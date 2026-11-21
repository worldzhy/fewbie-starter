# Expert Review — fewbie-starter 组件体系（round 1）

评审对象：fewbie 前端统一框架的组件层与框架层（ADR-056 D4/D5 的落地物）。
评审性质：只读。本报告是 2026-11-21 的时点快照，后续状态由 `findings.md` 承载。

## 1. 锚点

| 仓                  | branch | HEAD       | dirty | 用途                       |
| ------------------- | ------ | ---------- | ----- | -------------------------- |
| fewbie-starter      | dev    | `e390f9e`  | 0     | 被审主仓                   |
| devbie              | dev    | `fa66b407` | 0     | 只读：CLI 所有权表交叉核对 |
| nightwatch-frontend | dev    | `659b805`  | 0     | 只读：存量宿主契约核对     |

- 评审时间：2026-11-21 16:20–16:55（+08:00）；取证命令执行于 16:45。
- 并行会话：被审域无 dirty 文件，无需标记 provisional。
- 环境：宿主无 node/npm；全部 Node 命令经容器 `66b958b39256`（`worldzhy/node:v2.0`），工作区挂载 `/home/worldzhy/src/...`。

## 2. 范围与方法

**scope：`workspace`（fewbie-starter 作为框架模板仓）**。该仓无模块装配面，§2 的「装配一致性」标 N/A；模板漂移门与 `template update --check` 是本轮核心取证项。

### 审了

- `src/components/ui/**`：29 个 primitive（`ls src/components/ui/*.tsx | wc -l` = 29）。
- `src/framework/**`：21 个文件（`find src/framework -type f | wc -l` = 21）。
- 契约与门禁：`eslint.config.mjs`、`scripts/*.mjs`、`src/app/layout.tsx`、`src/app/host-providers.tsx`、`src/i18n/**`、`.fewbie/framework.json`。
- 跨仓只读核对：`devbie/packages/fewbie-cli/src/lib/template-ownership.ts`；`nightwatch-frontend/src/app/{layout.tsx,providers.tsx}`、`src/i18n/**`。

### 明确排除

`node_modules/**`、`.next/**`、生成物、`deploy/**`、发布用 README/文档；未逐行评审的 primitive 在 §9 列明。

### 方法

4 路并行取证（UI primitives / framework runtime / 门禁脚本 / 宿主契约）+ 主会话逐条复核；P1 另起 1 个无共享上下文的独立代理做反驳轮（只移交「结论 + file:line」，属部分独立：同基础模型）。

### 执行证据（被测树 HEAD `e390f9e`，dirty 0）

| 命令                                                                                      | 结果                                     |
| ----------------------------------------------------------------------------------------- | ---------------------------------------- |
| `npm run lint`                                                                            | 0 error / 0 warning                      |
| `npm test`                                                                                | 23 tests, 23 pass, 0 fail                |
| `npm run build`                                                                           | Compiled successfully（Next.js 16.4.6）  |
| `npm run check:structure`                                                                 | R1/R5/R9/R10 全部 0 violation            |
| `node --import tsx .../fewbie-cli/src/index.ts template update --check --template-path .` | `✓ Framework baseline covers 79 file(s)` |
| ESLint `lintText` 探针矩阵（`filePath: src/features/probe.ts(x)`）                        | 见 §5 R1-04、§6 R1-13/14                 |

探针矩阵原始输出：

```
rounded-lg       => no-restricted-syntax
rounded-md       => clean
rounded-sm       => clean
rounded-xl       => no-restricted-syntax
p-[3px]          => no-restricted-syntax
bg-blue-500      => no-restricted-syntax
fetch            => no-restricted-globals
window.fetch     => clean
globalThis.fetch => clean
axios dyn        => clean
R11 literal      => no-restricted-syntax
R11 template     => clean
R11 const        => clean
R2 loader        => no-restricted-syntax
```

### 失败与重跑

- 宿主无 node：所有命令转入容器执行，命令与工作目录记录如上。
- 首次 R11 探针因 heredoc 内反引号转义错误产生解析错误，已重跑并以第二次输出为准。

## 3. 结论摘要与维度评分

**0 P0 / 6 P1 / 20 P2。**

