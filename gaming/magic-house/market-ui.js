import { CATALOG_ITEMS, SERIES, seriesForItem } from './catalog.js';
import { ROOM_IMAGES } from './room-assets.js';
import { ownedItems, placedCopies } from './ownership.js';
import { shopBook, shopQuote, tradeItem } from './shop.js';
import { candleChart, candleSummary } from './market-charts.js';
import { SECURITIES, LEGACY_SECURITIES, MARKET_RULES, marketState, marketQuote, marketOrder, advanceMarket, contracts, marketEquity, reservedCash } from './market.js';
const points = n => n.toLocaleString('zh-CN');
const cash = n => (n/100).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2});
const titleOf = id => CATALOG_ITEMS.find(i=>i.id===id)?.name || id;
const tickerOf = id => [...SECURITIES,...LEGACY_SECURITIES].find(s=>s.id===id)?.name || id;
const optionName = c => `${tickerOf(c.symbol)} · ${c.type==='call'?'看涨 CALL':'看跌 PUT'} · K ${cash(c.strike)} · D${c.expiry}`;
export function createMarketUI({getState,getBusy,transact,toast}) {
  const root=document.querySelector('#market-content'), dialog=document.querySelector('#trade-dialog');
  let tab='shop', filter='all', symbol='D-10', term=5, qty=1, page=0, pending=null, returnFocusId='';
  let period=1, range=60, chartStyle='candles', search='', plotted=null, cursor=0;
  const escape = text => text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function render() {
    const active=document.activeElement?.id, state=getState(), busy=getBusy(), m=marketState(state);
    document.querySelector('#market-day').textContent=`模拟日 D${m.day}`;
    document.querySelector('#market-advance').disabled=busy || m.revision>=MARKET_RULES.maxEvents;
    document.querySelector('#market-advance').textContent=m.revision>=MARKET_RULES.maxEvents?'已达 4,000 条记录上限':'推进 1 个模拟日 →';
    document.querySelector('#trade-confirm').disabled=busy;
    document.querySelectorAll('[data-market-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.marketTab===tab)));
    document.querySelector('#market-account').innerHTML=`<div><span>独立模拟资金</span><strong>${cash(m.cash)}</strong><small>不能领取、充值或换成积分</small></div><div><span>证券账户净值 · 估值</span><strong>${cash(marketEquity(m))}</strong><small>含持仓，不等于可提现现金</small></div><div><span>已实现盈亏 / 累计手续费</span><strong>${m.realized>=0?'+':''}${cash(m.realized)}</strong><small>手续费 ${cash(m.fees)} 模拟元</small></div>`;
    if(tab==='shop') renderShop(state,busy);
    else if(tab==='stocks') renderStocks(m,busy);
    else if(tab==='options') renderOptions(m,busy);
    else renderRecords(state,m);
    if(active && root.querySelector(`#${active}`)) root.querySelector(`#${active}`).focus({preventScroll:true});
  }
  function renderShop(state,busy) {
    const book=shopBook(state), owns=ownedItems(state);
    const list=CATALOG_ITEMS.filter(item => filter === 'all' || (filter === 'owned' ? owns[item.id] > 0 : filter === 'new' ? item.shopPremium && !item.zoo : item.seriesId === filter));
    root.innerHTML=`<div class="market-section-head"><div><h2>把喜欢，直接带回家。</h2><p>全部藏品都能买卖，也能抽取（最后赏为可选加赠）。新伙伴已加入新版奖池，旧场绑定签不变。这里使用体验积分，不使用证券资金。</p></div><label>浏览藏品 <select id="shop-filter">${[['all',`全部 ${CATALOG_ITEMS.length} 款`],['owned','我拥有的藏品'],...SERIES.map(series => [series.id, series.name]),['new','萨摩耶与原有三猫']].map(([v,n])=>`<option value="${v}" ${filter===v?'selected':''}>${n}</option>`).join('')}</select></label></div><p class="market-note">可用体验积分 <b>${points(state.balance)}</b> · 商店回收预算 ${points(book.cash)} · 库存稀少时价格上升；买卖有价差，手续费 1%（向上取整）。无限免费积分使这里不具备真实稀缺性，不能兑换证券资金。</p><div class="shop-grid">${list.map(item=>{
      const buy=shopQuote(book,item.id,'buy'), sell=shopQuote(book,item.id,'sell'), available=owns[item.id]-placedCopies(state,item.id);
      return `<article class="shop-card"><div class="shop-art"><img src="${ROOM_IMAGES[item.id]}" width="480" height="480" alt="${item.name}" loading="lazy"><span>${seriesForItem(item.id)?.name || '藏品'}</span></div><h3>${item.name}</h3><p>拥有 ${owns[item.id]} · 闲置可卖 ${available} · 店内 ${book.stock[item.id]}</p><div class="shop-quote"><span>买入 <b>${points(buy.total)}</b></span><span>卖出到账 <b>${points(sell.total)}</b></span></div><small>含费买入 ${buy.fee} / 卖出 ${sell.fee} 积分</small><div class="shop-actions"><button id="buy-${item.id}" data-shop-key="${item.id}" data-side="buy" ${busy||state.balance<buy.total||!book.stock[item.id]?'disabled':''}>买入一份</button><button id="sell-${item.id}" data-shop-key="${item.id}" data-side="sell" ${busy||available<1||book.cash<sell.price?'disabled':''}>卖出一份</button></div>${available<owns[item.id]?'<small>摆在任一场景的份数不会被出售，请先收回。</small>':''}</article>`;
    }).join('')||'<p class="market-note">还没有藏品。可以抽取，也可以切换系列直接买入。</p>'}</div>`;
  }
  function quantity() { return `<label>每笔数量 <select id="market-qty">${[1,5,10,50,100].map(v=>`<option ${qty===v?'selected':''}>${v}</option>`).join('')}</select></label>`; }
  function symbolOptions() { return SECURITIES.map(s=>`<option value="${s.id}" ${s.id===symbol?'selected':''}>${s.id} · ${s.name}</option>`).join(''); }
  function terminal(m) {
    const s=SECURITIES.find(s=>s.id===symbol), bar=m.candles[symbol].at(-1), change=(bar.close/bar.open-1)*100;
    plotted=candleChart(m.candles[symbol],period,range,chartStyle);cursor=plotted.bars.length-1;
    return `<section class="quote-terminal"><header class="terminal-header"><div class="stock-brand"><img src="${ROOM_IMAGES[s.item]}" alt="" width="64" height="64"><div><small>COLLECTIBLE / ${s.id} / ${s.sector}</small><h3>${s.name}</h3></div></div><div class="terminal-price ${change>=0?'quote-up':'quote-down'}"><strong>${cash(bar.close)}</strong><span>${change>=0?'+':''}${change.toFixed(2)}% · 模拟元</span></div></header><div class="terminal-stats">${[['今开',cash(bar.open)],['最高',cash(bar.high)],['最低',cash(bar.low)],['成交量',bar.volume+' 股'],['成交额',cash(bar.turnover)],['波动率假设',(s.volatility*100).toFixed(0)+'%']].map(([k,v])=>`<div><span>${k}</span><b>${v}</b></div>`).join('')}</div><div class="chart-controls"><label>周期 <select id="chart-period">${[[1,'日 K'],[5,'5 日 K'],[20,'20 日 K']].map(([v,n])=>`<option value="${v}" ${period===v?'selected':''}>${n}</option>`).join('')}</select></label><label>范围 <select id="chart-range">${[30,60,120].map(v=>`<option value="${v}" ${range===v?'selected':''}>最近 ${v} 根</option>`).join('')}</select></label><label>图表 <select id="chart-style"><option value="candles" ${chartStyle==='candles'?'selected':''}>蜡烛图</option><option value="line" ${chartStyle==='line'?'selected':''}>收盘折线</option></select></label><span>已保存行情 · D${m.day} · 非实时</span></div>${plotted.html}${m.candles[symbol].length===1?'<p class="chart-caption">当前只有挂牌参考价。点击「推进 1 个模拟日」积累 K 线，不预填历史、不自动推进时间。</p>':''}</section>`;
  }
  function renderStocks(m,busy) {
    const s=SECURITIES.find(s=>s.id===symbol), held=m.shares[symbol];
    const buy=marketQuote(m,{kind:'stock',symbol,side:'buy',qty}),sell=marketQuote(m,{kind:'stock',symbol,side:'sell',qty});
    const list=SECURITIES.filter(s=>`${s.id} ${s.name} ${s.sector}`.toLowerCase().includes(search.toLowerCase()));
    root.innerHTML=`<div class="market-section-head"><div><h2>藏品股票 · 行情终端</h2><p>51 款藏品，51 个独立标的。股票是对应藏品的虚拟行情份额，不是公司股份，也不交付收藏实物。</p></div><label>当前藏品 <select id="stock-symbol">${symbolOptions()}</select></label></div><div class="exchange-layout"><aside class="instrument-panel"><label for="security-search">藏品行情列表</label><input id="security-search" type="search" placeholder="名称 / 代码 / 系列" value="${escape(search)}"><div class="instrument-list">${list.map(item=>{const b=m.candles[item.id].at(-1),delta=(b.close/b.open-1)*100;return `<button id="instrument-${item.id}" data-market-symbol="${item.id}" aria-pressed="${item.id===symbol}"><span><b>${item.name}</b><small>${item.id} · ${item.sector}</small></span><span class="${delta>=0?'quote-up':'quote-down'}">${cash(b.close)}<small>${delta>=0?'+':''}${delta.toFixed(2)}%</small></span></button>`;}).join('')||'<p>没有匹配的藏品</p>'}</div></aside><div class="instrument-main">${terminal(m)}<section class="stock-order"><div><h3>${s.name} · 现价委托</h3><p>买价 <b>${cash(buy.ask)}</b> / 卖价 <b>${cash(sell.bid)}</b> · 做市库存 ${MARKET_RULES.shares-held.qty} 股</p><p>持有 ${held.qty} 股 · 均摊成本 ${held.qty?cash(held.cost/held.qty):'—'} · 浮动盈亏 ${cash(held.qty*m.prices[symbol]-held.cost)}</p><small>没有挂单撮合；确认后按该次报价成交。每股仅为模拟份额，不增减收藏。</small></div><div>${quantity()}<div class="shop-actions"><button id="stock-buy-${symbol}" data-stock="${symbol}" data-side="buy" ${busy||m.cash<buy.total||held.qty+qty>MARKET_RULES.shares?'disabled':''}>买入 ${qty} 股</button><button id="stock-sell-${symbol}" data-stock="${symbol}" data-side="sell" ${busy||held.qty<qty?'disabled':''}>卖出 ${qty} 股</button></div></div></section></div></div>${legacyPositions(m,busy)}<h3>我的藏品股票持仓</h3><div class="holding-strip">${SECURITIES.filter(s=>m.shares[s.id].qty).map(s=>`<button data-market-symbol="${s.id}"><b>${s.name}</b> ${m.shares[s.id].qty} 股 · 市值 ${cash(m.shares[s.id].qty*m.prices[s.id])}</button>`).join('')||'<p class="market-note">尚无藏品股票持仓。</p>'}</div><p class="market-note">最新价是结算参考，不是成交价。价差至少每边 0.4%，手续费 0.1%（最低 0.01 模拟元）。OHLC 为已保存的合成情景，影线不是外部成交；量与额只统计本机账户实际股票交易，期权交易不计入。藏品商店积分价格与行情份额价格分开，不自动兑换。</p>`;
  }
  function legacyPositions(m,busy) {
    const held=LEGACY_SECURITIES.filter(s=>m.shares[s.id]?.qty);
    return held.length?`<section class="legacy-market"><h3>旧版公司持仓 · 仅可减仓</h3><p>原名称、成本和资金保留，不映射为藏品。旧期权仍会正常结算。</p>${held.map(s=>`<p>${s.name} / ${s.id} · ${m.shares[s.id].qty} 股 · 参考价 ${cash(m.prices[s.id])} <button data-stock="${s.id}" data-side="sell" ${busy?'disabled':''}>卖出 ${Math.min(qty,m.shares[s.id].qty)} 股</button></p>`).join('')}</section>`:'';
  }
  function renderOptions(m,busy) {
    const list=contracts(m,symbol,term);
    root.innerHTML=`<div class="market-section-head"><div><h2>藏品期权 · 同一藏品，看涨或看跌</h2><p>欧式、现金结算，一张对应 <b>1 股</b>（教学规格，不是常见的 100 股）。只能买入开仓、卖出已有合约平仓。</p></div></div><div class="market-controls"><label>标的 <select id="option-symbol">${symbolOptions()}</select></label><label>到期 <select id="option-term">${[5,20].map(t=>`<option value="${t}" ${t===term?'selected':''}>${t} 个模拟交易日后</option>`).join('')}</select></label>${quantity()}</div>${terminal(m)}<p class="market-risk">买入的最大损失＝权利金＋开仓手续费；可能全部损失。仅到期现金结算，不交付股票、不提前行权。离开页面不会推进到期日。</p><p class="market-note">窄屏可横向滑动报价表；键盘可聚焦表格区域后用方向键滚动。</p><div class="market-table-wrap" tabindex="0" role="region" aria-label="期权报价表，可横向滚动"><table class="market-table"><caption>${tickerOf(symbol)} / ${symbol} · 当前标的 ${cash(m.prices[symbol])} · 到期日 D${m.day+term} · 单位：模拟元</caption><thead><tr><th>方向 / 行权价</th><th>理论价</th><th>内在 / 时间价值</th><th>买价 / 卖价</th><th>开仓总额（含费）</th><th>委托</th></tr></thead><tbody>${list.map((c,i)=>{
      const q=marketQuote(m,{kind:'option',...c,side:'buy',qty});
      const intrinsic=Math.max(0,c.type==='call'?m.prices[symbol]-c.strike:c.strike-m.prices[symbol]);
      return `<tr><td><b>${c.type==='call'?'看涨 CALL':'看跌 PUT'}</b><small>K ${cash(c.strike)}</small></td><td>${cash(q.fair)}</td><td>${cash(intrinsic)} / ${cash(Math.max(0,q.fair-intrinsic))}</td><td>${cash(q.ask)} / ${cash(q.bid)}</td><td>${cash(q.total)}<small>最大损失</small></td><td><button id="option-buy-${i}" data-option-index="${i}" ${busy||m.cash<q.total?'disabled':''}>买 ${qty} 张</button></td></tr>`;
    }).join('')}</tbody></table></div><h3 class="positions-heading">我的期权持仓</h3><div class="option-positions">${m.options.map((c,i)=>{
      const sell=marketQuote(m,{kind:'option',...c,side:'sell',qty:c.qty});
      return `<article><strong>${optionName(c)}</strong><p>${c.qty} 张 · 剩 ${c.expiry-m.day} 日 · 总成本 ${cash(c.cost)} · 全部平仓净额 ${cash(sell.total)}</p><button id="option-close-${i}" data-option-close="${i}" ${busy?'disabled':''}>平仓全部 ${c.qty} 张</button></article>`;
    }).join('')||'<p class="market-note">尚无合约。先理解方向、行权价、时间价值和最大损失，再选择是否参与。</p>'}</div><p class="market-note">CRR 二叉树定价，利率与股息率均设为 0，年化波动率为固定情景参数。理论价不等于可成交价；期权每边价差 6% 加 0.01，另收 0.1% 手续费（零价平仓免手续费）。做市商锁定 ${cash(reservedCash(m))} 模拟元覆盖当前模型内最坏分支，现金不足时拒单；真实市场没有这样的有界保证。</p>`;
  }
  function renderRecords(state,m) {
    const rows=[...m.tape].reverse(), pages=Math.max(1,Math.ceil(rows.length/12));page=Math.max(0,Math.min(page,pages-1));
    root.innerHTML=`<h2>证券流水 · 每笔都能追溯</h2><p class="market-note">已实现盈亏采用含买入费用的加权平均成本；未平仓按理论价估值。买入费用已计入成本，卖出费用计入到账净额。</p><div class="market-ledger">${rows.slice(page*12,page*12+12).map(e=>`<article><span>D${e.day} / #${e.id}</span><div>${e.kind==='day'?'推进模拟日 · '+`${e.moves.filter(n=>n>0).length} 个标的上涨 / ${e.moves.filter(n=>n<0).length} 个标的下跌`:e.kind==='settlement'?`到期现金结算 · ${optionName(e)} · ${e.qty} 张`:`${e.side==='buy'?'买入':'卖出'} · ${e.kind==='option'?optionName(e):tickerOf(e.symbol)} · ${e.qty} ${e.kind==='option'?'张':'股'}`}<small>${e.kind==='day'?'已保存情景，不因刷新改变':e.kind==='settlement'?`到账 ${cash(e.payout)} · 本次盈亏 ${cash(e.realized)} · 已自动移除到期合约`:`成交单价 ${cash(e.unit)} · 费用 ${cash(e.fee)} · ${e.side==='buy'?'支出':'净到账'} ${cash(e.total)}`}</small></div></article>`).join('')||'<p>暂无证券交易。</p>'}</div><div class="history-paging"><button data-market-page="-1" ${page===0?'disabled':''}>上一页</button><span>${page+1} / ${pages}</span><button data-market-page="1" ${page===pages-1?'disabled':''}>下一页</button></div><h3>藏品商店 · 最近 20 笔（完整账本保留在存档）</h3><div class="market-ledger">${[...(state.shop?.entries||[])].reverse().slice(0,20).map(e=>`<article><span>#${e.id}</span><div>${e.side==='buy'?'买入':'卖出'} ${titleOf(e.key)}<small>${e.side==='buy'?'支出':'到账'} ${e.total} 体验积分 · 手续费 ${e.fee} · ${new Date(e.time).toLocaleString('zh-CN')}</small></div></article>`).join('')||'<p>暂无商店交易。</p>'}</div>`;
  }
  function preview(order) {
    returnFocusId=document.activeElement?.id || '';
    const state=getState(), m=marketState(state);
    let title, html;
    if(order.kind==='shop') {
      const q=shopQuote(shopBook(state),order.key,order.side), buy=order.side==='buy';
      pending={order,revision:state.shop?.entries.length||0};
      title=`${buy?'买入':'卖出'} · ${titleOf(order.key)}`;
      html=`<p>一份虚拟藏品 · 使用体验积分</p><dl><dt>成交价</dt><dd>${q.price}</dd><dt>手续费</dt><dd>${q.fee}</dd><dt>${buy?'总支出':'净到账'}</dt><dd>${q.total} 积分</dd></dl><p>${buy?'买入后立即加入收藏，可摆进任意场景。':'只出售闲置份数，不删除历史抽赏记录；卖出后会减少当前拥有量。'}</p>`;
    } else {
      const q=marketQuote(m,order), buy=order.side==='buy';
      pending={order,revision:m.revision};
      title=order.kind==='option'?optionName(order):`${tickerOf(order.symbol)} · ${buy?'买入':'卖出'}`;
      html=`<p>${buy?'买入':'卖出'} ${order.qty} ${order.kind==='option'?'张':'股'} · D${m.day} 报价</p><dl><dt>每份成交价</dt><dd>${cash(q.unit)}</dd><dt>手续费</dt><dd>${cash(q.fee)}</dd><dt>${buy?'总支出':'净到账'}</dt><dd>${cash(q.total)} 模拟元</dd></dl>${order.kind==='option'&&buy?`<p class="market-risk">最大损失 ${cash(q.total)} 模拟元。到期盈亏平衡标的价约 ${cash(order.type==='call'?order.strike+q.total/order.qty:order.strike-q.total/order.qty)}；仅为数学阈值，不是价格预测。到期收益＝max(0, ${order.type==='call'?'标的价−行权价':'行权价−标的价'}) × ${order.qty}，已付权利金不会退回。</p>`:'<p>不会消费或产生藏品，不与体验积分兑换。持仓价格可能下跌。</p>'}`;
    }
    document.querySelector('#trade-title').textContent=title;
    document.querySelector('#trade-details').innerHTML=html;
    document.querySelector('#trade-error').hidden=true;
    dialog.showModal();document.querySelector('#trade-cancel').focus();
  }
  root.addEventListener('change',e=>{
    if(!['shop-filter','market-qty','option-symbol','stock-symbol','option-term','chart-period','chart-range','chart-style'].includes(e.target.id)) return;
    if(e.target.id==='shop-filter') filter=e.target.value;
    if(e.target.id==='market-qty') qty=Number(e.target.value);
    if(['option-symbol','stock-symbol'].includes(e.target.id)) symbol=e.target.value;
    if(e.target.id==='chart-period') period=Number(e.target.value);
    if(e.target.id==='chart-range') range=Number(e.target.value);
    if(e.target.id==='chart-style') chartStyle=e.target.value;
    if(e.target.id==='option-term') term=Number(e.target.value);
    render();
  });
  root.addEventListener('input',e=>{
    if(e.target.id==='security-search') { search=e.target.value; render(); }
  });
  function inspectCandle(index) {
    if (!plotted || !root.querySelector('#market-kline')) return;
    cursor=Math.max(0,Math.min(plotted.bars.length-1,index));
    root.querySelector('#candle-readout').textContent=candleSummary(plotted.bars[cursor]);
    root.querySelector('#chart-crosshair').setAttribute('d',`M${plotted.x(cursor)} 25V360`);
  }
  root.addEventListener('pointermove',e=>{
    const svg=e.target.closest('#market-kline');if(!svg||!plotted)return;
    const rect=svg.getBoundingClientRect(), x=(e.clientX-rect.left)/rect.width*920;
    inspectCandle(Math.floor((x-plotted.start)/plotted.dx));
  });
  root.addEventListener('keydown',e=>{
    if(e.target.id!=='market-kline'||!plotted)return;
    if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) {
      e.preventDefault();inspectCandle(e.key==='Home'?0:e.key==='End'?plotted.bars.length-1:cursor+(e.key==='ArrowLeft'?-1:1));
      root.querySelector('#market-kline').setAttribute('aria-label',candleSummary(plotted.bars[cursor]));
    }
  });
  root.addEventListener('click',e=>{
    const candle=e.target.closest('[data-candle-index]');if(candle)inspectCandle(Number(candle.dataset.candleIndex));
    const b=e.target.closest('button');if(!b||b.disabled||getBusy())return;
    if(b.dataset.marketPage){page+=Number(b.dataset.marketPage);render();return;}
    if(b.dataset.marketSymbol){symbol=b.dataset.marketSymbol;render();return;}
    const m=marketState(getState());
    if(b.dataset.shopKey) preview({kind:'shop',key:b.dataset.shopKey,side:b.dataset.side});
    else if(b.dataset.stock) preview({kind:'stock',symbol:b.dataset.stock,side:b.dataset.side,qty:LEGACY_SECURITIES.some(s=>s.id===b.dataset.stock)?Math.min(qty,m.shares[b.dataset.stock].qty):qty});
    else if(b.dataset.optionIndex!==undefined) preview({kind:'option',...contracts(m,symbol,term)[Number(b.dataset.optionIndex)],side:'buy',qty});
    else if(b.dataset.optionClose!==undefined) preview({kind:'option',...m.options[Number(b.dataset.optionClose)],side:'sell'});
  });
  document.querySelectorAll('[data-market-tab]').forEach(b=>b.addEventListener('click',()=>{tab=b.dataset.marketTab;page=0;render();}));
  document.querySelector('#market-advance').addEventListener('click',async()=>{
    const revision=marketState(getState()).revision;
    const result=await transact(latest=>advanceMarket(latest,revision));
    if(result) { const m=marketState(getState());toast(`已推进至 D${m.day}。${m.settlements.length?`已自动结算 ${m.settlements.length} 份到期持仓；详情见流水。`:'价格已保存，刷新不会改变。'}`); }
  });
  document.querySelector('#trade-confirm').addEventListener('click',async()=>{
    if(!pending||getBusy())return;
    const {order,revision}=pending;
    const result=await transact(latest=>order.kind==='shop'?tradeItem(latest,order.key,order.side,revision):marketOrder(latest,order,revision));
    if(result){dialog.close();toast('已成交并保存。');}
    else{document.querySelector('#trade-error').textContent=document.querySelector('#toast').textContent;document.querySelector('#trade-error').hidden=false;}
  });
  // Native close is queued: a rapid reopen must not clear the new order.
  dialog.addEventListener('close',()=>{if(dialog.open)return;pending=null;const button=document.getElementById(returnFocusId);if(button&&!button.disabled)button.focus({preventScroll:true});returnFocusId='';});
  return {render,reset(){pending=null;page=0;tab='shop';filter='all';symbol='D-10';search='';period=1;range=60;chartStyle='candles';plotted=null;}};
}
