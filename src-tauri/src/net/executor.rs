use crate::common::error::{AppError, AppResult, ErrorCode};
use crate::common::privilege::is_admin;
use crate::common::process::run_command;
use crate::common::snapshot::{SnapshotModule, SnapshotStore};
use crate::net::adapter::list_adapters;
use crate::net::model::{
    AdapterTabConfig, DnsType, Ipv4Type, NetProfile, NetSnapshotPayload, ProxyType,
};
use std::fs;
use std::path::PathBuf;
use winreg::enums::*;
use winreg::RegKey;

fn get_net_store_dir() -> PathBuf {
    let dir = dirs::data_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("EnvPilot")
        .join("net");
    fs::create_dir_all(&dir).ok();
    dir
}

/// 读取所有网络方案
pub fn load_net_profiles() -> AppResult<Vec<NetProfile>> {
    let store_dir = get_net_store_dir();
    let config_path = store_dir.join("profiles.json");

    if !config_path.exists() {
        // 生成默认初始方案
        let default_home = NetProfile {
            id: "net-home".to_string(),
            group: "".to_string(),
            name: "家".to_string(),
            adapters: vec![AdapterTabConfig {
                adapter_name: "WLAN".to_string(),
                adapter_desc: "".to_string(),
                apply_ip: true,
                ipv4: crate::net::model::Ipv4Config {
                    mode: Ipv4Type::Dhcp,
                    ip: "".to_string(),
                    mask: "".to_string(),
                    gateway: "".to_string(),
                },
                apply_dns: true,
                dns: crate::net::model::DnsConfig {
                    mode: DnsType::Dhcp,
                    primary: "".to_string(),
                    secondary: "".to_string(),
                },
            }],
            proxy: crate::net::model::ProxyConfig {
                mode: ProxyType::Disable,
                server: "".to_string(),
                bypass: "".to_string(),
            },
            linked_hosts_id: None,
        };

        let default_office = NetProfile {
            id: "net-office".to_string(),
            group: "".to_string(),
            name: "公司".to_string(),
            adapters: vec![AdapterTabConfig {
                adapter_name: "以太网".to_string(),
                adapter_desc: "".to_string(),
                apply_ip: true,
                ipv4: crate::net::model::Ipv4Config {
                    mode: Ipv4Type::Dhcp,
                    ip: "".to_string(),
                    mask: "".to_string(),
                    gateway: "".to_string(),
                },
                apply_dns: true,
                dns: crate::net::model::DnsConfig {
                    mode: DnsType::Dhcp,
                    primary: "".to_string(),
                    secondary: "".to_string(),
                },
            }],
            proxy: crate::net::model::ProxyConfig {
                mode: ProxyType::Disable,
                server: "".to_string(),
                bypass: "".to_string(),
            },
            linked_hosts_id: None,
        };

        let list = vec![default_home, default_office];
        save_net_profiles(&list)?;
        return Ok(list);
    }

    let json_str = fs::read_to_string(&config_path).map_err(|e| {
        AppError::new(ErrorCode::IoError, format!("读取网络方案失败: {}", e))
    })?;

    serde_json::from_str::<Vec<NetProfile>>(&json_str).map_err(|e| {
        AppError::new(ErrorCode::InternalError, format!("解析网络方案数据失败: {}", e))
    })
}

/// 保存网络方案列表
pub fn save_net_profiles(profiles: &[NetProfile]) -> AppResult<()> {
    let store_dir = get_net_store_dir();
    let config_path = store_dir.join("profiles.json");

    let bytes = serde_json::to_vec_pretty(profiles).map_err(|e| {
        AppError::new(ErrorCode::InternalError, format!("序列化网络方案失败: {}", e))
    })?;

    fs::write(config_path, bytes).map_err(|e| {
        AppError::new(ErrorCode::IoError, format!("保存网络方案失败: {}", e))
    })?;

    Ok(())
}

