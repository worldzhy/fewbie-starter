# ADR-012：`useRouteNavigate` 透传 Next.js router 选项

- 状态：已采纳
- 日期：2026-11-25
- 仓：fewbie-starter
- 关系：扩展 ADR-001（框架根布局挂载 Provider）里的 `useRouteNavigate` 契约；解决 nightwatch 宿主对框架文件的本地改动无法回流的问题

## 背景

nightwatch-frontend 在 `src/fewbie/framework/feedback/navigation-progress.tsx` 上做过本地改动：`navigate(href, { replace })` 只接受 `replace`，而宿主需要 `scroll` / `shallow`（滚动位置与 history 语义由调用点决定，框架不应替宿主固定）。宿主改了框架文件，却按旧哈希写回了 `.fewbie/framework.json`，且顶层 digest 与 `files` 不再自洽；升级后的 CLI 判定 `malformed` 并拒绝更新。

框架基线（ADR-056 D3）只为「宿主可安全被覆盖」而存在，一旦宿主必须改框架文件才可用，说明框架契约缺一个参数。正确修法是把这个能力放进模板，而不是让宿主带着无法升级的本地补丁。

## 决策

1. `useRouteNavigate` 的 `navigate` 接收 `{ replace?, scroll?, shallow? }`：`replace` 仍表示 `router.replace` / `router.push` 的选择，其余选项原样透传给对应的 router 调用。
2. 不引入第二套导航封装：宿主需要滚动或 shallow 语义时直接传参，不再复制 provider。
3. nightwatch 的本地改动随本 ADR 回流模板；宿主删除损坏的 `.fewbie/framework.json` 重新采纳框架副本（内容与本决定一致，宿主侧无功能变化）。

## Cross-host check

| 维度     | 框架层                                                      | 宿主层                          |
| -------- | ----------------------------------------------------------- | ------------------------------- |
| 签名     | `navigate(href, { replace?, scroll?, shallow? })`           | 直接传参，不再本地修改 provider |
| 默认行为 | 省略选项时等同 `router.push(href)` / `router.replace(href)` | 语义不变（向后兼容）            |
| 升级     | `template update` 覆盖该文件                                | 宿主无本地补丁，冲突消失        |

## 影响

- 存量调用保持不变（新增可选字段）。
- 宿主不再需要为滚动/历史语义 fork 框架文件；基线冲突检测恢复有效。
- 验证：`npm run lint`、`npm test`、`npm run build`、`npm run check:template`。
