import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  SystemStatus,
  EnvState,
  EnvChange,
  SystemHostsInfo,
  HostsProfile,
  HostsSettings,
  AdapterInfo,
  NetProfile,
  SnapshotMeta,
  ScannedHost,
  NetConnectionInfo,
} from "./types";

export * from "./types";

export const isTauriEnv = (): boolean => {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
};

// ---------------- API 调用包装 ----------------

export const api = {
  // 系统与提权
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

  async rollbackSnapshot(id: string, module: string): Promise<string> {
    if (!isTauriEnv()) {
      return `[Web 预览模式] 模拟已成功回滚快照: ${id}`;
    }
    return await invoke<string>("rollback_snapshot_cmd", { id, module });
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
            is_multi: true,
            is_protected: false,
            issues: [],
            items: [
              {
                raw: "D:\\developmentTool\\mise\\data\\installs\\java\\temurin-21.0.12+101.0.LTS",
                expanded: "D:\\developmentTool\\mise\\data\\installs\\java\\temurin-21.0.12+101.0.LTS",
                exists: true,
                is_duplicate: false,
                is_empty: false,
                issues: []
              }
            ]
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

  // 网络方案
  async listAdapters(): Promise<AdapterInfo[]> {
    if (!isTauriEnv()) {
      return [
        {
          guid: "{mock-guid-wlan}",
          index: 12,
          name: "WLAN",
          description: "Intel(R) Wi-Fi 6 AX201 160MHz",
          mac: "00-11-22-33-44-55",
          is_dhcp: true,
          ip: "192.168.1.105",
          mask: "255.255.255.0",
          gateway: "192.168.1.1",
          dns: ["192.168.1.1", "8.8.8.8"],
          is_up: true,
          is_wireless: true
        },
        {
          guid: "{mock-guid-eth}",
          index: 5,
          name: "以太网",
          description: "Realtek PCIe GbE Family Controller",
          mac: "AA-BB-CC-DD-EE-FF",
          is_dhcp: true,
          ip: "",
          mask: "",
          gateway: "",
          dns: [],
          is_up: false,
          is_wireless: false
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
          group: "Default",
          name: "家庭无线 (DHCP 自动获取)",
          adapters: [
            {
              adapter_name: "WLAN",
              adapter_desc: "Intel(R) Wi-Fi 6 AX201 160MHz",
              apply_ip: true,
              ipv4: { mode: "Dhcp", ip: "", mask: "", gateway: "" },
              apply_dns: true,
              dns: { mode: "Dhcp", primary: "", secondary: "" }
            }
          ],
          proxy: { mode: "Keep", server: "", bypass: "" },
          linked_hosts_id: null
        },
        {
          id: "company",
          group: "Default",
          name: "公司静态内网 (192.168.10.x)",
          adapters: [
            {
              adapter_name: "WLAN",
              adapter_desc: "Intel(R) Wi-Fi 6 AX201 160MHz",
              apply_ip: true,
              ipv4: { mode: "Static", ip: "192.168.10.88", mask: "255.255.255.0", gateway: "192.168.10.1" },
              apply_dns: true,
              dns: { mode: "Static", primary: "192.168.10.1", secondary: "114.114.114.114" }
            }
          ],
          proxy: { mode: "Keep", server: "", bypass: "" },
          linked_hosts_id: "ide"
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
  },

  async runNetTool(cmd: string, args: string, target: string): Promise<string> {
    if (!isTauriEnv()) {
      return `[Web 预览模式] 模拟执行: ${cmd} ${args} ${target}\r\n正在 Ping ${target || "127.0.0.1"} 具有 32 字节的数据:\r\n来自 ${target || "127.0.0.1"} 的回复: 字节=32 时间<1ms TTL=128\r\n来自 ${target || "127.0.0.1"} 的回复: 字节=32 时间<1ms TTL=128`;
    }
    return await invoke<string>("run_net_tool_cmd", { cmd, args, target });
  },

  async startNetToolStream(
    sessionId: string,
    cmd: string,
    args: string,
    target: string,
    onLine: (line: string) => void,
    onDone: () => void
  ): Promise<() => void> {
    if (!isTauriEnv()) {
      let count = 0;
      onLine(`[Web 模拟流式启动]: ${cmd} ${args} ${target}`);
      const timer = setInterval(() => {
        count++;
        onLine(`来自 ${target || "127.0.0.1"} 的回复: 字节=32 时间=${Math.floor(Math.random() * 4)}ms TTL=128 (第 ${count} 次)`);
        if (count >= 10 && !args.includes("-t") && !args.includes("/t")) {
          clearInterval(timer);
          onDone();
        }
      }, 1000);
      return () => {
        clearInterval(timer);
        onDone();
      };
    }

    const unlistenLine = await listen<string>(`net-tool-line-${sessionId}`, (event) => {
      onLine(event.payload);
    });

    const unlistenDone = await listen(`net-tool-done-${sessionId}`, () => {
      unlistenLine();
      unlistenDone();
      onDone();
    });

    await invoke("start_net_tool_stream_cmd", {
      sessionId,
      cmd,
      args,
      target,
    });

    return async () => {
      unlistenLine();
      unlistenDone();
      try {
        await invoke("stop_net_tool_stream_cmd", { sessionId });
      } catch (err) {
        console.error("停止流式命令异常:", err);
      }
    };
  },

  async stopNetToolStream(sessionId: string): Promise<void> {
    if (!isTauriEnv()) return;
    await invoke("stop_net_tool_stream_cmd", { sessionId });
  },

  async scanSubnet(startIp: string, endIp: string): Promise<ScannedHost[]> {
    if (!isTauriEnv()) {
      return [
        { ip: "192.168.1.1", hostname: "Gateway.Router", mac: "00:11:22:33:44:55", vendor: "TP-Link", os: "Linux/Embedded", latency_ms: 1 },
        { ip: "192.168.1.10", hostname: "Desktop-PC", mac: "AA:BB:CC:DD:EE:FF", vendor: "Intel", os: "Windows 11", latency_ms: 0 },
        { ip: "192.168.1.100", hostname: "iPhone-Mobile", mac: "11:22:33:44:55:66", vendor: "Apple", os: "iOS", latency_ms: 3 },
      ];
    }
    return await invoke<ScannedHost[]>("scan_subnet_cmd", { startIp, endIp });
  },

  async getActiveConnections(): Promise<NetConnectionInfo[]> {
    if (!isTauriEnv()) {
      return [
        { proto: "TCP", local_ip: "127.0.0.1", local_port: 1421, remote_ip: "0.0.0.0", remote_port: 0, remote_host: "*", state: "LISTENING", pid: 18204, process_name: "node.exe", path: "C:\\Program Files\\nodejs\\node.exe" },
        { proto: "TCP", local_ip: "127.0.0.1", local_port: 50062, remote_ip: "127.0.0.1", remote_port: 49983, remote_host: "localhost", state: "ESTABLISHED", pid: 20124, process_name: "Antigravity.exe", path: "C:\\Users\\ck\\AppData\\Local\\Antigravity\\Antigravity.exe" },
        { proto: "UDP", local_ip: "0.0.0.0", local_port: 5353, remote_ip: "*", remote_port: 0, remote_host: "*", state: "LISTENING", pid: 1420, process_name: "svchost.exe", path: "C:\\Windows\\System32\\svchost.exe" },
      ];
    }
    return await invoke<NetConnectionInfo[]>("get_active_connections_cmd");
  },

  // 监听来自系统托盘等通道的页面直达导航事件
  onNavigate(callback: (page: "env" | "hosts" | "net" | "settings") => void): () => void {
    if (!isTauriEnv()) return () => {};
    let unlisten: (() => void) | null = null;
    listen<string>("navigate", (event) => {
      const page = event.payload;
      if (page === "env" || page === "hosts" || page === "net" || page === "settings") {
        callback(page);
      }
    }).then((fn) => {
      unlisten = fn;
    }).catch(console.error);

    return () => {
      if (unlisten) unlisten();
    };
  },

  // 隐藏窗口到托盘
  async hideToTray(): Promise<void> {
    if (!isTauriEnv()) return;
    return await invoke("hide_to_tray_cmd");
  },

  // 彻底退出应用
  async exitApp(): Promise<void> {
    if (!isTauriEnv()) return;
    return await invoke("exit_app_cmd");
  },

  // 监听关闭请求
  onCloseRequested(callback: () => void): () => void {
    if (!isTauriEnv()) return () => {};
    let unlisten: (() => void) | null = null;
    listen("window-close-requested", () => {
      callback();
    }).then((fn) => {
      unlisten = fn;
    }).catch(console.error);

    return () => {
      if (unlisten) unlisten();
    };
  },

  // 获取关闭窗口行为配置
  getCloseAction(): "ask" | "tray" | "quit" {
    const val = localStorage.getItem("envpilot_close_action");
    if (val === "tray" || val === "quit") return val;
    return "ask";
  },

  // 保存关闭窗口行为配置
  setCloseAction(action: "ask" | "tray" | "quit"): void {
    localStorage.setItem("envpilot_close_action", action);
  },
};
