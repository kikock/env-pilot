import React, { useState, useEffect } from "react";
import { api, SystemStatus } from "./services/api";
import { Header } from "./components/Header";
import { EnvPage } from "./pages/EnvPage";
import { HostsPage } from "./pages/HostsPage";
import { NetPage } from "./pages/NetPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ConfirmModal } from "./components/ConfirmModal";
import { applyThemeConfig, getThemeConfig, saveThemeConfig, ThemeConfig, ThemeMode } from "./services/theme";
import { CloseActionModal } from "./components/CloseActionModal";
import "./styles/fluent.css";

export default function App() {
  const [activePage, setActivePage] = useState<"env" | "hosts" | "net" | "settings">("env");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [globalNotice, setGlobalNotice] = useState<{
    title: string;
    message: string;
    subMessage?: string;
    type?: "info" | "warning" | "danger";
  } | null>(null);

  useEffect(() => {
    // 初始化应用已持久化的现代主题
    const cfg = getThemeConfig();
    applyThemeConfig(cfg);
    setTheme(cfg.mode === "light" ? "light" : "dark");

    // 读取系统与权限状态
    api.getSystemStatus().then(setStatus).catch(console.error);

    // 检查是否有 --resume 参数
    const params = new URLSearchParams(window.location.search);
    const resume = params.get("resume");
    if (resume === "hosts" || resume === "net" || resume === "settings") {
      setActivePage(resume);
    }

    // 监听来自系统托盘等通道的直达页面导航
    const unlistenNavigate = api.onNavigate((page) => {
      setActivePage(page);
    });

    // 监听窗口关闭按钮请求事件
    const unlistenClose = api.onCloseRequested(() => {
      const action = api.getCloseAction();
      if (action === "tray") {
        api.hideToTray();
      } else if (action === "quit") {
        api.exitApp();
      } else {
        setIsCloseModalOpen(true);
      }
    });

    return () => {
      unlistenNavigate();
      unlistenClose();
    };
  }, []);

  const toggleTheme = () => {
    const cfg = getThemeConfig();
    const nextMode: ThemeMode = cfg.mode === "light" ? "dark" : "light";
    const nextCfg: ThemeConfig = { ...cfg, mode: nextMode };
    saveThemeConfig(nextCfg);
    setTheme(nextMode);
  };

  const handleRelaunchAdmin = async () => {
    try {
      await api.relaunchAsAdmin(activePage);
    } catch (e: any) {
      setGlobalNotice({
        title: "提权运行提示",
        message: e?.message || String(e),
        subMessage: "以管理员权限运行时，可无缝修改系统级环境变量与只读网络适配器。",
        type: "info",
      });
    }
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* 顶部标题栏与提权状态徽章 */}
      <Header
        status={status}
        theme={theme}
        onToggleTheme={toggleTheme}
        onRelaunchAdmin={handleRelaunchAdmin}
      />

      {/* 主界面布局 */}
      <div className="app-container">
        {/* 左侧功能导航 */}
        <nav className="app-nav">
          <div
            className={`nav-item ${activePage === "env" ? "active" : ""}`}
            onClick={() => setActivePage("env")}
            title="查看并配置系统与用户环境变量（已优化标签页长路径宽幅展示）"
          >
            <span className="nav-icon" style={{ display: "inline-flex", alignItems: "center" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="21" x2="4" y2="14" />
                <line x1="4" y1="10" x2="4" y2="3" />
                <line x1="12" y1="21" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12" y2="3" />
                <line x1="20" y1="21" x2="20" y2="16" />
                <line x1="20" y1="12" x2="20" y2="3" />
                <line x1="1" y1="14" x2="7" y2="14" />
                <line x1="9" y1="8" x2="15" y2="8" />
                <line x1="17" y1="16" x2="23" y2="16" />
              </svg>
            </span>
            <span>环境变量</span>
          </div>

          <div
            className={`nav-item ${activePage === "hosts" ? "active" : ""}`}
            onClick={() => setActivePage("hosts")}
            title="管理多套 Hosts 方案并一键切换生效"
          >
            <span className="nav-icon" style={{ display: "inline-flex", alignItems: "center" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </span>
            <span>Hosts 方案</span>
          </div>

          <div
            className={`nav-item ${activePage === "net" ? "active" : ""}`}
            onClick={() => setActivePage("net")}
            title="管理并快速切换本机各网卡 IP、网关、DNS 与系统代理"
          >
            <span className="nav-icon" style={{ display: "inline-flex", alignItems: "center" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.55a11 11 0 0 1 14.08 0" />
                <path d="M1.42 9a16 16 0 0 1 21.16 0" />
                <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                <line x1="12" y1="20" x2="12.01" y2="20" strokeWidth="2.5" />
              </svg>
            </span>
            <span>本机网络</span>
          </div>

          <div className="nav-spacer" />

          <div
            className={`nav-item ${activePage === "settings" ? "active" : ""}`}
            onClick={() => setActivePage("settings")}
            title="安全快照库与系统偏好设置"
          >
            <span className="nav-icon" style={{ display: "inline-flex", alignItems: "center" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </span>
            <span>设置</span>
          </div>

          {/* 设置项下方：开发者与仓库链接跳转 */}
          <div className="nav-footer">
            <button
              className="nav-link-btn"
              onClick={() => api.openBrowser("https://github.com/kikock")}
              title="访问开发人员 kikock 主页 (https://github.com/kikock)"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>kikock</span>
            </button>
            <button
              className="nav-link-btn"
              onClick={() => api.openBrowser("https://github.com/kikock/env-pilot")}
              title="访问 GitHub 源码仓库 (https://github.com/kikock/env-pilot)"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <span>仓库 ↗</span>
            </button>
          </div>
        </nav>

        {/* 右侧页面展示区 */}
        <main className="app-main">
          {activePage === "env" && <EnvPage />}
          {activePage === "hosts" && <HostsPage />}
          {activePage === "net" && <NetPage />}
          {activePage === "settings" && <SettingsPage />}
        </main>
      </div>

      {/* 全局美化弹窗 */}
      {globalNotice && (
        <ConfirmModal
          isOpen={true}
          title={globalNotice.title}
          message={globalNotice.message}
          subMessage={globalNotice.subMessage}
          type={globalNotice.type || "info"}
          confirmText="知道了"
          cancelText=""
          onConfirm={() => setGlobalNotice(null)}
          onCancel={() => setGlobalNotice(null)}
        />
      )}

      {/* 关闭窗口提示模态框 */}
      <CloseActionModal
        isOpen={isCloseModalOpen}
        onCancel={() => setIsCloseModalOpen(false)}
        onHideToTray={(remember) => {
          setIsCloseModalOpen(false);
          if (remember) api.setCloseAction("tray");
          api.hideToTray();
        }}
        onExitApp={(remember) => {
          setIsCloseModalOpen(false);
          if (remember) api.setCloseAction("quit");
          api.exitApp();
        }}
      />
    </div>
  );
}