| 维度 | 评分 | 依据                                                                                                           |
| ---- | ---- | -------------------------------------------------------------------------------------------------------------- |
| 安全 | 4/5  | 前端域无凭证/越权面；未发现 `dangerouslySetInnerHTML` 之外的注入点（layout 内联主题脚本为常量）。              |
| 架构 | 3/5  | 分层清晰（primitive / framework / host），但框架层依赖宿主文件、多个 Provider 无挂载点。                       |
| 契约 | 2/5  | layout→host-providers、i18n config 两处会在宿主升级时断裂；R6 与自身提示矛盾。                                 |
| 测试 | 3/5  | 23 条门禁夹具覆盖 R1–R12 的合规/违规双路径，但无组件渲染测试（Provider、Tooltip、Progress 类缺陷均未被测出）。 |
| 门禁 | 3/5  | 规则可执行、CI 已接；但 R3/R6 不覆盖框架自身，R2/R4/R11/R12 存在可复现绕过。                                   |
| 治理 | 3/5  | ADR-056 与 spec 对齐；但「框架文件已符合 token 体系」的注释与事实相反（见 R1-05）。                            |

一句话结论：**29 个 primitive 的代码本体基本干净；真正的问题在「框架层与门禁层的自洽性」**——门禁管不到框架自己的文件，框架 layout 依赖一个升级流程不会下发的宿主文件。

## 4. P0

无。

## 5. P1（按仓分组）

### fewbie-starter / devbie（所有权表）

#### R1-01 框架 layout 依赖 host-owned 文件，`template update` 不会为存量宿主创建它

- 证据：
  - `src/app/layout.tsx:9` `import { HostProviders } from "./host-providers";`，`:60-63` 用它包裹整棵树。
  - `src/app/host-providers.tsx:1-10` 注释自称「`template update` ships this file once and never rewrites it」。
  - `devbie/packages/fewbie-cli/src/lib/template-ownership.ts:172` 把它登记为 `ownership: "host"`；`:193-195` 的 `isSyncableAsset` 只允许 framework/mixed/scaffold；`:462-484` 的 `planTemplateUpdate` 默认只遍历 `SYNCABLE_ASSETS`（host 已被过滤），因此**不存在**「首次下发」分支。
  - `nightwatch-frontend/src/app/` 只有 `providers.tsx`，无 `host-providers.tsx`（`ls` 实测）。
- 可达性：宿主执行 `fewbie template update` 时（运维/开发者操作）。
- 暴露面：`template`。
- 影响：可用性——layout 被替换后 `Module not found: ./host-providers`，构建失败。
- 可利用性：直接。
- 补充：nightwatch 的 `src/app/layout.tsx` 与模板基线不同，D3 会先报 `modified-framework` 冲突并中止更新；因此实际表现是「升级被卡住」而非静默损坏。两条路径都要求 M4 提供明确的人工合并步骤，而现在没有。
- 修复方向：把 `host-providers.tsx` 改成 `scaffold`（缺失即创建、存在即保留），或在 `planTemplateUpdate` 中为 host 资产增加「仅当缺失时创建」的 `create` 类别；同时修正文件头注释。

#### R1-06 框架 i18n config 与存量宿主契约不兼容

- 证据：
  - `template-ownership.ts:146` 把 `src/i18n/config.ts` 登记为 `framework`。
  - `src/i18n/config.ts:39-40` 动态 import `./messages/${locale}.json` **和** `./messages/framework.${locale}.json`，`:44` 合并为 `{ ...hostMessages, framework: frameworkMessages }`。
  - `nightwatch-frontend/src/i18n/messages/` 只有 `en.json`、`zh.json`（`ls` 实测），没有 `framework.*.json`。
  - nightwatch 的 `src/i18n/config.ts` 是定制版：`import { SUPPORTED_LOCALES } from "./locales"`、`localeDetection: true`、依赖 `src/proxy.ts` 做 locale 协商（读码确认）。
- 可达性：M4 迁移执行者。
- 暴露面：`template`。
- 影响：可用性/正确性——直接采用模板 `config.ts` 会因缺失 `framework.<locale>.json` 构建失败；保留宿主版本则与「config.ts 归框架所有」的 D1/D4 契约冲突。
- 可利用性：直接（迁移路径上必然遇到）。
- 修复方向：二选一并在 spec 写明——(a) 框架消息改为可选加载（`try/catch` 或 `import.meta.glob` 语义的静态映射），(b) M4 明确「先补 `framework.*.json`，再替换 config.ts」的步骤，并把 `src/i18n/**` 从框架所有权中降级为 mixed。

