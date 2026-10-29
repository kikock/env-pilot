pub mod common;
pub mod env;
pub mod hosts;
pub mod net;
pub mod tray;

use common::error::AppError;
use common::privilege::{is_admin, relaunch_as_admin};
use common::snapshot::{SnapshotMeta, SnapshotModule, SnapshotStore};
use env::model::{EnvChange, EnvState};
use env::registry::{apply_env_changes, get_env_state};
use hosts::model::{HostsProfile, HostsSettings, SystemHostsInfo};
use hosts::parser::read_system_hosts;
use hosts::writer::{apply_hosts_to_system, flush_system_dns, load_profiles, save_profiles};
use net::adapter::list_adapters;
use net::executor::{activate_net_profile, load_net_profiles, save_net_profiles};
use net::model::{AdapterInfo, NetProfile};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct SystemStatus {
    pub is_admin: bool,
    pub user_name: String,
    pub os_info: String,
}

// ---------------- 系统命令 ----------------

#[tauri::command]
fn get_system_status_cmd() -> SystemStatus {
    let user_name = std::env::var("USERNAME").unwrap_or_else(|_| "User".to_string());
    let os_info = std::env::var("OS").unwrap_or_else(|_| "Windows_NT".to_string());
    SystemStatus {
        is_admin: is_admin(),
        user_name,
        os_info,
    }
}

#[tauri::command]
fn relaunch_as_admin_cmd(page: Option<String>, pending_json: Option<String>) -> Result<(), AppError> {
    relaunch_as_admin(page.as_deref(), pending_json.as_deref())
}

#[tauri::command]
fn list_snapshots_cmd(module: Option<String>) -> Vec<SnapshotMeta> {
    let mod_enum = match module.as_deref() {
        Some("env") => SnapshotModule::Env,
        Some("hosts") => SnapshotModule::Hosts,
        _ => SnapshotModule::Net,
    };
    SnapshotStore::list(&mod_enum)
}

#[tauri::command]
fn rollback_snapshot_cmd(id: String, module: String) -> Result<String, AppError> {
    let mod_enum = match module.as_str() {
        "env" => SnapshotModule::Env,
        "hosts" => SnapshotModule::Hosts,
        _ => SnapshotModule::Net,
    };
    SnapshotStore::rollback(&id, mod_enum)
}

// ---------------- 环境变量命令 ----------------

#[tauri::command]
fn get_env_state_cmd() -> Result<EnvState, AppError> {
    get_env_state()
}

#[tauri::command]
fn apply_env_changes_cmd(changes: Vec<EnvChange>) -> Result<String, AppError> {
    apply_env_changes(changes)
}

// ---------------- Hosts 命令 ----------------

#[tauri::command]
fn get_system_hosts_cmd() -> Result<SystemHostsInfo, AppError> {
    read_system_hosts().map_err(|e| {
        AppError::new(
            common::error::ErrorCode::IoError,
            format!("读取系统 hosts 失败: {}", e),
        )
    })
}

#[tauri::command]
fn get_hosts_profiles_cmd() -> Result<(Vec<HostsProfile>, HostsSettings), AppError> {
    load_profiles()
}

#[tauri::command]
fn save_hosts_profiles_cmd(
    profiles: Vec<HostsProfile>,
    settings: HostsSettings,
) -> Result<(), AppError> {
    save_profiles(&profiles, &settings)
}

#[tauri::command]
fn apply_hosts_cmd(
    profiles: Vec<HostsProfile>,
    settings: HostsSettings,
) -> Result<String, AppError> {
    apply_hosts_to_system(&profiles, &settings)
}

#[tauri::command]
fn flush_dns_cmd() -> Result<(), AppError> {
    flush_system_dns()
}

// ---------------- 本机网络环境命令 ----------------

#[tauri::command]
fn list_adapters_cmd() -> Result<Vec<AdapterInfo>, AppError> {
    list_adapters()
}

#[tauri::command]
fn get_net_profiles_cmd() -> Result<Vec<NetProfile>, AppError> {
    load_net_profiles()
}

#[tauri::command]
fn save_net_profiles_cmd(profiles: Vec<NetProfile>) -> Result<(), AppError> {
    save_net_profiles(&profiles)
}

#[tauri::command]
fn activate_net_profile_cmd(profile_id: String) -> Result<String, AppError> {
    activate_net_profile(&profile_id)
}

#[tauri::command]
fn run_net_tool_cmd(cmd: String, args: String, target: String) -> Result<String, AppError> {
    net::tools::run_net_tool(&cmd, &args, &target)
}

#[tauri::command]
fn start_net_tool_stream_cmd(
    app: tauri::AppHandle,
    session_id: String,
    cmd: String,
    args: String,
    target: String,
) -> Result<(), AppError> {
    net::tools::start_net_tool_stream(app, session_id, &cmd, &args, &target)
}

#[tauri::command]
fn stop_net_tool_stream_cmd(session_id: String) -> Result<(), AppError> {
    net::tools::stop_net_tool_stream(&session_id)
}

#[tauri::command]
async fn scan_subnet_cmd(start_ip: String, end_ip: String) -> Result<Vec<net::tools::ScannedHost>, AppError> {
    net::tools::scan_ipv4_range(&start_ip, &end_ip).await
}

#[tauri::command]
fn get_active_connections_cmd() -> Result<Vec<net::tools::NetConnectionInfo>, AppError> {
    net::tools::get_active_connections()
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let _ = tray::setup_tray(app);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_system_status_cmd,
            relaunch_as_admin_cmd,
            list_snapshots_cmd,
            rollback_snapshot_cmd,
            get_env_state_cmd,
            apply_env_changes_cmd,
            get_system_hosts_cmd,
            get_hosts_profiles_cmd,
            save_hosts_profiles_cmd,
            apply_hosts_cmd,
            flush_dns_cmd,
            list_adapters_cmd,
            get_net_profiles_cmd,
            save_net_profiles_cmd,
            activate_net_profile_cmd,
            run_net_tool_cmd,
            start_net_tool_stream_cmd,
            stop_net_tool_stream_cmd,
            scan_subnet_cmd,
            get_active_connections_cmd,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
