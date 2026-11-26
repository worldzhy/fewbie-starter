# ADR-014：错误订阅者注入、apits 适配器与 QueryClient 访问器

- 状态：已采纳
- 日期：2026-11-26
- 仓：fewbie-starter
- 关系：落实 devbie ADR-080（D1/D2/D3）；收窄 ADR-011 第 2 条「宿主需要不同默认值时嵌套自己的 provider」——默认值差异改由框架发版，不再允许嵌套第二层 provider

## 背景

round107 前端复用评审暴露同一个模式：框架已经提供能力，宿主又写了一份，两份同时生效或互相取代。

1. 根布局无条件挂载默认错误订阅者，宿主为了本地化文案只能**再挂一份**；错误通道对订阅者是 `Set` fan-out，于是每次请求失败弹两条 toast，其中一条没有 i18n。
2. apits 生成的 `request` 五方法与 SSE 错误映射（`toErrorEnvelope` 模式）在两个宿主逐字节相同，却各维护一份。
3. 框架只导出 `QueryProvider` 组件，宿主要在组件外失效查询（mutation 成功后刷新列表）只能自建 QueryClient；crewbie 甚至建了模块级单例，正是框架注释点名禁止的 SSR 共享写法。

## 决策

1. **D1 单一订阅者 + 文案注入。** `src/fewbie/framework/feedback/api-error-toast.tsx` 保持只由根布局挂载一次，并新增 `ApiErrorMessageProvider`（`mapError?: (error: ApiError) => string | undefined`）。订阅者通过 context 读取映射；映射返回空串/`undefined` 时回落 `error.message`，服务端消息也为空则静默。宿主在 `host-providers.tsx` 内用该 provider 包裹 `children` 注入 i18n 映射，不再挂第二份订阅者。
2. **D1 布局顺序。** 根布局把 `<ApiErrorToast />` 移入 `<HostProviders>` 子树（作为 `children` 的兄弟），使宿主注入的 context 可达；`host-providers.tsx` scaffold 注释同步说明「单一订阅者 + `mapError`」。
3. **D2 apits 适配器归框架。** `ClientRequestConfig` 与 `request` 五方法移入 `src/lib/api-client/apits.ts`，由 `src/lib/api-client/index.ts` 导出。宿主 `src/api/request.ts` 只保留会话过期重定向接线并再导出。
4. **D2 SSE 错误映射归框架。** `StreamError` / `toStreamError` / `throwIfAborted` 移入 `src/lib/api-client/stream-error.ts` 并从桶文件导出，去掉「copilot、analysis」这类宿主词汇；宿主删除副本改 import。SSE 传输本体（`sse-stream` 模块 + 产品协议）不归框架。
5. **D3 QueryClient 访问器。** `src/fewbie/framework/providers/query-provider.tsx` 新增 `getQueryClient()`：浏览器侧返回该 tab 的唯一实例（与 `QueryProvider` 提供给 React 树的是同一个），服务端调用直接抛错。宿主删除自建 client / 模块级单例 / 嵌套 provider，组件外失效改用 `getQueryClient()`。
6. `.fewbie/framework.json` 由 `fewbie template update --template-path .` 再生成，随本次框架文件一起提交（ADR-010）。

## 为什么不选「只写文档」

三个症状都是运行时的、静默的：重复 toast 只是冗余，模块级 QueryClient 只是偶发串数据，宿主复制适配器只是下次改一处。文档拦不住任何一种，而框架能自己保证的事情（只挂一个订阅者、适配器只有一份、client 只有一个来源）不应外包给使用方。

## Cross-host check

| 维度         | 框架层（fewbie-starter）                                             | 宿主层（nw / cb / 未来宿主）                            |
| ------------ | -------------------------------------------------------------------- | ------------------------------------------------------- |
| 错误订阅者   | 根布局挂载唯一一份；`ApiErrorMessageProvider` + `mapError`           | `host-providers` 注入映射，不挂第二份订阅者             |
| apits 适配器 | `src/lib/api-client/apits.ts` 导出 `request` / `ClientRequestConfig` | `src/api/request.ts` 保留会话过期接线，其余再导出       |
| SSE 错误映射 | `src/lib/api-client/stream-error.ts`                                 | 删除副本，改 import 框架导出                            |
| QueryClient  | `QueryProvider` 与 `getQueryClient()` 同一个 tab 级实例              | 删除自建 client / 模块级单例 / 嵌套 provider            |
| 回滚         | 移除 provider、accessor 与迁移的适配器文件                           | 恢复宿主本地订阅者与自建 client，行为回到 round107 之前 |

## 验证

- 单测（`src/fewbie/framework/__tests__/api-error-toast.test.tsx`）：映射优先、空映射回落服务端文案、无文案静默、`QueryProvider` 与 `getQueryClient()` 共享同一实例。
- `npm test`、`npm run lint`、`npm run format:check`、`npm run check:structure`、`npm run check:template`、`npm run build`。
- 两宿主 `template update` 后：`npm run lint`、`npm run build`，并确认任一 API 失败只产生一条 toast。
