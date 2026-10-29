import { invoke } from "@tauri-apps/api/core";

export const isTauriEnv = (): boolean => {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
};

// ---------------- 类型定义 ----------------

export interface SystemStatus {
  is_admin: boolean;
  user_name: string;
  os_info: string;
}

export type EnvScope = "System" | "User";
export type ValueKind = "Sz" | "ExpandSz" | "Dynamic";
export type IssueSeverity = "Error" | "Warning" | "Info";

export interface EnvIssue {
  severity: IssueSeverity;
  message: string;
}

export interface EnvItem {
  raw: string;
  expanded: string;
  exists: boolean;
  is_duplicate: boolean;
  is_empty: boolean;
  issues: EnvIssue[];
}

export interface EnvVar {
  name: string;
  raw_value: string;
  expanded_value: string;
  kind: ValueKind;
  scope: EnvScope;
  is_multi: boolean;
  items: EnvItem[];
  issues: EnvIssue[];
  is_protected: boolean;
}

export interface EnvState {
  system: EnvVar[];
  user: EnvVar[];
  revision: string;
}

export interface EnvChange {
  scope: EnvScope;
  name: string;
  old_value: string | null;
  new_value: string | null;
  kind: ValueKind;
}

export interface SystemHostsInfo {
  path: string;
  content: string;
  is_readonly: boolean;
  encoding: string;
}

export interface HostsProfile {
  id: string;
  name: string;
  kind: { type: "Local" } | { type: "Remote"; url: string };
  enabled: boolean;
  content: string;
  order: number;
}

export interface HostsSettings {
  is_single_mode: boolean;
  write_strategy: "Managed" | "Overwrite";
  auto_flush_dns: boolean;
}

export interface AdapterInfo {
  guid: string;
  index: number;
  name: string;
  description: string;
  mac: string;
  is_dhcp: boolean;
  ip: string;
  mask: string;
  gateway: string;
  dns: string[];
  is_up: boolean;
  is_wireless: boolean;
}

export interface AdapterTabConfig {
  adapter_name: string;
  adapter_desc: string;
  apply_ip: boolean;
  ipv4: {
    mode: "Dhcp" | "Static";
    ip: string;
    mask: string;
    gateway: string;
  };
  apply_dns: boolean;
  dns: {
    mode: "Dhcp" | "Static";
    primary: string;
    secondary: string;
  };
}

export interface NetProfile {
  id: string;
  group: string;
  name: string;
  adapters: AdapterTabConfig[];
  proxy: {
    mode: "Keep" | "Disable" | "Manual";
    server: string;
    bypass: string;
  };
  linked_hosts_id: string | null;
}

export interface SnapshotMeta {
  id: string;
  module: "Env" | "Hosts" | "Net";
  created_at: string;
  summary: string;
}

// ---------------- API 调用包装 ----------------