/// 激活网络方案
pub fn activate_net_profile(profile_id: &str) -> AppResult<String> {
    if !is_admin() {
        return Err(AppError::permission_denied("修改本机网络适配器与 IP 配置需要管理员权限"));
    }

    let profiles = load_net_profiles()?;
    let target_profile = profiles
        .iter()
        .find(|p| p.id == profile_id)
        .ok_or_else(|| {
            AppError::new(
                ErrorCode::NotFound,
                format!("未找到 ID 为 '{}' 的网络方案", profile_id),
            )
        })?;

    // 1. 采集当前所有网卡状态生成回滚快照
    let current_adapters = list_adapters().unwrap_or_default();
    let snapshot_id = SnapshotStore::save(
        SnapshotModule::Net,
        format!("激活网络方案: {}", target_profile.name),
        NetSnapshotPayload {
            adapters: current_adapters,
        },
    )?;

    // 2. 遍历方案中的各网卡页签并逐项下发 netsh 指令
    for tab in &target_profile.adapters {
        let adapter_name = &tab.adapter_name;
        if adapter_name.is_empty() {
            continue;
        }

        // 下发 IPv4
        if tab.apply_ip {
            match tab.ipv4.mode {
                Ipv4Type::Dhcp => {
                    let _ = run_command(
                        "netsh",
                        &[
                            "interface",
                            "ipv4",
                            "set",
                            "address",
                            &format!("name={}", adapter_name),
                            "source=dhcp",
                        ],
                        None,
                    );
                }
                Ipv4Type::Static => {
                    if !tab.ipv4.ip.is_empty() && !tab.ipv4.mask.is_empty() {
                        let name_arg = format!("name={}", adapter_name);
                        let addr_arg = format!("address={}", tab.ipv4.ip);
                        let mask_arg = format!("mask={}", tab.ipv4.mask);
                        let gw_arg = format!("gateway={}", tab.ipv4.gateway);

                        let mut args = vec![
                            "interface",
                            "ipv4",
                            "set",
                            "address",
                            &name_arg,
                            "source=static",
                            &addr_arg,
                            &mask_arg,
                        ];
                        if !tab.ipv4.gateway.is_empty() {
                            args.push(&gw_arg);
                        }
                        let _ = run_command("netsh", &args, None);
                    }
                }
            }
        }

        // 下发 DNS
        if tab.apply_dns {
            match tab.dns.mode {
                DnsType::Dhcp => {
                    let _ = run_command(
                        "netsh",
                        &[
                            "interface",
                            "ipv4",
                            "set",
                            "dnsservers",
                            &format!("name={}", adapter_name),
                            "source=dhcp",
                        ],
                        None,
                    );
                }
                DnsType::Static => {
                    if !tab.dns.primary.is_empty() {
                        let _ = run_command(
                            "netsh",
                            &[
                                "interface",
                                "ipv4",
                                "set",
                                "dnsservers",
                                &format!("name={}", adapter_name),
                                "source=static",
                                &format!("address={}", tab.dns.primary),
                                "register=primary",
                                "validate=no",
                            ],
                            None,
                        );

                        if !tab.dns.secondary.is_empty() {
                            let _ = run_command(
                                "netsh",
                                &[
                                    "interface",
                                    "ipv4",
                                    "add",
                                    "dnsservers",
                                    &format!("name={}", adapter_name),
                                    &format!("address={}", tab.dns.secondary),
                                    "index=2",
                                    "validate=no",
                                ],
                                None,
                            );
                        }
                    }
                }
            }
        }
    }

    // 3. 配置 Windows 系统代理
    apply_system_proxy(&target_profile.proxy)?;

    Ok(snapshot_id)
}

/// 配置系统代理 (HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings)
fn apply_system_proxy(proxy: &crate::net::model::ProxyConfig) -> AppResult<()> {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let subkey = r"Software\Microsoft\Windows\CurrentVersion\Internet Settings";

    if let Ok(key) = hkcu.open_subkey_with_flags(subkey, KEY_WRITE) {
        match proxy.mode {
            ProxyType::Keep => {}
            ProxyType::Disable => {
                let _ = key.set_value("ProxyEnable", &0u32);
            }
            ProxyType::Manual => {
                let _ = key.set_value("ProxyEnable", &1u32);
                let _ = key.set_value("ProxyServer", &proxy.server);
                let _ = key.set_value("ProxyOverride", &proxy.bypass);
            }
        }
    }

    Ok(())
}
