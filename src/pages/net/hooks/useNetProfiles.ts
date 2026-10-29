import { useState, useEffect } from "react";
import {
  AdapterInfo,
  AdapterTabConfig,
  api,
  HostsProfile,
  NetProfile,
} from "../../../services/api";
import { ConfirmDialogState } from "../types";

export function useNetProfiles() {
  const [profiles, setProfiles] = useState<NetProfile[]>([]);
  const [adapters, setAdapters] = useState<AdapterInfo[]>([]);
  const [hostsProfiles, setHostsProfiles] = useState<HostsProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isActivating, setIsActivating] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [newName, setNewName] = useState("");
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

  useEffect(() => {
    if (msg) {
      const timer = window.setTimeout(() => {
        setMsg(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [msg]);

  const currentProfile = profiles.find((p) => p.id === selectedProfileId) || null;
  const currentTab = currentProfile?.adapters[activeTabIdx] || null;
  const matchedAdapter = adapters.find((a) => a.name === currentTab?.adapter_name);

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

  const handleActivate = async () => {
    if (!currentProfile) return;
    try {
      setIsActivating(true);
      const snapId = await api.activateNetProfile(currentProfile.id);
      setMsg({
        text: `网络方案 "${currentProfile.name}" 已成功激活生效！已创建快照 (${snapId})`,
        ok: true,
      });
      const updatedAdps = await api.listAdapters();
      setAdapters(updatedAdps);
    } catch (e: any) {
      setMsg({ text: `激活失败: ${e?.message || e}`, ok: false });
    } finally {
      setIsActivating(false);
    }
  };

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

  const handleOpenRename = (id: string, name: string) => {
    setRenameId(id);
    setRenameName(name);
    setIsRenameOpen(true);
  };

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
        setMsg({ text: `网络方案 "${name}" 已删除`, ok: true });
      },
    });
  };

  return {
    profiles,
    adapters,
    hostsProfiles,
    selectedProfileId,
    setSelectedProfileId,
    activeTabIdx,
    setActiveTabIdx,
    loading,
    isActivating,
    msg,
    setMsg,
    confirmDialog,
    setConfirmDialog,
    isNewOpen,
    setIsNewOpen,
    newName,
    setNewName,
    isRenameOpen,
    setIsRenameOpen,
    renameName,
    setRenameName,
    currentProfile,
    currentTab,
    matchedAdapter,
    updateCurrentTab,
    updateCurrentProfile,
    handleCaptureCurrent,
    handleActivate,
    handleAddTab,
    handleCreateProfile,
    handleOpenRename,
    handleSaveRename,
    handleDeleteProfile,
    loadData,
  };
}
