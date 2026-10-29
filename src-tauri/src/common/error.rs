use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum ErrorCode {
    PermissionDenied,
    FileLocked,
    NotFound,
    AlreadyExists,
    ValidationFailed,
    CommandFailed,
    CommandTimeout,
    Conflict,
    IoError,
    InternalError,
}

#[derive(Debug, Clone, Serialize, Deserialize, thiserror::Error)]
#[error("{message}")]
pub struct AppError {
    pub code: ErrorCode,
    pub message: String,
    pub hint: Option<String>,
    pub detail: Option<String>,
}

impl AppError {
    pub fn new(code: ErrorCode, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
            hint: None,
            detail: None,
        }
    }

    pub fn with_hint(mut self, hint: impl Into<String>) -> Self {
        self.hint = Some(hint.into());
        self
    }

    pub fn with_detail(mut self, detail: impl Into<String>) -> Self {
        self.detail = Some(detail.into());
        self
    }

    pub fn permission_denied(msg: impl Into<String>) -> Self {
        Self::new(ErrorCode::PermissionDenied, msg)
            .with_hint("请点击顶部标题栏的【以管理员身份重启】以获取系统权限")
    }
}

pub type AppResult<T> = Result<T, AppError>;
