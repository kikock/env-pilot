use crate::common::error::{AppError, AppResult, ErrorCode};
use chrono::{DateTime, Local};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum SnapshotModule {
    Env,
    Hosts,
    Net,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SnapshotMeta {
    pub id: String,
    pub module: SnapshotModule,
    pub created_at: String,
    pub summary: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Snapshot<T> {
    pub id: String,
    pub module: SnapshotModule,
    pub created_at: String,
    pub summary: String,
    pub payload: T,
}

pub struct SnapshotStore;

impl SnapshotStore {
    fn get_dir(module: &SnapshotModule) -> PathBuf {
        let base = dirs::data_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("EnvPilot")
            .join("snapshots");
        match module {
            SnapshotModule::Env => base.join("env"),
            SnapshotModule::Hosts => base.join("hosts"),
            SnapshotModule::Net => base.join("net"),
        }
    }

    /// 保存快照到磁盘，并自动清理超过 50 个的历史旧快照
    pub fn save<T: Serialize>(
        module: SnapshotModule,
        summary: impl Into<String>,
        payload: T,
    ) -> AppResult<String> {
        let dir = Self::get_dir(&module);
        fs::create_dir_all(&dir).map_err(|e| {
            AppError::new(ErrorCode::IoError, format!("创建快照目录失败: {}", e))
        })?;

        let now: DateTime<Local> = Local::now();
        let timestamp_str = now.format("%Y%m%d_%H%M%S").to_string();
        let id = format!("{}_{}", timestamp_str, &now.timestamp_subsec_millis());

        let snapshot = Snapshot {
            id: id.clone(),
            module: module.clone(),
            created_at: now.format("%Y-%m-%d %H:%M:%S").to_string(),
            summary: summary.into(),
            payload,
        };

        let file_path = dir.join(format!("{}.json", id));
        let json_bytes = serde_json::to_vec_pretty(&snapshot).map_err(|e| {
            AppError::new(ErrorCode::InternalError, format!("序列化快照失败: {}", e))
        })?;

        fs::write(&file_path, json_bytes).map_err(|e| {
            AppError::new(ErrorCode::IoError, format!("写入快照文件失败: {}", e))
        })?;

        // 维护保留最近 50 个快照
        Self::prune_old(&dir, 50);

        Ok(id)
    }

    /// 列出某一模块的所有快照元信息
    pub fn list(module: &SnapshotModule) -> Vec<SnapshotMeta> {
        let dir = Self::get_dir(module);
        let mut list = Vec::new();
        if let Ok(entries) = fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().and_then(|s| s.to_str()) == Some("json") {
                    if let Ok(content) = fs::read_to_string(&path) {
                        if let Ok(snap) = serde_json::from_str::<SnapshotMeta>(&content) {
                            list.push(snap);
                        }
                    }
                }
            }
        }
        // 按创建时间倒序
        list.sort_by(|a, b| b.id.cmp(&a.id));
        list
    }

    /// 加载具体快照 payload
    pub fn load<T: for<'de> Deserialize<'de>>(
        module: &SnapshotModule,
        id: &str,
    ) -> AppResult<Snapshot<T>> {
        let path = Self::get_dir(module).join(format!("{}.json", id));
        if !path.exists() {
            return Err(AppError::new(
                ErrorCode::NotFound,
                format!("未找到 ID 为 '{}' 的快照文件", id),
            ));
        }

        let content = fs::read_to_string(&path).map_err(|e| {
            AppError::new(ErrorCode::IoError, format!("读取快照失败: {}", e))
        })?;

        serde_json::from_str::<Snapshot<T>>(&content).map_err(|e| {
            AppError::new(ErrorCode::InternalError, format!("解析快照失败: {}", e))
        })
    }

    fn prune_old(dir: &Path, max_keep: usize) {
        if let Ok(entries) = fs::read_dir(dir) {
            let mut files: Vec<PathBuf> = entries
                .flatten()
                .map(|e| e.path())
                .filter(|p| p.extension().and_then(|s| s.to_str()) == Some("json"))
                .collect();
            files.sort(); // 文件名含时间戳升序
            if files.len() > max_keep {
                let to_remove = files.len() - max_keep;
                for file in files.into_iter().take(to_remove) {
                    let _ = fs::remove_file(file);
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_snapshot_prune_old() {
        let temp_dir = std::env::temp_dir().join(format!("envpilot_snap_test_{}", std::process::id()));
        let _ = fs::create_dir_all(&temp_dir);

        // 创建 5 个模拟快照文件
        for i in 1..=5 {
            let f = temp_dir.join(format!("20261029_00000{}.json", i));
            let _ = fs::write(f, b"{}");
        }

        // 仅保留 3 个
        SnapshotStore::prune_old(&temp_dir, 3);

        let remaining: Vec<_> = fs::read_dir(&temp_dir)
            .unwrap()
            .flatten()
            .map(|e| e.file_name().to_string_lossy().to_string())
            .collect();

        assert_eq!(remaining.len(), 3);
        // 最旧的 1 和 2 应该被移除，保留 3, 4, 5
        assert!(!remaining.contains(&"20261029_000001.json".to_string()));
        assert!(!remaining.contains(&"20261029_000002.json".to_string()));
        assert!(remaining.contains(&"20261029_000003.json".to_string()));
        assert!(remaining.contains(&"20261029_000004.json".to_string()));
        assert!(remaining.contains(&"20261029_000005.json".to_string()));

        let _ = fs::remove_dir_all(&temp_dir);
    }
}
