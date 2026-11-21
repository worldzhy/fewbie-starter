# Expert Review — fewbie 前端组件复用体系（round 2）

评审对象：fewbie 框架的 primitive / framework 分层，以及它在真实宿主中的复用与漂移。
评审性质：只读。本报告是 2026-11-21 的时点快照，后续状态由 `findings.md` 承载。

## 1. 锚点

| 仓                  | branch | HEAD       | dirty | 用途                            |
| ------------------- | ------ | ---------- | ----- | ------------------------------- |
| fewbie-starter      | dev    | `269641e`  | 0     | 被审主仓（模板 + framework 层） |
| devbie              | dev    | `7b5aff59` | 0     | 只读：CLI 所有权与基线机制      |
| nightwatch-frontend | dev    | `659b805`  | 0     | 只读：真实宿主的复用与漂移      |

- 评审时间：2026-11-21 21:51–22:10（+08:00）。
- 并行会话：被审域无 dirty 文件，结论无需标记 provisional。
- 环境：宿主无 node/npm；全部 Node 命令经容器 `66b958b39256`（工作区挂载 `/home/worldzhy/src/...`）。
- 反驳轮：3 个无共享上下文的独立代理，只拿「结论 + file:line」，主会话读码裁决（部分独立：同基础模型）。

## 2. 范围与方法

**scope：`workspace`（fewbie 框架模板仓 + 唯一在册消费仓）**。该体系无模块装配面，§2 的「装配一致性」标 N/A；模板漂移门、`template update` 行为、宿主复用面是本轮核心取证项。

### 审了

- `fewbie-starter`：`src/framework/**`（22 文件）、`src/components/ui/**`（29 primitive）、`src/app/{layout.tsx,host-providers.tsx}`、`src/i18n/config.ts`、`eslint.config.mjs`、`AGENTS.md`、`.fewbie/framework.json`、`scripts/**`。
- `devbie`：`packages/fewbie-cli/src/lib/template-ownership.ts`、`src/commands/template/update.ts`、`src/commands/create.ts`、`test/template-ownership.test.ts`。
- `nightwatch-frontend`：`src/app/**`、`src/components/**`（112 文件）的复用面、palette 分布、shadow 副本、CI 门禁、`package.json` 依赖。

### 明确排除

`node_modules/**`、`.next/**`、业务页面与业务组件的内部逻辑、视觉渲染与浏览器运行时、部署链路（宿主声明 offline）、registry 模块。

**范围外观察**：工作区之外存在第二个 fewbie 宿主 `crewbie-console-frontend`（HEAD `f135c4f`，依赖 `@devbie/fewbie-cli@^1.6.2`）。它同样没有 `src/framework/`、0 处 `@/framework` import，但不在本次 workspace scope 内，只作为「零采用不是单仓偶然」的旁证记录，未审其内部。

### 执行证据

被测树断言：starter `269641e` dirty 0；host `659b805` dirty 0；devbie `7b5aff59` dirty 0。

| 命令（容器内）                                                                                 | 结果                                                                    |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| host：`npx fewbie template update --check --template-path /tmp/tpl-origin-dev`（已安装 1.6.2） | `✓ Project template files are up to date`（exit 0）                     |
| host：HEAD 源 CLI 对同一 origin/dev 模板 `--check`                                             | 9 files drift；含 `src/app/layout.tsx`、`src/i18n/config.ts`、7 个 ui   |
| host：HEAD 源 CLI 对本地 starter `--check`                                                     | 46 files drift；含 8 个 ui、22 个 framework、8 个 scripts、manifest     |
| host：HEAD 源 CLI `--check .fewbie/framework.json`                                             | `1 template file(s) to update: .fewbie/framework.json (create)`         |
| starter：`node` 遍历统计 framework 分层                                                        | 22 framework / 29 ui；消费者仅 `src/app/layout.tsx`、`src/app/page.tsx` |
| host：`node` 遍历统计（`src/**/*.{ts,tsx}`，排除 `src/components/ui/**`）                      | palette 400 处 / 209 行 / 186 字面量 / 54 文件；`@/framework` 0 文件    |
| devbie：`npm test`（`packages/fewbie-cli`）                                                    | 88 tests / 88 pass / 0 fail                                             |
| `git ls-tree origin/dev -- .fewbie`、`git cat-file -e origin/dev:.fewbie/framework.json`       | 均无 manifest（本地 `269641e` 有）                                      |

