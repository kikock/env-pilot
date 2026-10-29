import React, { useState, useEffect } from "react";
import {
  AdapterInfo,
  AdapterTabConfig,
  api,
  HostsProfile,
  NetProfile,
} from "../services/api";
import { ConfirmModal } from "../components/ConfirmModal";

export const NetPage: React.FC = () => {
  const [profiles, setProfiles] = useState<NetProfile[]>([]);
  const [adapters, setAdapters] = useState<AdapterInfo[]>([]);
  const [hostsProfiles, setHostsProfiles] = useState<HostsProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isActivating, setIsActivating] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // 通用美化确认与提示弹窗
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    subMessage?: string;
    confirmText?: string;
    cancelText?: string;
    type?: "danger" | "warning" | "info";
    onConfirm: () => void;
  } | null>(null);

  // 新建方案弹窗
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [newName, setNewName] = useState("");

  // 修改方案名称弹窗
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [renameId, setRenameId] = useState("");
  const [renameName, setRenameName] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const adps = await api.listAdapters();
      setAdapters(adps);

      const profs = await api.getNetProfiles();
      setProfiles(profs);

      const [hProfs] = await api.getHostsProfiles();
      setHostsProfiles(hProfs);

      if (profs.length > 0 && !selectedProfileId) {
        setSelectedProfileId(profs[0].id);
      }
    } catch (e: any) {
      setMsg({ text: `加载网络适配器与方案失败: ${e?.message || e}`, ok: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const currentProfile = profiles.find((p) => p.id === selectedProfileId) || null;
  const currentTab = currentProfile?.adapters[activeTabIdx] || null;

  // 匹配当前网卡的实时信息
  const matchedAdapter = adapters.find(
    (a) => a.name === currentTab?.adapter_name
  );

  // 从当前物理网卡配置一键读取填入
  const handleCaptureCurrent = () => {
    if (!currentProfile || !currentTab || !matchedAdapter) {
      setConfirmDialog({
        isOpen: true,
        type: "warning",
        title: "提示",
        message: "请先选择一块已连接的本机网卡",
        confirmText: "知道了",
        onConfirm: () => setConfirmDialog(null),
      });
      return;
    }

    const updatedTab: AdapterTabConfig = {
      ...currentTab,
      apply_ip: true,
      ipv4: {
        mode: matchedAdapter.is_dhcp ? "Dhcp" : "Static",
        ip: matchedAdapter.ip,
        mask: matchedAdapter.mask || "255.255.255.0",
        gateway: matchedAdapter.gateway,
      },
      apply_dns: true,
      dns: {
        mode: matchedAdapter.dns.length > 0 ? "Static" : "Dhcp",
        primary: matchedAdapter.dns[0] || "",
        secondary: matchedAdapter.dns[1] || "",
      },
    };

    updateCurrentTab(updatedTab);
    setMsg({ text: `已成功从网卡 "${matchedAdapter.name}" 同步实时配置！`, ok: true });
  };

  const updateCurrentTab = (updated: AdapterTabConfig) => {
    if (!currentProfile) return;
    const newAdapters = [...currentProfile.adapters];
    newAdapters[activeTabIdx] = updated;

    const newProfile = { ...currentProfile, adapters: newAdapters };
    const nextProfiles = profiles.map((p) =>
      p.id === currentProfile.id ? newProfile : p
    );
    setProfiles(nextProfiles);
    api.saveNetProfiles(nextProfiles);
  };

  const updateCurrentProfile = (newProfile: NetProfile) => {
    const nextProfiles = profiles.map((p) =>
      p.id === newProfile.id ? newProfile : p
    );
    setProfiles(nextProfiles);
    api.saveNetProfiles(nextProfiles);
  };

  // 激活方案
  const handleActivate = async () => {
    if (!currentProfile) return;
    try {
      setIsActivating(true);
      const snapId = await api.activateNetProfile(currentProfile.id);
      setMsg({
        text: `网络方案 "${currentProfile.name}" 已成功激活生效！已创建快照 (${snapId})`,
        ok: true,
      });
      // 重新读取网卡实际 IP
      const updatedAdps = await api.listAdapters();
      setAdapters(updatedAdps);
    } catch (e: any) {
      setMsg({ text: `激活失败: ${e?.message || e}`, ok: false });
    } finally {
      setIsActivating(false);
    }
  };

  // 添加网卡页签
  const handleAddTab = () => {
    if (!currentProfile) return;
    const defaultAdp = adapters[0]?.name || "以太网";
    const newTab: AdapterTabConfig = {
      adapter_name: defaultAdp,
      adapter_desc: "",
      apply_ip: true,
      ipv4: { mode: "Dhcp", ip: "", mask: "", gateway: "" },
      apply_dns: true,
      dns: { mode: "Dhcp", primary: "", secondary: "" },
    };

    const nextAdapters = [...currentProfile.adapters, newTab];
    updateCurrentProfile({ ...currentProfile, adapters: nextAdapters });
    setActiveTabIdx(nextAdapters.length - 1);
  };

  // 新建方案
  const handleCreateProfile = async () => {
    if (!newName.trim()) return;
    const firstAdp = adapters[0]?.name || "WLAN";
    const newProf: NetProfile = {
      id: `net-${Date.now()}`,
      group: "",
      name: newName.trim(),
      adapters: [
        {
          adapter_name: firstAdp,
          adapter_desc: "",
          apply_ip: true,
          ipv4: { mode: "Dhcp", ip: "", mask: "", gateway: "" },
          apply_dns: true,
          dns: { mode: "Dhcp", primary: "", secondary: "" },
        },
      ],
      proxy: { mode: "Disable", server: "", bypass: "" },
      linked_hosts_id: null,
    };

    const nextProfiles = [...profiles, newProf];
    setProfiles(nextProfiles);
    await api.saveNetProfiles(nextProfiles);
    setSelectedProfileId(newProf.id);
    setActiveTabIdx(0);
    setIsNewOpen(false);
    setNewName("");
    setMsg({ text: `已成功创建方案 "${newProf.name}"`, ok: true });
  };

  // 打开修改方案名称弹窗
  const handleOpenRename = (id: string, name: string) => {
    setRenameId(id);
    setRenameName(name);
    setIsRenameOpen(true);
  };

  // 保存修改后的方案名称
  const handleSaveRename = async () => {
    if (!renameName.trim() || !renameId) return;
    const nextProfiles = profiles.map((p) =>
      p.id === renameId ? { ...p, name: renameName.trim() } : p
    );
    setProfiles(nextProfiles);
    await api.saveNetProfiles(nextProfiles);
    setIsRenameOpen(false);
    setMsg({ text: `方案已成功重命名为 "${renameName.trim()}"`, ok: true });
  };

  // 删除方案
  const handleDeleteProfile = (id: string, name: string) => {
    if (profiles.length <= 1) {
      setConfirmDialog({
        isOpen: true,
        type: "warning",
        title: "无法删除",
        message: "系统至少需要保留一个网络方案",
        confirmText: "知道了",
        onConfirm: () => setConfirmDialog(null),
      });
      return;
    }

    setConfirmDialog({
      isOpen: true,
      type: "danger",
      title: "删除网络方案",
      message: `确定要删除网络方案 "${name}" 吗？`,
      subMessage: "删除后该方案绑定的网卡 IP、DNS 及系统代理配置将一并移除。",
      confirmText: "确认删除",
      cancelText: "取消",
      onConfirm: async () => {
        setConfirmDialog(null);
        const nextProfiles = profiles.filter((p) => p.id !== id);
        setProfiles(nextProfiles);
        await api.saveNetProfiles(nextProfiles);
        if (selectedProfileId === id) {
          setSelectedProfileId(nextProfiles[0].id);
          setActiveTabIdx(0);
        }
        setMsg({ text: `已删除网络方案 "${name}"`, ok: true });
      },
    });
  };

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* 左侧方案管理 */}
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
          <span style={{ fontWeight: 600, fontSize: "13px" }}>网络方案列表</span>
          <button
            className="fluent-btn fluent-btn-primary"
            style={{ padding: "3px 8px", fontSize: "11px" }}
            onClick={() => {
              setNewName("");
              setIsNewOpen(true);
            }}
          >
            + 新建方案
          </button>
        </div>

        {/* 方案纯名称列表（彻底去除分组） */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px" }}>
          {profiles.map((p) => (
            <div
              key={p.id}
              className={`nav-item ${selectedProfileId === p.id ? "active" : ""}`}
              onClick={() => {
                setSelectedProfileId(p.id);
                setActiveTabIdx(0);
              }}
              style={{ justifyContent: "space-between", paddingRight: "6px" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden", flex: 1 }}>
                <span>🖧</span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.name}
                </span>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="fluent-btn"
                  style={{ padding: "2px 5px", fontSize: "11px", border: "none", background: "transparent" }}
                  onClick={() => handleOpenRename(p.id, p.name)}
                  title="修改方案名称"
                >
                  ✏️
                </button>
                {profiles.length > 1 && (
                  <button
                    className="fluent-btn"
                    style={{ padding: "2px 5px", fontSize: "11px", border: "none", background: "transparent", color: "var(--color-danger)" }}
                    onClick={() => handleDeleteProfile(p.id, p.name)}
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
        <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "8px", fontSize: "11px", color: "var(--text-muted)" }}>
          <div>检测到 {adapters.length} 块网络适配器</div>
          {matchedAdapter && (
            <div style={{ color: "var(--color-success)", marginTop: "2px" }}>
              ● {matchedAdapter.name}: {matchedAdapter.ip || "未分配 IP"}
            </div>
          )}
        </div>
      </div>

      {/* 右侧网络配置工作区 */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--bg-app)", overflowY: "auto" }}>
        {/* 顶部激活横幅 */}
        <div className="toolbar" style={{ background: "var(--bg-sidebar)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "16px" }}>📶</span>
            <span style={{ fontWeight: 600, fontSize: "14px" }}>
              方案: {currentProfile?.name || "未选择"}
            </span>
            {currentProfile && (
              <button
                className="fluent-btn"
                style={{ padding: "2px 8px", fontSize: "12px" }}
                onClick={() => handleOpenRename(currentProfile.id, currentProfile.name)}
                title="修改当前方案名称"
              >
                ✏️ 修改名称
              </button>
            )}
          </div>

          <div className="toolbar-actions">
            <button
              className="fluent-btn fluent-btn-success"
              style={{ padding: "6px 16px", fontWeight: 600 }}
              onClick={handleActivate}
              disabled={isActivating || !currentProfile}
            >
              <span>▶</span> {isActivating ? "正在激活下发 netsh..." : `激活方案: ${currentProfile?.name || ""}`}
            </button>
          </div>
        </div>

        {/* 提示消息 */}
        {msg && (
          <div
            style={{
              padding: "6px 16px",
              background: msg.ok ? "var(--color-success-bg)" : "var(--color-danger-bg)",
              color: msg.ok ? "var(--color-success)" : "var(--color-danger)",
              fontSize: "12px",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>{msg.text}</span>
            <span style={{ cursor: "pointer" }} onClick={() => setMsg(null)}>
              ✕
            </span>
          </div>
        )}

        {currentProfile && currentTab ? (
          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* 网卡多页签切换 (如 #1 WLAN, #2 以太网) */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "8px" }}>
              {currentProfile.adapters.map((adp, idx) => (
                <button
                  key={idx}
                  className={`fluent-btn ${activeTabIdx === idx ? "fluent-btn-primary" : ""}`}
                  onClick={() => setActiveTabIdx(idx)}
                >
                  #{idx + 1} {adp.adapter_name}
                </button>
              ))}

              <button className="fluent-btn" onClick={handleAddTab} title="为此方案添加第二块网卡绑定配置">
                + 添加网卡页签
              </button>

              <div style={{ flex: 1 }} />

              <button className="fluent-btn" onClick={handleCaptureCurrent}>
                ⤓ 从当前物理配置一键读取
              </button>
            </div>

            {/* 当前绑定的网卡选择与状态 */}
            <div className="env-var-card" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <label style={{ fontSize: "12px", color: "var(--text-secondary)", width: "80px" }}>
                  目标适配器:
                </label>
                <select
                  className="fluent-input"
                  style={{ flex: 1 }}
                  value={currentTab.adapter_name}
                  onChange={(e) => updateCurrentTab({ ...currentTab, adapter_name: e.target.value })}
                >
                  {adapters.map((a) => (
                    <option key={a.name} value={a.name}>
                      {a.name} ({a.description}) — {a.ip || "无IP"}
                    </option>
                  ))}
                </select>
              </div>

              {matchedAdapter && (
                <div style={{ fontSize: "11px", color: "var(--text-muted)", paddingLeft: "92px" }}>
                  硬件设备: {matchedAdapter.description} | MAC: {matchedAdapter.mac} | 连接状态:{" "}
                  {matchedAdapter.is_up ? "已连通" : "未连接"}
                </div>
              )}
            </div>

            {/* 配置表单双栏容器 */}
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "16px" }}>
              {/* 左列：IP 与 DNS */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* IP 与网关面板 */}
                <div className="env-var-card">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "6px" }}>
                    <label style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={currentTab.apply_ip}
                        onChange={(e) => updateCurrentTab({ ...currentTab, apply_ip: e.target.checked })}
                      />
                      <span>IP 与网关设置</span>
                    </label>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      {currentTab.apply_ip ? "激活时写入" : "忽略不修改"}
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", opacity: currentTab.apply_ip ? 1 : 0.4 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="ipv4Mode"
                        checked={currentTab.ipv4.mode === "Dhcp"}
                        onChange={() =>
                          updateCurrentTab({
                            ...currentTab,
                            ipv4: { ...currentTab.ipv4, mode: "Dhcp" },
                          })
                        }
                      />
                      <span>自动获取 IP 地址 (DHCP)</span>
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="ipv4Mode"
                        checked={currentTab.ipv4.mode === "Static"}
                        onChange={() =>
                          updateCurrentTab({
                            ...currentTab,
                            ipv4: { ...currentTab.ipv4, mode: "Static" },
                          })
                        }
                      />
                      <span>使用下面的 IP 地址 (静态配置):</span>
                    </label>

                    {currentTab.ipv4.mode === "Static" && (
                      <div style={{ paddingLeft: "24px", display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ width: "70px", fontSize: "12px", color: "var(--text-secondary)" }}>
                            IP 地址:
                          </span>
                          <input
                            className="fluent-input"
                            style={{ fontFamily: "var(--font-mono)" }}
                            placeholder="如 192.168.1.100"
                            value={currentTab.ipv4.ip}
                            onChange={(e) =>
                              updateCurrentTab({
                                ...currentTab,
                                ipv4: { ...currentTab.ipv4, ip: e.target.value },
                              })
                            }
                          />
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ width: "70px", fontSize: "12px", color: "var(--text-secondary)" }}>
                            子网掩码:
                          </span>
                          <input
                            className="fluent-input"
                            style={{ fontFamily: "var(--font-mono)" }}
                            placeholder="如 255.255.255.0"
                            value={currentTab.ipv4.mask}
                            onChange={(e) =>
                              updateCurrentTab({
                                ...currentTab,
                                ipv4: { ...currentTab.ipv4, mask: e.target.value },
                              })
                            }
                          />
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ width: "70px", fontSize: "12px", color: "var(--text-secondary)" }}>
                            默认网关:
                          </span>
                          <input
                            className="fluent-input"
                            style={{ fontFamily: "var(--font-mono)" }}
                            placeholder="如 192.168.1.1"
                            value={currentTab.ipv4.gateway}
                            onChange={(e) =>
                              updateCurrentTab({
                                ...currentTab,
                                ipv4: { ...currentTab.ipv4, gateway: e.target.value },
                              })
                            }
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* DNS 服务器面板 */}
                <div className="env-var-card">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "6px" }}>
                    <label style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={currentTab.apply_dns}
                        onChange={(e) => updateCurrentTab({ ...currentTab, apply_dns: e.target.checked })}
                      />
                      <span>DNS 服务器设置</span>
                    </label>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      {currentTab.apply_dns ? "激活时写入" : "忽略不修改"}
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", opacity: currentTab.apply_dns ? 1 : 0.4 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="dnsMode"
                        checked={currentTab.dns.mode === "Dhcp"}
                        onChange={() =>
                          updateCurrentTab({
                            ...currentTab,
                            dns: { ...currentTab.dns, mode: "Dhcp" },
                          })
                        }
                      />
                      <span>自动获取 DNS 服务器地址</span>
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="dnsMode"
                        checked={currentTab.dns.mode === "Static"}
                        onChange={() =>
                          updateCurrentTab({
                            ...currentTab,
                            dns: { ...currentTab.dns, mode: "Static" },
                          })
                        }
                      />
                      <span>使用下面的 DNS 服务器地址:</span>
                    </label>

                    {currentTab.dns.mode === "Static" && (
                      <div style={{ paddingLeft: "24px", display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ width: "70px", fontSize: "12px", color: "var(--text-secondary)" }}>
                            首选 DNS:
                          </span>
                          <input
                            className="fluent-input"
                            style={{ fontFamily: "var(--font-mono)" }}
                            placeholder="如 223.5.5.5 (阿里公共DNS)"
                            value={currentTab.dns.primary}
                            onChange={(e) =>
                              updateCurrentTab({
                                ...currentTab,
                                dns: { ...currentTab.dns, primary: e.target.value },
                              })
                            }
                          />
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ width: "70px", fontSize: "12px", color: "var(--text-secondary)" }}>
                            备用 DNS:
                          </span>
                          <input
                            className="fluent-input"
                            style={{ fontFamily: "var(--font-mono)" }}
                            placeholder="如 119.29.29.29 (腾讯DNS)"
                            value={currentTab.dns.secondary}
                            onChange={(e) =>
                              updateCurrentTab({
                                ...currentTab,
                                dns: { ...currentTab.dns, secondary: e.target.value },
                              })
                            }
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 右列：附加项与联动设置 */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* 附加项：系统代理 */}
                <div className="env-var-card">
                  <div style={{ fontWeight: 600, marginBottom: "12px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "6px" }}>
                    附加设置：Windows 系统代理
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <input
                        type="radio"
                        name="proxyMode"
                        checked={currentProfile.proxy.mode === "Keep"}
                        onChange={() =>
                          updateCurrentProfile({
                            ...currentProfile,
                            proxy: { ...currentProfile.proxy, mode: "Keep" },
                          })
                        }
                      />
                      <span>保持当前系统代理不变</span>
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <input
                        type="radio"
                        name="proxyMode"
                        checked={currentProfile.proxy.mode === "Disable"}
                        onChange={() =>
                          updateCurrentProfile({
                            ...currentProfile,
                            proxy: { ...currentProfile.proxy, mode: "Disable" },
                          })
                        }
                      />
                      <span>关闭系统代理 (直连)</span>
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <input
                        type="radio"
                        name="proxyMode"
                        checked={currentProfile.proxy.mode === "Manual"}
                        onChange={() =>
                          updateCurrentProfile({
                            ...currentProfile,
                            proxy: { ...currentProfile.proxy, mode: "Manual" },
                          })
                        }
                      />
                      <span>启用手动系统代理:</span>
                    </label>

                    {currentProfile.proxy.mode === "Manual" && (
                      <div style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "6px" }}>
                        <input
                          className="fluent-input"
                          placeholder="代理服务器地址:端口 (如 127.0.0.1:7890)"
                          value={currentProfile.proxy.server}
                          onChange={(e) =>
                            updateCurrentProfile({
                              ...currentProfile,
                              proxy: { ...currentProfile.proxy, server: e.target.value },
                            })
                          }
                        />
                        <input
                          className="fluent-input"
                          placeholder="例外地址 (如 localhost;127.*;192.168.*)"
                          value={currentProfile.proxy.bypass}
                          onChange={(e) =>
                            updateCurrentProfile({
                              ...currentProfile,
                              proxy: { ...currentProfile.proxy, bypass: e.target.value },
                            })
                          }
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* 附加项：联动 Hosts 方案 */}
                <div className="env-var-card">
                  <div style={{ fontWeight: 600, marginBottom: "12px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "6px" }}>
                    附加设置：联动启用 Hosts 方案
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                      激活此网络方案时，同时自动激活指定的 Hosts 方案：
                    </div>
                    <select
                      className="fluent-input"
                      value={currentProfile.linked_hosts_id || ""}
                      onChange={(e) =>
                        updateCurrentProfile({
                          ...currentProfile,
                          linked_hosts_id: e.target.value || null,
                        })
                      }
                    >
                      <option value="">(不联动 Hosts 方案)</option>
                      {hostsProfiles.map((hp) => (
                        <option key={hp.id} value={hp.id}>
                          {hp.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
            请在左侧选择或新建网络方案
          </div>
        )}
      </div>

      {/* 新建方案弹窗 */}
      {isNewOpen && (
        <div className="modal-overlay" onClick={() => setIsNewOpen(false)}>
          <div className="modal-card" style={{ maxWidth: "420px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span>新建网络环境方案</span>
              <button className="fluent-btn" style={{ border: "none" }} onClick={() => setIsNewOpen(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>
                  方案名称
                </label>
                <input
                  className="fluent-input"
                  placeholder="如 家, 公司"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateProfile();
                  }}
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="fluent-btn" onClick={() => setIsNewOpen(false)}>
                取消
              </button>
              <button className="fluent-btn fluent-btn-primary" onClick={handleCreateProfile}>
                创建网络方案
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 修改方案名称弹窗 */}
      {isRenameOpen && (
        <div className="modal-overlay" onClick={() => setIsRenameOpen(false)}>
          <div className="modal-card" style={{ maxWidth: "420px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span>修改网络方案名称</span>
              <button className="fluent-btn" style={{ border: "none" }} onClick={() => setIsRenameOpen(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>
                  方案新名称
                </label>
                <input
                  className="fluent-input"
                  placeholder="如 家, 公司"
                  value={renameName}
                  onChange={(e) => setRenameName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveRename();
                  }}
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="fluent-btn" onClick={() => setIsRenameOpen(false)}>
                取消
              </button>
              <button className="fluent-btn fluent-btn-primary" onClick={handleSaveRename}>
                保存名称
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 通用美化确认与消息提示弹窗 */}
      {confirmDialog && (
        <ConfirmModal
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          subMessage={confirmDialog.subMessage}
          type={confirmDialog.type}
          confirmText={confirmDialog.confirmText}
          cancelText={confirmDialog.cancelText}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
};
