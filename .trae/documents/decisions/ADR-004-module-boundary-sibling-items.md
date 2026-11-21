# ADR-004：模块边界允许引用 registryDependencies 声明的兄弟 item

- 状态：已采纳
- 日期：2026-11-22
- 仓：fewbie-starter
- 关系：细化 ADR-057（fewbie 模块契约与锁文件）在模板 eslint 门禁上的落地；对应 devbie ADR-062

## 背景

`eslint.config.mjs` 的 `MODULE_CODE` 规则把 `src/modules/**` 限制为「React + `@/components/ui/*` + `@/lib/utils` + 自身文件」，`@/modules/*` 整体禁止。

但 registry 侧 `registryDependencies` 是 item 共享代码的正式机制：CLI 递归安装被依赖 item，锁文件记录其版本与哈希。`fewbie-modules` 的 R84-01 让 `forgot-password` 通过该机制复用 `password-checklist` 的密码策略后，宿主安装即触发 lint error —— 两条契约互相矛盾。

## 决策

1. `no-restricted-imports` 移除 `@/modules/*`。其余边界不变：`@/app/*`、`@/features/*`、`@/framework/*`、`@/api`、`@/api/*`、`@/i18n/*`、`@/components/*`（`ui` 除外）、`@/lib/*`（`utils` 除外）仍禁止；`next`/`next-intl`/`axios`/`sonner`/`swr`/`@tanstack/*`/`@radix-ui/*` 仍禁止。
2. lint 不承担依赖校验：eslint 逐文件静态检查，不解析依赖图。未声明的 item 不会安装，`fewbie modules update --check` 会因缺文件直接判红，失败点比 lint 更早。
3. `MODULE_BOUNDARY_MESSAGE` 同步说明「自身文件与 `registryDependencies` 声明的兄弟 item」。

## 影响

- 使用兄弟 item 的宿主：`fewbie template update` 后 lint 转绿，业务代码无需改动。
- 未同步模板的宿主：旧规则继续生效，表现为可观测的 lint error，不会静默放行。
- 宿主业务层（`src/app/**`、`src/features/**`）的 R4/R7 门禁不受影响。
