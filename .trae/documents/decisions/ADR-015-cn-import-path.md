# ADR-015：`cn` 只有一条导入路径——shadcn 的 `@/lib/utils` alias

- 状态：已采纳
- 日期：2026-11-26
- 仓：fewbie-starter
- 触发：round107 前端复用评审 R107-14（`cn` 双导入路径）

## 背景

同一函数存在两条导入路径：

| 路径                               | 使用方                                                          | 解析结果                                                    |
| ---------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------- |
| `import { cn } from "cn"`          | 框架 `src/fewbie/ui/**`、`src/fewbie/framework/**`（40 个文件） | npm 包 `cn`（shadcn 官方 `clsx` + `tailwind-merge` 替代品） |
| `import { cn } from "@/lib/utils"` | 宿主（nw 13 处、cb 5 处）、registry 模块（5 处）                | `src/lib/utils.ts` 的 `export { cn } from "cn"`             |

`components.json` 的 `aliases.utils` 指向 `@/lib/utils`，因此 `npx shadcn add` 生成的每个原语都写 `@/lib/utils`。框架当前写法意味着**每次生成原语后都要手改 import**，否则新原语与框架既有原语风格不一致——标准由生成器决定，不由文档决定，手改步骤必然衰减。

## 候选方案

| 方案                          | 做法                                                                     | 结论                                                                                                                                           |
| ----------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| A 统一为 `from "cn"`          | 宿主与模块改裸包名；模块 manifest 增 `cn` 依赖、harness 增加解析替身     | **否决**：让生成器输出长期不合规；registry 每条模块多一份仅为满足解析的依赖声明；跨两宿主 + 5 个模块 + 1 个 harness 的改动只为迁就框架既有写法 |
| B 统一为 `from "@/lib/utils"` | 框架 40 个文件改 alias；定义处 `src/lib/utils.ts` 不变；宿主与模块零改动 | **采纳**：单一路径，且等于 `npx shadcn add` 的产出，标准自执行                                                                                 |

## 决策

1. `src/fewbie/ui/**` 与 `src/fewbie/framework/**` 一律 `import { cn } from "@/lib/utils"`。
2. `src/lib/utils.ts` 保持 `export { cn } from "cn"`——`cn` 包只是该 alias 的实现细节，调用方不感知。
3. 宿主与 registry 模块不改：它们本来就是 `@/lib/utils`。
4. `.fewbie/framework.json` 由 `fewbie template update --template-path .` 再生成，随本次框架文件一起提交（ADR-010）。

## Cross-host check

| 维度     | 框架层（fewbie-starter）              | 宿主层（nw / cb / 未来宿主）          |
| -------- | ------------------------------------- | ------------------------------------- |
| 导入路径 | `@/lib/utils`                         | `@/lib/utils`（无改动）               |
| 实现     | `src/lib/utils.ts` 再导出 `cn` 包     | 由 `template update` 同步，不自行实现 |
| 新原语   | `npx shadcn add` 产出即合规，无需手改 | 同左                                  |
| 回滚     | 40 个 import 改回 `"cn"`              | 无变化                                |

## 验证

- `npm run lint`、`npm run format:check`、`npm test`（101 通过）、`npm run build`、`npm run check:template`。
- 宿主执行 `template update` 后 `git diff` 只含 import 行变化。
