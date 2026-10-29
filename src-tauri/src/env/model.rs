use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum EnvScope {
    System,
    User,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum ValueKind {
    Sz,       // REG_SZ
    ExpandSz, // REG_EXPAND_SZ
    Dynamic,  // 动态只读
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum IssueSeverity {
    Error,   // 红色：路径不存在
    Warning, // 黄色：重复项
    Info,    // 灰色：空项
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnvIssue {
    pub severity: IssueSeverity,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnvItem {
    pub raw: String,
    pub expanded: String,
    pub exists: bool,
    pub is_duplicate: bool,
    pub is_empty: bool,
    pub issues: Vec<EnvIssue>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnvVar {
    pub name: String,
    pub raw_value: String,
    pub expanded_value: String,
    pub kind: ValueKind,
    pub scope: EnvScope,
    pub is_multi: bool, // 是否按分号拆分展开显示 (如 Path, PATHEXT)
    pub items: Vec<EnvItem>,
    pub issues: Vec<EnvIssue>,
    pub is_protected: bool, // 是否为系统保护变量 (删除需二次验证)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnvState {
    pub system: Vec<EnvVar>,
    pub user: Vec<EnvVar>,
    pub revision: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawEnvVar {
    pub name: String,
    pub value: String,
    pub kind: ValueKind,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnvSnapshotPayload {
    pub system: Vec<RawEnvVar>,
    pub user: Vec<RawEnvVar>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnvChange {
    pub scope: EnvScope,
    pub name: String,
    pub old_value: Option<String>,
    pub new_value: Option<String>,
    pub kind: ValueKind,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnvPreviewResult {
    pub changes: Vec<EnvChange>,
    pub warnings: Vec<String>,
}
