# ADR-009：i18n 请求时区来自 NEXT_TIMEZONE cookie

- 状态：已采纳（框架改动已随 291ae08 落地，本 ADR 补记以满足 R12 门禁）
- 日期：2026-11-25
- 仓：fewbie-starter（框架文件 `src/fewbie/i18n/config.ts` 由模板下发）
- 关系：落实 devbie [ADR-077](../../../devbie/.trae/documents/decisions/ADR-077-fewbie-display-timezone-and-instant-query-contract.md)（fewbie 展示时区契约与查询边界瞬时契约）在模板侧的框架实现；`src/fewbie/i18n/config.ts` 代码注释中的裸「ADR-077」即指 devbie ADR-077

## 背景

devbie ADR-077 决定展示时区的真源是账号偏好（`currentUser.timezone`），服务端通过派生 cookie `NEXT_TIMEZONE` 获知时区（D2=A），并扩展 devbie ADR-056 D5 把 `src/fewbie/i18n/config.ts` 划为模板下发的框架文件。该决策的框架侧落地修改了 `src/fewbie/i18n/config.ts`（request config 在解析 locale 时一并返回 `timeZone`），`.fewbie/framework.json` 基线 digest 随之更新。

R12 门禁要求框架文件变更必须在本仓留有 ADR；框架同步文件不可手工编辑，因此本文件是该变更在模板仓的决策记录，不改动文件本身。

## 决策

1. `src/fewbie/i18n/config.ts` 导出 `TIMEZONE_COOKIE = "NEXT_TIMEZONE"` 与 `resolveTimeZone`：IANA 名仅在运行时 `Intl.DateTimeFormat` 可用时被接受，否则回落 UTC。
2. next-intl request config（模块默认导出）在返回 locale/messages 的同时返回 `timeZone: resolveTimeZone(cookieStore.get(TIMEZONE_COOKIE)?.value)`：缺失或非法回落 UTC，服务端首屏渲染时区确定。
3. cookie 由宿主在账号偏好持久化（或浏览器时区自动探测落库）后写入；框架只消费、不写 cookie。真源、写入时机与查询边界瞬时化的完整论证见 devbie ADR-077，本仓不复制其决策过程。
4. `.fewbie/framework.json` 基线记录该文件的最新 sha256；宿主通过 `fewbie template update` 静默接收（宿主副本未被改动时）。

## 影响

- 模板宿主无需各自实现 request config 的 timeZone 注入即获得正确的服务端渲染时区。
- 宿主未写 cookie 时按 UTC 渲染：行为确定、可预期，符合「派生缓存」语义而非第二真源。
