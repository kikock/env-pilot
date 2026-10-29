/**
 * env-pilot 代码审查与量化约束自动门禁检查工具
 * 依据 .agents/workflows/code-review-standards.md 执行自动化静态审计
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const SRC_DIRS = [
  path.join(ROOT_DIR, 'src'),
  path.join(ROOT_DIR, 'src-tauri', 'src'),
];

const FILE_HARD_LIMIT = 500;
const FILE_RECOMMENDED_LIMIT = 300;

let hasViolations = false;
const violations = [];
const warnings = [];

function scanDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', 'target', 'gen', '.git'].includes(entry.name)) {
        continue;
      }
      scanDir(fullPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (['.ts', '.tsx', '.rs'].includes(ext)) {
        checkFile(fullPath);
      }
    }
  }
}

function checkFile(filePath) {
  const relPath = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const lineCount = lines.length;

  // 1. 检查单文件行数硬限制与推荐限制
  if (lineCount > FILE_HARD_LIMIT) {
    violations.push(`[硬性超标] ${relPath} 当前 ${lineCount} 行 (超过硬限制 ${FILE_HARD_LIMIT} 行)，必须进行模块拆分！`);
    hasViolations = true;
  } else if (lineCount > FILE_RECOMMENDED_LIMIT) {
    warnings.push(`[推荐优化] ${relPath} 当前 ${lineCount} 行 (建议控制在 ${FILE_RECOMMENDED_LIMIT} 行以内)`);
  }

  // 2. 检查 Rust 代码中的生产级 .unwrap()
  if (filePath.endsWith('.rs')) {
    let inTestBlock = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('#[cfg(test)]') || line.includes('mod tests {')) {
        inTestBlock = true;
      }
      if (!inTestBlock && line.includes('.unwrap()')) {
        // 忽略注释中的 unwrap
        const trimmed = line.trim();
        if (!trimmed.startsWith('//') && !trimmed.startsWith('/*')) {
          violations.push(`[安全违规] ${relPath}:${i + 1} 发现未捕获的 .unwrap()，违背 Zero Unwrap 规范，请使用 Result<T, E> 传播！`);
          hasViolations = true;
        }
      }
    }
  }
}

console.log('🔍 开始执行 env-pilot 核心量化指标与架构约束静态审计...\n');
for (const dir of SRC_DIRS) {
  scanDir(dir);
}

if (warnings.length > 0) {
  console.log('⚠ 推荐优化项：');
  for (const w of warnings) {
    console.log(`   ${w}`);
  }
  console.log('');
}

if (hasViolations) {
  console.error('❌ 架构门禁校验失败，发现违背 code-review-standards.md 的致命项：');
  for (const v of violations) {
    console.error(`   ${v}`);
  }
  console.error('\n请先按规范重构后再进行构建与提交。\n');
  process.exit(1);
} else {
  console.log('✅ 完美通过！所有代码文件均满足单文件硬限制 (<= 500行) 与 Rust Zero Unwrap 约束。\n');
  process.exit(0);
}
