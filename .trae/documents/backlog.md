# Backlog

Unfinished engineering tasks. Completed items are deleted (git history is the archive).

来源标记：`[安全评审 round3 2026-10-31]` 指 devbie 仓 `.trae/documents/expert-review-2026-10-31-round3.md`（已入库）。本仓条目由 2026-11-02 二次取证拆 ID 入账。

## P2（安全评审 round3，模板/ops 主题）

newbie-starter 已就同构问题入账 R3-G4-1..G4-6，本仓同构项随其修复一并回灌：

- [ ] `[R3-G4-5]` **P2** 模板仓无 Dockerfile（同 newbie-starter）。
- [ ] `[R3-G4-6]` **P2** 模板零测试（同 newbie-starter）。

## 治理残余（2026-11-02 复核）

- [ ] `.github/workflows/ci.yml` 已有 `concurrency`，仍无 `timeout-minutes`。
