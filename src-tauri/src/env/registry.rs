use crate::common::error::{AppError, AppResult, ErrorCode};
use crate::common::privilege::is_admin;
use crate::common::snapshot::{SnapshotModule, SnapshotStore};
use crate::env::model::{
    EnvChange, EnvScope, EnvSnapshotPayload, EnvState, EnvVar, RawEnvVar, ValueKind,
};
use crate::env::validator::{is_multi_value_var, is_protected_var, validate_and_enrich_var};
use std::collections::HashMap;
use std::ffi::OsStr;
use std::os::windows::ffi::OsStrExt;
use winreg::enums::*;
use winreg::{RegKey, RegValue};

const SYS_ENV_KEY: &str = r"SYSTEM\CurrentControlSet\Control\Session Manager\Environment";
const USER_ENV_KEY: &str = r"Environment";
const USER_VOLATILE_KEY: &str = r"Volatile Environment";

/// 读取注册表中原始环境变量集合
pub fn load_raw_env_vars() -> AppResult<(Vec<RawEnvVar>, Vec<RawEnvVar>)> {
    let mut system_vars = Vec::new();
    let mut user_vars = Vec::new();

    // 1. 系统变量 HKLM
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    if let Ok(key) = hklm.open_subkey(SYS_ENV_KEY) {
        for val in key.enum_values().flatten() {
            let (name, reg_val) = val;
            let kind = match reg_val.vtype {
                REG_EXPAND_SZ => ValueKind::ExpandSz,
                _ => ValueKind::Sz,
            };
            let str_val = reg_val_to_string(&reg_val);
            system_vars.push(RawEnvVar {
                name,
                value: str_val,
                kind,
            });
        }
    }

    // 2. 用户变量 HKCU
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    if let Ok(key) = hkcu.open_subkey(USER_ENV_KEY) {
        for val in key.enum_values().flatten() {
            let (name, reg_val) = val;
            let kind = match reg_val.vtype {
                REG_EXPAND_SZ => ValueKind::ExpandSz,
                _ => ValueKind::Sz,
            };
            let str_val = reg_val_to_string(&reg_val);
            user_vars.push(RawEnvVar {
                name,
                value: str_val,
                kind,
            });
        }
    }

    // 3. 用户动态变量 HKCU\Volatile Environment (如 APPDATA, USERNAME, HOMEPATH 等只读项)
    if let Ok(key) = hkcu.open_subkey(USER_VOLATILE_KEY) {
        for val in key.enum_values().flatten() {
            let (name, reg_val) = val;
            // 如果用户变量中已有定义，则以真实用户变量为准
            if !user_vars.iter().any(|u| u.name.eq_ignore_ascii_case(&name)) {
                let str_val = reg_val_to_string(&reg_val);
                user_vars.push(RawEnvVar {
                    name,
                    value: str_val,
                    kind: ValueKind::Dynamic,
                });
            }
        }
    }

    // 4. 追加进程环境中的其他动态只读项 (如 COMPUTERNAME, ProgramFiles 等)
    for (k, v) in std::env::vars() {
        let is_in_sys = system_vars.iter().any(|s| s.name.eq_ignore_ascii_case(&k));
        let is_in_usr = user_vars.iter().any(|u| u.name.eq_ignore_ascii_case(&k));
        if !is_in_sys && !is_in_usr {
            system_vars.push(RawEnvVar {
                name: k,
                value: v,
                kind: ValueKind::Dynamic,
            });
        }
    }

    // 排序：常规变量在前，动态只读在后；同类按名称字母序
    system_vars.sort_by(|a, b| {
        let dynamic_cmp = (a.kind == ValueKind::Dynamic).cmp(&(b.kind == ValueKind::Dynamic));
        if dynamic_cmp != std::cmp::Ordering::Equal {
            dynamic_cmp
        } else {
            a.name.to_lowercase().cmp(&b.name.to_lowercase())
        }
    });

    user_vars.sort_by(|a, b| {
        let dynamic_cmp = (a.kind == ValueKind::Dynamic).cmp(&(b.kind == ValueKind::Dynamic));
        if dynamic_cmp != std::cmp::Ordering::Equal {
            dynamic_cmp
        } else {
            a.name.to_lowercase().cmp(&b.name.to_lowercase())
        }
    });

    Ok((system_vars, user_vars))
}

