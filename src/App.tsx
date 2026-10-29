import React, { useState, useEffect } from "react";
import { api, SystemStatus } from "./services/api";
import { Header } from "./components/Header";
import { EnvPage } from "./pages/EnvPage";
import { HostsPage } from "./pages/HostsPage";
import { NetPage } from "./pages/NetPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ConfirmModal } from "./components/ConfirmModal";
import { applyThemeConfig, getThemeConfig, saveThemeConfig, ThemeConfig, ThemeMode } from "./services/theme";
import "./styles/fluent.css";

export default function App() {
  const [activePage, setActivePage] = useState<"env" | "hosts" | "net" | "settings">("env");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [status, setStatus] = useState<SystemStatus | null>(null);
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
            <span className="nav-icon" style={{ fontSize: "16px" }}>🧩</span>
            <span>环境变量</span>
          </div>

          <div
            className={`nav-item ${activePage === "hosts" ? "active" : ""}`}
            onClick={() => setActivePage("hosts")}
            title="管理多套 Hosts 方案并一键切换生效"
          >
            <span className="nav-icon" style={{ fontSize: "16px" }}>🌐</span>
            <span>Hosts 方案</span>
          </div>

          <div
            className={`nav-item ${activePage === "net" ? "active" : ""}`}
            onClick={() => setActivePage("net")}
            title="管理并快速切换本机各网卡 IP、网关、DNS 与系统代理"
          >
            <span className="nav-icon" style={{ fontSize: "16px" }}>📶</span>
            <span>本机网络</span>
          </div>

          <div className="nav-spacer" />

          <div
            className={`nav-item ${activePage === "settings" ? "active" : ""}`}
            onClick={() => setActivePage("settings")}
            title="安全快照库与系统设置"
          >
            <span className="nav-icon" style={{ fontSize: "16px" }}>⚙</span>
            <span>设置与快照</span>
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
    </div>
  );
}
