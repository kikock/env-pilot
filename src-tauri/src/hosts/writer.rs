use crate::common::atomic_file::atomic_write_file;
use crate::common::error::{AppError, AppResult, ErrorCode};
use crate::common::privilege::is_admin;
use crate::common::process::run_command;
use crate::common::snapshot::{SnapshotModule, SnapshotStore};
use crate::hosts::composer::compose_hosts_content;
use crate::hosts::model::{HostsProfile, HostsSettings, ProfileKind};
use crate::hosts::parser::{get_system_hosts_path, read_system_hosts};
use std::fs;
use std::path::PathBuf;

fn get_hosts_store_dir() -> PathBuf {
    let dir = dirs::data_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("EnvPilot")
        .join("hosts");
    fs::create_dir_all(&dir).ok();
    dir
}

/// 读取本地保存的所有 Hosts 方案
pub fn load_profiles() -> AppResult<(Vec<HostsProfile>, HostsSettings)> {
    let store_dir = get_hosts_store_dir();
    let config_path = store_dir.join("profiles.json");

    if !config_path.exists() {
        // 首次启动，生成一个默认演示方案
        let default_profile = HostsProfile {
            id: "default-dev".to_string(),
            name: "开发常用测试屏蔽".to_string(),
            kind: ProfileKind::Local,
            enabled: false,
            content: "# 本地方案示例\r\n127.0.0.1 test.local\r\n127.0.0.1 dev.api.local".to_string(),
            order: 0,
        };
        let profiles = vec![default_profile];
        let settings = HostsSettings::default();
        save_profiles(&profiles, &settings)?;
        return Ok((profiles, settings));
    }

    let json_str = fs::read_to_string(&config_path).map_err(|e| {
        AppError::new(ErrorCode::IoError, format!("读取方案配置失败: {}", e))
    })?;

    #[derive(serde::Deserialize)]
    struct StoredData {
        profiles: Vec<HostsProfile>,
        settings: HostsSettings,
    }

    let data: StoredData = serde_json::from_str(&json_str).map_err(|e| {
        AppError::new(ErrorCode::InternalError, format!("解析方案数据失败: {}", e))
    })?;

    Ok((data.profiles, data.settings))
}

/// 保存 Hosts 方案列表与配置到应用数据目录
pub fn save_profiles(profiles: &[HostsProfile], settings: &HostsSettings) -> AppResult<()> {
    let store_dir = get_hosts_store_dir();
    let config_path = store_dir.join("profiles.json");

    #[derive(serde::Serialize)]
    struct StoredData<'a> {
        profiles: &'a [HostsProfile],
        settings: &'a HostsSettings,
    }

    let data = StoredData { profiles, settings };
    let json_bytes = serde_json::to_vec_pretty(&data).map_err(|e| {
        AppError::new(ErrorCode::InternalError, format!("序列化方案失败: {}", e))
    })?;

    fs::write(config_path, json_bytes).map_err(|e| {
        AppError::new(ErrorCode::IoError, format!("保存方案配置失败: {}", e))
    })?;

    Ok(())
}

/// 应用选中的方案列表到 Windows 系统 hosts 文件
pub fn apply_hosts_to_system(
    profiles: &[HostsProfile],
    settings: &HostsSettings,
) -> AppResult<String> {
    if !is_admin() {
        return Err(AppError::permission_denied("修改 hosts 文件需要管理员权限"));
    }

    let hosts_path = get_system_hosts_path();
    let current_info = read_system_hosts().map_err(|e| {
        AppError::new(ErrorCode::IoError, format!("读取系统 hosts 失败: {}", e))
    })?;

    // 1. 生成写入前的快照备份
    let snapshot_id = SnapshotStore::save(
        SnapshotModule::Hosts,
        "切换并写入系统 Hosts",
        current_info.content.clone(),
    )?;

    // 2. 合成新文本 (UTF-8 无 BOM + CRLF)
    let new_content = compose_hosts_content(&current_info.content, profiles, settings);

    // 3. 处理只读属性
    let mut was_readonly = false;
    if hosts_path.exists() {
        if let Ok(metadata) = fs::metadata(&hosts_path) {
            if metadata.permissions().readonly() {
                was_readonly = true;
                let mut perms = metadata.permissions();
                perms.set_readonly(false);
                let _ = fs::set_permissions(&hosts_path, perms);
            }
        }
    }

    // 4. 原子安全写入
    let write_res = atomic_write_file(&hosts_path, new_content.as_bytes(), true);

    // 5. 还原只读属性
    if was_readonly {
        if let Ok(metadata) = fs::metadata(&hosts_path) {
            let mut perms = metadata.permissions();
            perms.set_readonly(true);
            let _ = fs::set_permissions(&hosts_path, perms);
        }
    }

    write_res?;

    // 6. 自动刷新系统 DNS 缓存
    if settings.auto_flush_dns {
        let _ = flush_system_dns();
    }

    // 7. 保存当前方案状态
    save_profiles(profiles, settings)?;

    Ok(snapshot_id)
}

/// 刷新 Windows 本机 DNS 解析器缓存
pub fn flush_system_dns() -> AppResult<()> {
    let out = run_command("ipconfig", &["/flushdns"], None)?;
    if !out.success {
        return Err(AppError::new(
            ErrorCode::CommandFailed,
            format!("刷新 DNS 失败: {}", out.stderr),
        ));
    }
    Ok(())
}

/// 将快照中的 hosts 文件内容恢复到系统 hosts
pub fn restore_hosts_snapshot(content: &str) -> AppResult<()> {
    if !is_admin() {
        return Err(AppError::permission_denied("恢复系统 hosts 需要管理员权限"));
    }
    let hosts_path = get_system_hosts_path();
    atomic_write_file(&hosts_path, content.as_bytes(), true)?;
    let _ = flush_system_dns();
    Ok(())
}