## 3. 结论摘要与维度评分

复用体系本身的分层纪律是干净的，问题全部出在**分发与落地**：framework 层在真实宿主中零采用，而新的 framework 所有权一旦发布，会在没有基线保护的首次更新里覆盖宿主内容。

| 维度 | 评分 | 依据                                                       |
| ---- | ---- | ---------------------------------------------------------- |
| 安全 | 4/5  | 未发现新增安全面；风险集中在内容覆盖导致的功能丢失         |
| 架构 | 2/5  | framework 层无消费者；宿主以 shadow 副本分叉维护           |
| 契约 | 2/5  | 所有权扩张未同步 AGENTS.md；基线保护的承诺与可达性不一致   |
| 测试 | 2/5  | framework 仅 1 个单测文件；无渲染层测试；宿主侧无复用测试  |
| 门禁 | 2/5  | 新所有权依赖的 manifest 未发布；迁移即 lint 红，无渐进路径 |
| 治理 | 3/5  | 决策与台账齐备，但发布顺序（模板 / CLI / 宿主）没有约束    |

本轮 **0 P0 / 3 P1 / 5 P2**。

## 4. P0

无。

## 5. P1

### R2-01 复用层在真实宿主零采用，模板修复无法到达宿主

- **证据（executed）**
  - host：`src/framework` 不存在；`@/framework` 引用 0 文件（node 遍历，见 §2 命令表）。
  - template：framework 22 文件，模板内消费者只有 `src/app/layout.tsx` 与 `src/app/page.tsx`；`src/components/ui/**` → `@/framework` 0 处（方向正确）。
  - host 用 shadow 副本实现同类能力，且尺寸已分叉：`page-shell/index.tsx` 72 行 vs 模板 99 行；`page-header/index.tsx` 42 vs 41；`loading/index.tsx` 39 vs 35；`confirm-dialog/index.tsx` 213 vs 199；`inline-result.tsx` 79 vs 77；`navigation-progress.tsx` 105 vs 113（`wc -l`）。
  - `nightwatch-frontend/src/components/chart/` 5 个文件，`chart-palette.ts:1-5` 仍是硬编码 6 色并注明 "aligned ... by hand"；模板已是 token 解析 + `chart-theme.ts` + `chart-tokens.test.ts`。
- **可达角色**：宿主维护者 / 后续所有使用这些组件的页面作者。
- **暴露面**：template + 宿主源码（宿主 offline，非 live 生产数据风险）。
- **复现**：`ls nightwatch-frontend/src/framework`（不存在）；`node` 遍历 host `src` 统计 `@/framework`（0）。
- **影响**：round 1 对 chart 配色、`closeLabel`、按钮点击组合等修复只存在于模板；宿主继续维护第二套实现，任何一侧的修复都不会自动传播。复用体系名义上交付、实际未生效。
- **修复方向**：M4 明确二选一——真实迁移一个宿主到 `src/framework/**`（并删除 shadow），或把 `src/framework/**` 降级为 examples 并在文档中撤回「framework 所有权」的表述。二者都不应在「已交付复用层」的口径下继续并存。

### R2-02 新所有权下，存量宿主的首次更新会覆盖宿主内容，且无阻断

