# ADR-003：框架层反馈通道、主题化 Toaster 与控件契约

- 状态：已采纳
- 日期：2026-11-22
- 仓：fewbie-starter
- 关系：落实专家评审 Round 82 的 R82-16…R82-22；细化 ADR-001（框架根布局挂载框架级 Provider）

## 背景

Round 82 在框架层发现一组「契约存在但宿主拿不到」的缺口，它们都不是新功能，而是已有契约的默认路径失效：

| 编号   | 现象                                                                                                                  |
| ------ | --------------------------------------------------------------------------------------------------------------------- |
| R82-16 | framework 消息 `import` 失败被静默吞成 `{}`，老宿主升级后打开 ConfirmDialog/DatePicker 才在运行时抛错                 |
| R82-17 | `api-client` 注释指向不存在的 `request.ts`；`/auth/*` 请求仍附带上一次会话的 Bearer；默认错误通道无人订阅，错误被丢弃 |
| R82-18 | `ConfirmDialog` 三个「隐藏开关」同时成立时没有关闭路径；`title` 可空导致对话框无可访问名称                            |
| R82-19 | `DatePicker` 未选日期时先改时/分会用 `dayjs(undefined)` 提交「今天」                                                  |
| R82-20 | `SectionTabs` 受控 `value` 但没有 `onValueChange`，键盘激活无法改变选中态                                             |
| R82-21 | `Toaster` 挂在 `ThemeProvider` 之外且未传 `theme`，暗色主题下 toast 仍是浅色                                          |
| R82-22 | 图表 pie 忽略 `dataset.color`、`splitLine` 硬编码黑色、`withAlpha` 只认 `#rrggbb`、无无障碍标签                       |

这些都是 framework 所有权文件（`src/app/layout.tsx`、`src/framework/**`、`src/lib/api-client/**`、`src/components/ui/**`、`src/i18n/config.ts`），宿主无法在不违反所有权契约的前提下自行修补。

## 决策

### 1. 错误通道由框架自己消费

`api-client` 暴露 `onError` 订阅点；新增 `src/framework/feedback/api-error-toast.tsx`，在框架根布局挂载一次，把错误转成 `toast.error(error.message)`。宿主不再需要手写「默认 toast」，但仍然可以订阅 `onError` 做更细的处理。

- 注释只指向真实存在的文件（`error-channel.ts`、`framework/feedback/api-error-toast.tsx`），删掉对已删除 `request.ts` 的引用。
- 认证路径（`/auth/*`）不附带任何残留 Bearer：`trusted && !isAuthPath` 才取 token。

### 2. Toaster 跟随主题

`Toaster` 移入 `ThemeProvider`，并把服务端算出的 theme 映射为 `dark` / `light` / `system` 传给 sonner。toast 与页面共享同一套主题判定，不引入第二份 cookie 解析。

### 3. 控件契约显式化

- `ConfirmDialog`：`showCancel = !hideCancelButton || isConfirmDisabled`，保证「三个开关都成立」时仍有可见出口；`AlertDialogTitle` 回退到 `t("confirm")`，不再产生无名称对话框。
- `DatePicker`：未选日期时时/分选择器 `disabled`，`commitTime` 直接返回，不从 `undefined` 推导「今天」。
- `SectionTabs`：`onValueChange` 调 `router.push(href)`；`Link` 点击置标记避免同一次导航被 push 两次。
- 图表：网格色读 `--border`（`chartGridColor()`），`withAlpha` 支持 `#rgb`/`#rrggbb` 并对非 hex 原样返回；pie 透传 `dataset.color`；`EChart` 接受 `ariaLabel`，外层 `role="img"` + `aria-label`。

### 4. 消息加载失败要报错而不是降级

`loadFrameworkMessages` 只对 `MODULE_NOT_FOUND` / `ERR_MODULE_NOT_FOUND` 抛出带修复指引的 `Error`，其余错误原样重抛。缺文件是「宿主副本落后」的配置问题，静默返回 `{}` 只会把它推迟到运行时。

## 为什么不选「只在文档里写清楚」

这些缺口的共同点是**默认路径失效**：宿主照文档用默认值就会踩坑，而修补点在框架所有权文件里。把契约留给每个宿主复述，等于让每个宿主都重复一次相同的运行时排错。

## Cross-host check

| 维度               | 框架层                                               | 宿主层                                        |
| ------------------ | ---------------------------------------------------- | --------------------------------------------- |
| 错误提示           | `ApiErrorToast` 在根布局订阅 `onError` 并 toast      | 无需装配；需要自定义时再订阅 `onError`        |
| 主题               | `ThemeProvider` 内的 `Toaster` 收到映射后的 theme    | 换肤仍走 `useThemePreference`，toast 自动跟随 |
| 认证请求           | `/auth/*` 不附带 Bearer；其余按 `trusted` 取新 token | 行为更严格，无需迁移                          |
| 对话框/日期/标签页 | 默认值即可关闭、不可隐式提交、可键盘切换             | 直接使用，不需要额外 props                    |
| 图表               | `chartGridColor()` 与 `ariaLabel` 由框架提供         | 传 `title` 即获得无障碍名称                   |
| 消息缺失           | 启动即抛错并给出修复指引                             | 升级后立即暴露，不再延迟到运行时              |

回滚方式：上述每项都是独立的小改动，移除对应文件/分支即回到 ADR 之前的默认路径。
