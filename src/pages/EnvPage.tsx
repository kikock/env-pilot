import React, { useState, useEffect, useMemo } from "react";
import {
  api,
  EnvChange,
  EnvScope,
  EnvState,
  EnvVar,
  ValueKind,
} from "../services/api";
import { DiffDialog } from "../components/DiffDialog";
import { ConfirmModal } from "../components/ConfirmModal";

export const EnvPage: React.FC = () => {
  const [envState, setEnvState] = useState<EnvState | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeScope, setActiveScope] = useState<EnvScope>("System");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterInvalidOnly, setFilterInvalidOnly] = useState(false);
  const [showDynamic, setShowDynamic] = useState(false);
  const [expandedVars, setExpandedVars] = useState<Record<string, boolean>>({
    Path: true,
  });

  // 通用美化确认与消息提示弹窗
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    subMessage?: string;
    type?: "danger" | "warning" | "info";
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  } | null>(null);

  // 编辑抽屉状态
  const [editingVar, setEditingVar] = useState<{
    isNew: boolean;
    scope: EnvScope;
    name: string;
    origName?: string;
    value: string;
    kind: ValueKind;
  } | null>(null);

  // 单项子路径编辑/新增弹窗（针对 Path 等多值变量）
  const [subItemModal, setSubItemModal] = useState<{
    varName: string;
    scope: EnvScope;
    isNew: boolean;
    index: number;
    value: string;
  } | null>(null);

  // 待提交的应用变更列表
  const [pendingChanges, setPendingChanges] = useState<EnvChange[]>([]);
  const [isDiffOpen, setIsDiffOpen] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "ok" | "err" } | null>(
    null
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const state = await api.getEnvState();
      setEnvState(state);
      setPendingChanges([]);
    } catch (e: any) {
      setMessage({ text: `加载环境变量失败: ${e?.message || e}`, type: "err" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const currentList = useMemo(() => {
    if (!envState) return [];
    const list = activeScope === "System" ? envState.system : envState.user;

    return list.filter((v) => {
      if (!showDynamic && v.kind === "Dynamic") return false;

      if (filterInvalidOnly) {
        const hasInvalidItem = v.items.some((it) => !it.exists && !it.is_empty);
        const hasErrorIssue = v.issues.some((iss) => iss.severity === "Error");
        if (!hasInvalidItem && !hasErrorIssue) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = v.name.toLowerCase().includes(q);
        const matchVal = v.raw_value.toLowerCase().includes(q);
        const matchItem = v.items.some((it) => it.raw.toLowerCase().includes(q));
        return matchName || matchVal || matchItem;
      }

      return true;
    });
  }, [envState, activeScope, showDynamic, filterInvalidOnly, searchQuery]);

  const toggleExpand = (name: string) => {
    setExpandedVars((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  // 保存新建/编辑
  const handleSaveEdit = () => {
    if (!editingVar || !editingVar.name.trim()) return;

    const change: EnvChange = {
      scope: editingVar.scope,
      name: editingVar.name.trim(),
      old_value: editingVar.isNew ? null : editingVar.value,
      new_value: editingVar.value,
      kind: editingVar.kind,
    };

    setPendingChanges((prev) => {
      const filtered = prev.filter(
        (c) => !(c.scope === change.scope && c.name.toLowerCase() === change.name.toLowerCase())
      );
      return [...filtered, change];
    });

    // 乐观更新本地显示
    if (envState) {
      const targetScopeKey = editingVar.scope === "System" ? "system" : "user";
      const updatedList = [...envState[targetScopeKey]];
      const existingIdx = updatedList.findIndex(
        (v) => v.name.toLowerCase() === editingVar.name.toLowerCase()
      );

      if (existingIdx >= 0) {
        updatedList[existingIdx] = {
          ...updatedList[existingIdx],
          raw_value: editingVar.value,
          kind: editingVar.kind,
        };
      } else {
        updatedList.unshift({
          name: editingVar.name,
          raw_value: editingVar.value,
          expanded_value: editingVar.value,
          kind: editingVar.kind,
          scope: editingVar.scope,
          is_multi: editingVar.name.toUpperCase() === "PATH",
          items: [],
          issues: [],
          is_protected: false,
        });
      }

      setEnvState({
        ...envState,
        [targetScopeKey]: updatedList,
      });
    }

    setEditingVar(null);
  };

  // 一键去重与清理 Path 重复项
  const handleCleanDuplicates = (v: EnvVar) => {
    if (!v.is_multi) return;
    const seen = new Set<string>();
    const cleanedItems: string[] = [];

    v.raw_value.split(";").forEach((seg) => {
      const trimmed = seg.trim();
      if (!trimmed) return;
      const norm = trimmed.toLowerCase().replace(/[\/\\]+$/, "");
      if (!seen.has(norm)) {
        seen.add(norm);
        cleanedItems.push(trimmed);
      }
    });

    const newVal = cleanedItems.join(";");
    if (newVal === v.raw_value) {
      setConfirmDialog({
        isOpen: true,
        type: "info",
        title: "提示",
        message: "当前变量没有重复或无效空项",
        subMessage: `${v.name} 中的所有路径项均保持独立且规范。`,
        confirmText: "知道了",
        onConfirm: () => setConfirmDialog(null),
      });
      return;
    }

    const change: EnvChange = {
      scope: v.scope,
      name: v.name,
      old_value: v.raw_value,
      new_value: newVal,
      kind: v.kind,
    };

    setPendingChanges((prev) => [...prev, change]);

    if (envState) {
      const targetScopeKey = v.scope === "System" ? "system" : "user";
      const list = [...envState[targetScopeKey]];
      const idx = list.findIndex((item) => item.name === v.name);
      if (idx >= 0) {
        list[idx] = { ...list[idx], raw_value: newVal };
        setEnvState({ ...envState, [targetScopeKey]: list });
      }
    }
  };

  // 打开单独添加一项弹窗
  const handleOpenAddSubItem = (v: EnvVar) => {
    setSubItemModal({
      varName: v.name,
      scope: v.scope,
      isNew: true,
      index: v.items.length,
      value: "",
    });
  };

  // 打开单独修改一项弹窗
  const handleOpenEditSubItem = (v: EnvVar, index: number, currentVal: string) => {
    setSubItemModal({
      varName: v.name,
      scope: v.scope,
      isNew: false,
      index,
      value: currentVal,
    });
  };

  // 保存单独添加/修改的单项路径
  const handleSaveSubItem = () => {
    if (!subItemModal || !subItemModal.value.trim() || !envState) return;
    const targetScopeKey = subItemModal.scope === "System" ? "system" : "user";
    const targetVar = envState[targetScopeKey].find((v) => v.name === subItemModal.varName);
    if (!targetVar) return;

    const newRawItems = targetVar.items.map((it) => it.raw);
    if (subItemModal.isNew) {
      newRawItems.push(subItemModal.value.trim());
    } else {
      newRawItems[subItemModal.index] = subItemModal.value.trim();
    }

    const newJoinedValue = newRawItems.join(";");

    const change: EnvChange = {
      scope: targetVar.scope,
      name: targetVar.name,
      old_value: targetVar.raw_value,
      new_value: newJoinedValue,
      kind: targetVar.kind,
    };

    setPendingChanges((prev) => {
      const filtered = prev.filter(
        (c) => !(c.scope === change.scope && c.name.toLowerCase() === change.name.toLowerCase())
      );
      return [...filtered, change];
    });

    // 乐观更新本地 state 显示
    const updatedVar: EnvVar = {
      ...targetVar,
      raw_value: newJoinedValue,
      expanded_value: newJoinedValue,
      items: newRawItems.map((r) => ({
        raw: r,
        expanded: r,
        exists: true,
        is_empty: r.trim().length === 0,
        is_duplicate: false,
        issues: [],
      })),
    };

    const updatedList = envState[targetScopeKey].map((item) =>
      item.name === targetVar.name ? updatedVar : item
    );

    setEnvState({
      ...envState,
      [targetScopeKey]: updatedList,
    });

    setSubItemModal(null);
    setMessage({
      text: `${subItemModal.isNew ? "已添加新项" : "已修改该项"} 到 ${targetVar.name}，请点击右上角【💾 应用更改】写入生效`,
      type: "ok",
    });
  };

  // 单独删除某一项
  const handleDeleteSubItem = (v: EnvVar, index: number) => {
    if (!envState) return;
    const itemToRemove = v.items[index]?.raw || "";

    setConfirmDialog({
      isOpen: true,
      type: "danger",
      title: `删除 ${v.name} 路径项`,
      message: `确定要从 ${v.name} 中删除第 ${index + 1} 项吗？`,
      subMessage: itemToRemove,
      confirmText: "确认删除",
      cancelText: "取消",
      onConfirm: () => {
        setConfirmDialog(null);
        const newRawItems = v.items.map((it) => it.raw).filter((_, i) => i !== index);
        const newJoinedValue = newRawItems.join(";");

        const change: EnvChange = {
          scope: v.scope,
          name: v.name,
          old_value: v.raw_value,
          new_value: newJoinedValue,
          kind: v.kind,
        };

        setPendingChanges((prev) => {
          const filtered = prev.filter(
            (c) => !(c.scope === change.scope && c.name.toLowerCase() === change.name.toLowerCase())
          );
          return [...filtered, change];
        });

        const updatedVar: EnvVar = {
          ...v,
          raw_value: newJoinedValue,
          expanded_value: newJoinedValue,
          items: newRawItems.map((r) => ({
            raw: r,
            expanded: r,
            exists: true,
            is_empty: r.trim().length === 0,
            is_duplicate: false,
            issues: [],
          })),
        };

        const targetScopeKey = v.scope === "System" ? "system" : "user";
        const updatedList = envState[targetScopeKey].map((item) =>
          item.name === v.name ? updatedVar : item
        );

        setEnvState({
          ...envState,
          [targetScopeKey]: updatedList,
        });

        setMessage({
          text: `已从 ${v.name} 移除第 ${index + 1} 项，请点击【💾 应用更改】生效`,
          type: "ok",
        });
      },
    });
  };

  // 单独上下调整某项顺序
  const handleMoveSubItem = (v: EnvVar, index: number, direction: "up" | "down") => {
    if (!envState) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= v.items.length) return;

    const newRawItems = v.items.map((it) => it.raw);
    const temp = newRawItems[index];
    newRawItems[index] = newRawItems[targetIndex];
    newRawItems[targetIndex] = temp;

    const newJoinedValue = newRawItems.join(";");

    const change: EnvChange = {
      scope: v.scope,
      name: v.name,
      old_value: v.raw_value,
      new_value: newJoinedValue,
      kind: v.kind,
    };

    setPendingChanges((prev) => {
      const filtered = prev.filter(
        (c) => !(c.scope === change.scope && c.name.toLowerCase() === change.name.toLowerCase())
      );
      return [...filtered, change];
    });

    const updatedVar: EnvVar = {
      ...v,
      raw_value: newJoinedValue,
      expanded_value: newJoinedValue,
      items: newRawItems.map((r) => ({
        raw: r,
        expanded: r,
        exists: true,
        is_empty: r.trim().length === 0,
        is_duplicate: false,
        issues: [],
      })),
    };

    const targetScopeKey = v.scope === "System" ? "system" : "user";
    const updatedList = envState[targetScopeKey].map((item) =>
      item.name === v.name ? updatedVar : item
    );

    setEnvState({
      ...envState,
      [targetScopeKey]: updatedList,
    });
  };

  // 触发应用
  const handleConfirmApply = async () => {
    try {
      setIsApplying(true);
      const snapId = await api.applyEnvChanges(pendingChanges);
      setMessage({
        text: `环境变量已成功写入系统并广播通知！已自动创建安全快照 (${snapId})`,
        type: "ok",
      });
      setIsDiffOpen(false);
      await loadData();
    } catch (e: any) {
      setMessage({ text: `写入失败: ${e?.message || e}`, type: "err" });
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* 顶部 Tab 切换（已优化：全幅单栏架构，宽幅空间杜绝截断长路径） */}
      <div className="scope-tabs">
        <div
          className={`scope-tab ${activeScope === "System" ? "active" : ""}`}
          onClick={() => setActiveScope("System")}
        >
          <span>🏷 系统环境变量 (System)</span>
          <span className="scope-count">{envState?.system.length || 0}</span>
        </div>
        <div
          className={`scope-tab ${activeScope === "User" ? "active" : ""}`}
          onClick={() => setActiveScope("User")}
        >
          <span>🏷 用户环境变量 (User)</span>
          <span className="scope-count">{envState?.user.length || 0}</span>
        </div>
      </div>

      {/* 工具栏 */}
      <div className="toolbar">
        <div className="search-input-wrap">
          <input
            className="fluent-input"
            placeholder="🔍 搜索变量名、路径或值..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "12px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={filterInvalidOnly}
              onChange={(e) => setFilterInvalidOnly(e.target.checked)}
            />
            <span>仅显示失效路径 (标红)</span>
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={showDynamic}
              onChange={(e) => setShowDynamic(e.target.checked)}
            />
            <span>显示动态只读变量</span>
          </label>
        </div>

        <div className="toolbar-actions">
          <button
            className="fluent-btn"
            onClick={() => {
              setEditingVar({
                isNew: true,
                scope: activeScope,
                name: "",
                value: "",
                kind: "Sz",
              });
            }}
          >
            <span>+</span> 新增变量
          </button>

          <button className="fluent-btn" onClick={loadData} title="重新从注册表加载">
            <span>⟳</span> 刷新
          </button>

          {pendingChanges.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "12px" }}>
              <span style={{ fontSize: "12px", color: "var(--color-warning)" }}>
                已暂存 {pendingChanges.length} 项修改
              </span>
              <button className="fluent-btn" onClick={loadData}>
                放弃
              </button>
              <button
                className="fluent-btn fluent-btn-primary"
                onClick={() => setIsDiffOpen(true)}
              >
                ✔ 审阅并应用到系统
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 提示消息横幅 */}
      {message && (
        <div
          style={{
            padding: "8px 16px",
            background: message.type === "ok" ? "var(--color-success-bg)" : "var(--color-danger-bg)",
            color: message.type === "ok" ? "var(--color-success)" : "var(--color-danger)",
            fontSize: "12px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>{message.text}</span>
          <span style={{ cursor: "pointer" }} onClick={() => setMessage(null)}>
            ✕
          </span>
        </div>
      )}

      {/* 环境变量列表：全宽沉浸式树形卡片视图 */}
      <div className="env-tree-container">
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
            正在读取 Windows 注册表环境变量...
          </div>
        ) : currentList.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
            未找到匹配的环境变量
          </div>
        ) : (
          currentList.map((v) => {
            const isExp = expandedVars[v.name] ?? false;
            const hasError = v.issues.some((iss) => iss.severity === "Error");
            const hasWarning = v.issues.some((iss) => iss.severity === "Warning");

            return (
              <div
                key={v.name}
                className="env-var-card"
                style={{
                  borderLeft: hasError
                    ? "3px solid var(--color-danger)"
                    : hasWarning
                    ? "3px solid var(--color-warning)"
                    : undefined,
                }}
              >
                <div className="env-var-header" onClick={() => v.is_multi && toggleExpand(v.name)}>
                  <div className="env-var-left">
                    {/* 类型指示图标 */}
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

                    {/* 多值折叠箭头 */}
                    {v.is_multi && (
                      <span style={{ fontSize: "10px", color: "var(--text-muted)", width: "12px" }}>
                        {isExp ? "▼" : "▶"}
                      </span>
                    )}

                    {/* 变量名与值 (宽幅设计完整呈现) */}
                    <span className="env-name">{v.name}</span>
                    <span className="env-equal">=</span>
                    <span className="env-val" title={`原始值: ${v.raw_value}\n展开值: ${v.expanded_value}`}>
                      {v.raw_value}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }} onClick={(e) => e.stopPropagation()}>
                    {/* 单独添加一项按钮 */}
                    {v.is_multi && v.kind !== "Dynamic" && (
                      <button
                        className="fluent-btn fluent-btn-primary"
                        style={{ padding: "2px 8px", fontSize: "11px" }}
                        onClick={() => handleOpenAddSubItem(v)}
                        title={`向 ${v.name} 单独添加一条新路径/项`}
                      >
                        + 添加一项
                      </button>
                    )}

                    {/* 一键去重按钮 */}
                    {v.is_multi && hasWarning && (
                      <button
                        className="fluent-btn"
                        style={{ padding: "2px 6px", fontSize: "11px" }}
                        onClick={() => handleCleanDuplicates(v)}
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
                          setEditingVar({
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

                {/* 针对 Path 等多值变量的子项列表展开 (无水平遮挡) */}
                {v.is_multi && isExp && (
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
                        title={it.issues.map((i) => i.message).join("\n") || it.expanded}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
                          <span style={{ color: "var(--text-muted)", fontSize: "11px", width: "24px" }}>
                            {idx + 1}.
                          </span>
                          <span style={{ wordBreak: "break-all" }}>{it.raw}</span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
                          {it.issues.length > 0 && (
                            <span style={{ fontSize: "11px", fontWeight: 500, marginRight: "4px" }}>
                              {it.issues[0].message}
                            </span>
                          )}

                          {v.kind !== "Dynamic" && (
                            <>
                              {idx > 0 && (
                                <button
                                  className="fluent-btn"
                                  style={{ padding: "2px 5px", fontSize: "10px" }}
                                  onClick={() => handleMoveSubItem(v, idx, "up")}
                                  title="上移此项优先级"
                                >
                                  ▲
                                </button>
                              )}
                              {idx < v.items.length - 1 && (
                                <button
                                  className="fluent-btn"
                                  style={{ padding: "2px 5px", fontSize: "10px" }}
                                  onClick={() => handleMoveSubItem(v, idx, "down")}
                                  title="下移此项优先级"
                                >
                                  ▼
                                </button>
                              )}
                              <button
                                className="fluent-btn"
                                style={{ padding: "2px 6px", fontSize: "11px" }}
                                onClick={() => handleOpenEditSubItem(v, idx, it.raw)}
                                title="单独修改此项路径"
                              >
                                ✏️ 修改
                              </button>
                              <button
                                className="fluent-btn"
                                style={{ padding: "2px 6px", fontSize: "11px", color: "var(--color-danger)" }}
                                onClick={() => handleDeleteSubItem(v, idx)}
                                title="删除此项"
                              >
                                🗑️
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* 展开底部便捷添加新项栏 */}
                    {v.kind !== "Dynamic" && (
                      <div style={{ padding: "6px 12px", borderTop: "1px dashed var(--border-subtle)" }}>
                        <button
                          className="fluent-btn"
                          style={{ fontSize: "11px", padding: "3px 10px" }}
                          onClick={() => handleOpenAddSubItem(v)}
                        >
                          + 添加新项到 {v.name}...
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 底部状态汇总栏 */}
      <div className="app-statusbar">
        <div>
          当前共展示 {currentList.length} 项变量 • 作用域:{" "}
          {activeScope === "System" ? "系统环境变量 (HKLM)" : "用户环境变量 (HKCU)"}
        </div>
        <div>提示：双击或展开 Path 可查看完整长路径；系统变量需管理员权限生效</div>
      </div>

      {/* 新增/编辑抽屉弹窗 */}
      {editingVar && (
        <div className="modal-overlay" onClick={() => setEditingVar(null)}>
          <div className="modal-card" style={{ maxWidth: "560px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span>{editingVar.isNew ? "新增环境变量" : `编辑变量: ${editingVar.origName}`}</span>
              <button
                className="fluent-btn"
                style={{ border: "none", background: "transparent" }}
                onClick={() => setEditingVar(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>
                  作用域
                </label>
                <div style={{ display: "flex", gap: "12px" }}>
                  <label style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}>
                    <input
                      type="radio"
                      name="editScope"
                      checked={editingVar.scope === "System"}
                      onChange={() => setEditingVar({ ...editingVar, scope: "System" })}
                    />
                    系统变量 (System)
                  </label>
                  <label style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}>
                    <input
                      type="radio"
                      name="editScope"
                      checked={editingVar.scope === "User"}
                      onChange={() => setEditingVar({ ...editingVar, scope: "User" })}
                    />
                    用户变量 (User)
                  </label>
                </div>
              </div>

              <div>
                <label style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>
                  变量名称
                </label>
                <input
                  className="fluent-input"
                  value={editingVar.name}
                  onChange={(e) => setEditingVar({ ...editingVar, name: e.target.value })}
                  placeholder="如 JAVA_HOME, GOPATH, Path"
                  disabled={!editingVar.isNew && editingVar.name.toUpperCase() === "PATH"}
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>
                  变量类型
                </label>
                <select
                  className="fluent-input"
                  value={editingVar.kind}
                  onChange={(e) => setEditingVar({ ...editingVar, kind: e.target.value as ValueKind })}
                >
                  <option value="Sz">REG_SZ (普通字符串)</option>
                  <option value="ExpandSz">REG_EXPAND_SZ (包含 %VAR% 展开宏)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>
                  变量值 (多路径请用半角分号 ';' 分隔)
                </label>
                <textarea
                  className="fluent-input"
                  rows={6}
                  style={{ resize: "vertical", fontFamily: "var(--font-mono)" }}
                  value={editingVar.value}
                  onChange={(e) => setEditingVar({ ...editingVar, value: e.target.value })}
                  placeholder="如 C:\Program Files\Java\jdk-21"
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="fluent-btn" onClick={() => setEditingVar(null)}>
                取消
              </button>
              <button className="fluent-btn fluent-btn-primary" onClick={handleSaveEdit}>
                暂存保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 单独修改或添加一项路径弹窗 */}
      {subItemModal && (
        <div className="modal-overlay" onClick={() => setSubItemModal(null)}>
          <div className="modal-card" style={{ maxWidth: "520px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span>
                {subItemModal.isNew
                  ? `添加新路径项到: ${subItemModal.varName}`
                  : `单独修改 ${subItemModal.varName} 第 ${subItemModal.index + 1} 项`}
              </span>
              <button
                className="fluent-btn"
                style={{ border: "none", background: "transparent" }}
                onClick={() => setSubItemModal(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                请输入单条独立的目录路径或包含宏的文件路径（单项无需输入分号 ';'）：
              </div>

              <div>
                <label style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>
                  路径值
                </label>
                <input
                  className="fluent-input"
                  style={{ fontFamily: "var(--font-mono)" }}
                  value={subItemModal.value}
                  onChange={(e) => setSubItemModal({ ...subItemModal, value: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveSubItem();
                  }}
                  placeholder="如 C:\Program Files\nodejs 或 %JAVA_HOME%\bin"
                  autoFocus
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="fluent-btn" onClick={() => setSubItemModal(null)}>
                取消
              </button>
              <button className="fluent-btn fluent-btn-primary" onClick={handleSaveSubItem}>
                {subItemModal.isNew ? "添加并暂存" : "保存修改并暂存"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 确认写入差异对话框 */}
      <DiffDialog
        isOpen={isDiffOpen}
        title="确认应用环境变量修改到 Windows 注册表"
        changes={pendingChanges}
        warnings={[
          "写入后将自动广播 WM_SETTINGCHANGE 消息，新打开的命令行将立即生效。",
          "已经打开的终端窗口或软件需重启后才能感知新变量。",
        ]}
        onConfirm={handleConfirmApply}
        onCancel={() => setIsDiffOpen(false)}
        isLoading={isApplying}
      />

      {/* 美化确认与提示模态弹窗 */}
      {confirmDialog && (
        <ConfirmModal
          {...confirmDialog}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
};
