# Backlog

Unfinished engineering tasks. Completed items are deleted (git history is the archive).

来源标记：`[安全评审 round3 2026-10-31]` 指 devbie 仓 `.trae/documents/expert-review-2026-10-31-round3.md`（已入库）。本仓条目由 2026-11-02 二次取证拆 ID 入账。

## 治理残余

（已全部关闭：G4-5 Dockerfile 推 `e06a9e6`，G4-6 smoke test + Node 原生 runner 推 `e8b907d`（统一 fewbie-starter 与 newbie-starter 测试栈），ci.yml timeout-minutes 推 `35eb3bb`。）

## 组件体系评审 round1 残余（2026-11-21，台账 `.trae/documents/findings.md`）

（已全部关闭：CLI 1.12.0 发布后 `check:template` 绿——2026-11-22 用 `1.12.0` 重跑通过；`digest` 字段已随 `.fewbie/framework.json` 落地。）

## framework 渲染测试（R86-09，2026-11-22）

已补：jsdom + `@testing-library/react` 底座 `src/components/__tests__/dom.ts`，覆盖 `InlineResult` / `InlineErrorText`、`LoadingState` / `EmptyState` / `ErrorState`、`PageHeader` / `PageShell`（测试总数 70 pass）。测试放在 host-owned 的 `src/components/__tests__/**`，不进入 `template update` 载荷，旧宿主无需新增 devDependencies；`package.json` 的 `test` glob 已加 `src/**/*.test.tsx`。

- [ ] **剩余覆盖**：`src/i18n/request.ts` 依赖 `next/headers` 的请求上下文，需要请求假体或放到宿主侧测试；health route 在 starter 中不存在（由宿主/部署层提供），若需要门禁应加在 fewbie-cli 的 route 约定检查，而不是渲染测试。
