# ADR-006：框架测试归模板所有，门禁对畸形 lockfile 失败关闭

- 状态：已采纳
- 日期：2026-11-22
- 仓：fewbie-starter
- 关系：细化 ADR-002（framework baseline）、ADR-004/ADR-005（模块边界）；落地 devbie round 87 的模板侧结论

## 背景

R12 门禁要求改动框架路径必须带 ADR。本轮把框架组件的测试从 `src/components/__tests__` 移到 `src/framework/__tests__`，同时修正 eslint 模块边界的相对路径解析与 lockfile 容错，并清理模板里一处未挂载的组件。这些都是跨宿主契约层面的变化，需要一次性记录。

## 决策

1. 框架组件的测试随框架代码走：测试文件放在 `src/framework/__tests__/`，由 `template update` 整体同步。宿主自己的测试仍在框架路径之外，避免被模板覆盖。
2. eslint 模块边界在判定 import 归属前先解析相对路径（`./`、`../`），再映射到 `@/` 别名（R87-03）。此前相对路径绕过模块边界规则。
3. `fewbie.lock.json` 解析失败时失败关闭：不再静默跳过模块规则，而是报错终止 lint，避免畸形的 lockfile 让边界门禁整体失效。
4. 删除模板中未挂载的 `FrontendMonitor` 组件与依赖；`frontend-monitor-sdk` 改为宿主按需自行安装的可选项，模板不默认携带。
5. `.fewbie/framework.json` 重新生成，去掉不存在的 `src/i18n/request.ts` 条目；baseline 摘要跟随新的框架文件集。
6. 运行时容器统一 node 24、非 root，Next 缓存目录保持可写；滚动条颜色改用主题 token，不再写死色值。CI 使用只读 token。

## 影响

- 宿主 `fewbie template update` 后：`src/framework/__tests__/**` 随模板同步，旧路径下的同名测试不再被模板管理。
- 相对路径 import 与畸形 lockfile 不再能绕过模块边界门禁；先前依赖该行为的宿主需要按规则调整 import。
- 未安装 `frontend-monitor-sdk` 的宿主不再因模板引用而缺依赖；需要监控的宿主显式安装并挂载。
