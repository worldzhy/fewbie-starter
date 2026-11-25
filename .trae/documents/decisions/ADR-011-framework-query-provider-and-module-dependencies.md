# ADR-011：框架挂载 QueryProvider，数据页统一走浏览器 api-client

- 状态：已采纳
- 日期：2026-11-25
- 仓：fewbie-starter
- 关系：落实 devbie ADR-079（D3/D4/D5/D6）；修正 ADR-001 把 query client 列为「宿主自有 Provider」的表述；ADR-004 已被取代，其中「模块一律禁止 `@tanstack/*`」的结论不再有效，本 ADR 给出模块作用域的新判定

## 背景

模板此前只治理了 chrome、token 与门禁，没有治理数据层：首页是只做 i18n 的 async RSC，`package.json` 没有 `@tanstack/react-query`，`host-providers.tsx` 把 query client 留给宿主自装，而 `eslint.config.mjs` 的 R4（走 `@/api` 或 `lib/api-client`）与 R11（query key 用领域常量）已经预设宿主使用 TanStack Query。结果是新宿主没有被要求采用任何机制，两个产品各自发明（nw 是浏览器 axios + TanStack，cb 是 RSC 取数 + BFF 会话）。

同时模块边界与 registry 契约互相矛盾：`fewbie.module.json: dependencies` 允许模块声明 npm 包（registry `check-contract` 放行、CLI 校验已安装），宿主 ESLint 却在模块作用域一刀切禁止 `@tanstack/*`。同一家公司两个产品因此无法共用同一形态的模块——「装上即完备」在数据层从未成立。

## 决策

1. 新增框架文件 `src/fewbie/framework/providers/query-provider.tsx`（`"use client"`，`useState(() => new QueryClient(...))`，默认 `retry: false` / `staleTime: 30s` / `gcTime: 5min`，与 nw 一致）。它归框架所有，宿主不能改。
2. 框架根布局 `src/app/layout.tsx` 在 `TooltipProvider` 与 `HostProviders` 之间挂载 `<QueryProvider>`，因此任意宿主的任意 registry 模块都能直接 `useQuery`。宿主需要不同默认值时在 `host-providers.tsx` 内嵌套自己的 provider（内层生效）。
3. `@tanstack/react-query` 进入模板依赖；它是框架运行时依赖，宿主 `template update` / `doctor` 据此检查。
4. 模块作用域改为按模块判定：lockfile 条目里的 `dependencies` 声明过即放行（`module-boundary/packages` 规则），未声明的裸包报错；host-only 包（`next`/`next-intl`/`axios`/`sonner`/`swr`/`@radix-ui/*`）无论是否声明都报错。`react`/`react-dom`/`lucide-react` 视为框架保证，无需声明。
5. 首页 `src/app/page.tsx` 改为参考实现：客户端组件 + 一次 `useQuery`（走 `@/lib/api-client` 的 `apiClient`，因此 token gate、静默刷新与错误通道全部生效）+ 领域 query-key 常量 + 共用 Loading/Empty/Error 态。它查询 `GET /account/me`，宿主按自己的端点替换字段即可，形态保留。
6. `.fewbie/framework.json` 只能由 `fewbie template update --template-path .` 再生成（ADR-010），随本次框架文件变更一起提交。

## 为什么不选「只写文档」

R4/R11 已经把 TanStack 写进规则文本，却没有 provider、没有依赖、模块还被禁止使用——文档无法弥合这个矛盾。provider 由框架挂载的收益与 ADR-001 相同：漏挂的代价是运行时崩溃，而宿主不能改框架文件自救；框架能自己保证的事情不外发给使用方。

## Cross-host check

| 维度                 | 框架层（fewbie-starter / CLI）                                   | 宿主层（nw / cb / 未来宿主）                               |
| -------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------- |
| QueryClient 生命周期 | `src/fewbie/framework/providers/query-provider.tsx`，根布局挂载  | 不实现；需要不同默认值时在 `host-providers.tsx` 内层覆盖   |
| 模板依赖             | `package.json` 声明 `@tanstack/react-query`                      | `template update` 同步；`doctor` 报告缺失                  |
| 数据获取             | R4（走 api-client）/ R11（领域 query key）继续生效               | 页面写 `useQuery`/`useMutation`，RSC 只做壳                |
| 模块 npm 依赖        | lockfile `dependencies` → 模板 ESLint 放行；host-only 包继续禁止 | 安装即生效，不需要为模块写 transport 适配层                |
| 会话                 | `src/lib/api-client/**`（token gate、刷新、错误通道）            | 浏览器直连 `/auth/*`；配置 cookie 属性与 `ALLOWED_ORIGINS` |
| 回滚                 | 移除布局中的 `QueryProvider` 与依赖，回到「宿主自装」契约        | 回滚后 `useQuery` 失效，与 ADR-079 之前一致                |

## 影响

- 发版顺序：本 ADR →（本批）provider + 参考页 + 模板依赖 + 模块作用域规则 →`@devbie/fewbie-cli` 在 lockfile 写入 `dependencies` 并发版 →各宿主 `fewbie template update` → cb 收敛（nw 不改）。
- 在 CLI 发版之前，lockfile 条目没有 `dependencies`：模块内的 `@tanstack/*` 仍会被判为未声明，因此 `console-audit-log` 的 ESLint 抑制注释要等 CLI 发版后再删。
- 验证：`npm run lint`、`npm test`、`npm run check:structure`、`npm run check:template`、`npm run build`。
