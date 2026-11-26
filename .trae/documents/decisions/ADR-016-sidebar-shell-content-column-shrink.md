# ADR-016：`SidebarShell` 的内容列必须允许收缩（`min-w-0`）

- 状态：已采纳
- 日期：2026-11-26
- 仓：fewbie-starter
- 触发：round108 前端复用评审 R108-04（三个 account-level 布局改渲染 `SidebarShell`）

## 背景

`SidebarShell` 是 account-level 布局共用的固定侧边栏骨架。宿主此前各自手写这套骨架，内容列写成 `min-h-screen min-w-0 flex-1`；收编到框架后，`main` 只有 `flex-1`。

`flex-1` 等价于 `flex: 1 1 0%`，而 flex item 的 `min-width` 默认是 `auto`——宽度下限取内容的最小宽度。监测类页面（EC2 / RDS / 日志 / 报表）普遍含宽表格，表格的 min-content 会顶开 `main`，结果是整页横向滚动，而不是表格容器内部横向滚动。这是把三个布局收编进框架时唯一会引入的行为回归，且每个未来宿主都会遇到。

## 候选方案

| 方案                    | 做法                              | 结论                                                                                                                  |
| ----------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| A 保持 `flex-1`         | 宿主自己包一层带 `min-w-0` 的元素 | **否决**：`min-w-0` 必须落在 flex item（`main`）上，宿主的子元素无法替代；要么恢复手写骨架，要么每个宿主各写一次 hack |
| B `main` 增加 `min-w-0` | 框架侧一行类名                    | **采纳**：内容列可收缩是共享骨架的正确默认值，与既有布局行为一致                                                      |

## 决策

1. `SidebarShell` 的 `main` 类名为 `min-w-0 flex-1 bg-background transition-[margin] duration-200`。
2. 其余结构、插槽与宿主导航模型不变：`header` / `nav` / `footer` 仍由宿主装配，框架只拥有骨架、折叠位移与内容列。

## Cross-host check

| 维度     | 框架层（fewbie-starter） | 宿主层（nw / cb / 未来宿主）              |
| -------- | ------------------------ | ----------------------------------------- |
| 内容列   | `min-w-0 flex-1`         | 由 `template update` 同步，宿主不自建骨架 |
| 宽表格   | 在页面自身容器内横向滚动 | 同左，无需宿主额外处理                    |
| 导航模型 | 不感知                   | 保持分组 / flyout / 动态条目逻辑          |
| 回滚     | 删掉一个类名             | 无变化                                    |

## 验证

- `npm run format:check`、`npm run build`。
- nightwatch-frontend 三个布局改渲染 `SidebarShell` 后，`node scripts/check-layout-shell.mjs` 退出码为 0；EC2 / RDS 表页无整页横向滚动。
