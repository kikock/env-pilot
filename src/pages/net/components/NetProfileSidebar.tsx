import React from "react";
import { AdapterInfo, NetProfile } from "../../../services/api";

interface NetProfileSidebarProps {
  profiles: NetProfile[];
  selectedProfileId: string;
  onSelectProfile: (id: string) => void;
  onOpenCreate: () => void;
  onOpenRename: (id: string, name: string) => void;
  onDeleteProfile: (id: string, name: string) => void;
  adapters: AdapterInfo[];
  matchedAdapter?: AdapterInfo;
}

export const NetProfileSidebar: React.FC<NetProfileSidebarProps> = ({
  profiles,
  selectedProfileId,
  onSelectProfile,
  onOpenCreate,
  onOpenRename,
  onDeleteProfile,
  adapters,
  matchedAdapter,
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
        <span style={{ fontWeight: 600, fontSize: "13px" }}>网络方案列表</span>
        <button
          className="fluent-btn fluent-btn-primary"
          style={{ padding: "3px 8px", fontSize: "11px" }}
          onClick={onOpenCreate}
        >
          + 新建方案
        </button>
      </div>

      {/* 方案纯名称列表 */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}
      >
        {profiles.map((p) => (
          <div
            key={p.id}
            className={`nav-item ${selectedProfileId === p.id ? "active" : ""}`}
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
              <span>🖧</span>
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
              <button
                className="fluent-btn"
                style={{
                  padding: "2px 5px",
                  fontSize: "11px",
                  border: "none",
                  background: "transparent",
                }}
                onClick={() => onOpenRename(p.id, p.name)}
                title="修改方案名称"
              >
                ✏️
              </button>
              {profiles.length > 1 && (
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
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 底部物理网卡快速信息 */}
      <div
        style={{
          borderTop: "1px solid var(--border-subtle)",
          paddingTop: "8px",
          fontSize: "11px",
          color: "var(--text-muted)",
        }}
      >
        <div>检测到 {adapters.length} 块网络适配器</div>
        {matchedAdapter && (
          <div style={{ color: "var(--color-success)", marginTop: "2px" }}>
            ● {matchedAdapter.name}: {matchedAdapter.ip || "未分配 IP"}
          </div>
        )}
      </div>
    </div>
  );
};