- **证据（executed）**
  - 已安装 `@devbie/fewbie-cli@1.6.2` 对 origin/dev 模板：`✓ up to date`（exit 0）。新所有权（`src/app/layout.tsx`、`src/components/ui/**`、`src/i18n/config.ts` 归 framework）来自 devbie `63c8dd22`，仅存在于未发布的本地 `dev`（`7b5aff59`）。
  - 同一宿主、HEAD 源 CLI、origin/dev 模板：9 个文件 `update`，含 `src/app/layout.tsx`、`src/i18n/config.ts`、7 个 ui primitive。
  - HEAD 源 CLI + 本地 starter 模板：46 个文件，含 8 个 ui、22 个 framework（create）、8 个 scripts、`src/app/host-providers.tsx`（create）、`.fewbie/framework.json`（create）。
  - 覆盖是真实内容丢失：宿主 `layout.tsx` 与模板相差 63 行，含 `ClientProviders`、`FrontendMonitor`、`ApiErrorToast`、`Toaster`、next-intl server 接线；宿主 `src/i18n/config.ts` 相差 62 行，含 `NEXT_LOCALE` cookie、`localePrefix: "never"`、proxy locale 检测。
  - 唯一提示是 `update.ts:361-371` 的 `console.warn`；`planTemplateUpdate` 在 `baseline === undefined` 时直接走 `update`（`template-ownership.ts:569-598`），没有 `modified-framework`，也没有交互确认。
- **可达角色**：任何按 AGENTS.md「Pull skeleton updates with `npx fewbie template update`」操作的宿主维护者。
- **暴露面**：source（未发布 CLI `7b5aff59` + 本地 starter `269641e`）；发布后即 artifact。
- **复现**：在 host 执行 `node --import tsx .../devbie/packages/fewbie-cli/src/index.ts template update --check --template-path /home/worldzhy/src/fewbie-starter`，观察 46 文件清单。
- **影响**：`layout.tsx` 的监控 / 错误提示 / i18n 接线被丢弃（宿主页面仍可编译，属 static 推断），locale 解析配置被替换；一次 `update` 后写入的新 manifest 把这次覆盖固化为「宿主已接受」。
- **修复方向**：pre-manifest 首次更新改为两阶段——先按模板写入基线并重新 plan，再执行；或在 `baseline === undefined` 且存在 framework `update` 时直接拒绝，要求显式 `--adopt-baseline`。仅靠 warn 不足以保护存量宿主。

### R2-03 基线保护在文档化流程中不可达，警告文案承诺了不会发生的事

- **证据（executed）**
  - `.fewbie/framework.json` 只存在于 starter 本地 `dev`（`269641e`）；`origin/dev`（`35500ba`）与 `origin/main`（`d0355b8`）都没有。
  - `create.ts:51-60`：未指定 `--template-ref` 时默认 `HEAD`（即模板仓默认分支 main）。
  - `template-ownership.ts:506-508`：模板缺该文件时 `continue`，不会生成 manifest change；而 `update.ts:361-371` 在写盘前就断言 "the manifest shipped by this update protects later runs"。
  - 宿主 CI 使用 `--template-ref dev`（`nightwatch-frontend/.github/workflows/ci.yml:40`），同样指向无 manifest 的 origin/dev。
  - 唯一的建基线方式是未文档化的路径过滤：`template update .fewbie/framework.json` 可只写 manifest（executed：`1 template file(s) to update: .fewbie/framework.json (create)`），且要求所用模板 ref 已包含该文件。
- **可达角色**：所有宿主维护者与 CI。
- **暴露面**：template / source。
- **复现**：`git cat-file -e origin/dev:.fewbie/framework.json`（absent）；在 host 执行路径过滤 `--check`（1 create）。
- **影响**：按文档走的宿主永远处于 pre-manifest，`modified-framework` 保护永不生效；警告文案把「本次更新会写 manifest」当成事实，而模板无 manifest 时并不会写。R2-02 的破坏路径因此没有自动兜底。
- **修复方向**：(1) 先把 manifest 发布到 `dev` 与 `main`，再发 CLI；(2) 默认 ref 不含 manifest 时明确报错而不是 warn；(3) 在 AGENTS.md / CLI help 中提供并文档化 baseline bootstrap（独立子命令或显式 flag），不要要求用户记住内部路径。

