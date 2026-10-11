# grisaille - 项目知识地图
<!-- project-docs: generated -->

> 能直接读取 `AGENTS.md` 的 coding 工具读本文件;Claude / Gemini 分别经 `CLAUDE.md` / `GEMINI.md` 引入同一份规则。
> 全局 worktree、Git、安全与自治规则见 `~/ai-rules/global-core.md`,本文件只记录项目事实。
> 敏感真值只放在 gitignored `.agents/local/`;checked-in 文档只写抽象引用。

## 读取顺序

1. 先读本文件。
2. 修改某条路径时,只继续读取其祖先链上适用的 `AGENTS.md`,停在最近一层。
3. 仅在任务命中知识地图主题时读取对应 `docs/ai/*.md`,不预加载无关文档。

## 项目边界

- 技术栈:零依赖原生 JavaScript(classic `<script>`,无模块、无 npm 依赖)+ Canvas 2D + Web Audio;线上排行榜是 Cloudflare Pages Functions + D1。
- `js/*.js` 按 `index.html` 里的 `<script>` 顺序加载、共享全局变量;新文件的顶层代码只能用排在它前面的文件定义的全局。
- `functions/api/` 是排行榜接口(Pages Functions,ESM),`schema.sql` 是 D1 表结构;`dist/` 是 `build.py` 的产物,已 gitignore。
- 综合分公式有两份:`js/lb.js` 的 `LB.score`(只做结算页预览)和 `functions/api/score.js` 的 `score`(服务器权威);改一处必须同步另一处。
- 界面文字都在 `js/i18n.js` 的 `STR.en` / `STR.zh`,缺 zh 时回退 en;新增键两边都要加。
- 存档在 localStorage 的 `grisaille-opt`,按网站隔离:不同域名部署的版本互不共享进度。

## 验证入口

- 没有自动化测试。`python3 build.py` 必须成功(它会断言所有脚本都被内联);改动后用浏览器打开 `index.html` 实测。
- 排行榜改动在本地联调:先 `npx wrangler d1 execute grisaille-lb --local --file schema.sql`,再 `python3 build.py && npx wrangler pages dev`;本地状态写在 `.wrangler/`(已 gitignore)。
<!-- project-docs: ci-start -->
- 当前未发现 CI 配置;新增门禁时同步更新本节。
<!-- project-docs: ci-end -->

## 知识地图

- 当前没有需要单独下沉的领域文档。只有出现非显然、稳定且会影响后续实现的知识时,才创建 `docs/ai/<area>.md` 并在这里增加一行路由。

## 模块规则

- 当前没有证实需要独立规则的模块。只有子树存在不同于项目级的约束时,才在该子树创建 `AGENTS.md` 并在这里登记。

## Git 与交付

- 远端默认主线:`main`(GitHub `Bliz333/grisaille`)
- 部署没有 CI,手动执行:`python3 build.py && npx wrangler pages deploy --branch main`,发布到 Cloudflare Pages 项目 `grisaille`(https://grisaille.pages.dev);D1 表结构变更用 `npx wrangler d1 execute grisaille-lb --remote --file schema.sql`。
- worktree、受保护主线、commit / push 与不可逆操作边界统一遵循 `~/ai-rules/global-core.md`。

## 文档维护

- 只记录代码、配置或验证已经证明的事实;不提交猜测、占位符、任务流水账或可直接从代码得到的清单。
- 任务结束前运行 `~/ai-rules/bin/project-docs doctor --repo .`;只修正本次证实过时或缺失的内容。若主线未识别,有明确任务基线时再追加 `--base <commit>`。
