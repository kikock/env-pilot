---
description: env-pilot 代码审查与架构量化约束 (Tauri 2.x + Rust 系统原生底层 + Fluent Design)
---

# env-pilot 核心量化指标与架构约束规范

## 1. 核心量化代码指标 (Quantitative Code Constraints)

- **单文件长度 (File Length)**：推荐 `<= 300` 行，硬性上限 `<= 500` 行。超过 500 行必须拆分。
- **单函数长度 (Function Length)**：推荐 `<= 30` 行，硬性上限 `<= 50` 行。
- **单文件核心处理函数 (Functions per File)**：`<= 5` 个核心业务/Command 处理函数。
- **圈复杂度 (Cyclomatic Complexity)**：`<= 5`，严禁多层分支逻辑嵌套。
- **Tauri Command 参数**：`<= 3` 个统一封装的 Payload 结构体。

---

## 2. 架构边界与工程底线 (Architecture Boundaries)

### 2.1 Tauri 2.x 与 Rust 系统原生底层约束
- **系统核心操作下沉原则**：
  - Windows 注册表（Registry）、系统环境变量（PATH）、`hosts` 文件读写、网络网卡重置等核心系统操作，必须全部由 Rust 原生代码原子化完成。
  - 关键操作必须具备前置自动备份机制（如备份旧 hosts 到 `.bak`），严禁破坏性覆写。
- **安全与错误传播 (Zero Unwrap)**：
  - 严禁任何裸调 `.unwrap()` 或 `.expect()`，系统级调用必须返回明确的 `Result<T, SystemError>`。
  - 涉及提权（UAC Administrator）与权限拒绝时，必须提供清晰的结构化错误码与前端友好提示。
- **IPC 性能与响应基准**：
  - 系统配置读取/变更的 Command 往返时延 `<= 100ms`。
  - 前端保持轻量状态，数据变更均通过 Rust 发出的状态事件同步。

### 2.2 Fluent Design 视觉设计规范（量化指标）
- **Windows 设置风格对齐 (Windows 11 Settings Style)**：
  - 采用标准导航侧栏 + 扁平卡片列表（Settings Card Group）布局。
- **圆角体系 (Corner Radius)**：
  - 交互控件（按钮、Switch 开关、输入框、标签）：`4px`。
  - 设置项卡片、分组容器、危险确认弹窗：`8px`。
- **深度与微交互 (Elevation & Micro-interactions)**：
  - 扁平边框卡片（`1px solid rgba(0,0,0,0.06)`）配合微妙的悬浮投影。
  - 悬停/开关过渡动效 `<= 180ms`，缓动采用 `cubic-bezier(0.1, 0.9, 0.2, 1.0)`。
- **安全警告与色彩层级**：
  - 正常配置使用 Accent 主题色，敏感/危险修改（如删除系统路径、覆盖 hosts）使用警示色，且对比度 `>= 4.5:1` 并配备模态确认机制。
