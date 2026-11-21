# ADR-002：框架基线清单带自校验摘要

- 状态：提议中
- 日期：2026-11-21
- 仓：fewbie-starter（实现位于 devbie `packages/fewbie-cli`）
- 关系：细化 devbie ADR-056 D3（`.fewbie/framework.json` 基线）；落实组件评审 R1-26

## 背景

ADR-056 D3 用 `.fewbie/framework.json`（路径 → sha256）记录宿主收到的框架文件版本：`template update` 只有在宿主副本仍等于基线时才静默升级，否则报 `modified-framework` 冲突。

这个机制有一个前提没有守住：**基线文件本身是宿主可写的普通文件**。宿主（或代其操作的脚本/agent）只要把对应条目的 hash 改成修改后的内容，冲突就会消失，`template update` 会静默覆盖宿主的改动。评审 R1-26 记录了这个缺口。

在清单文件内做任何「自校验」都不能防住有决心的攻击者（他可以重算），所以这里的目标是**防误改与防顺手改**：让「手改 hash」不再是一个隐蔽的成功路径，而是一个立刻可见的拒绝。

## 决策

清单增加 `digest` 字段：对排序后的 `files` 映射做规范化串接后再 sha256。

```
digest = sha256("path1:hash1\npath2:hash2\n...")   // 键按字典序
```

- `buildFrameworkManifest` 生成时写入；`serializeFrameworkManifest` 每次重新计算而不是照抄旧值，因此 CLI 写出的清单必然自洽。
- `parseFrameworkManifest` 在 `digest` 存在且与重算值不符时返回 `null`。`template update` 与 `doctor` 都走这个入口，于是：
  - `template update` 拒绝运行并提示「malformed 或被 CLI 之外改过；恢复模板副本，或删除它以重新采纳框架文件（同时失去宿主改动检测）」；
  - `doctor` 报 error 级 finding，而不是把被改过的基线当真。
- 兼容性：`version` 保持 1，`digest` 为可选字段。没有 `digest` 的旧清单继续可读（视作 pre-digest 宿主），下一次 CLI 写入时自动补上；旧版 CLI 忽略未知字段，不会因此破坏宿主。
- 局限（明确记录）：摘要算法与实现都在公开的 CLI 源码里，因此它检测「宿主侧未重算的手改」，不构成对恶意方的密码学保证。真正的信任锚（把基线随 npm 包分发或在 registry 固定 commit 交叉校验）需要发布链路配合，另起决策。

## 为什么不选「与 registry 交叉校验」

`fewbie template update` 拉取的模板源码本身随版本前进，宿主清单记录的是「上次同步时的模板状态」，两者天然可能不同。用 registry 当前 HEAD 去校验宿主清单会产生大量版本滞后误报，必须先引入「宿主上次同步的模板 commit」这一新状态，成本高于收益。

## Cross-host check

| 维度     | 框架层（fewbie-cli）                       | 宿主层                                             |
| -------- | ------------------------------------------ | -------------------------------------------------- |
| 清单格式 | 生成/序列化时写入 `digest`，解析时校验     | 不感知，`template update` 写什么就收到什么         |
| 手改基线 | 解析失败 → update 拒绝、doctor 报错        | 恢复模板副本或删除清单重新采纳（后者失去改动检测） |
| 旧宿主   | 无 `digest` 的清单照常解析，下次写入补齐   | 无需任何迁移动作                                   |
| 旧 CLI   | 忽略 `digest` 字段，模板整体下发时原样保留 | 升级 CLI 前不会校验摘要，升级后立即生效            |
| 回滚     | 去掉 `digest` 校验即回到 ADR-056 D3 原状   | 回滚后手改基线的隐蔽路径重新出现，与本文之前一致   |