export const api = {
  // 系统
  async getSystemStatus(): Promise<SystemStatus> {
    if (!isTauriEnv()) {
      return { is_admin: false, user_name: "WebDebugUser", os_info: "Windows 11 (Browser Mock)" };
    }
    return await invoke<SystemStatus>("get_system_status_cmd");
  },

  async relaunchAsAdmin(page?: string, pendingJson?: string): Promise<void> {
    if (!isTauriEnv()) {
      throw new Error("当前处于 Web 预览模式。在生产桌面客户端中，点击此按钮将唤起 Windows UAC 对话框并以管理员身份重启 EnvPilot。");
    }
    await invoke("relaunch_as_admin_cmd", { page, pendingJson });
  },

  async listSnapshots(module?: string): Promise<SnapshotMeta[]> {
    if (!isTauriEnv()) return [];
    return await invoke<SnapshotMeta[]>("list_snapshots_cmd", { module });
  },

  // 环境变量
  async getEnvState(): Promise<EnvState> {
    if (!isTauriEnv()) {
      return {
        system: [
          {
            name: "Path",
            raw_value: "C:\\WINDOWS\\system32;C:\\WINDOWS;D:\\tools\\bin",
            expanded_value: "C:\\WINDOWS\\system32;C:\\WINDOWS;D:\\tools\\bin",
            kind: "ExpandSz",
            scope: "System",
            is_multi: true,
            is_protected: true,
            issues: [],
            items: [
              { raw: "C:\\WINDOWS\\system32", expanded: "C:\\WINDOWS\\system32", exists: true, is_duplicate: false, is_empty: false, issues: [] },
              { raw: "C:\\WINDOWS", expanded: "C:\\WINDOWS", exists: true, is_duplicate: false, is_empty: false, issues: [] },
              { raw: "D:\\tools\\bin", expanded: "D:\\tools\\bin", exists: false, is_duplicate: false, is_empty: false, issues: [{ severity: "Error", message: "路径不存在: D:\\tools\\bin" }] }
            ]
          },
          {
            name: "JAVA_HOME",
            raw_value: "D:\\developmentTool\\mise\\data\\installs\\java\\temurin-21.0.12+101.0.LTS",
            expanded_value: "D:\\developmentTool\\mise\\data\\installs\\java\\temurin-21.0.12+101.0.LTS",
            kind: "Sz",
            scope: "System",
            is_multi: false,
            is_protected: false,
            issues: [],
            items: []
          }
        ],
        user: [
          {
            name: "Path",
            raw_value: "C:\\Users\\ck\\.cargo\\bin;D:\\developmentTool\\mise\\bin",
            expanded_value: "C:\\Users\\ck\\.cargo\\bin;D:\\developmentTool\\mise\\bin",
            kind: "Sz",
            scope: "User",
            is_multi: true,
            is_protected: true,
            issues: [],
            items: [
              { raw: "C:\\Users\\ck\\.cargo\\bin", expanded: "C:\\Users\\ck\\.cargo\\bin", exists: true, is_duplicate: false, is_empty: false, issues: [] },
              { raw: "D:\\developmentTool\\mise\\bin", expanded: "D:\\developmentTool\\mise\\bin", exists: true, is_duplicate: false, is_empty: false, issues: [] }
            ]
          }
        ],
        revision: "mock-rev-1"
      };
    }
    return await invoke<EnvState>("get_env_state_cmd");
  },

  async applyEnvChanges(changes: EnvChange[]): Promise<string> {
    if (!isTauriEnv()) {
      return "mock-snapshot-id-1234";
    }
    return await invoke<string>("apply_env_changes_cmd", { changes });
  },

  // Hosts
  async getSystemHosts(): Promise<SystemHostsInfo> {
    if (!isTauriEnv()) {
      return {
        path: "C:\\Windows\\System32\\drivers\\etc\\hosts",
        content: "# SwitchHosts!\n# ide\n0.0.0.0 account.jetbrains.com\n0.0.0.0 oauth.account.jetbrains.com",
        is_readonly: false,
        encoding: "UTF-8"
      };
    }
    return await invoke<SystemHostsInfo>("get_system_hosts_cmd");
  },

  async getHostsProfiles(): Promise<[HostsProfile[], HostsSettings]> {
    if (!isTauriEnv()) {
      return [
        [
          {
            id: "ide",
            name: "ide 屏蔽列表",
            kind: { type: "Local" },
            enabled: true,
            content: "0.0.0.0 account.jetbrains.com\n0.0.0.0 oauth.account.jetbrains.com",
            order: 0
          }
        ],
        { is_single_mode: false, write_strategy: "Managed", auto_flush_dns: true }
      ];
    }
    return await invoke<[HostsProfile[], HostsSettings]>("get_hosts_profiles_cmd");
  },

  async saveHostsProfiles(profiles: HostsProfile[], settings: HostsSettings): Promise<void> {
    if (!isTauriEnv()) return;
    await invoke("save_hosts_profiles_cmd", { profiles, settings });
  },

  async applyHosts(profiles: HostsProfile[], settings: HostsSettings): Promise<string> {
    if (!isTauriEnv()) return "mock-hosts-snap";
    return await invoke<string>("apply_hosts_cmd", { profiles, settings });
  },

  async flushDns(): Promise<void> {
    if (!isTauriEnv()) return;
    await invoke("flush_dns_cmd");
  },

  // 网络适配器
  async listAdapters(): Promise<AdapterInfo[]> {
    if (!isTauriEnv()) {
      return [
        {
          guid: "{mock-wlan}",
          index: 12,
          name: "WLAN",
          description: "Intel(R) Wi-Fi 6E AX211 160MHz",
          mac: "AA-BB-CC-DD-EE-FF",
          is_dhcp: true,
          ip: "192.168.1.108",
          mask: "255.255.255.0",
          gateway: "192.168.1.1",
          dns: ["223.5.5.5", "119.29.29.29"],
          is_up: true,
          is_wireless: true
        }
      ];
    }
    return await invoke<AdapterInfo[]>("list_adapters_cmd");
  },

  async getNetProfiles(): Promise<NetProfile[]> {
    if (!isTauriEnv()) {
      return [
        {
          id: "home",
          group: "",
          name: "家",
          adapters: [
            {
              adapter_name: "WLAN",
              adapter_desc: "Intel(R) Wi-Fi 6E AX211",
              apply_ip: true,
              ipv4: { mode: "Dhcp", ip: "", mask: "", gateway: "" },
              apply_dns: true,
              dns: { mode: "Static", primary: "223.5.5.5", secondary: "119.29.29.29" }
            }
          ],
          proxy: { mode: "Disable", server: "", bypass: "" },
          linked_hosts_id: "ide"
        },
        {
          id: "office",
          group: "",
          name: "公司",
          adapters: [
            {
              adapter_name: "以太网",
              adapter_desc: "Realtek Gaming 2.5GbE Family Controller",
              apply_ip: true,
              ipv4: { mode: "Dhcp", ip: "", mask: "", gateway: "" },
              apply_dns: true,
              dns: { mode: "Dhcp", primary: "", secondary: "" }
            }
          ],
          proxy: { mode: "Disable", server: "", bypass: "" },
          linked_hosts_id: null
        }
      ];
    }
    return await invoke<NetProfile[]>("get_net_profiles_cmd");
  },

  async saveNetProfiles(profiles: NetProfile[]): Promise<void> {
    if (!isTauriEnv()) return;
    await invoke("save_net_profiles_cmd", { profiles });
  },

  async activateNetProfile(profileId: string): Promise<string> {
    if (!isTauriEnv()) return "mock-net-snap";
    return await invoke<string>("activate_net_profile_cmd", { profileId });
  }
};
