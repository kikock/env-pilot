# env-pilot 项目级开发规范与最高准则 (rules.md)

## 1. 核心架构与技术栈约束
- **主框架**：Tauri 2.x + Rust 系统原生底层 + React 18 + TypeScript + Fluent Design (Win11 Settings 风格)。
- **工作流与审查规范**：必须强制遵守 [.agents/workflows/code-review-standards.md](file:///.agents/workflows/code-review-standards.md) 中的全部量化指标。

## 2. 核心量化指标红线
1. **代码规模**：单文件行数 `<= 300` 行（硬上限 `<= 500` 行）；单函数 `<= 30` 行（硬上限 `<= 50` 行）。
2. **系统底层安全与原子性**：
   - 环境变量、Hosts 与注册表操作必须在 Rust 层实现原子操作，修改前必须生成快照备份。
   - 严禁生产代码裸调 `.unwrap()` / `.expect()`，统一返回 `Result<T, SystemError>`。
3. **IPC 延迟要求**：系统查询与变更响应时延 `<= 100ms`。
4. **Fluent Design (Win11 设置规范)**：
   - 开关/小按钮圆角 `4px`，设置卡片圆角 `8px`。
   - 交互动效时长 `<= 180ms`，缓动采用 `cubic-bezier(0.1, 0.9, 0.2, 1.0)`。
   - 危险操作必须触发二次模态确认，高对比度色彩合规（`>= 4.5:1`）。

## 3. 后续更新自动化门禁 (Continuous Compliance)
- **强制门禁校验**：所有代码变更在构建前均会自动触发 `npm run check:standards`。
- **硬性阻断标准**：
  - 任意 `.tsx`/`.ts`/`.rs` 文件行数超过 500 行，构建立即报错阻断。
  - Rust 生产代码中出现未经处理的 `.unwrap()`，构建立即报错阻断。
- **持续合规工作流**：在提交或推送前，必须保证 `npm run build` 和 `cargo test` 全部绿灯通过。