### fewbie-starter / UI primitive

#### R1-02 Tooltip 依赖 `TooltipProvider`，但全仓没有任何挂载点

- 证据：
  - `src/framework/shell/sidebar-chrome.tsx:69-72`（折叠态导航行）与 `:154-157`（折叠切换按钮）直接渲染 `<Tooltip>`。
  - `src/components/ui/tooltip.tsx:11-13` 的 `Tooltip` 只是 `TooltipPrimitive.Root`，不自带 Provider；`:7-9` 定义、`:43` 导出 `TooltipProvider`。
  - `grep -rn "TooltipProvider" src` 只命中定义与导出，**0 个挂载点**（layout / host-providers / framework 全部没有）。
  - Radix 的 context 无默认值时抛错：`node_modules/@radix-ui/react-context/dist/index.mjs:44-52`；tooltip Root 在 `@radix-ui/react-tooltip/dist/index.mjs:86` 调用该 hook。
- 可达性：宿主首次把 `SidebarNavLink`/`SidebarCollapseToggle` 用于折叠态时（当前模板内这两个组件 0 消费者，属潜伏缺陷）。
- 暴露面：`template`。
- 影响：可用性——渲染即抛 `Tooltip must be used within TooltipProvider`，侧栏崩溃。
- 可利用性：直接。
- 修复方向：在框架 layout 内挂 `TooltipProvider`（框架自有、无需宿主配合），或让 `Tooltip` 包装器自身提供 Provider 并允许嵌套覆盖。

#### R1-03 Tooltip 使用未定义的 `night-*` token

- 证据：
  - `src/components/ui/tooltip.tsx:31` `bg-night-elevated ... text-night-foreground`；`:37` `bg-night-elevated fill-night-elevated`。
  - `src/app/globals.css:16-68` 的 `@theme inline` 只登记 `background/card/foreground/.../chart-*/sidebar-*`，无 `night`；全仓 `grep "night-"` 只命中 tooltip 自身（2 处）。
  - Tailwind v4 对未登记的 utility 不生成规则，也不报错。
- 可达性：同 R1-02（Provider 修好后立即可见）。
- 暴露面：`template`。
- 影响：正确性——tooltip 无背景、箭头无填充，浮层文字直接叠在页面上；同时违反 R3（非语义、未定义 token）。
- 可利用性：直接。
- 修复方向：改用 `bg-popover text-popover-foreground`，箭头用 `fill-popover`；若确需独立浮层色，在 `:root`/`.dark` 定义 `--popover` 语义 token 而非新造 `night` 体系。

### fewbie-starter / 门禁

#### R1-04 R6 门禁拒绝它自己推荐的 `rounded-lg`

- 证据：
  - `eslint.config.mjs:21-22` 的 `OFF_SCALE_SPACING` 含 `rounded-(?:lg|xl|2xl|3xl)`。
  - 同文件 `:70` 的提示文案：「Use the design radius (rounded-md/rounded-lg)」。
  - 执行探针：`rounded-lg => no-restricted-syntax`；`rounded-md`、`rounded-sm` 为 clean。
- 可达性：任意宿主页面作者。
- 暴露面：`template`（门禁随模板下发）。
- 影响：正确性/可用性——按提示使用 `rounded-lg` 的页面直接 lint 失败；`globals.css:60-66` 恰好把 `--radius-lg: 8px` 定义为「container radius」，即推荐值本身。
- 可利用性：直接。
- 修复方向：正则去掉 `lg`（保留 `xl|2xl|3xl`），或把提示改为「只用 rounded-md」，并同步 `--radius` 文档。

#### R1-05 R3/R6 不覆盖 `src/framework/**`，而框架自身正违反这两条规则

