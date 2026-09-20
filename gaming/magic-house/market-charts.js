// Deterministic presentation of saved OHLCV. No quote/RNG/storage side effects.
export function aggregateCandles(candles, period = 1) {
  if (![1,5,20].includes(period)) throw new Error('无效K线周期');
  const result=[];
  for (const bar of candles) {
    const bucket=Math.floor(bar.day/period), last=result.at(-1);
    if (last?.bucket===bucket) {
      last.high=Math.max(last.high,bar.high);last.low=Math.min(last.low,bar.low);
      last.close=bar.close;last.volume+=bar.volume;last.turnover+=bar.turnover;last.endDay=bar.day;
    } else result.push({...bar,bucket,endDay:bar.day});
  }
  return result;
}
export function movingAverage(bars, window) {
  return bars.map((_,i)=>i+1<window?null:bars.slice(i+1-window,i+1).reduce((sum,b)=>sum+b.close,0)/window);
}
const price=n=>(n/100).toFixed(2), f=n=>Number(n.toFixed(2));
export function candleSummary(bar) {
  return `D${bar.day}${bar.endDay!==bar.day?'–D'+bar.endDay:''}　开 ${price(bar.open)}　高 ${price(bar.high)}　低 ${price(bar.low)}　收 ${price(bar.close)}　成交量 ${bar.volume} 股　成交额 ${price(bar.turnover)} 模拟元`;
}
export function candleChart(candles, period=1, count=60, style='candles') {
  const all=aggregateCandles(candles,period), bars=all.slice(-count), offset=all.length-bars.length;
  const averages=[5,10,20].map(window=>({window,values:movingAverage(all,window).slice(offset)}));
  const averagePrices=averages.flatMap(a=>a.values.filter(v=>v!==null));
  const lo=Math.min(...bars.map(b=>b.low),...averagePrices), hi=Math.max(...bars.map(b=>b.high),...averagePrices);
  const pad=Math.max((hi-lo)*.12,hi*.003,1), min=lo-pad, max=hi+pad;
  const width=770, dx=width/Math.max(bars.length,12), start=52, y=v=>258-(v-min)/(max-min)*220;
  const x=i=>start+dx*(i+.5), maxVolume=Math.max(1,...bars.map(b=>b.volume));
  const bodyWidth=Math.max(2,Math.min(20,dx*.65));
  const grid=Array.from({length:5},(_,i)=>{const value=min+(max-min)*i/4,py=f(y(value));return `<path d="M52 ${py}H830" class="chart-grid"/><text x="840" y="${py+4}" class="chart-axis">${price(value)}</text>`;}).join('');
  const candlesSvg=bars.map((b,i)=>{
    const color=b.close>=b.open?'#ef736c':'#52c5a4', px=f(x(i));
    const title=candleSummary(b);
    return `<g data-candle-index="${i}"><title>${title}</title>${style==='candles'?`<path d="M${px} ${f(y(b.high))}V${f(y(b.low))}" stroke="${color}" stroke-width="1.5"/><rect x="${f(px-bodyWidth/2)}" y="${f(Math.min(y(b.open),y(b.close)))}" width="${bodyWidth}" height="${Math.max(1.5,f(Math.abs(y(b.open)-y(b.close))))}" fill="${color}"/>`:''}<rect x="${f(px-bodyWidth/2)}" y="${f(350-b.volume/maxVolume*55)}" width="${bodyWidth}" height="${b.volume?f(b.volume/maxVolume*55):0}" fill="${color}" opacity=".65"/><rect x="${f(start+i*dx)}" y="25" width="${f(dx)}" height="340" fill="transparent"/></g>`;
  }).join('');
  const ma=averages.map((a,j)=>`<polyline class="chart-ma ma-${a.window}" points="${a.values.map((v,i)=>v===null?'':`${f(x(i))},${f(y(v))}`).filter(Boolean).join(' ')}" fill="none" stroke="${['#f1c578','#83b7fa','#c5a0ee'][j]}" stroke-width="1.5"/>`).join('');
  const line=style==='line'?`<polyline points="${bars.map((b,i)=>`${f(x(i))},${f(y(b.close))}`).join(' ')}" fill="none" stroke="#76d7c6" stroke-width="2"/>${bars.length===1?`<circle cx="${f(x(0))}" cy="${f(y(bars[0].close))}" r="3" fill="#76d7c6"/>`:''}`:'';
  const dates=bars.filter((_,i)=>i%Math.max(1,Math.ceil(bars.length/6))===0).map(b=>{const i=bars.indexOf(b);return `<text x="${f(x(i))}" y="378" class="chart-axis" text-anchor="middle">D${b.day}</text>`;}).join('');
  return { bars, averages, html:`<div class="terminal-chart"><div class="chart-legend"><span>红涨 / 绿跌</span><span class="legend-ma5">MA5</span><span class="legend-ma10">MA10</span><span class="legend-ma20">MA20</span><span>${bars.length} 根 · ${period} 模拟日 / 根</span></div><p id="candle-readout" class="candle-readout" aria-live="off">${candleSummary(bars.at(-1))}</p><svg id="market-kline" viewBox="0 0 920 400" role="img" tabindex="0" aria-describedby="candle-readout" aria-label="藏品K线与成交量；左右方向键查看各根开高低收，Home或End跳到首尾"><desc>已保存的模拟行情，不是实时市场。成交量仅为本机账户实际成交股数。</desc>${grid}${candlesSvg}${line}${ma}<path d="M52 285H830" class="chart-grid"/><text x="52" y="282" class="chart-axis">VOL · 本机实际成交股数</text>${dates}<path id="chart-crosshair" d="M${f(x(bars.length-1))} 25V360" stroke="#e4ddc7" stroke-dasharray="4 4" opacity=".55"/></svg><p class="chart-caption">鼠标／轻触／左右键查看 OHLCV。仅已有数据；没有成交时量为 0。MA 为所选周期收盘均线，不足周期不显示。</p></div>`, x, dx, start };
}
