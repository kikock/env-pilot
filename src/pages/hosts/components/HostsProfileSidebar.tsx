import React from "react";
import { HostsProfile, SystemHostsInfo } from "../../../services/api";

interface HostsProfileSidebarProps {
  systemHosts: SystemHostsInfo | null;
  profiles: HostsProfile[];
  selectedId: string;
  onSelectProfile: (id: string) => void;
  onToggleProfile: (id: string) => void;
  onOpenCreate: () => void;
  onDeleteProfile: (id: string, name: string) => void;
}

export const HostsProfileSidebar: React.FC<HostsProfileSidebarProps> = ({
  systemHosts,
  profiles,
  selectedId,
  onSelectProfile,
  onToggleProfile,
  onOpenCreate,
  onDeleteProfile,
}) => {
  return (
    <div
      style={{
        width: "280px",
        background: "var(--bg-sidebar)",
        borderRight: "1px solid var(--border-subtle)",
        display: "flex",
        flexDirection: "column",
        padding: "12px",
        gap: "8px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "4px",
        }}
      >
        <span style={{ fontWeight: 600, fontSize: "13px" }}>Hosts 方案列表</span>
        <button
          className="fluent-btn fluent-btn-primary"
          style={{ padding: "3px 8px", fontSize: "11px" }}
          onClick={onOpenCreate}
        >
          + 新建方案
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}
      >
        {/* 系统当前 hosts (只读视图) */}
        <div
          className={`nav-item ${selectedId === "__system__" ? "active" : ""}`}
          onClick={() => onSelectProfile("__system__")}
          style={{ justifyContent: "space-between" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span>💻</span>
            <span>系统当前 Hosts</span>
          </div>
          <span className="badge badge-standard" style={{ fontSize: "10px" }}>
            只读
          </span>
        </div>

        <div
          style={{
            height: "1px",
            background: "var(--border-subtle)",
            margin: "4px 0",
          }}
        />

        {/* 用户自定义方案列表 */}
        {profiles.map((p) => (
          <div
            key={p.id}
            className={`nav-item ${selectedId === p.id ? "active" : ""}`}
            onClick={() => onSelectProfile(p.id)}
            style={{ justifyContent: "space-between", paddingRight: "6px" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                overflow: "hidden",
                flex: 1,
              }}
            >
              <span>📄</span>
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {p.name}
              </span>
            </div>

            <div
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={p.enabled}
                onChange={() => onToggleProfile(p.id)}
                title={p.enabled ? "已启用此方案" : "已停用此方案"}
                style={{ cursor: "pointer" }}
              />
              <button
                className="fluent-btn"
                style={{
                  padding: "2px 5px",
                  fontSize: "11px",
                  border: "none",
                  background: "transparent",
                  color: "var(--color-danger)",
                }}
                onClick={() => onDeleteProfile(p.id, p.name)}
                title="删除方案"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 底部信息栏 */}
      <div
        style={{
          borderTop: "1px solid var(--border-subtle)",
          paddingTop: "8px",
          fontSize: "11px",
          color: "var(--text-muted)",
        }}
      >
        <div>路径: {systemHosts?.path || "C:\\Windows\\...\\hosts"}</div>
        <div style={{ marginTop: "2px" }}>
          状态: {systemHosts?.is_readonly ? "🔒 驱动层只读保护" : "可直接写入"}
        </div>
      </div>
    </div>
  );
};
