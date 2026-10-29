use crate::common::error::{AppError, AppResult, ErrorCode};
use std::ffi::OsStr;
use std::os::windows::ffi::OsStrExt;
use std::path::PathBuf;

/// 检查当前进程是否具备 Windows 管理员权限 (Elevated Token)
pub fn is_admin() -> bool {
    #[cfg(windows)]
    unsafe {
        use windows_sys::Win32::Foundation::{CloseHandle, HANDLE};
        use windows_sys::Win32::Security::{
            GetTokenInformation, TokenElevation, TOKEN_ELEVATION, TOKEN_QUERY,
        };
        use windows_sys::Win32::System::Threading::{GetCurrentProcess, OpenProcessToken};

        let mut token: HANDLE = std::ptr::null_mut();
        if OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token) == 0 {
            return false;
        }

        let mut elevation = TOKEN_ELEVATION { TokenIsElevated: 0 };
        let mut ret_len = 0u32;
        let success = GetTokenInformation(
            token,
            TokenElevation,
            &mut elevation as *mut _ as *mut _,
            std::mem::size_of::<TOKEN_ELEVATION>() as u32,
            &mut ret_len,
        );
        CloseHandle(token);

        success != 0 && elevation.TokenIsElevated != 0
    }

    #[cfg(not(windows))]
    {
        true
    }
}

/// 以管理员权限重启自身 (通过 ShellExecuteW runas)
/// - page: 重启后恢复导航的页面路由 (例如 "env", "hosts", "net")
/// - pending_json: 用户尚未保存但暂存的修改，写入 pending.json 由新进程自动加载
pub fn relaunch_as_admin(page: Option<&str>, pending_json: Option<&str>) -> AppResult<()> {
    #[cfg(windows)]
    {
        use windows_sys::Win32::UI::Shell::ShellExecuteW;
        use windows_sys::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;

        // 如果有暂存内容，保存到应用数据目录
        if let Some(pending) = pending_json {
            let app_data = dirs::data_dir()
                .unwrap_or_else(|| PathBuf::from("."))
                .join("EnvPilot");
            std::fs::create_dir_all(&app_data).ok();
            let pending_path = app_data.join("pending.json");
            std::fs::write(pending_path, pending).map_err(|e| {
                AppError::new(ErrorCode::IoError, format!("暂存修改失败: {}", e))
            })?;
        }

        let current_exe = std::env::current_exe().map_err(|e| {
            AppError::new(ErrorCode::InternalError, format!("获取自身路径失败: {}", e))
        })?;

        let page_arg = page.unwrap_or("env");
        let params = format!("--resume={}", page_arg);

        let op_wide: Vec<u16> = OsStr::new("runas").encode_wide().chain(Some(0)).collect();
        let exe_wide: Vec<u16> = current_exe.as_os_str().encode_wide().chain(Some(0)).collect();
        let params_wide: Vec<u16> = OsStr::new(&params).encode_wide().chain(Some(0)).collect();

        unsafe {
            let res = ShellExecuteW(
                std::ptr::null_mut(),
                op_wide.as_ptr(),
                exe_wide.as_ptr(),
                params_wide.as_ptr(),
                std::ptr::null(),
                SW_SHOWNORMAL as i32,
            );

            let res_int = res as isize;
            if res_int > 32 {
                // 成功唤起提权新进程，退出当前普通权限实例
                std::process::exit(0);
            } else if res_int == 5 || res_int == 1223 {
                // 1223 (ERROR_CANCELLED): 用户在 UAC 弹窗中点击了“否”取消
                return Err(AppError::new(
                    ErrorCode::PermissionDenied,
                    "已取消提权请求（UAC 弹窗被拒绝）",
                )
                .with_hint("操作需要管理员权限才能写入系统配置，您可继续以只读方式浏览"));
            } else {
                return Err(AppError::new(
                    ErrorCode::InternalError,
                    format!("提权重启失败，错误码: {}", res_int),
                ));
            }
        }
    }

    #[cfg(not(windows))]
    Ok(())
}
