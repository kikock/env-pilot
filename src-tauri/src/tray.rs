use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    App, AppHandle, Emitter, Manager, WebviewWindow,
};

/// 唤起并聚焦主窗口
fn show_and_focus_main_window(app: &AppHandle) -> Option<WebviewWindow> {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.show();
        let _ = win.unminimize();
        let _ = win.set_focus();
        Some(win)
    } else {
        None
    }
}

/// 处理直达页面路由跳转
fn navigate_to_page(app: &AppHandle, page: &str) {
    if let Some(win) = show_and_focus_main_window(app) {
        let _ = win.emit("navigate", page);
    }
}

/// 构建并注册系统托盘
pub fn setup_tray(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {
    let open_item = MenuItem::with_id(app, "open", "显示主窗口", true, None::<&str>)?;
    let sep1 = PredefinedMenuItem::separator(app)?;
    let env_item = MenuItem::with_id(app, "nav_env", "环境变量", true, None::<&str>)?;
    let hosts_item = MenuItem::with_id(app, "nav_hosts", "Hosts 方案", true, None::<&str>)?;
    let net_item = MenuItem::with_id(app, "nav_net", "本机网络", true, None::<&str>)?;
    let sep2 = PredefinedMenuItem::separator(app)?;
    let hide_item = MenuItem::with_id(app, "hide", "最小化到托盘", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "退出应用", true, None::<&str>)?;

    let menu = Menu::with_items(
        app,
        &[
            &open_item,
            &sep1,
            &env_item,
            &hosts_item,
            &net_item,
            &sep2,
            &hide_item,
            &quit_item,
        ],
    )?;

    // 优先使用默认窗口图标，未获取到时使用应用资源图标兜底
    let icon = app.default_window_icon().cloned().or_else(|| {
        tauri::image::Image::from_app_icon_resource(32).ok()
    });

    let mut builder = TrayIconBuilder::new()
        .tooltip("EnvPilot - Windows 环境配置中心")
        .menu(&menu)
        .show_menu_on_left_click(false);

    if let Some(i) = icon {
        builder = builder.icon(i);
    }

    let _tray = builder
        .on_menu_event(|app, event| match event.id.as_ref() {
            "open" => {
                show_and_focus_main_window(app);
            }
            "nav_env" => {
                navigate_to_page(app, "env");
            }
            "nav_hosts" => {
                navigate_to_page(app, "hosts");
            }
            "nav_net" => {
                navigate_to_page(app, "net");
            }
            "hide" => {
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.hide();
                }
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(win) = app.get_webview_window("main") {
                    if let Ok(is_visible) = win.is_visible() {
                        if is_visible {
                            let _ = win.hide();
                        } else {
                            let _ = win.show();
                            let _ = win.unminimize();
                            let _ = win.set_focus();
                        }
                    }
                }
            }
        })
        .build(app)?;

    Ok(())
}
