use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum ProfileKind {
    Local,
    Remote { url: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HostsProfile {
    pub id: String,
    pub name: String,
    pub kind: ProfileKind,
    pub enabled: bool,
    pub content: String,
    pub order: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemHostsInfo {
    pub path: String,
    pub content: String,
    pub is_readonly: bool,
    pub encoding: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum WriteStrategy {
    Managed,   // 托管区块模式 (# EnvPilot BEGIN ... # EnvPilot END)
    Overwrite, // 全量覆盖模式
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HostsSettings {
    pub is_single_mode: bool, // 单选模式还是多选模式
    pub write_strategy: WriteStrategy,
    pub auto_flush_dns: bool,
}

impl Default for HostsSettings {
    fn default() -> Self {
        Self {
            is_single_mode: false,
            write_strategy: WriteStrategy::Managed,
            auto_flush_dns: true,
        }
    }
}
