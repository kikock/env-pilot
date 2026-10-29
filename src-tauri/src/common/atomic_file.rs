use crate::common::error::{AppError, AppResult, ErrorCode};
use std::fs::File;
use std::io::Write;
use std::os::windows::ffi::OsStrExt;
use std::path::{Path, PathBuf};

/// 安全原子文件写入
/// 流程：写入同目录临时文件 -> 刷入磁盘 (flush & sync_all) -> ReplaceFileW / MoveFileExW 原子替换
pub fn atomic_write_file(target: &Path, content: &[u8], preserve_acl: bool) -> AppResult<()> {
    let parent = target.parent().unwrap_or_else(|| Path::new("."));
    let file_name = target
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("file");
    let tmp_path: PathBuf = parent.join(format!("{}.envpilot.tmp", file_name));

    // 1. 写入临时文件
    let mut file = File::create(&tmp_path).map_err(|e| {
        AppError::new(
            ErrorCode::IoError,
            format!("创建临时文件失败 ({}): {}", tmp_path.display(), e),
        )
    })?;

    file.write_all(content).map_err(|e| {
        let _ = std::fs::remove_file(&tmp_path);
        AppError::new(ErrorCode::IoError, format!("写入临时数据失败: {}", e))
    })?;

    file.sync_all().map_err(|e| {
        let _ = std::fs::remove_file(&tmp_path);
        AppError::new(ErrorCode::IoError, format!("同步磁盘数据失败: {}", e))
    })?;

    drop(file);

    // 2. Windows 平台原子替换
    #[cfg(windows)]
    {
        use windows_sys::Win32::Foundation::GetLastError;
        use windows_sys::Win32::Storage::FileSystem::{
            MoveFileExW, ReplaceFileW, MOVEFILE_REPLACE_EXISTING, MOVEFILE_WRITE_THROUGH,
            REPLACEFILE_IGNORE_MERGE_ERRORS,
        };

        let target_wide: Vec<u16> = target.as_os_str().encode_wide().chain(Some(0)).collect();
        let tmp_wide: Vec<u16> = tmp_path.as_os_str().encode_wide().chain(Some(0)).collect();

        unsafe {
            let mut replaced = false;
            if preserve_acl && target.exists() {
                // ReplaceFileW 能够完美保留目标系统的安全描述符 (ACL) 与属性
                let ok = ReplaceFileW(
                    target_wide.as_ptr(),
                    tmp_wide.as_ptr(),
                    std::ptr::null(),
                    REPLACEFILE_IGNORE_MERGE_ERRORS,
                    std::ptr::null_mut(),
                    std::ptr::null_mut(),
                );
                if ok != 0 {
                    replaced = true;
                }
            }

            if !replaced {
                let ok = MoveFileExW(
                    tmp_wide.as_ptr(),
                    target_wide.as_ptr(),
                    MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH,
                );
                if ok == 0 {
                    let err = GetLastError();
                    let _ = std::fs::remove_file(&tmp_path);
                    return match err {
                        5 => Err(AppError::permission_denied(format!(
                            "写入文件访问被拒绝: {}",
                            target.display()
                        ))),
                        32 | 33 => Err(AppError::new(
                            ErrorCode::FileLocked,
                            format!("文件正被其他程序占用，无法写入: {}", target.display()),
                        )
                        .with_hint("请检查是否有安全软件或编辑器正在锁定此文件")),
                        _ => Err(AppError::new(
                            ErrorCode::IoError,
                            format!("原子替换文件失败 (Win32错误码: {})", err),
                        )),
                    };
                }
            }
        }
    }

    #[cfg(not(windows))]
    {
        std::fs::rename(&tmp_path, target).map_err(|e| {
            let _ = std::fs::remove_file(&tmp_path);
            AppError::new(ErrorCode::IoError, format!("重命名文件失败: {}", e))
        })?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_atomic_write_new_and_overwrite() {
        let temp_dir = std::env::temp_dir().join(format!("envpilot_test_{}", std::process::id()));
        let _ = std::fs::create_dir_all(&temp_dir);
        let target_file = temp_dir.join("hosts.test");

        // 1. 首次写入全新文件
        let initial_data = b"127.0.0.1 localhost\n";
        let res1 = atomic_write_file(&target_file, initial_data, false);
        assert!(res1.is_ok());
        assert_eq!(std::fs::read(&target_file).unwrap(), initial_data);

        // 2. 二次覆盖原子写入
        let updated_data = b"127.0.0.1 localhost\n::1 ip6-localhost\n";
        let res2 = atomic_write_file(&target_file, updated_data, true);
        assert!(res2.is_ok());
        assert_eq!(std::fs::read(&target_file).unwrap(), updated_data);

        // 3. 验证临时文件已被正确清理
        let tmp_file = temp_dir.join("hosts.test.envpilot.tmp");
        assert!(!tmp_file.exists());

        let _ = std::fs::remove_dir_all(&temp_dir);
    }
}