- 证据：
  - `eslint.config.mjs:17` `HOST_CODE` 仅含 `src/app/**`、`src/features/**`、`src/components/**`；`:28`、`:104` 仅额外忽略 `src/components/ui/**`。`src/framework/**` 不在任何被 lint 的集合里。
  - `:13-15` 注释声称 `src/components/ui/**` 与 `src/framework/**`「already follow the token/radius system」。
  - 反例：`src/framework/states/error-state.tsx:28` 使用 `border-red-200 bg-red-50 text-red-700 ...`；`src/framework/feedback/inline-result.tsx:22,26,31` 使用 `emerald-*/red-*/blue-*`；`src/framework/states/loading-state.tsx:23` `z-[9999]`、`:29` `h-[200px] w-[200px]`、`:30` `size-[70px]`。
  - 计数：`grep -rn "<palette>-[0-9]" src/components/ui src/framework | wc -l` = 4，全部落在上面 2 个 framework 文件；ui primitives 为 0。
- 可达性：框架维护者、复制框架模式的宿主开发者。
- 暴露面：`template`。
- 影响：契约/门禁——随模板下发的「参考实现」不满足随模板下发的规则；宿主照抄 `error-state` 的写法会在自己的 `src/components` 里被 R3 拦下。注释构成错误不变量。
- 可利用性：直接。
- 修复方向：把 `src/framework/**` 纳入 R3/R6 的 files 范围并修正组件；确实需要例外时用带注释的单独 override，而不是整目录排除。

## 6. P2（按主题归并）

### A. 组件正确性

**R1-07 `Progress` 不把 `value` 传给 Radix Root**
`src/components/ui/progress.tsx:7` 解构了 `value`，`:11-18` 的 `Root` 没有 `value={value}`，只在 `:17` 的 Indicator transform 里用到。后果：`aria-valuenow`/`data-value` 缺失，读屏拿不到进度值；受控语义也不完整。修复：`<ProgressPrimitive.Root value={value} ...>`。

**R1-08 `Tabs` 不把 `orientation` 传给 Root**
`src/components/ui/tabs.tsx:8` 解构 `orientation`，`:12` 仅写 `data-orientation={orientation}`，未传给 `TabsPrimitive.Root`。后果：Radix 内部仍按 horizontal 处理键盘方向键/aria-orientation，垂直 tabs 的交互与视觉样式（`group-data-vertical`）不一致。修复：`orientation={orientation}`。

**R1-09 `DatePicker` 的 i18n key 缺失，且命名空间与框架消息不一致**
`src/components/ui/date-picker.tsx:122` 用 `useTranslations("common")`，`:143,185,190,203,215` 读取 `selectDate/selectDateTime/clear/hour/minute/done`。`src/i18n/messages/en.json` 的 `common` 只有 13 个通用词（ok/cancel/…/done），没有前 5 个；框架消息 `framework.en.json` 也只在 `framework.common` 下提供同样 13 个。next-intl 4 的缺省回退是把 key 当文案渲染并 `console.error`（`node_modules/next-intl/dist/esm/production/initializeConfig-*.js`），因此选择器会显示 `common.selectDate` 之类的原始 key。修复：补齐 key，并与 `confirm-dialog.tsx:73` 的 `framework.common` 命名空间统一。

### B. 图表

**R1-10 图表调色板与 `--chart-*` token 漂移**
`src/framework/chart/chart-palette.ts:5` 硬编码 6 色 `#3b82f6 #f59e0b #10b981 #ef4444 #8b5cf6 #6b7280`；`globals.css:97-101` 的 light token 是 `#2563eb #00b42a #ffaa00 #f53f3f #8490a3`（5 色），`.dark`（`:135`）只覆盖 `--chart-1`。后果：ECharts（canvas）与 DOM 图表用两套颜色，light/dark 也不同步；R3 提示「数据色来自 chart-palette」，但 palette 本身没有对齐 token。

**R1-11 `CHART_TOOLTIP_STYLE` 硬编码深色值，注释与事实不符**
`src/framework/chart/chart-theme.ts:5-10` 固定 `backgroundColor: "#16213a"`、`textStyle.color: "#e6ecf7"`；这两个值全仓仅此一处（`grep "16213a|e6ecf7"`），既不是 `.dark` 的 `--popover: #151b24`，也不是 tooltip 的颜色。注释「mirrors the shared dark surface tokens and the DOM tooltip component」不成立（DOM tooltip 用的是未定义的 `night-*`）。后果：light 主题下图表 tooltip 仍是深色浮层，且与 UI tooltip 两种观感。

### C. 组合与可用性

