# ADR-005：模块边界分 feature 与 widget 两层

- 状态：已采纳
- 日期：2026-11-22
- 仓：fewbie-starter
- 关系：取代 ADR-004 在文件集与导入白名单上的结论；落地 devbie ADR-066（registry 两层安装树），沿用 devbie ADR-065 的 lockfile 驱动判定

## 背景

devbie ADR-065 让 `registry:block` item 落位 `src/features/**`，模块边界文件集由 `fewbie.lock.json` 给出。devbie ADR-066 又把 registry 分为两层：`registry:feature` 落位 `src/features/**`，`registry:widget` 落位 `src/widgets/**`。模板 eslint 必须同步，否则 widget item 在宿主里既拿不到模块规则，也无法阻止 feature 反向依赖 widget。

## 决策

1. `HOST_CODE` 加入 `src/widgets/**/*.{ts,tsx}`；`installedModuleFiles()` 收集 lockfile 中位于 `src/features/**` 与 `src/widgets/**` 的文件并集。
2. 模块边界拆成两个块，文件集分别来自两层：
   - feature 块：沿用 ADR-004 的白名单（允许 `@/features/<已安装 item>`），并整体禁止 `@/widgets/*`（静态与动态 import）；`@/features/<宿主自写>` 照旧禁止。
   - widget 块：允许 `@/features/<已安装 item>` 与 `@/widgets/<已安装 item>`；宿主自写的 feature/widget 均禁止。
3. 兄弟白名单按层分别生成。某一层没有已安装 item 时，该层的全部 `@/features/*` 或 `@/widgets/*` 都视为宿主导入并禁止。
4. `registry:component`、`registry:lib` item 仍落在 `src/components/**`、`src/lib/**`，继续按宿主规则校验，与 ADR-065 的范围一致。

## 影响

- 装了 widget item 的宿主：`fewbie template update` 后获得 widget 规则；feature 反向 import widget 会报 lint error。
- 未装 widget item 的宿主：widget 文件集为空，不生成 widget 块，行为与 ADR-065 一致。
- 该门禁只在 lint 期生效；依赖是否声明仍由 `fewbie modules update --check` 与 lockfile 决定。