/// 构建完整的 EnvState 视图（解析、展开、校验）
pub fn get_env_state() -> AppResult<EnvState> {
    let (raw_sys, raw_usr) = load_raw_env_vars()?;

    // 构建宏替换字典（不区分大小写）
    let mut lookup = HashMap::new();
    for v in &raw_sys {
        lookup.insert(v.name.to_lowercase(), v.value.clone());
    }
    for v in &raw_usr {
        lookup.insert(v.name.to_lowercase(), v.value.clone());
    }

    let mut sys_vars = Vec::new();
    for raw in raw_sys {
        let is_multi = is_multi_value_var(&raw.name, &raw.value);
        let is_prot = is_protected_var(&raw.name);
        let mut var = EnvVar {
            name: raw.name,
            raw_value: raw.value,
            expanded_value: String::new(),
            kind: raw.kind,
            scope: EnvScope::System,
            is_multi,
            items: Vec::new(),
            issues: Vec::new(),
            is_protected: is_prot,
        };
        validate_and_enrich_var(&mut var, &lookup);
        sys_vars.push(var);
    }

    let mut usr_vars = Vec::new();
    for raw in raw_usr {
        let is_multi = is_multi_value_var(&raw.name, &raw.value);
        let is_prot = is_protected_var(&raw.name);
        let mut var = EnvVar {
            name: raw.name,
            raw_value: raw.value,
            expanded_value: String::new(),
            kind: raw.kind,
            scope: EnvScope::User,
            is_multi,
            items: Vec::new(),
            issues: Vec::new(),
            is_protected: is_prot,
        };
        validate_and_enrich_var(&mut var, &lookup);
        usr_vars.push(var);
    }

    let revision = format!("{:x}", calculate_revision(&sys_vars, &usr_vars));

    Ok(EnvState {
        system: sys_vars,
        user: usr_vars,
        revision,
    })
}

/// 计算当前状态指纹
fn calculate_revision(sys: &[EnvVar], usr: &[EnvVar]) -> u64 {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};

    let mut hasher = DefaultHasher::new();
    for v in sys {
        v.name.hash(&mut hasher);
        v.raw_value.hash(&mut hasher);
    }
    for v in usr {
        v.name.hash(&mut hasher);
        v.raw_value.hash(&mut hasher);
    }
    hasher.finish()
}

/// 应用环境变量变更
pub fn apply_env_changes(changes: Vec<EnvChange>) -> AppResult<String> {
    if changes.is_empty() {
        return Ok("没有需要应用的更改".to_string());
    }

    // 1. 权限前置判断：如果包含系统变量写入且非管理员，直接拒绝并提示提权
    let has_system_change = changes.iter().any(|c| c.scope == EnvScope::System);
    if has_system_change && !is_admin() {
        return Err(AppError::permission_denied("修改系统环境变量需要管理员权限"));
    }

    // 2. 写入前生成全量快照以备一键回滚
    let (current_sys, current_usr) = load_raw_env_vars()?;
    let snapshot_id = SnapshotStore::save(
        SnapshotModule::Env,
        format!("应用 {} 项环境变量修改", changes.len()),
        EnvSnapshotPayload {
            system: current_sys,
            user: current_usr,
        },
    )?;

    // 3. 执行注册表修改
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);

    for change in changes {
        let (key_root, subkey_path) = match change.scope {
            EnvScope::System => (&hklm, SYS_ENV_KEY),
            EnvScope::User => (&hkcu, USER_ENV_KEY),
        };

        let key = key_root.open_subkey_with_flags(subkey_path, KEY_WRITE).map_err(|e| {
            AppError::new(
                ErrorCode::IoError,
                format!("打开注册表键失败 ({}): {}", subkey_path, e),
            )
        })?;

        match (change.old_value, change.new_value) {
            (Some(_), Some(new_val)) | (None, Some(new_val)) => {
                // 新增或更新变量
                let reg_type = match change.kind {
                    ValueKind::ExpandSz => REG_EXPAND_SZ,
                    _ => {
                        if new_val.contains('%') {
                            REG_EXPAND_SZ
                        } else {
                            REG_SZ
                        }
                    }
                };
                let reg_val = string_to_reg_val(&new_val, reg_type);
                key.set_raw_value(&change.name, &reg_val).map_err(|e| {
                    AppError::new(
                        ErrorCode::IoError,
                        format!("写入变量 '{}' 失败: {}", change.name, e),
                    )
                })?;
            }
            (Some(_), None) => {
                // 删除变量
                let _ = key.delete_value(&change.name);
            }
            _ => {}
        }
    }

    // 4. 广播 Windows 全局 WM_SETTINGCHANGE 消息，使新启动的命令行和程序立即生效
    broadcast_setting_change();

    Ok(snapshot_id)
}