**R1-12 四个 Provider 均无挂载点，配套 hook 一用即抛；theme 两套实现并存**
`ConfirmProvider`（`src/framework/feedback/confirm-dialog.tsx`）、`NavigationProgressProvider`（`navigation-progress.tsx`）、`TooltipProvider`、`ThemeProvider`（`framework/theme/theme-provider.tsx`）在 `src` 内均无挂载点（`grep` 只命中定义/抛错文案）。`useConfirm`（:194）、`useRouteNavigate`（:102）、`useThemePreference`（theme-provider.tsx:49）都会抛错。同时 `theme-provider.tsx` 0 引用，`package.json:35` 的 `next-themes` 0 引用；主题实际由 `layout.tsx:47-59` 的 cookie + 内联脚本实现。后果：框架导出的是「需要宿主自己记得挂载」的隐式契约，且 `host-providers.tsx` 的空壳没有任何注释提示要挂哪些 Provider。

**R1-17 `PageShell` 的双重内边距、`min-h-screen` 与强制 `h1`**
`src/framework/page/page-shell.tsx:71-74`：`inset === "platform"` 与 `width !== "full"` 各自追加 `px-6 pb-8`，两条分支同时成立时类名重复（tailwind-merge 会去重，但语义含糊）；`:71` 的 `min-h-screen` 在 `SidebarShell` 的 `main` 内会造成整页高度叠加。`page-header.tsx:28` 无条件渲染 `<h1>`，一个 layout 内嵌套两个 `PageShell` 会出现两个 `h1`（R1 扫描只校验「存在 h1 或引用 PageShell」，不校验层级）。

**R1-18 `SectionTabs` 无匹配时把第一个 tab 设为 active**
`src/framework/page/section-tabs.tsx:26-31` 的 `?? items[0]?.href ?? ""`：当 pathname 不属于任何 tab（如详情页）时，第一个 tab 被高亮，误导当前位置。建议无匹配时传 `undefined`（Radix 允许无选中）。

**R1-19 框架组件硬编码英文文案，R7 管不到**
`src/components/ui/dialog.tsx:63`、`sheet.tsx:66` 的 `sr-only "Close"`，`dialog.tsx:96` 的可见 `Close` 按钮，`command.tsx:25-26` 的 `"Command Palette"` / `"Search for a command to run..."`。R7 `jsx-no-literals` 只作用于 `HOST_CODE`（eslint.config.mjs:102-108），框架文件被排除；而 AGENTS.md 又要求宿主不得编辑框架文件。后果：宿主无法在不违反所有权的前提下本地化这些文案。建议框架用 `framework.common` 提供，或暴露 `closeLabel`/`title` 默认参数（command 已有 title/description 参数，dialog/sheet 没有）。

**R1-20 `InputGroupAddon` 的点击聚焦会被调用方 `onClick` 覆盖；`Table` 无谓 `"use client"`**
`src/components/ui/input-group.tsx:54-59` 先定义内部 `onClick`，`:60` 再 `{...props}`，调用方传 `onClick` 时内部聚焦逻辑被整体替换（`Table` 同类问题：`table.tsx:1` 的 `"use client"` 使纯展示表格进入客户端包，`Table` 及其子组件没有任何 hook/事件）。

### D. 门禁可绕过（均已执行验证）

**R1-13 R4 只拦裸 `fetch`/`XMLHttpRequest`，不拦 `window.fetch`、`globalThis.fetch`、动态 `import("axios")`**
探针结果：`window.fetch => clean`、`globalThis.fetch => clean`、`axios dyn => clean`。`no-restricted-globals`（eslint.config.mjs:31-41）只命中标识符引用。修复：改用 `no-restricted-properties`（object: window/globalThis, property: fetch）+ `no-restricted-syntax` 的 `ImportExpression[source.value="axios"]`。

**R1-14 R11 只拦数组首个字面量，模板字面量可绕过**
探针：`queryKey: ["user-list"]` 报错；`queryKey: [\`user-list\`]`clean。选择器（eslint.config.mjs:96）限定`Literal:first-child`。修复：同时匹配 `TemplateLiteral`，或要求 queryKey 首元素必须是标识符。

**R1-15 R2/R3 的选择器窄于规则文本**
R2（eslint.config.mjs:79-93）只匹配 `isLoading|loading|isPending|isFetching` 结尾的变量名，`pending`、`isBusy` 等写法不拦；R3 只匹配 className 字符串里的 palette 类，`style={{ color: "#ff0000" }}` 与 CSS 变量误用不拦。属规则强度问题，不是「已合规」的证明。

