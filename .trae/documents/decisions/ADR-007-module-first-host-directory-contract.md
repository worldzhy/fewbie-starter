# ADR-007：采用 module-first 宿主目录契约

- 状态：已采纳
- 日期：2026-11-23
- 仓：fewbie-starter
- 关系：落地 devbie ADR-069（block 单元）与 ADR-070（host 目录契约 module-first）；沿用 ADR-002（framework baseline）、ADR-006（框架测试归属）

## 背景

registry 载荷此前落在 `src/items/<item>/<layer>/`，与 registry 仓自己的 `fewbie.module.json`、模块目录命名不一致：仓叫 modules、清单叫 module，单位却叫 item。devbie ADR-070 把自有词表统一为 module，并把宿主落盘前缀改为 `src/fewbie/modules/<module>/<layer>/`，`item` 只保留在 shadcn 线格式边界。本仓作为模板，框架同步面、eslint 边界、门禁脚本与 baseline 都要跟着换路径。

## 决策

1. registry 载荷写入 `src/fewbie/modules/<module>/<layer>/`，与 `fewbie.module.json` 同层命名；模块清单与 `files` 数组按 module 命名，`item` 不再出现在自有词表里。
2. CLI 自有面收敛到 `src/fewbie/{framework,adapters,i18n,ui}`；`src/fewbie/i18n/config.ts` 由框架同步，`src/fewbie/adapters/**` 与 `src/fewbie/modules/**` 仍归宿主（由 `modules adapters` / `modules add|update` 写入）。
3. 归属清单（`template-ownership.ts`）按最长前缀解析新路径；eslint 模块边界规则与 `scripts/check-*.mjs` 门禁同步改判 `src/fewbie/modules` 前缀。
4. `src/fewbie/i18n/config.test.ts` 留在宿主侧：它断言宿主消息命名空间（`home`）与框架消息同载，属宿主集成测试，因此迁回 `src/i18n/config.test.ts`（命中 `src/i18n/**` 宿主 glob），不被 `template update` 同步。
5. `@devbie/fewbie-cli` 升到 `^1.16.0`（module-first 目录契约与配套 registry 快照）；`.fewbie/framework.json` 按新的框架文件集重新生成。

## 影响

- 宿主 `fewbie modules apply|update` 后，载荷落在 `src/fewbie/modules/**`；旧 `src/items/**` 不再被识别，未迁移的宿主需要重装模块。
- 宿主 `fewbie template update` 会按新路径同步框架文件；`src/i18n/config.test.ts` 这类断言宿主内容的测试不会被覆盖。
- 旧版 CLI（≤1.15.x）拒绝新路径，宿主必须同步升级到 1.16.0。
