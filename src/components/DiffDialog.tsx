import React from "react";
import { EnvChange } from "../services/api";
import { MultiItemDiffTree } from "./diff/MultiItemDiffTree";

interface DiffDialogProps {
  isOpen: boolean;
  title: string;
  changes: EnvChange[];
  warnings?: string[];
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

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
      <div
        className="modal-card"
        style={{ maxWidth: "880px", width: "92vw" }}
        onClick={(e) => e.stopPropagation()}
      >
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
