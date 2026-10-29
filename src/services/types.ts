// ---------------- EnvPilot 核心数据模型与类型定义 ----------------

export type EnvScope = "System" | "User";
export type ValueKind = "Sz" | "ExpandSz" | "Dynamic";
export type IssueSeverity = "Error" | "Warning" | "Info";

export interface SystemStatus {
  is_admin: boolean;
  user_name: string;
  os_info: string;
}

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

export interface ScannedHost {
  ip: string;
  hostname: string;
  mac: string;
  vendor: string;
  os: string;
  latency_ms: number;
}

export interface NetConnectionInfo {
  proto: string;
  local_ip: string;
  local_port: number;
  remote_ip: string;
  remote_port: number;
  remote_host: string;
  state: string;
  pid: number;
  process_name: string;
  path: string;
}
