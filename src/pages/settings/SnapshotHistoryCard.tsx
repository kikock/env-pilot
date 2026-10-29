import React from "react";
import { SnapshotMeta } from "../../services/api";

interface SnapshotHistoryCardProps {
  activeModule: "env" | "hosts" | "net";
  setActiveModule: (m: "env" | "hosts" | "net") => void;
  snapshots: SnapshotMeta[];
  loading: boolean;
  onRollback: (snap: SnapshotMeta) => void;
}

export const SnapshotHistoryCard: React.FC<SnapshotHistoryCardProps> = ({
  activeModule,
  setActiveModule,
  snapshots,
  loading,
  onRollback,
}) => {
  return (
    <div className="env-var-card" style={{ padding: "16px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
          borderBottom: "1px solid var(--border-subtle)",
          paddingBottom: "8px",
        }}
      >
        <span style={{ fontWeight: 600, fontSize: "14px" }}>
          📸 自动安全快照备份 (最近50份)
        </span>
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            className={`fluent-btn ${activeModule === "env" ? "fluent-btn-primary" : ""}`}
            onClick={() => setActiveModule("env")}
          >
            环境变量快照
          </button>
          <button
            className={`fluent-btn ${activeModule === "hosts" ? "fluent-btn-primary" : ""}`}
            onClick={() => setActiveModule("hosts")}
          >
            Hosts 文件快照
          </button>
          <button
            className={`fluent-btn ${activeModule === "net" ? "fluent-btn-primary" : ""}`}
            onClick={() => setActiveModule("net")}
          >
            网络配置快照
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)" }}>
          正在加载快照历史...
        </div>
      ) : snapshots.length === 0 ? (
        <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)" }}>
          当前模块暂无历史快照记录（系统将在首次应用更改时自动生成）
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {snapshots.map((snap) => (
            <div
              key={snap.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                background: "rgba(0, 0, 0, 0.15)",
                borderRadius: "var(--radius-sm)",
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <div>
                  <span style={{ color: "var(--text-muted)", marginRight: "12px" }}>
                    {snap.created_at}
                  </span>
                  <span style={{ fontWeight: 600 }}>{snap.summary}</span>
                </div>
                <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>
                  快照指纹: {snap.id}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  className="fluent-btn fluent-btn-primary"
                  style={{ fontSize: "11px", padding: "3px 10px" }}
                  onClick={() => onRollback(snap)}
                  title="一键将系统回滚恢复到此快照生成时的配置状态"
                >
                  ⏪ 恢复此快照
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