**R1-16 R6 只覆盖 `rounded-*` 与 `p/m/gap/space-*`，任意尺寸与层级不拦**
`OFF_SCALE_SPACING`（eslint.config.mjs:21-22）不含 `h/w/size/z/inset`。框架自身的 `loading-state.tsx:23,29,30` 就是反例（`z-[9999]`、`h-[200px]`、`size-[70px]`）。宿主照抄不会被拦。

**R1-22 R12 路径清单有缺口，且只在 PR 触发**
`scripts/check-framework-adr.mjs:16-32` 的 `FRAMEWORK_PATHS` 缺少 `src/i18n/request.ts`（template-ownership.ts:150 为 framework）、`.fewbie/framework.json`（:164）、`src/app/globals.css`（mixed 的框架块）。`:47-49` 无 `--base` 时直接 no-op；CI 只在 PR 上带 `--base`，直接 push 到 dev 的门禁不存在。

**R1-24 R1 页面契约可被注释绕过，feature 页不扫描**
`scripts/check-page-contract.mjs:20` 的 `PAGE_CONTRACT_REFERENCE = /\b(PageShell|PageHeader)\b/`，`:35` 只要源码任意位置出现该词（包括注释）即放行；`:44-56` 只扫 `src/app/**/page.tsx`，`src/features/**` 的页面组件不在范围。后果：注释写「PageShell」+ 裸 `<div>` 根节点可通过。

**R1-26 框架基线可被宿主自行改写**
`.fewbie/framework.json` 与 `scripts/**` 同为 framework 并随模板下发；D3 的冲突检测依赖宿主侧的这份基线。宿主（或一次误提交）同时改文件与基线哈希后，`template update` 会认为「未修改」并覆盖，D3 的保护在该路径上失效。建议基线加上模板侧签名（如模板版本 + 发布侧校验），或至少让 `doctor` 对比远端模板的基线。

### E. 全局样式与运行时

**R1-21 `globals.css` 用 `!important` 锁死 body**
`src/app/globals.css:164-166`：`background`、`color`、`font-family` 全部 `!important`。宿主若想换品牌字体或页面底色（这正是模板的常见定制点），必须在更高优先级或同样 `!important` 上打架。建议去掉 `!important`，靠 `:root` 变量与层叠顺序解决。

**R1-23 `NavigationProgressProvider` 的 30s 定时器在卸载时不清**
`navigation-progress.tsx:70-71` 设置 `linkTimeout`，`:77` 的 effect cleanup 只移除 click 监听，没有 `clearTimeout(linkTimeout.current)`。路由切换后组件若卸载，定时器仍会触发 `setLinkNavigating(false)`。影响很小，但属于明确的清理缺口。

**R1-25 折叠态导航链接没有可访问名**
`src/framework/shell/sidebar-chrome.tsx:59-63` 折叠时 `<Link>` 内只有图标和（被 `!collapsed` 隐藏的）文本；`TooltipContent` 通过 aria-describedby 提供的是描述而非名称。图标链接的可访问名为空。修复：折叠时补 `aria-label={label}`（`SidebarBackButton` 已经有 `backAriaLabel`，可对照）。

## 7. 误报剔除

| 候选结论                                                                  | 裁决     | 依据                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `night-*` 未定义会导致 `next build` 失败                                  | 推翻     | `npm run build` 成功；Tailwind v4 对未知 utility 静默不生成（执行证据见 §2）。真实后果只是视觉缺失，已按 R1-03 保留。                                                                                                  |
| `DatePicker` 缺 key 会在运行时抛异常、整页崩溃                            | 推翻     | next-intl 4 生产构建的 `MISSING_MESSAGE` 走 `getMessageFallback`，渲染 key 并 `console.error`（`node_modules/use-intl/dist/esm/production/core.js`、`initializeConfig-*.js`），不抛到 React 树。已降级为 R1-09（P2）。 |
| `TooltipProvider` 可能由 Radix 内部默认提供                               | 推翻     | `createTooltipContext(PROVIDER_NAME)` 无默认值；`useTooltipProviderContext` 在无 Provider 时执行 `throw`（`@radix-ui/react-context/dist/index.mjs:44-52`）。R1-02 成立。                                               |
| 框架 `config.ts` 会被 `template update` 静默覆盖，nightwatch 立即构建失败 | 部分推翻 | D3 基线检测会把宿主的定制版判为 `modified-framework` 冲突并中止更新（`template-ownership.ts:433`、`:547`；`commands/template/update.ts:240-245`，无 `--force`），不是静默覆盖。已按「M4 迁移路径被卡住」重写 R1-06。   |
| `src/lib/utils.ts` 与 `cn` 包形成两个 `cn` 源，shadcn 新增组件会不一致    | 推翻     | `src/lib/utils.ts` 只有 `export { cn } from "cn"`；全仓 `from "cn"` 40 处、`from "@/lib/utils"` 0 处，两条路径指向同一实现。                                                                                           |

