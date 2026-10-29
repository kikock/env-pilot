import React, { useState } from "react";
import { ValueKind } from "../../../services/api";
import { EditingVarState } from "../types";

interface EnvEditDrawerProps {
  editingVar: EditingVarState;
  onClose: () => void;
  onUpdateEditingVar: (updated: EditingVarState) => void;
  onSave: () => void;
}

export const EnvEditDrawer: React.FC<EnvEditDrawerProps> = ({
  editingVar,
  onClose,
  onUpdateEditingVar,
  onSave,
}) => {
  // 是否以多输入框形式编辑变量值（默认新增和具有多值时开启多输入框）
  const [useListMode, setUseListMode] = useState(true);
  const [itemValues, setItemValues] = useState<string[]>(() => {
    if (!editingVar.value) return [""];
    const splits = editingVar.value.split(";");
    return splits.length > 0 ? splits : [""];
  });

  const handleAddInput = () => {
    setItemValues((prev) => [...prev, ""]);
  };

  const handleRemoveInput = (idx: number) => {
    setItemValues((prev) => {
      const filtered = prev.filter((_, i) => i !== idx);
      const res = filtered.length > 0 ? filtered : [""];
      onUpdateEditingVar({ ...editingVar, value: res.join(";") });
      return res;
    });
  };

  const handleInputChange = (idx: number, text: string) => {
    setItemValues((prev) => {
      const copy = [...prev];
      copy[idx] = text;
      onUpdateEditingVar({ ...editingVar, value: copy.join(";") });
      return copy;
    });
  };

  const handleSwitchToListMode = () => {
    const splits = editingVar.value ? editingVar.value.split(";") : [""];
    setItemValues(splits.length > 0 ? splits : [""]);
    setUseListMode(true);
  };

  const handleSwitchToTextMode = () => {
    const joined = itemValues.join(";");
    onUpdateEditingVar({ ...editingVar, value: joined });
    setUseListMode(false);
  };

  const [error, setError] = useState<string | null>(null);

  const handleSaveCheck = () => {
    if (!editingVar.name.trim()) {
      setError("请输入环境变量名称");
      return;
    }
    if (useListMode) {
      const filtered = itemValues.map((v) => v.trim()).filter((v) => v.length > 0);
      if (filtered.length === 0) {
        setError("请至少添加并填写一项有效的变量值");
        return;
      }
      const finalVal = filtered.join(";");
      onUpdateEditingVar({ ...editingVar, value: finalVal });
    } else {
      if (!editingVar.value.trim()) {
        setError("变量值不能为空，请填写有效内容");
        return;
      }
    }
    setError(null);
    onSave();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        style={{
          maxWidth: "600px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <span>
            {editingVar.isNew ? "新增环境变量" : `编辑变量: ${editingVar.origName}`}
          </span>
          <button
            className="fluent-btn"
            style={{ border: "none", background: "transparent" }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div
          className="modal-body"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            overflowY: "auto",
            flex: 1,
          }}
        >
          {/* 作用域 */}
          <div>
            <label style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>
              作用域
            </label>
            <div style={{ display: "flex", gap: "12px" }}>
              <label style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="editScope"
                  checked={editingVar.scope === "System"}
                  onChange={() => onUpdateEditingVar({ ...editingVar, scope: "System" })}
                />
                系统变量 (System)
              </label>
              <label style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="editScope"
                  checked={editingVar.scope === "User"}
                  onChange={() => onUpdateEditingVar({ ...editingVar, scope: "User" })}
                />
                用户变量 (User)
              </label>
            </div>
          </div>

          {/* 变量名称 */}
          <div>
            <label style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>
              变量名称
            </label>
            <input
              className="fluent-input"
              value={editingVar.name}
              onChange={(e) => onUpdateEditingVar({ ...editingVar, name: e.target.value })}
              placeholder="如 JAVA_HOME, GOPATH, Path"
              disabled={!editingVar.isNew && editingVar.name.toUpperCase() === "PATH"}
            />
          </div>

          {/* 变量类型 */}
          <div>
            <label style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>
              变量类型
            </label>
            <select
              className="fluent-input"
              value={editingVar.kind}
              onChange={(e) => onUpdateEditingVar({ ...editingVar, kind: e.target.value as ValueKind })}
            >
              <option value="Sz">REG_SZ (普通字符串)</option>
              <option value="ExpandSz">REG_EXPAND_SZ (包含 %VAR% 展开宏)</option>
            </select>
          </div>

          {/* 变量值输入区 */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <label style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                变量值 {useListMode ? "(支持点击下方【+ 添加变量值】录入多个值)" : "(单文本长文本模式)"}
              </label>
              <button
                type="button"
                className="fluent-btn"
                style={{ fontSize: "11px", padding: "2px 8px" }}
                onClick={useListMode ? handleSwitchToTextMode : handleSwitchToListMode}
              >
                {useListMode ? "📝 切换为长文本" : "📑 切换为多输入框"}
              </button>
            </div>

            {useListMode ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {itemValues.map((val, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        fontSize: "12px",
                        color: "var(--text-muted)",
                        width: "22px",
                        textAlign: "right",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {idx + 1}.
                    </span>
                    <input
                      className="fluent-input"
                      style={{ fontFamily: "var(--font-mono)", flex: 1 }}
                      value={val}
                      onChange={(e) => handleInputChange(idx, e.target.value)}
                      placeholder="如 C:\Program Files\Java\jdk-21 或 %USERPROFILE%\bin"
                    />
                    {itemValues.length > 1 && (
                      <button
                        type="button"
                        className="fluent-btn"
                        style={{ padding: "4px 8px", color: "var(--color-danger)", fontSize: "12px" }}
                        onClick={() => handleRemoveInput(idx)}
                        title="删除该值输入框"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}

                <div>
                  <button
                    type="button"
                    className="fluent-btn"
                    style={{ fontSize: "12px", padding: "4px 12px" }}
                    onClick={handleAddInput}
                  >
                    <span>+</span> 添加变量值
                  </button>
                </div>
              </div>
            ) : (
              <textarea
                className="fluent-input"
                rows={5}
                style={{ resize: "vertical", fontFamily: "var(--font-mono)" }}
                value={editingVar.value}
                onChange={(e) => onUpdateEditingVar({ ...editingVar, value: e.target.value })}
                placeholder="如 C:\Program Files\Java\jdk-21;D:\tools\bin"
              />
            )}
          </div>

          {error && (
            <div
              style={{
                padding: "8px 12px",
                borderRadius: "4px",
                background: "var(--color-danger-bg)",
                color: "var(--color-danger)",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="fluent-btn" onClick={onClose}>
            取消
          </button>
          <button className="fluent-btn fluent-btn-primary" onClick={handleSaveCheck}>
            暂存保存
          </button>
        </div>
      </div>
    </div>
  );
};
