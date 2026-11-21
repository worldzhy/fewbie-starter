# Backlog

Unfinished engineering tasks. Completed items are deleted (git history is the archive).

来源标记：`[安全评审 round3 2026-10-31]` 指 devbie 仓 `.trae/documents/expert-review-2026-10-31-round3.md`（已入库）。本仓条目由 2026-11-02 二次取证拆 ID 入账。

## 治理残余

（已全部关闭：G4-5 Dockerfile 推 `e06a9e6`，G4-6 smoke test + Node 原生 runner 推 `e8b907d`（统一 fewbie-starter 与 newbie-starter 测试栈），ci.yml timeout-minutes 推 `35eb3bb`。）

## 组件体系评审 round1 残余（2026-11-21，台账 `.trae/documents/findings.md`）

- [R1-22] R12 门禁仍只在 PR 触发（`ci.yml` 只有 `pull_request: [main]`），直推 dev 不受保护。改触发器要连带解决「一次 push 多个 framework commit、ADR 只在其中一条」的判定，且会给 dev 每次 push 套上完整 build + docker 成本，需单独立项。
- [R1-26] `.fewbie/framework.json` 基线可被宿主改写。同文件内自校验没有意义（改写者可以重算），真实修复必须有外部信任锚：由 `@devbie/fewbie-cli` 发布包内自带模板基线（或读取 registry 固定 commit），`template update` 时用它校验宿主基线并拒绝硬改写。属 devbie CLI 契约变更，需 ADR 后再动代码。
- 发布 `@devbie/fewbie-cli` 1.6.3 后重跑 `npm run check:template`（本地 1.6.2 缺 M2 注册表条目）。
