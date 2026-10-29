import React from "react";
import { EnvVar } from "../../../services/api";
import { EditingVarState } from "../types";

interface EnvVarCardProps {
  envVar: EnvVar;
  isExpanded: boolean;
  onToggleExpand: (name: string) => void;
  onOpenAddSubItem: (v: EnvVar) => void;
  onCleanDuplicates: (v: EnvVar) => void;
  onEditFullVar: (state: EditingVarState) => void;
  onMoveSubItem: (v: EnvVar, index: number, direction: "up" | "down") => void;
  onOpenEditSubItem: (v: EnvVar, index: number, currentVal: string) => void;
  onDeleteSubItem: (v: EnvVar, index: number) => void;
}

export const EnvVarCard: React.FC<EnvVarCardProps> = ({
  envVar: v,
  isExpanded: isExp,
  onToggleExpand,
  onOpenAddSubItem,
  onCleanDuplicates,
  onEditFullVar,
  onMoveSubItem,
  onOpenEditSubItem,
  onDeleteSubItem,
}) => {
  const hasError = v.issues.some((iss) => iss.severity === "Error");
  const hasWarning = v.issues.some((iss) => iss.severity === "Warning");

  return (
    <div
      className="env-var-card"
      style={{
        borderLeft: hasError
          ? "3px solid var(--color-danger)"
          : hasWarning
          ? "3px solid var(--color-warning)"
          : undefined,
      }}
    >
      <div
        className="env-var-header"
        onClick={() => onToggleExpand(v.name)}
      >
        <div className="env-var-left">
          <span
            className={`kind-icon ${
              v.kind === "ExpandSz"
                ? "kind-icon-exp"
                : v.kind === "Dynamic"
                ? "kind-icon-dyn"
                : "kind-icon-sz"
            }`}
            title={
              v.kind === "ExpandSz"
                ? "REG_EXPAND_SZ 可展开宏变量"
                : v.kind === "Dynamic"
                ? "只读动态变量"
                : "REG_SZ 普通字符串变量"
            }
          >
            {v.kind === "ExpandSz" ? "%" : v.kind === "Dynamic" ? "🔒" : "abc"}
          </span>

          <span
            style={{
              fontSize: "10px",
              color: "var(--text-muted)",
              width: "12px",
            }}
          >
            {isExp ? "▼" : "▶"}
          </span>

          <span className="env-name">{v.name}</span>
          <span className="env-equal">=</span>
          <span
            className="env-val"
            title={`原始值: ${v.raw_value}\n展开值: ${v.expanded_value}`}
          >
            {v.raw_value}
          </span>
        </div>

        <div
          style={{ display: "flex", alignItems: "center", gap: "6px" }}
          onClick={(e) => e.stopPropagation()}
        >
          {v.kind !== "Dynamic" && (
            <button
              className="fluent-btn fluent-btn-primary"
              style={{ padding: "2px 8px", fontSize: "11px" }}
              onClick={() => onOpenAddSubItem(v)}
              title={`向 ${v.name} 添加变量值`}
            >
              + 添加值
            </button>
          )}

          {v.is_multi && hasWarning && (
            <button
              className="fluent-btn"
              style={{ padding: "2px 6px", fontSize: "11px" }}
              onClick={() => onCleanDuplicates(v)}
              title="一键去除重复项及无效空项"
            >
              ⚡ 一键去重
            </button>
          )}

          {v.kind !== "Dynamic" && (
            <button
              className="fluent-btn"
              style={{ padding: "2px 6px", fontSize: "11px" }}
              onClick={() => {
                onEditFullVar({
                  isNew: false,
                  scope: v.scope,
                  name: v.name,
                  origName: v.name,
                  value: v.raw_value,
                  kind: v.kind,
                });
              }}
            >
              编辑完整变量
            </button>
          )}
        </div>
      </div>

      {isExp && (
        <div className="env-items-list">
          {v.items.map((it, idx) => (
            <div
              key={idx}
              className={`env-item-row ${
                !it.exists && !it.is_empty
                  ? "item-error"
                  : it.is_duplicate
                  ? "item-warning"
                  : ""
              }`}
              title={
                it.issues.map((i) => i.message).join("\n") || it.expanded
              }
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "11px",
                    width: "24px",
                  }}
                >
                  {idx + 1}.
                </span>
                <span style={{ wordBreak: "break-all" }}>{it.raw}</span>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  flexShrink: 0,
                }}
              >
                {it.issues.length > 0 && (
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 500,
                      marginRight: "4px",
                    }}
                  >
                    {it.issues[0].message}
                  </span>
                )}

                {v.kind !== "Dynamic" && (
                  <>
                    {idx > 0 && (
                      <button
                        className="fluent-btn"
                        style={{ padding: "2px 5px", fontSize: "10px" }}
                        onClick={() => onMoveSubItem(v, idx, "up")}
                        title="上移此项优先级"
                      >
                        ▲
                      </button>
                    )}
                    {idx < v.items.length - 1 && (
                      <button
                        className="fluent-btn"
                        style={{ padding: "2px 5px", fontSize: "10px" }}
                        onClick={() => onMoveSubItem(v, idx, "down")}
                        title="下移此项优先级"
                      >
                        ▼
                      </button>
                    )}
                    <button
                      className="fluent-btn"
                      style={{ padding: "2px 6px", fontSize: "11px" }}
                      onClick={() => onOpenEditSubItem(v, idx, it.raw)}
                      title="单独修改此项路径"
                    >
                      ✏️ 修改
                    </button>
                    <button
                      className="fluent-btn"
                      style={{
                        padding: "2px 6px",
                        fontSize: "11px",
                        color: "var(--color-danger)",
                      }}
                      onClick={() => onDeleteSubItem(v, idx)}
                      title="删除此项"
                    >
                      🗑️
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
