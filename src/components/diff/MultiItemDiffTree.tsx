import React, { useState } from "react";
import { computeMultiItemTreeDiff } from "./diffUtils";

interface MultiItemDiffTreeProps {
  name: string;
  oldVal?: string | null;
  newVal?: string | null;
}

export const MultiItemDiffTree: React.FC<MultiItemDiffTreeProps> = ({
  name,
  oldVal,
  newVal,
}) => {
  const [showRaw, setShowRaw] = useState(false);
  const { rows, addedCount, removedCount } = computeMultiItemTreeDiff(
    oldVal,
    newVal
  );

  if (showRaw) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            className="fluent-btn"
            style={{ padding: "2px 6px", fontSize: "11px" }}
            onClick={() => setShowRaw(false)}
          >
            🌲 切换为树形结构对照
          </button>
        </div>
        {oldVal && (
          <div
            style={{
              textDecoration: "line-through",
              color: "var(--text-muted)",
              fontSize: "12px",
              wordBreak: "break-all",
            }}
          >
            {oldVal}
          </div>
        )}
        {newVal && (
          <div
            style={{
              color: "var(--text-main)",
              fontSize: "12px",
              wordBreak: "break-all",
              fontWeight: 500,
            }}
          >
            {newVal}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {/* 树形汇总头 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "12px",
          color: "var(--text-secondary)",
          background: "rgba(0, 0, 0, 0.15)",
          padding: "5px 8px",
          borderRadius: "var(--radius-sm)",
          fontFamily: "var(--font-mono)",
        }}
      >
        <span style={{ fontWeight: 600 }}>
          📁 {name} 树形项明细对照（共 {rows.length} 项记录）
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {addedCount > 0 && (
            <span style={{ color: "var(--color-success)", fontWeight: 600 }}>
              +{addedCount} 项新增
            </span>
          )}
          {removedCount > 0 && (
            <span style={{ color: "var(--color-danger)", fontWeight: 600 }}>
              -{removedCount} 项删除
            </span>
          )}
          <button
            className="fluent-btn"
            style={{ padding: "1px 6px", fontSize: "10px" }}
            onClick={() => setShowRaw(true)}
            title="查看纯分号单行字符串"
          >
            查看原始单行
          </button>
        </div>
      </div>

      {/* 树形列表分支 */}
      <div
        style={{
          maxHeight: "320px",
          overflowY: "auto",
          background: "rgba(0, 0, 0, 0.1)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-sm)",
          padding: "6px 8px",
          fontFamily: "var(--font-mono)",
          fontSize: "12px",
          display: "flex",
          flexDirection: "column",
          gap: "3px",
        }}
      >
        {rows.map((row, idx) => {
          const isLast = idx === rows.length - 1;
          const branchPrefix = isLast ? "└─" : "├─";

          if (row.type === "added") {
            return (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "var(--color-success-bg)",
                  color: "var(--color-success)",
                  padding: "3px 6px",
                  borderRadius: "3px",
                }}
              >
                <span style={{ color: "var(--text-muted)" }}>{branchPrefix}</span>
                <span
                  style={{
                    fontWeight: "bold",
                    fontSize: "11px",
                    padding: "1px 4px",
                    background: "var(--color-success)",
                    color: "#fff",
                    borderRadius: "2px",
                  }}
                >
                  + 新增 [{row.newIndex}]
                </span>
                <span style={{ wordBreak: "break-all", fontWeight: 600 }}>
                  {row.raw}
                </span>
              </div>
            );
          }

          if (row.type === "removed") {
            return (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "var(--color-danger-bg)",
                  color: "var(--color-danger)",
                  padding: "3px 6px",
                  borderRadius: "3px",
                  textDecoration: "line-through",
                  opacity: 0.85,
                }}
              >
                <span style={{ color: "var(--text-muted)" }}>{branchPrefix}</span>
                <span
                  style={{
                    fontWeight: "bold",
                    fontSize: "11px",
                    padding: "1px 4px",
                    background: "var(--color-danger)",
                    color: "#fff",
                    borderRadius: "2px",
                    textDecoration: "none",
                  }}
                >
                  - 移除 [{row.oldIndex}]
                </span>
                <span style={{ wordBreak: "break-all" }}>{row.raw}</span>
              </div>
            );
          }

          if (row.type === "moved") {
            return (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "var(--color-warning-bg)",
                  color: "var(--color-warning)",
                  padding: "3px 6px",
                  borderRadius: "3px",
                }}
              >
                <span style={{ color: "var(--text-muted)" }}>{branchPrefix}</span>
                <span
                  style={{
                    fontWeight: "bold",
                    fontSize: "11px",
                    padding: "1px 4px",
                    background: "var(--color-warning)",
                    color: "#fff",
                    borderRadius: "2px",
                  }}
                >
                  ↕ 顺序调整 [{row.oldIndex} → {row.newIndex}]
                </span>
                <span style={{ wordBreak: "break-all" }}>{row.raw}</span>
              </div>
            );
          }

          return (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "2px 6px",
                color: "var(--text-secondary)",
              }}
            >
              <span style={{ color: "var(--text-muted)" }}>{branchPrefix}</span>
              <span
                style={{
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  width: "28px",
                }}
              >
                [{row.newIndex}]
              </span>
              <span style={{ wordBreak: "break-all" }}>{row.raw}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
