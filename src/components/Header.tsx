import React from "react";
import { api, SystemStatus } from "../services/api";

interface HeaderProps {
  status: SystemStatus | null;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  onRelaunchAdmin: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  theme,
  onToggleTheme,
  onRelaunchAdmin,
}) => {
  return (
    <div className="app-titlebar">
      <div className="titlebar-left">
        <div className="app-brand">
          <span style={{ fontSize: "16px" }}>🧭</span>
          <span>EnvPilot</span>
          <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "normal" }}>
            系统环境配置中心
          </span>
        </div>

        {status && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "12px" }}>
            {status.is_admin ? (
              <span className="badge badge-admin">
                <span>🛡</span> 管理员权限
              </span>
            ) : (
              <>
                <span className="badge badge-standard">
                  <span>⚠</span> 标准权限
                </span>
                <button
                  className="relaunch-btn"
                  onClick={onRelaunchAdmin}
                  title="以管理员身份重启本程序，以获取系统变量、Hosts及网络适配器写权限"
                >
                  <span>⚡</span> 以管理员身份重启
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="titlebar-actions">
        <button
          className="fluent-btn"
          style={{ padding: "4px 8px", fontSize: "12px" }}
          onClick={() => api.hideToTray()}
          title="缩小至系统托盘常驻（不在任务栏占位）"
        >
          📥 缩小至托盘
        </button>
        <button
          className="fluent-btn"
          style={{ padding: "4px 8px", fontSize: "12px" }}
          onClick={onToggleTheme}
          title="切换深色/浅色主题"
        >
          {theme === "dark" ? "☀ 浅色模式" : "🌙 深色模式"}
        </button>
      </div>
    </div>
  );
};
