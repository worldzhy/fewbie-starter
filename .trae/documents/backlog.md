# Backlog

Unfinished engineering tasks. Completed items are deleted (git history is the archive).

来源标记：`[安全评审 round3 2026-10-31]` 指 devbie 仓 `.trae/documents/expert-review-2026-10-31-round3.md`（已入库）。本仓条目由 2026-11-02 二次取证拆 ID 入账。

## 治理残余

（已全部关闭：G4-5 Dockerfile 推 `e06a9e6`，G4-6 smoke test + Node 原生 runner 推 `e8b907d`（统一 fewbie-starter 与 newbie-starter 测试栈），ci.yml timeout-minutes 推 `35eb3bb`。）

## 组件体系评审 round1 残余（2026-11-21，台账 `.trae/documents/findings.md`）

- [R1-10] `CHART_PALETTE` 与 `--chart-*` token 漂移（6 色 vs 5 token）。
- [R1-11] `CHART_TOOLTIP_STYLE` 硬编码 `#16213a/#e6ecf7`；与 R1-15 的 style 颜色检测一起做。
- [R1-12] 四个 Provider 无挂载点；`theme-provider.tsx` 与 `next-themes` 为死代码。
- [R1-15] R3 不拦 `style` 内颜色（R2 变量名已扩展）。
- [R1-17] `PageShell` 双重内边距、`min-h-screen` 与 `SidebarShell` 冲突、`PageHeader` 强制 `h1`。
- [R1-18] `SectionTabs` 无匹配路由时把第一个 tab 设为 active。
- [R1-19] 框架组件硬编码英文，R7 不覆盖 `src/framework/**`。
- [R1-20] `InputGroupAddon` 的 `onClick` 被覆盖；`Table` 无谓 `"use client"`。
- [R1-21] `globals.css` body 的 background/color/font-family 使用 `!important`。
- [R1-22] R12 门禁仍只在 PR 触发，直推 dev 不受保护。
- [R1-23] `NavigationProgressProvider` 卸载时未清 30s 定时器。
- [R1-25] 折叠态导航 `<Link>` 无 `aria-label`。
- [R1-26] `.fewbie/framework.json` 基线可被宿主改写，需完整性机制。
- 发布 `@devbie/fewbie-cli` 1.6.3 后重跑 `npm run check:template`（本地 1.6.2 缺 M2 注册表条目）。
