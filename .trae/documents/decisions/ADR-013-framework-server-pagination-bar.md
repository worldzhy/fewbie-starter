# ADR-013：服务端分页条归框架所有

- 状态：已采纳
- 日期：2026-11-26
- 仓：fewbie-starter
- 关系：落实 devbie ADR-079 的统一客户端数据页机制；承接共享 console 模块化计划中「分页条先居 console-kit、框架发版后上收」的过渡决策

## 背景

`DataTable` 只负责已经完整加载的数组分页，console 的账号、审计与任务页面则由服务端返回单页记录和总数。`console-kit` 为避免宿主重复实现临时提供了 `PaginationBar`，但分页条与 `PageHeader`、`SectionTabs` 一样属于领域无关的页面 chrome，不应长期停留在业务 registry。

## 决策

1. 框架新增 `src/fewbie/framework/page/pagination-bar.tsx`，提供零基 `page`、`pageSize`、`total`、`onPageChange` 和完整 `labels` 的服务端分页条。
2. 分页条不持有查询状态、不读取路由、不自带文案；当前页越界时收敛到有效范围，首页和末页禁用对应按钮。
3. registry 白名单增加 `@/fewbie/framework/page/pagination-bar`；`console-kit/components/pagination-bar` 只保留同名 re-export，消费方无需修改 import。
4. `TableShell` 仍留在 `console-kit`：它是 console 表格区域的组合壳，不是本次需要上收的框架能力。
5. `.fewbie/framework.json` 由 `fewbie template update --template-path .` 再生成，随框架文件一起提交。

## Cross-host check

| 维度       | 框架层（fewbie-starter）          | 宿主层（cb / nw / 未来宿主）                           |
| ---------- | --------------------------------- | ------------------------------------------------------ |
| 分页状态   | 不持有；只计算总页数并收敛当前页  | TanStack Query 持有查询，`onPageChange` 更新状态或 URL |
| 文案       | 只定义 `PaginationBarLabels` 契约 | 从模块 defaults 或宿主字典提供                         |
| 传输与路由 | 不依赖                            | 宿主 port 获取 `{ records, total }`，宿主决定路由回写  |
| 模块消费   | registry 白名单允许直接引用       | `console-kit` 保留 re-export，现有模块零改动           |
| 回滚       | 删除框架文件与白名单              | 恢复 `console-kit` 的完整实现                          |

## 验证

- `npm test` 覆盖边界禁用、越界收敛与零基页码回调。
- `npm run lint`、`npm run check:structure`、`npm run check:template`、`npm run build`。
- 两宿主同步后运行 `fewbie modules apply --check`、`fewbie doctor` 与各自构建。
