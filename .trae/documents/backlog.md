# Backlog

Unfinished engineering tasks. Completed items are deleted (git history is the archive).

来源标记：`[安全评审 round3 2026-10-31]` 指 devbie 仓 `.trae/documents/expert-review-2026-10-31-round3.md`（已入库）。本仓条目由 2026-11-02 二次取证拆 ID 入账。

## 治理残余

（已全部关闭：G4-5 Dockerfile 推 `e06a9e6`，G4-6 smoke test + Node 原生 runner 推 `e8b907d`（统一 fewbie-starter 与 newbie-starter 测试栈），ci.yml timeout-minutes 推 `35eb3bb`。）

## 组件体系评审 round1 残余（2026-11-21，台账 `.trae/documents/findings.md`）

- 发布 `@devbie/fewbie-cli` 1.6.3 后重跑 `npm run check:template`（本地 1.6.2 缺 M2 注册表条目）。
- 发布后确认 `digest` 字段随 CLI 一起生效：宿主用旧 CLI 收到的清单不含 `digest`，升级到含本改动的版本后首次 `template update` 会补齐（ADR-002）。