## 8. 已核验通过的不变量

- 29 个 primitive 全部存在且被 `ls` 枚举；`src/framework` 恰为 21 个文件。
- UI primitive 层 0 处原始 palette 类（`grep` 计数 = 0），语义 token 使用一致。
- `cn` 只有一个实现来源：`src/lib/utils.ts` 重新导出 `cn` 包，40 处直接 import 一致。
- `npm run lint`、`npm test`（23/23）、`npm run build`、`npm run check:structure` 在当前树全部通过（执行证据见 §2）。
- 模板基线覆盖 79 个文件，且与模板自身一致（CLI `--check` 通过）。
- R1/R5/R9/R10 四个结构脚本在当前树 0 violation。
- `layout.tsx` 的主题内联脚本是常量字符串，不含用户输入，未发现 XSS 面。

## 9. 覆盖率清单

### 逐行深读

- `src/framework/**` 全部 21 个文件：chart（6）、feedback（4）、page（3）、shell（3）、states（3）、theme（2）。
- UI primitive 深读 11 个：`tooltip`、`progress`、`tabs`、`popover`、`input-group`、`table`、`switch`、`command`、`sheet`、`dialog`、`date-picker`。
- 门禁与契约：`eslint.config.mjs`、`scripts/check-page-contract.mjs`、`scripts/check-framework-adr.mjs`、`scripts/lib/walk.mjs`、`src/app/layout.tsx`、`src/app/host-providers.tsx`、`src/i18n/config.ts`、`src/i18n/messages/*.json`、`.fewbie/framework.json`、`devbie` 的 `template-ownership.ts`、`nightwatch-frontend` 的 `layout.tsx`/`providers.tsx`/`i18n/config.ts`。

### 仅模式扫描（未逐行评审）

`accordion`、`alert-dialog`、`alert`、`avatar`、`badge`、`button`、`calendar`、`card`、`checkbox`、`dropdown-menu`、`input`、`label`、`radio-group`、`select`、`separator`、`skeleton`、`sonner`、`textarea`（18 个）。扫描口径：原始 palette 类、硬编码英文、任意值、`"use client"`、i18n key。未发现超出上文的模式违例；但这不等于逐行评审结论。

### 明确没审

`node_modules/**`、`.next/**`、生成物、`deploy/**`、README/文档、CI workflow 的 YAML 语义（只核对了门禁脚本入口）、nightwatch-frontend 的业务页面（只核对了契约相关文件）。

## 10. 修复优先级

1. **M4 阻断项**：R1-01（host-providers 下发）与 R1-06（i18n config 合并路径）——在任何宿主执行 `template update` 之前必须先解决。
2. **框架层崩溃/视觉缺陷**：R1-02（Provider）、R1-03（night token）——侧栏一旦被宿主采用即暴露。
3. **门禁自洽**：R1-04（rounded-lg 误报）、R1-05（framework 不在 lint 范围）——宿主开始用 R1–R12 的门禁前必须修，否则第一条 `rounded-lg` 就会挡路。
4. **组件 bug**：R1-07、R1-08、R1-09。
5. **门禁加固**：R1-13、R1-14、R1-15、R1-16、R1-22、R1-24、R1-26。
6. 其余 P2（R1-10～R1-12、R1-17～R1-21、R1-23、R1-25）。

## 11. 台账

`R1-01` ～ `R1-26` 已登记在 `.trae/documents/findings.md`。本报告为快照，状态变更以台账为准。
