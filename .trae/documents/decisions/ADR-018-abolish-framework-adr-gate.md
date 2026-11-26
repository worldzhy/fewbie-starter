# ADR-018：取缔 R12“框架改动需 ADR”门禁

- 状态：已采纳
- 日期：2026-11-26
- 仓：fewbie-starter
- 触发：nightwatch-frontend round110 R110-12 讨论；用户判定“存在性检查”不合理，明确要求彻底取缔
- 取代：ADR-010 第 3 条

## 背景

R12（`scripts/check-framework-adr.mjs`）的判定只有两条：

1. 改动文件里是否有落在 `FRAMEWORK_PATHS` 的框架文件；
2. 改动文件里是否有 `.trae/documents/decisions/` 下的文件。

两条同时为真即放行。它**不读 ADR 内容，也不建立“哪个框架文件由哪条 ADR 说明”的对应关系**，因此：

- 同一次 diff 里随便碰一个 `decisions/` 文件（哪怕只加一行）就能满足门禁，是形式化可绕过的提示，而非证明。
- 机械性文件也被算作“框架契约变更”。ADR-010 第 3 条正是为此让步：digest-only 的基线刷新必须在 ADR-010 追加维护记录来“喂”门禁——这本身印证了门禁在制造形式满足。
- `.fewbie/framework.json` 这类由 `template update` 自动重写的基线清单被纳入契约变更，会让纯基线刷新在 dev→main PR 上被误判。

维持一个既不能证明对应关系、又需要靠补维护记录来满足的门禁，收益低于维护成本与误报成本。用户据此要求取缔。

## 决策

1. 删除 `scripts/check-framework-adr.mjs` 及 `package.json` 的 `check:framework-adr` 脚本。
2. 删除 `.github/workflows/ci.yml` 中 `guards` 与 `verify` 两个 job 的 `Framework ADR gate` 步骤；随之移除仅为其服务的 `fetch-depth: 0` 与相关注释。
3. 删除 `scripts/gates.test.mjs` 的 R12 用例与导入。
4. 删除 `.github/pull_request_template.md` 的 R12 勾选项；保留“是否引入新跨宿主契约/架构决策，或链接 ADR”的人工勾选。
5. `eslint.config.mjs` 头注释不再列出 R12。
6. 用 `fewbie template update --template-path .` 重新生成 `.fewbie/framework.json`（ADR-010 第 1 条仍然有效：基线只经 CLI 写出）。
7. “框架改动要不要写 ADR”回归设计评审：由 PR 模板的人工勾选和 review 判断，不再由脚本机械拦截。

## Cross-host check

| 维度     | 框架层（fewbie-starter）                 | 宿主层（nightwatch-frontend 等）                          |
| -------- | ---------------------------------------- | --------------------------------------------------------- |
| 门禁脚本 | 删除 `check-framework-adr.mjs`           | 已同步的副本在下次 `template update` 收敛；未接线则无影响 |
| CI       | 删除两条 ADR 作业（仅本仓接线过）        | 本项目从未接线（R110-12 open），无需删作业                |
| ADR 义务 | 由 PR 模板人工勾选 + review 判断         | 同左                                                      |
| 基线清单 | `.fewbie/framework.json` 仍只由 CLI 生成 | 同左                                                      |
| 回滚     | 恢复脚本 + 两条作业 + 测试用例           | 同左，随模板同步                                          |

## 影响

- 框架文件变更不再有机械门禁，完全依赖人工设计评审；这是本 ADR 有意接受的代价。
- ADR-010 第 3 条（digest-only 需追加维护记录以满足 R12）随本 ADR 失效；ADR-010 第 1、2 条继续有效。
- ADR-006、ADR-009 中把 R12 当作既有约束的背景表述保留为历史，不再构成当前流程。

## 验证

- `npm run check:structure`、`npm run format:check`、`npm test`、`npm run build` 全绿。
- `npx fewbie template update --check --template-path .` 在重算基线后退出 0。

## 更新记录

- 2026-11-26：新立并落地取缔。
