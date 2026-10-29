import { useState, useEffect } from "react";
import {
  api,
  HostsProfile,
  HostsSettings,
  SystemHostsInfo,
} from "../../../services/api";

export function useHostsState() {
  const [profiles, setProfiles] = useState<HostsProfile[]>([]);
  const [settings, setSettings] = useState<HostsSettings>({
    is_single_mode: false,
    write_strategy: "Managed",
    auto_flush_dns: true,
  });
  const [systemHosts, setSystemHosts] = useState<SystemHostsInfo | null>(null);
  const [selectedId, setSelectedId] = useState<string>("__system__");
  const [activeContent, setActiveContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    subMessage?: string;
    onConfirm: () => void;
  } | null>(null);

  const [isNewOpen, setIsNewOpen] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const sys = await api.getSystemHosts();
      setSystemHosts(sys);

      const [profs, sets] = await api.getHostsProfiles();
      setProfiles(profs);
      setSettings(sets);

      if (selectedId === "__system__") {
        setActiveContent(sys.content);
      } else {
        const found = profs.find((p) => p.id === selectedId);
        if (found) setActiveContent(found.content);
      }
    } catch (e: any) {
      setMsg({ text: `加载 Hosts 失败: ${e?.message || e}`, ok: false });
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

  const handleSelectProfile = (id: string) => {
    if (selectedId !== "__system__") {
      setProfiles((prev) =>
        prev.map((p) => (p.id === selectedId ? { ...p, content: activeContent } : p))
      );
    }

    setSelectedId(id);
    if (id === "__system__") {
      setActiveContent(systemHosts?.content || "");
    } else {
      const target = profiles.find((p) => p.id === id);
      if (target) setActiveContent(target.content);
    }
  };

  const handleToggleProfile = async (id: string) => {
    const updated = profiles.map((p) => {
      if (settings.is_single_mode) {
        return { ...p, enabled: p.id === id ? !p.enabled : false };
      }
      return p.id === id ? { ...p, enabled: !p.enabled } : p;
    });

    setProfiles(updated);
    try {
      setIsApplying(true);
      await api.applyHosts(updated, settings);
      const sys = await api.getSystemHosts();
      setSystemHosts(sys);
      if (selectedId === "__system__") setActiveContent(sys.content);
      setMsg({ text: "Hosts 方案已成功切换并更新到系统 hosts 文件！", ok: true });
    } catch (e: any) {
      setMsg({ text: `应用失败: ${e?.message || e}`, ok: false });
    } finally {
      setIsApplying(false);
    }
  };

  const handleSaveCurrent = async () => {
    if (selectedId === "__system__") return;

    const updated = profiles.map((p) =>
      p.id === selectedId ? { ...p, content: activeContent } : p
    );
    setProfiles(updated);

    try {
      setIsApplying(true);
      await api.saveHostsProfiles(updated, settings);
      const current = updated.find((p) => p.id === selectedId);
      if (current?.enabled) {
        await api.applyHosts(updated, settings);
        const sys = await api.getSystemHosts();
        setSystemHosts(sys);
      }
      setMsg({ text: "方案已成功保存并实时同步生效！", ok: true });
    } catch (e: any) {
      setMsg({ text: `保存失败: ${e?.message || e}`, ok: false });
    } finally {
      setIsApplying(false);
    }
  };

  const handleCreateProfile = async () => {
    if (!newProfileName.trim()) return;
    const newProf: HostsProfile = {
      id: `hosts-${Date.now()}`,
      name: newProfileName.trim(),
      kind: { type: "Local" },
      enabled: false,
      content: "# 自定义 Hosts 方案\n# 格式: IP 域名 [可选域名...]\n",
      order: profiles.length,
    };

    const nextProfiles = [...profiles, newProf];
    setProfiles(nextProfiles);
    await api.saveHostsProfiles(nextProfiles, settings);
    setSelectedId(newProf.id);
    setActiveContent(newProf.content);
    setIsNewOpen(false);
    setNewProfileName("");
    setMsg({ text: `已成功创建方案 "${newProf.name}"`, ok: true });
  };

  const handleDeleteProfile = (id: string, name: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "删除 Hosts 方案",
      message: `确定要删除方案 "${name}" 吗？`,
      subMessage: "删除后方案内的所有域名规则将彻底移除。",
      onConfirm: async () => {
        setConfirmDialog(null);
        const next = profiles.filter((p) => p.id !== id);
        setProfiles(next);
        await api.saveHostsProfiles(next, settings);
        if (selectedId === id) {
          setSelectedId("__system__");
          setActiveContent(systemHosts?.content || "");
        }
        setMsg({ text: `已成功删除方案 "${name}"`, ok: true });
      },
    });
  };

  const handleFlushDns = async () => {
    try {
      await api.flushDns();
      setMsg({ text: "已成功执行 ipconfig /flushdns 刷新本地 DNS 缓存！", ok: true });
    } catch (e: any) {
      setMsg({ text: `刷新 DNS 失败: ${e?.message || e}`, ok: false });
    }
  };

  return {
    profiles,
    settings,
    setSettings,
    systemHosts,
    selectedId,
    activeContent,
    setActiveContent,
    loading,
    isApplying,
    msg,
    setMsg,
    confirmDialog,
    setConfirmDialog,
    isNewOpen,
    setIsNewOpen,
    newProfileName,
    setNewProfileName,
    handleSelectProfile,
    handleToggleProfile,
    handleSaveCurrent,
    handleCreateProfile,
    handleDeleteProfile,
    handleFlushDns,
  };
}
