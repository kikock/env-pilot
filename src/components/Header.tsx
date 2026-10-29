import React from "react";
import { SystemStatus } from "../services/api";

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

      <div className="titlebar-actions" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <button
          className="fluent-icon-btn"
          onClick={onToggleTheme}
          title={theme === "dark" ? "切换至浅色模式" : "切换至深色模式"}
          aria-label="切换主题"
          style={{ width: "32px", height: "32px" }}
        >
          {theme === "dark" ? (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: "#ffb900" }}
            >
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: "#0078d4" }}
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};

