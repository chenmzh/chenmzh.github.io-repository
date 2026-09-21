# 时光交易所 · Time Exchange

免费中文历史投资模拟游戏，直接在浏览器运行，无需登录、后端或行情 API 密钥。

- 游戏：https://chenmzh.github.io/chenmzh.github.io-repository/gaming/time-exchange/
- 游戏大厅：https://chenmzh.github.io/chenmzh.github.io-repository/gaming/
- 1990–2025 年、40 个标的、252,572 根真实历史日线。
- 美股 20 只；A 股股票 19 只及上证 50 ETF。没有上市前虚构行情。
- 五个历史剧本，包括「A股 · 复苏之路」（2020-02-03 至 2020-06-30）。
- 自动回放、空格暂停、条件单、止盈止损、模拟期权、自动保存及三个手动存档位。

## 游玩

从「历史剧本」选择剧本并确认开启。新账户默认 1990 年美股开局；想从 A 股开始，请选择「A股 · 复苏之路」。开始后自动推进，可用空格暂停和继续，运行时也能下单。

存档只保存在当前浏览器的本站 localStorage。localhost、其他域名和其他设备的进度不会自动迁移。清除网站数据会清除存档；交易 CSV 不是可恢复存档。无需提交真实账户信息，所有交易和资金均为模拟。

## 部署与更新

这个目录是 Vite 的生产静态构建产物，不是开发服务器，也不需要 Node.js 在网站上运行。

在游戏源码项目中运行 `npm ci && npm run build`，然后将 `dist/` 的内容复制到本仓库的 `gaming/time-exchange/`。Vite 使用相对资源路径，并将历史数据放在独立的哈希 JS 文件中供浏览器缓存。不要只复制源码 `index.html`，不要提交 `node_modules`、开发缓存或浏览器存档。

同时维护 `gaming/index.html` 的游戏卡片。沿用本仓库原有 master 分支 Pages 发布流程，不覆盖其他游戏目录，不修改域名或部署设置。

## 数据与边界

日线来自 Yahoo Finance Chart API；具体标的覆盖范围、数据来源、拆股口径可在游戏内「规则与数据说明」查看。历史行情已内置，运行时不请求第三方行情或字体。

期权为 Black–Scholes 教学模型，不是真实历史期权链；新闻为有限的 2020 年节选；费用、汇率、交易制度为教学简化，不含完整公司行动现金流，也不是无幸存者偏差的历史全市场。仅供学习与娱乐，不构成投资建议。

第三方运行库许可见 [THIRD_PARTY_NOTICES.txt](./THIRD_PARTY_NOTICES.txt)。