## 6. P2

| ID    | 主题                | 结论与证据                                                                                                                                                                                                                                                                                                                 | 暴露面                                                                                                                                                                                                                                                                                                                               |
| ----- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R2-04 | palette 门禁迁移    | 模板 `eslint.config.mjs:161` 的 palette 规则为 `error` 级，无 warn / staged（`grep -n warn` 无命中）。宿主作用域内 186 个字面量、400 处、54 文件。采用模板 eslint 后 `npm run lint` 至少报出这些 error，M4 无法渐进。                                                                                                      | template                                                                                                                                                                                                                                                                                                                             |
| R2-05 | primitive 分叉方向  | 8 个 ui 文件与本地模板不同（`date-picker` 2 行、`dialog` 10、`input-group` 3、`progress` 1、`sheet` 5、`table` 1、`tabs` 1、`tooltip` 4；`diff -u                                                                                                                                                                          | grep -c '^[+-][^+-]'`）。其中宿主确有定制：`tooltip.tsx`用`bg-night-elevated`（宿主 `globals.css`定义 10 个`--night-*`）、`table.tsx`加了`"use client"`、`date-picker.tsx`用`useTranslations("common")`；模板领先的部分：`sheet`的`closeLabel`、`progress`的`value`、`tabs`的`orientation`。覆盖会丢宿主主题定制，不覆盖则继续分叉。 | host |
| R2-06 | 治理文档漂移        | 模板 `AGENTS.md:29` 的「Never edit framework-synced files」仍只列 7 个文件；新所有权（`template-ownership.ts:113-178`）已把 `src/app/layout.tsx`、`src/components/ui/**`、`src/framework/**`、`scripts/**`、`src/i18n/config.ts`、`.fewbie/framework.json` 收归框架。宿主同名块由模板同步，因此两个仓的 agent 都会被误导。 | template + host                                                                                                                                                                                                                                                                                                                      |
| R2-07 | chart shadow 已漂移 | 宿主 `src/components/chart/chart-palette.ts:1-5` 硬编码 6 色并自称手工对齐；模板 `src/framework/chart/chart-palette.ts` 走 token 解析，另有 `chart-theme.ts` 与 `chart-tokens.test.ts`。R1 的 token 化修复（starter `3f5e387`）未传播。                                                                                    | host                                                                                                                                                                                                                                                                                                                                 |
| R2-08 | 框架测试面          | framework 22 文件仅 `src/framework/chart/chart-tokens.test.ts` 1 个单测（node 遍历）；page / shell / feedback / states 无渲染或行为测试，模板门禁 R1/R5/R9/R10 均为静态扫描。                                                                                                                                              | template                                                                                                                                                                                                                                                                                                                             |

## 7. 误报剔除

反驳轮推翻了本轮初判的 4 条表述，均不改写为 findings，只保留修正后的版本：

1. **「pre-manifest 宿主执行 `template update` 会静默覆盖 layout 与 8 个 ui」→ 部分推翻。** 已发布的 1.6.2 对 origin/dev 模板返回 `✓ up to date`；覆盖只在 devbie `63c8dd22` 发布后出现。且「静默」不准确：`printChange` 会逐个打印 unified diff，`update.ts:361-371` 也有黄色警告；CI 的 `--check` 会以非零退出阻断（`update.ts:387-397`）。「8 个被宿主修改」也不准确：多数差异是模板领先（sheet/dialog/progress/tabs），宿主侧真实定制是 tooltip、table、date-picker。修正后见 R2-02。
2. **「nightwatch-frontend 是唯一消费仓」→ 部分推翻。** 工作区外的 `crewbie-console-frontend` 也是 fewbie 宿主且同样零采用。结论方向不变且更强，但范围表述收窄为「在册消费仓」。
3. **「没有 init 命令，因此无法先建基线」→ 部分推翻。** `template update .fewbie/framework.json` 的路径过滤可以只写 manifest（已实测 1 create），随后全量更新会把差异报为 `modified-framework`。真正的缺陷是不可发现、且要求模板 ref 自带 manifest，已并入 R2-03。
4. **「palette 131 处」→ 推翻。** 任何口径都复现不出 131。复算命令见 §2，结果为 400 处 / 209 行 / 186 字面量 / 54 文件；修正后见 R2-04。

