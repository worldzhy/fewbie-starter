# ADR-001：框架级 Provider 由框架根布局挂载

- 状态：提议中
- 日期：2026-11-21
- 仓：fewbie-starter
- 关系：落实 devbie ADR-056 D5（`src/app/layout.tsx` 归框架所有）与 devbie ADR-035（scaffold 引入 `host-providers.tsx`）

## 背景

`src/framework/**` 导出了三组「必须挂载 Provider 才能用」的 hook：

| Provider                     | hook                 | 无挂载时的表现                  |
| ---------------------------- | -------------------- | ------------------------------- |
| `ConfirmProvider`            | `useConfirm`         | 抛 `useConfirm must be...`      |
| `NavigationProgressProvider` | `useRouteNavigate`   | 抛 `useRouteNavigate must...`   |
| `ThemeProvider`              | `useThemePreference` | 抛 `useThemePreference must...` |

模板里这三个 Provider 一个挂载点也没有（`src/app/layout.tsx` 只挂 `TooltipProvider`），而 `src/app/layout.tsx` 是 framework 所有权、宿主不能改。结果是：宿主按文档调用 hook 必然在运行时崩溃，唯一的自救方式是改框架文件——正好违反所有权契约。组件评审 R1-12 记录了这一条。

## 决策

框架根布局按下面的顺序挂载，宿主不再需要自己挂：

```tsx
<NextIntlClientProvider locale={locale} messages={messages}>
  <ThemeProvider initialTheme={theme}>
    <ConfirmProvider>
      <NavigationProgressProvider>
        <TooltipProvider>
          <HostProviders>{children}</HostProviders>
        </TooltipProvider>
      </NavigationProgressProvider>
    </ConfirmProvider>
  </ThemeProvider>
  <Toaster />
</NextIntlClientProvider>
```

- 顺序不是随意的：`ThemeProvider` 与 `ConfirmProvider` 都要读取 locale 消息/主题 cookie，必须落在 `NextIntlClientProvider` 之内；`NavigationProgressProvider` 依赖 `useRouter`/`usePathname`，必须在 App Router 树内。
- `ThemeProvider` 的 `initialTheme` 复用布局已经算好的服务端 theme，不引入第二套 cookie 解析。
- `host-providers.tsx` 的注释列出已挂载的 Provider，宿主只添加自己的（query client、监控、错误 toast）。
- `next-themes` 依赖自此无引用，移除。

## 为什么不选「只写文档」

文档化等于把契约留给每个宿主复述：漏挂的代价是运行时崩溃而不是编译错误，而且宿主无法通过修改框架文件补救。框架能自己保证的事情不该外包给使用方。

## Cross-host check

| 维度      | 框架层                                                            | 宿主层                                                        |
| --------- | ----------------------------------------------------------------- | ------------------------------------------------------------- |
| 挂载点    | `src/app/layout.tsx`（framework 所有权）                          | 无，`host-providers.tsx` 只放宿主自有 Provider                |
| hook 契约 | `useConfirm` / `useRouteNavigate` / `useThemePreference` 保证可用 | 直接调用，不需要额外装配                                      |
| 主题来源  | 布局读 `NEXT_THEME` cookie，传给 `ThemeProvider`                  | 宿主换肤调 `useThemePreference().applyTheme`，写回同一 cookie |
| 重复挂载  | 宿主再挂同名 Provider 时内层生效，行为可预期                      | 不要求宿主做任何去重处理                                      |
| 回滚      | 移除布局中的 Provider 即回到旧契约                                | 回滚后上述 hook 恢复抛错，与 ADR 之前一致                     |
