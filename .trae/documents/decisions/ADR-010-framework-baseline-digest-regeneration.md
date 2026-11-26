# ADR-010：框架基线 digest 只经 CLI 再生成

- 状态：已采纳（第 3 条由 ADR-018 取代）
- 日期：2026-11-25
- 仓：fewbie-starter
- 关系：落实 [ADR-002](ADR-002-framework-baseline-digest.md) 的 digest 自校验机制在维护环节的操作约束

## 背景

`.fewbie/framework.json` 的 `digest` 是对排序后 `files` 映射的规范化串接再 sha256（ADR-002 公式）。任何一条文件 hash 变化都会使旧 digest 失效：`parseFrameworkManifest` 重算不符即返回 `null`，CI 的模板归属检查随之报 stale。

2026-11-25 的 8047402 只更新了单个框架文件的 hash、未重算顶层 digest，CI 立即报 `.fewbie/framework.json is stale (90 framework file(s) in the template)`，PR 门禁被阻塞。用 `fewbie template update --template-path .` 重新生成后恢复（dd1dbc5）。

## 决策

1. `.fewbie/framework.json` 只能由 `fewbie template update --template-path .` 写出（CLI 在序列化时重算 digest，天然自洽）；禁止在 CLI 之外手改任何条目或 digest。只改文件 hash 不重算 digest 产生的是 CLI 自己都会拒绝的清单。
2. digest-only 变更（无框架内容语义变化，仅基线重算）是机械维护，不构成跨宿主契约变更，不单独新立设计决策；其设计依据就是 ADR-002 与随框架内容变更的对应决策（如 ADR-009）。
3. 为满足推送级 R12 增量门禁（guards 以 `github.event.before` 为基线，要求框架文件变更的推送范围内含 decisions/ 文件），digest-only 维护提交必须在本 ADR 的维护记录追加一行，与框架基线变更同提交落地。

## 维护记录

- 2026-11-25 dd1dbc5：重算 digest（修复 8047402 遗留的 hash-无-digest 不一致；本次修复本身未携带维护记录，由本 ADR 创建提交一并登记）。

## 更新记录

- 2026-11-26：R12 门禁由 ADR-018 取缔，本 ADR 第 3 条（digest-only 需追加维护记录以满足 R12）随之失效；第 1、2 条继续有效。
