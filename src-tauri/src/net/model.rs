use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdapterInfo {
    pub guid: String,
    pub index: u32,
    pub name: String,        // 友好别名 (如 "WLAN", "以太网")
    pub description: String, // 硬件设备描述 (如 "Intel(R) Wi-Fi 6E AX211 160MHz")
    pub mac: String,
    pub is_dhcp: bool,
    pub ip: String,
    pub mask: String,
    pub gateway: String,
    pub dns: Vec<String>,
    pub is_up: bool,
    pub is_wireless: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum Ipv4Type {
    Dhcp,
    Static,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Ipv4Config {
    pub mode: Ipv4Type,
    pub ip: String,
    pub mask: String,
    pub gateway: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum DnsType {
    Dhcp,
    Static,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DnsConfig {
    pub mode: DnsType,
    pub primary: String,
    pub secondary: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum ProxyType {
    Keep,
    Disable,
    Manual,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxyConfig {
    pub mode: ProxyType,
    pub server: String,
    pub bypass: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdapterTabConfig {
    pub adapter_name: String, // 绑定的网卡别名 (如 "WLAN")
    pub adapter_desc: String,
    pub apply_ip: bool,
    pub ipv4: Ipv4Config,
    pub apply_dns: bool,
    pub dns: DnsConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetProfile {
    pub id: String,
    pub group: String, // 分组 (如 "群组", "数据中心")
    pub name: String,  // 方案名 (如 "家", "六所网络配置")
    pub adapters: Vec<AdapterTabConfig>,
    pub proxy: ProxyConfig,
    pub linked_hosts_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetSnapshotPayload {
    pub adapters: Vec<AdapterInfo>,
}