/// 广播 WM_SETTINGCHANGE ("Environment") 消息
fn broadcast_setting_change() {
    #[cfg(windows)]
    unsafe {
        use windows_sys::Win32::Foundation::HWND;
        use windows_sys::Win32::UI::WindowsAndMessaging::{
            SendMessageTimeoutW, HWND_BROADCAST, SMTO_ABORTIFHUNG, WM_SETTINGCHANGE,
        };

        let env_wide: Vec<u16> = OsStr::new("Environment")
            .encode_wide()
            .chain(Some(0))
            .collect();
        let mut result = 0;
        SendMessageTimeoutW(
            HWND_BROADCAST as HWND,
            WM_SETTINGCHANGE,
            0,
            env_wide.as_ptr() as isize,
            SMTO_ABORTIFHUNG,
            5000,
            &mut result,
        );
    }
}

/// 将 RegValue 字节转换为 String
fn reg_val_to_string(val: &RegValue) -> String {
    match val.vtype {
        REG_SZ | REG_EXPAND_SZ => {
            // 注册表字符串通常为 UTF-16LE + 结尾空字符
            let u16_slice: &[u16] = unsafe {
                std::slice::from_raw_parts(
                    val.bytes.as_ptr() as *const u16,
                    val.bytes.len() / 2,
                )
            };
            let mut end = u16_slice.len();
            while end > 0 && u16_slice[end - 1] == 0 {
                end -= 1;
            }
            String::from_utf16_lossy(&u16_slice[..end])
        }
        _ => String::from_utf8_lossy(&val.bytes).to_string(),
    }
}

/// 将字符串转换为带 UTF-16 字节的 RegValue
fn string_to_reg_val(s: &str, vtype: RegType) -> RegValue {
    let mut u16_vec: Vec<u16> = s.encode_utf16().collect();
    u16_vec.push(0); // null-terminated
    let bytes: Vec<u8> = unsafe {
        std::slice::from_raw_parts(
            u16_vec.as_ptr() as *const u8,
            u16_vec.len() * 2,
        )
        .to_vec()
    };
    RegValue { bytes, vtype }
}

/// 将快照中的环境变量集合恢复写入注册表
pub fn restore_env_snapshot(payload: &EnvSnapshotPayload) -> AppResult<()> {
    if !is_admin() && !payload.system.is_empty() {
        return Err(AppError::permission_denied("恢复系统环境变量需要管理员权限"));
    }

    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);

    if let Ok(key) = hklm.open_subkey_with_flags(SYS_ENV_KEY, KEY_WRITE) {
        for v in &payload.system {
            let reg_type = match v.kind {
                ValueKind::ExpandSz => REG_EXPAND_SZ,
                _ => REG_SZ,
            };
            let reg_val = string_to_reg_val(&v.value, reg_type);
            let _ = key.set_raw_value(&v.name, &reg_val);
        }
    }

    if let Ok(key) = hkcu.open_subkey_with_flags(USER_ENV_KEY, KEY_WRITE) {
        for v in &payload.user {
            let reg_type = match v.kind {
                ValueKind::ExpandSz => REG_EXPAND_SZ,
                _ => REG_SZ,
            };
            let reg_val = string_to_reg_val(&v.value, reg_type);
            let _ = key.set_raw_value(&v.name, &reg_val);
        }
    }

    broadcast_setting_change();
    Ok(())
}
