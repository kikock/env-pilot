import React from "react";
import { DiffDialog } from "../components/DiffDialog";
import { ConfirmModal } from "../components/ConfirmModal";
import { useEnvState } from "./env/hooks/useEnvState";
import { EnvVarCard } from "./env/components/EnvVarCard";
import { EnvEditDrawer } from "./env/components/EnvEditDrawer";
import { SubItemModal } from "./env/components/SubItemModal";
import { FooterBadges } from "../components/FooterBadges";

export const EnvPage: React.FC = () => {
  const {
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
  } = useEnvState();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* 顶部 Tab 切换 */}
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

          <button className="fluent-btn" onClick={loadData}>
            <span>🔄</span> 重新载入
          </button>

          {pendingChanges.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button
                className="fluent-btn fluent-btn-primary"
                onClick={() => setIsDiffOpen(true)}
              >
                <span>💾</span> 应用更改 ({pendingChanges.length})
              </button>
              <button
                className="fluent-btn"
                style={{ color: "var(--color-danger)" }}
                onClick={() => {
                  setPendingChanges([]);
                  loadData();
                }}
              >
                放弃修改
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

      {/* 环境变量列表 */}
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
          currentList.map((v) => (
            <EnvVarCard
              key={v.name}
              envVar={v}
              isExpanded={expandedVars[v.name] ?? false}
              onToggleExpand={toggleExpand}
              onOpenAddSubItem={handleOpenAddSubItem}
              onCleanDuplicates={handleCleanDuplicates}
              onEditFullVar={setEditingVar}
              onMoveSubItem={handleMoveSubItem}
              onOpenEditSubItem={handleOpenEditSubItem}
              onDeleteSubItem={handleDeleteSubItem}
            />
          ))
        )}
      </div>

      {/* 底部状态汇总栏 */}
      <div className="app-statusbar">
        <div>
          当前共展示 {currentList.length} 项变量 • 作用域:{" "}
          {activeScope === "System" ? "系统环境变量 (HKLM)" : "用户环境变量 (HKCU)"}
        </div>
        <FooterBadges />
      </div>

      {/* 新增/编辑抽屉弹窗 */}
      {editingVar && (
        <EnvEditDrawer
          editingVar={editingVar}
          onClose={() => setEditingVar(null)}
          onUpdateEditingVar={setEditingVar}
          onSave={handleSaveEdit}
        />
      )}

      {/* 单独修改或添加一项路径弹窗 */}
      {subItemModal && (
        <SubItemModal
          modalState={subItemModal}
          onClose={() => setSubItemModal(null)}
          onSave={handleSaveSubItem}
        />
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
