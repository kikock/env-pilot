import React, { useState } from "react";
import { EnvChange } from "../services/api";

interface DiffDialogProps {
  isOpen: boolean;
  title: string;
  changes: EnvChange[];
  warnings?: string[];
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

interface TreeDiffRow {
  type: "added" | "removed" | "unchanged" | "moved";
  raw: string;
  oldIndex?: number;
  newIndex?: number;
}

// 计算多项变量 (如 Path) 的单项差分树
function computeMultiItemTreeDiff(oldVal?: string | null, newVal?: string | null): {
  rows: TreeDiffRow[];
  addedCount: number;
  removedCount: number;
  unchangedCount: number;
} {
  const splitItems = (v?: string | null) =>
    (v || "")
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

  const oldItems = splitItems(oldVal);
  const newItems = splitItems(newVal);

  const oldNorm = oldItems.map((it) => it.toLowerCase().replace(/[\/\\]+$/, ""));
  const newNorm = newItems.map((it) => it.toLowerCase().replace(/[\/\\]+$/, ""));

  const rows: TreeDiffRow[] = [];
  let addedCount = 0;
  let removedCount = 0;
  let unchangedCount = 0;

  // 1. 查找被删除的项 (在 oldItems 中但不在 newItems 中)
  oldItems.forEach((oldIt, oIdx) => {
    const norm = oldNorm[oIdx];
    if (!newNorm.includes(norm)) {
      rows.push({
        type: "removed",
        raw: oldIt,
        oldIndex: oIdx + 1,
      });
      removedCount++;
    }
  });

  // 2. 遍历新项，标定新增、移动或未改变
  newItems.forEach((newIt, nIdx) => {
    const norm = newNorm[nIdx];
    const origOldIdx = oldNorm.indexOf(norm);

    if (origOldIdx === -1) {
      // 全新增加的项
      rows.push({
        type: "added",
        raw: newIt,
        newIndex: nIdx + 1,
      });
      addedCount++;
    } else if (origOldIdx !== nIdx) {
      // 存在但位置顺序发生移动
      rows.push({
        type: "moved",
        raw: newIt,
        oldIndex: origOldIdx + 1,
        newIndex: nIdx + 1,
      });
      unchangedCount++;
    } else {
      // 完全相同未变动
      rows.push({
        type: "unchanged",
        raw: newIt,
        oldIndex: origOldIdx + 1,
        newIndex: nIdx + 1,
      });
      unchangedCount++;
    }
  });

  return { rows, addedCount, removedCount, unchangedCount };
}

// 树形多项环境变量对照展示组件
const MultiItemDiffTree: React.FC<{
  name: string;
  oldVal?: string | null;
  newVal?: string | null;
}> = ({ name, oldVal, newVal }) => {
  const [showRaw, setShowRaw] = useState(false);
  const { rows, addedCount, removedCount } = computeMultiItemTreeDiff(oldVal, newVal);

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
          <div style={{ textDecoration: "line-through", color: "var(--text-muted)", fontSize: "12px", wordBreak: "break-all" }}>
            {oldVal}
          </div>
        )}
        {newVal && (
          <div style={{ color: "var(--text-main)", fontSize: "12px", wordBreak: "break-all", fontWeight: 500 }}>
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
                <span style={{ fontWeight: "bold", fontSize: "11px", padding: "1px 4px", background: "var(--color-success)", color: "#fff", borderRadius: "2px" }}>
                  + 新增 [{row.newIndex}]
                </span>
                <span style={{ wordBreak: "break-all", fontWeight: 600 }}>{row.raw}</span>
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
                <span style={{ fontWeight: "bold", fontSize: "11px", padding: "1px 4px", background: "var(--color-danger)", color: "#fff", borderRadius: "2px", textDecoration: "none" }}>
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
                <span style={{ fontSize: "11px", padding: "1px 4px", background: "rgba(255,170,68,0.25)", borderRadius: "2px" }}>
                  ↕ 顺序调整: {row.oldIndex} → {row.newIndex}
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
              <span style={{ color: "var(--text-muted)", width: "24px", fontSize: "11px" }}>
                {row.newIndex}.
              </span>
              <span style={{ wordBreak: "break-all" }}>{row.raw}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const DiffDialog: React.FC<DiffDialogProps> = ({
  isOpen,
  title,
  changes,
  warnings = [],
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  const isMultiValueVar = (name: string, oldV?: string | null, newV?: string | null) => {
    const upper = name.toUpperCase();
    if (["PATH", "PATHEXT", "PSMODULEPATH", "CLASSPATH", "INCLUDE", "LIB"].includes(upper)) {
      return true;
    }
    return Boolean((oldV && oldV.includes(";")) || (newV && newV.includes(";")));
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-card" style={{ maxWidth: "880px", width: "92vw" }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>{title}</span>
          <button
            className="fluent-btn"
            style={{ border: "none", background: "transparent", fontSize: "16px" }}
            onClick={onCancel}
          >
            ✕
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: "72vh", overflowY: "auto" }}>
          <p style={{ color: "var(--text-secondary)", marginBottom: "12px", fontSize: "13px" }}>
            系统在写入前将自动为您创建安全快照。请审阅即将生效的变更明细（多项变量已自动展开为树形对照）：
          </p>

          <table className="diff-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th style={{ width: "12%" }}>作用域</th>
                <th style={{ width: "16%" }}>变量名称</th>
                <th style={{ width: "72%" }}>变更详情 (树形结构对照)</th>
              </tr>
            </thead>
            <tbody>
              {changes.map((c, i) => {
                let badgeClass = "diff-modified";
                let text = "修改";
                if (!c.old_value && c.new_value) {
                  badgeClass = "diff-added";
                  text = "新增";
                } else if (c.old_value && !c.new_value) {
                  badgeClass = "diff-deleted";
                  text = "删除";
                }

                const multi = isMultiValueVar(c.name, c.old_value, c.new_value);

                return (
                  <tr key={i}>
                    <td>
                      <span className="badge badge-standard" style={{ fontSize: "11px" }}>
                        {c.scope === "System" ? "系统变量" : "用户变量"}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, fontSize: "13px", verticalAlign: "top" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <span>{c.name}</span>
                        <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "normal" }}>
                          类型: {c.kind === "ExpandSz" ? "REG_EXPAND_SZ" : "REG_SZ"}
                        </span>
                      </div>
                    </td>
                    <td style={{ verticalAlign: "top" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            padding: "1px 6px",
                            borderRadius: "4px",
                          }}
                          className={badgeClass}
                        >
                          {text}
                        </span>
                        {multi && (
                          <span style={{ fontSize: "11px", color: "var(--color-info)" }}>
                            • 多项分号列表
                          </span>
                        )}
                      </div>

                      {/* 多项变量树形结构对照，单项普通展示 */}
                      {multi ? (
                        <MultiItemDiffTree name={c.name} oldVal={c.old_value} newVal={c.new_value} />
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          {c.old_value && (
                            <div style={{ textDecoration: "line-through", color: "var(--text-muted)", fontSize: "12px", wordBreak: "break-all" }}>
                              {c.old_value}
                            </div>
                          )}
                          {c.new_value && (
                            <div style={{ color: "var(--text-main)", fontSize: "12px", wordBreak: "break-all", fontWeight: 500 }}>
                              {c.new_value}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {warnings.length > 0 && (
            <div
              style={{
                marginTop: "16px",
                padding: "10px",
                background: "var(--color-warning-bg)",
                border: "1px solid rgba(255, 170, 68, 0.3)",
                borderRadius: "var(--radius-sm)",
                color: "var(--color-warning)",
                fontSize: "12px",
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: "4px" }}>⚠ 注意事项：</div>
              {warnings.map((w, idx) => (
                <div key={idx}>• {w}</div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="fluent-btn" onClick={onCancel} disabled={isLoading}>
            放弃修改
          </button>
          <button
            className="fluent-btn fluent-btn-primary"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? "正在写入系统..." : "✔ 确认并应用到系统"}
          </button>
        </div>
      </div>
    </div>
  );
};