## 8. 已核验通过的不变量

| 不变量                                                                 | 证据（命令）                                                                     |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `src/components/ui/**` 不反向依赖 `src/framework/**`                   | node 遍历：`ui -> framework imports: 0`                                          |
| framework → ui 的依赖是受控的少量文件                                  | node 遍历：`framework -> ui imports: 5`                                          |
| framework 内无硬编码 UI 文案（title/aria-label/placeholder/alt/label） | node 正则统计：`framework literal UI attrs: []`；文案统一走 `useTranslations`    |
| 模板内 framework 消费者只有 root layout 与首页                         | node 遍历：`consumers of @/framework: src/app/layout.tsx, src/app/page.tsx`      |
| manifest digest 篡改会被拒绝、pre-digest 清单仍可读                    | `packages/fewbie-cli` `npm test`：88 pass / 0 fail（含 digest 篡改与兼容两例）   |
| 宿主改过的 framework 文件不会被静默覆盖（有基线时）                    | 单测「refuses to overwrite a framework file the host modified (ADR-056 D3)」通过 |
| scaffold `host-providers.tsx` 采用后不再改写                           | 单测「host extension point (ADR-056 D5)」通过                                    |
| 三仓工作树在评审期间保持 clean                                         | 锚点命令：dirty 0 / 0 / 0                                                        |

## 9. 覆盖率清单

**审了**：framework 22 文件的分层与依赖方向；ui 29 primitive 的 template↔host 差异；`layout.tsx` / `host-providers.tsx` / `i18n/config.ts` / `eslint.config.mjs` 的 template↔host 差异；CLI 的所有权表、`planTemplateUpdate`、manifest 读写、`--check` 行为；host 的 `src/app` 与 `src/components`（112 文件）的 import/palette/shadow 面；host CI 与依赖 pin；AGENTS.md 与 findings/ADR 引用。

**没审**：宿主业务页面与业务组件内部逻辑；真实浏览器渲染与交互；`npm run build` / `npm run lint` 的实际执行（本轮只做静态读取与 CLI 探针）；部署与镜像；`crewbie-console-frontend` 内部；registry 模块。

**未审原因**：本轮 scope 是复用体系，渲染与业务逻辑不构成其证据；宿主 offline 且数据可丢弃，运行时证据优先级低于分发契约。

## 10. 修复优先级

1. **R2-02**：发布阻断项。首次更新必须两阶段或显式 opt-in，禁止在无基线时覆盖宿主文件。
2. **R2-03**：manifest 先进 `dev` / `main`，再发 CLI；默认 ref 无 manifest 时明确报错；文档化 baseline bootstrap。
3. **R2-01**：M4 决策落地——迁移宿主或撤回 framework 所有权口径，二选一。
4. **R2-04**：迁移期提供 staged/warn 配置或基线 allowlist，避免 lint 一次性全红。
5. **R2-05 / R2-06 / R2-07 / R2-08**：随 M4 一并处理（差异回收、文档清单、chart 去重、补行为测试）。

## 11. 台账指针

本轮 8 条 finding 已追加到 `.trae/documents/findings.md` 的「Round 2」小节，状态均为 `open`；本轮只读，未创建修复 commit。
