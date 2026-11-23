# ADR-008：framework.common 承接通用词，宿主 common 不得重叠

- 状态：已采纳
- 日期：2026-11-24
- 仓：fewbie-starter
- 关系：落地 devbie ADR-074（文案所有权与模块默认文案）D1；沿用 ADR-002（framework baseline）、ADR-006（框架测试归属）

## 背景

`framework.common` 已服务框架组件，但只有 22 条，宿主仍在自己的 `common` 里重复同一批通用词（本模板 `en.json` / `zh.json` 的 13 条 `common` 与框架逐字重复）。两套命名空间永不报错，导致框架措辞更新到不了宿主。

## 决策

1. `framework.{en,zh}.json` 的 `common` 扩到 30 条，补齐 `back`、`edit`、`create`、`previous`、`next`、`pageOf`、`recordCount`、`copied`。
2. 宿主 `src/i18n/messages/{en,zh}.json` 删除与 `framework.common` 同名的 `common` 子树；通用词统一通过 `useTranslations("framework.common")` 读取。
3. `fewbie doctor` 新增重叠门禁：宿主 `<locale>.json` 的 `common` 出现 `framework.<locale>.json` `common` 已有键即失败。CI 的两个 job 都新增 `npx fewbie doctor`。
4. 模板仓自身纳入门禁前提：新增根 `fewbie.json`（`{ "modules": [] }`），CLI 归属清单把 `fewbie.json` 归为宿主文件；`@devbie/fewbie-cli` 升到 `^1.18.0`。
5. `.fewbie/framework.json` 按修改后的框架文件重新生成（`fewbie template update --template-path .`）。

## 影响

- 框架文件变更需同步 baseline，否则 `check:template` 报 stale。
- 新生成项目不再需要宿主侧通用词副本；宿主若要不同措辞，只能提模板变更，不能在宿主覆盖。
