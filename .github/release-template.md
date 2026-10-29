# 🚀 EnvPilot v__VERSION__ 正式发布

> **EnvPilot** 是一款专为 Windows 10/11 平台打造的高性能系统环境一站式治理桌面应用。基于 **Tauri 2.x + Rust 原生底层 + Fluent Design** 架构，提供环境变量宽幅沉浸治理、Hosts 多方案无损切换与本机网络适配器方案调度。

---

### ✨ 核心功能亮点

- 🎨 **Windows 11 Fluent 视觉美学**：深度契合微软 Fluent Design 设计语言，支持 Mica（云母）/ 亚克力半透明光效，深浅色自适应，沉浸式标题栏。
- 🧩 **环境变量宽幅沉浸治理**：
  - 杜绝传统窗口长路径遮挡，1000px+ 宽幅卡片树表完整展现深层路径；
  - 路径有效性与重复项健康探针（🔴 失效路径标红警示，🟡 重复项一键排查去重）；
  - 写入后通过 Win32 API 自动广播全局 `WM_SETTINGCHANGE` 消息，新终端即时生效。
- 🌐 **Hosts 多方案敏捷切换与无损托管**：
  - 仅在 `# EnvPilot BEGIN` 与 `# EnvPilot END` 区间内合成，100% 完整保留用户手写自定义内容；
  - 右侧方案开关随点随切，毫秒级原子写入并自动刷新系统 DNS 缓存 (`ipconfig /flushdns`)。
- 📶 **本机网络适配器与多方案调度**：
  - 基于 Win32 `GetAdaptersAddresses` 接口毫秒级探查物理硬件适配器；
  - 支持多网卡多页签绑定，一键从当前硬件配置读取参数；
  - 覆盖 IPv4 静态/动态 DHCP、首选备用 DNS 及系统代理联动切换。
- 🛡️ **最小权限模型与全自动快照回滚**：
  - 普通权限免提权启动，仅在写入系统级配置时提示管理员提权重启并无缝保留暂存修改；
  - 所有写入操作自动生成全量状态快照（保留最近 50 份），支持随时一键无损回滚。

---

### 📥 资产安装指南

| 安装程序 / 格式 | 适用系统 | 架构 | 说明 |
| :--- | :--- | :--- | :--- |
| **`env-pilot-setup-__VERSION__-x64.exe`** | Windows 10 / 11 | `x64` | **官方标准安装包**（向导式安装，带快捷方式与卸载程序） |
| **`env-pilot-portable-__VERSION__-x64.exe`** | Windows 10 / 11 | `x64` | **单文件免安装便携版**（双击即用，不写注册表，U 盘即插即用） |
| **`env-pilot-__VERSION__-win-x64.zip`** | Windows 10 / 11 | `x64` | **绿色免安装压缩包**（解压到任意目录直接运行） |

#### 快速开始：
1. **安装版用户**：下载 `env-pilot-setup-__VERSION__-x64.exe`，运行向导完成安装；
2. **便携版用户**：下载 `env-pilot-portable-__VERSION__-x64.exe` 或解压 `.zip` 压缩包，直接双击运行即可；
3. 首次启动推荐在“环境变量”页签下点击 **“仅显示失效路径”** 快速体检系统环境健康度！

---

### 🔗 相关链接
- 📖 **项目主页**：[kikock/env-pilot](https://github.com/kikock/env-pilot)
- 🐛 **问题反馈**：[提交 Issue](https://github.com/kikock/env-pilot/issues)
- 📝 **说明文档**：[README.md](https://github.com/kikock/env-pilot/blob/main/README.md)
