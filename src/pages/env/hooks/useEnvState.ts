import { useState, useEffect, useMemo } from "react";
import {
  api,
  EnvChange,
  EnvScope,
  EnvState,
  EnvVar,
} from "../../../services/api";
import {
  EditingVarState,
  SubItemModalState,
  ConfirmDialogState,
} from "../types";

export function useEnvState() {
  const [envState, setEnvState] = useState<EnvState | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeScope, setActiveScope] = useState<EnvScope>("System");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterInvalidOnly, setFilterInvalidOnly] = useState(false);
  const [showDynamic, setShowDynamic] = useState(false);
  const [expandedVars, setExpandedVars] = useState<Record<string, boolean>>({
    Path: true,
  });

  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [editingVar, setEditingVar] = useState<EditingVarState | null>(null);
  const [subItemModal, setSubItemModal] = useState<SubItemModalState | null>(null);

  const [pendingChanges, setPendingChanges] = useState<EnvChange[]>([]);
  const [isDiffOpen, setIsDiffOpen] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "ok" | "err" } | null>(null);

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

  useEffect(() => {
    if (message) {
      const timer = window.setTimeout(() => {
        setMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

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

    if (envState) {
      const targetScopeKey = editingVar.scope === "System" ? "system" : "user";
      const updatedList = [...envState[targetScopeKey]];
      const existingIdx = updatedList.findIndex(
        (v) => v.name.toLowerCase() === editingVar.name.toLowerCase()
      );

      const rawSplits = editingVar.value
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      const newItems = rawSplits.map((r) => ({
        raw: r,
        expanded: r,
        exists: true,
        is_empty: false,
        is_duplicate: false,
        issues: [],
      }));

      if (existingIdx >= 0) {
        updatedList[existingIdx] = {
          ...updatedList[existingIdx],
          raw_value: editingVar.value,
          expanded_value: editingVar.value,
          kind: editingVar.kind,
          is_multi: true,
          items: newItems,
        };
      } else {
        updatedList.unshift({
          name: editingVar.name,
          raw_value: editingVar.value,
          expanded_value: editingVar.value,
          kind: editingVar.kind,
          scope: editingVar.scope,
          is_multi: true,
          items: newItems,
          issues: [],
          is_protected: false,
        });
      }

      setEnvState({
        ...envState,
        [targetScopeKey]: updatedList,
      });
      setExpandedVars((prev) => ({ ...prev, [editingVar.name]: true }));
    }

    setEditingVar(null);
  };

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

  const handleOpenAddSubItem = (v: EnvVar) => {
    setSubItemModal({
      varName: v.name,
      scope: v.scope,
      isNew: true,
      index: v.items.length,
      value: "",
    });
  };

  const handleOpenEditSubItem = (v: EnvVar, index: number, currentVal: string) => {
    setSubItemModal({
      varName: v.name,
      scope: v.scope,
      isNew: false,
      index,
      value: currentVal,
    });
  };

  const handleSaveSubItem = (savedValues: string[]) => {
    if (!subItemModal || !savedValues.length || !envState) return;
    const targetScopeKey = subItemModal.scope === "System" ? "system" : "user";
    const targetVar = envState[targetScopeKey].find((v) => v.name === subItemModal.varName);
    if (!targetVar) return;

    const newRawItems = targetVar.items.map((it) => it.raw);
    if (subItemModal.isNew) {
      savedValues.forEach((val) => {
        const trimmed = val.trim();
        if (trimmed) newRawItems.push(trimmed);
      });
    } else {
      if (savedValues[0]) {
        newRawItems[subItemModal.index] = savedValues[0].trim();
      }
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

    const updatedVar: EnvVar = {
      ...targetVar,
      raw_value: newJoinedValue,
      expanded_value: newJoinedValue,
      is_multi: true,
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

    setEnvState({ ...envState, [targetScopeKey]: updatedList });
    setExpandedVars((prev) => ({ ...prev, [targetVar.name]: true }));
    setSubItemModal(null);
    setMessage({
      text: `${subItemModal.isNew ? `已添加 ${savedValues.length} 项变量值` : "已修改该项值"} 到 ${targetVar.name}，请点击右上角【💾 应用更改】写入生效`,
      type: "ok",
    });
  };

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

        setEnvState({ ...envState, [targetScopeKey]: updatedList });
        setMessage({
          text: `已从 ${v.name} 移除第 ${index + 1} 项，请点击【💾 应用更改】生效`,
          type: "ok",
        });
      },
    });
  };

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

    setEnvState({ ...envState, [targetScopeKey]: updatedList });
  };

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

  return {
    envState,
    loading,
    activeScope,
    setActiveScope,
    searchQuery,
    setSearchQuery,
    filterInvalidOnly,
    setFilterInvalidOnly,
    showDynamic,
    setShowDynamic,
    expandedVars,
    toggleExpand,
    confirmDialog,
    setConfirmDialog,
    editingVar,
    setEditingVar,
    subItemModal,
    setSubItemModal,
    pendingChanges,
    setPendingChanges,
    isDiffOpen,
    setIsDiffOpen,
    isApplying,
    message,
    setMessage,
    loadData,
    currentList,
    handleSaveEdit,
    handleCleanDuplicates,
    handleOpenAddSubItem,
    handleOpenEditSubItem,
    handleSaveSubItem,
    handleDeleteSubItem,
    handleMoveSubItem,
    handleConfirmApply,
  };
}
