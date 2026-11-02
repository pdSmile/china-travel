const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');

// 从生产源码切片，避免测试里复制一份实现
function productionBlock(startMarker,endMarker){
  const start=html.indexOf(startMarker);
  const end=html.indexOf(endMarker,start);
  assert.ok(start>=0&&end>start,'切片失败: '+startMarker+' → '+endMarker);
  return html.slice(start,end);
}
const modelBlock=productionBlock('  const ROUTE_DIFFICULTIES=','  // 时间与次数聚合：唯一权威来源');
const statsBlock=productionBlock('  // 时间与次数聚合：唯一权威来源','  /* ---------- 城市元数据 CRUD');
const badgeBlock=productionBlock('  function routeDifficultyBadge(difficulty){','  // 取一条路线下的第 visitIdx 条经历');
const mediaBlock=productionBlock('  function countMedia(items){','  window.TravelVideo=');
const cardsBlock=productionBlock('  async function renderCityCards(){','  // 渲染省份筛选条\n  function renderProvinceFilter(provinces){');

/* ---------- 极简 DOM 桩（支持多参 append / insertBefore / innerHTML 清空） ---------- */
function makeEl(tag){
  let ownText=null;  // 显式设置过的 textContent；null = 未设置（读时聚合子节点）
  const el={
    tagName:String(tag).toUpperCase(),
    className:'',value:'',src:'',alt:'',type:'',title:'',draggable:false,
    children:[],parent:null,dataset:{},attrs:{},handlers:{},
    style:{setProperty(){},removeProperty(){}},
    classList:{add(){},remove(){},toggle(){},contains(){return false;}},
    appendChild(c){ c.parent=this; this.children.push(c); return c; },
    append(...nodes){ nodes.forEach(n=>this.appendChild(n)); },
    insertBefore(c,ref){
      c.parent=this;
      const i=this.children.indexOf(ref);
      this.children.splice(i<0?this.children.length:i,0,c);
      return c;
    },
    remove(){ const p=this.parent; if(p) p.children.splice(p.children.indexOf(this),1); },
    addEventListener(type,fn){ (this.handlers[type]||(this.handlers[type]=[])).push(fn); },
    setAttribute(k,v){ this.attrs[k]=v; },
    getBoundingClientRect(){ return {left:0,top:0,width:100,height:100}; }
  };
  Object.defineProperty(el,'textContent',{
    get(){ if(ownText!=null) return ownText; return el.children.map(c=>c.textContent||'').join(''); },
    set(v){ ownText=v==null?'':String(v); }
  });
  Object.defineProperty(el,'innerHTML',{
    get(){ return el._html||''; },
    set(v){ el._html=v; if(v==='') el.children.length=0; }
  });
  return el;
}
function walk(node,fn){ fn(node); (node.children||[]).forEach(c=>walk(c,fn)); }
function findAll(root,cls){
  const out=[];
  walk(root,n=>{ if(String(n.className||'').split(/\s+/).includes(cls)) out.push(n); });
  return out;
}
function findFirst(root,cls){ return findAll(root,cls)[0]||null; }
/* 去掉 CSS 注释，避免注释里的说明文字干扰类名断言 */
function stripComments(css){ return css.replace(/\/\*[\s\S]*?\*\//g,''); }

/* ---------- 测试数据 ---------- */
const METAS={
  '320500_苏州市':{
    attractions:[
      {name:'虎丘山径',difficulty:'moderate',distanceKm:8.5,elevationGain:320,maxAltitude:48,lng:120.5712,lat:31.3364,
       visits:[
         {visitDate:'2026-03-18',notes:'第一次徒步',photos:[{id:1,name:'a.jpg',kind:'image',dataUrl:'ph1'},{id:3,name:'v.mp4',kind:'video',dataUrl:'poster3'}]},
         {visitDate:'2026-05-02',notes:'',photos:[{id:2,name:'b.jpg',kind:'image',dataUrl:'ph2'}]}
       ]},
      {name:'太湖环线',difficulty:'hard',distanceKm:21,elevationGain:600,maxAltitude:120,lng:120.2,lat:31.2,
       visits:[{visitDate:'2026-04-11',notes:'',photos:[]}]}
    ]
  },
  '330100_杭州市':{
    attractions:[
      {name:'西湖环湖',difficulty:'easy',distanceKm:12,elevationGain:80,maxAltitude:60,lng:120.15,lat:30.25,
       visits:[{visitDate:'2025-11-08',notes:'',photos:[]}]},
      // 还没有任何徒步经历的路线 → 日期显示兜底文案、次数为 0
      {name:'龙井茶园',difficulty:'easy',distanceKm:4,elevationGain:60,maxAltitude:110,lng:120.1,lat:30.2,
       visits:[]},
      // 既没有距离也没有爬升 → 第二行（爬升·距离）整行不渲染，不留空位
      {name:'九溪十八涧',difficulty:'easy',lng:120.1,lat:30.22,
       visits:[]}
    ]
  }
};
const ALBUMS={
  '320500_苏州市':[
    {id:1,dataUrl:'ph1',kind:'image',order:1},
    {id:2,dataUrl:'ph2',kind:'image',order:2},
    {id:3,dataUrl:'poster3',kind:'video',order:3}
  ],
  '330100_杭州市':[]
};
const CITY_POINTS=[
  {cityKey:'320500_苏州市',name:'苏州市',value:[120.5853,31.2989],adcode:'320500'},
  {cityKey:'330100_杭州市',name:'杭州市',value:[120.1551,30.2741],adcode:'330100'}
];

async function renderCards(){
  const listEl=makeEl('div'),gridEl=makeEl('div'),emptyEl=makeEl('div');
  const doc={
    createElement:tag=>makeEl(tag),
    createTextNode:text=>({nodeType:3,textContent:String(text)}),
    body:{classList:{contains(){return false;}}},
    querySelectorAll(){ return []; }
  };
  const deps={
    citiesWithPhotos:new Set(Object.keys(METAS)),
    cityPoints:CITY_POINTS,
    cityCardsListEl:listEl,
    cityGridEl:gridEl,
    cityCardsEmptyEl:emptyEl,
    getCityMeta:async key=>METAS[key]||{},
    getPhotosByCity:async key=>ALBUMS[key]||[],
    renderStars:()=>'<span class="star-display-inner">★</span>',
    provinceOf:adcode=>({'320500':'江苏省','330100':'浙江省'})[adcode]||'未知',
    renderProvinceFilter:()=>{},
    applyProvinceFilter:()=>{},
    focusCityOnMap:()=>{},
    openCityModal:()=>{},
    openPhotoViewer:()=>{},
    document:doc,
    setTimeout:()=>0,
    requestAnimationFrame:()=>0
  };
  const src=modelBlock+statsBlock+badgeBlock+mediaBlock+cardsBlock+'\nreturn renderCityCards;';
  const render=new Function(...Object.keys(deps),src)(...Object.values(deps));
  await render();
  return {listEl,gridEl};
}

/* ---------- 卡片数量：一个城市一张卡 ---------- */

test('顶层列表每个城市一张卡（不再一条路线一张卡）',async()=>{
  const {listEl}=await renderCards();
  const cards=findAll(listEl,'city-card');
  assert.equal(cards.length,2,'2 个城市应产出 2 张卡（不是 3 张路线卡）');
  const keys=cards.map(c=>c.dataset.cityKey);
  assert.deepEqual(keys,['320500_苏州市','330100_杭州市']);
});

test('网格视图同样每个城市一张卡',async()=>{
  const {gridEl}=await renderCards();
  assert.equal(findAll(gridEl,'grid-card').length,2);
});

/* ---------- 卡内路线列表 ---------- */

test('卡内列出该城市的全部徒步路线（两行制：名称+日期·次数 / 爬升·距离）',async()=>{
  const {listEl}=await renderCards();
  const card=findAll(listEl,'city-card').find(c=>c.dataset.cityKey==='320500_苏州市');
  const rows=findAll(card,'city-card-route');
  assert.equal(rows.length,2,'苏州市有 2 条路线');

  assert.deepEqual(findAll(card,'city-card-route-name').map(n=>n.textContent),['虎丘山径','太湖环线']);

  // 难度徽章已从卡内移除
  assert.equal(findAll(card,'city-card-route-badge').length,0,'卡内路线行不再显示难度徽章');

  // 第二行 = 爬升 · 距离（顺序：爬升在前；不含最高海拔）
  const metas=findAll(card,'city-card-route-meta');
  assert.equal(metas.length,2);
  assert.equal(metas[0].textContent,'爬升 320 m · 距离 8.5 km');
  assert.equal(metas[1].textContent,'爬升 600 m · 距离 21 km');
  assert.ok(!metas[0].textContent.includes('最高'),'卡内不再显示最高海拔');
  assert.ok(!metas[0].textContent.includes('48 m'),'卡内不应出现最高海拔数值');

  // 坐标已从卡内移除
  assert.equal(findAll(card,'city-card-route-coord').length,0,'卡内路线行不再显示坐标');

  // 第一行 = 日期 · 次数（次数始终跟时间）
  const times=findAll(card,'city-card-route-time');
  assert.equal(times.length,2);
  assert.equal(times[0].textContent,'2026-05-02 · 2 次','虎丘山径：日期 + 次数');
  assert.equal(times[1].textContent,'2026-04-11 · 1 次','太湖环线：日期 + 次数');
});

test('路线行是两行制：第一行名称+日期·次数，第二行爬升·距离',async()=>{
  const {listEl}=await renderCards();
  const card=findAll(listEl,'city-card').find(c=>c.dataset.cityKey==='320500_苏州市');
  const rows=findAll(card,'city-card-route');
  rows.forEach(row=>{
    // 每行有且只有一个 .city-card-route-top（第一行容器）
    assert.equal(findAll(row,'city-card-route-top').length,1,'每行应有一个第一行容器');
    const top=findAll(row,'city-card-route-top')[0];
    // 第一行里恰好是：名称 + 日期·次数
    assert.equal(findAll(top,'city-card-route-name').length,1,'第一行含路线名');
    assert.equal(findAll(top,'city-card-route-time').length,1,'第一行含日期·次数');
    // 第二行不在 top 里
    assert.equal(findAll(top,'city-card-route-meta').length,0,'第二行不在第一行容器内');
  });
  // DOM 顺序：top 在前，meta 在后
  const cls=rows[0].children.map(c=>String(c.className||'').split(/\s+/)[0]);
  assert.deepEqual(cls,['city-card-route-top','city-card-route-meta'],'行内顺序：先第一行再第二行');
});

test('没有距离也没有爬升时：第二行整行不渲染（不留空行/空位）',async()=>{
  const {listEl}=await renderCards();
  const card=findAll(listEl,'city-card').find(c=>c.dataset.cityKey==='330100_杭州市');
  const rows=findAll(card,'city-card-route');
  assert.equal(rows.length,3,'杭州市有 3 条路线');

  // 第三条「九溪十八涧」既无距离也无爬升 → 没有第二行元素
  const bare=rows[2];
  assert.equal(findAll(bare,'city-card-route-meta').length,0,'无爬升无距离 → 不渲染第二行元素');
  // 该行只剩第一行容器（没有多余的空 span）
  assert.equal(bare.children.length,1,'该行只应有一个子元素（第一行容器）');
  assert.equal(String(bare.children[0].className||'').split(/\s+/)[0],'city-card-route-top');
  // 整张卡里，第二行元素数量 = 有爬升或距离的路线数
  assert.equal(findAll(card,'city-card-route-meta').length,2,'只有前两条路线渲染第二行');
});

test('卡内路线行不再显示月份区间',async()=>{
  const {listEl}=await renderCards();
  const card=findAll(listEl,'city-card').find(c=>c.dataset.cityKey==='320500_苏州市');
  const times=findAll(card,'city-card-route-time');
  assert.ok(!times[0].textContent.includes('2026-03'),'不应再显示月份区间起点');
  assert.ok(!times[0].textContent.includes('~'),'不应再显示月份区间分隔符');
});

test('路线还没有徒步经历时，日期显示兜底文案、次数为 0',async()=>{
  const {listEl}=await renderCards();
  const card=findAll(listEl,'city-card').find(c=>c.dataset.cityKey==='330100_杭州市');
  const times=findAll(card,'city-card-route-time');
  assert.equal(times.length,3);
  assert.equal(times[0].textContent,'2025-11-08 · 1 次','西湖环湖有徒步日期');
  assert.equal(times[1].textContent,'未记录日期 · 0 次','无经历的路线应显示兜底文案');
  assert.equal(times[2].textContent,'未记录日期 · 0 次','无经历且无指标的路线同样兜底');
});

test('卡内路线行是只读的：自身不绑点击，点击冒泡到卡片打开城市弹窗',async()=>{
  const {listEl}=await renderCards();
  const card=findAll(listEl,'city-card').find(c=>c.dataset.cityKey==='320500_苏州市');
  const rows=findAll(card,'city-card-route');
  rows.forEach(row=>{
    assert.ok(!row.handlers.click,'路线行不应单独绑定 click');
  });
  assert.ok(card.handlers.click&&card.handlers.click.length,'卡片本身应绑定 click');
});

test('路线列表容器插在标题与缩略图之间',async()=>{
  const {listEl}=await renderCards();
  const card=findAll(listEl,'city-card')[0];
  const cls=card.children.map(c=>String(c.className||'').split(/\s+/)[0]);
  const iRoutes=cls.indexOf('city-card-routes');
  const iHead=cls.indexOf('city-card-head');
  const iThumbs=cls.indexOf('city-card-thumbs');
  assert.ok(iRoutes>=0,'缺少 .city-card-routes 容器');
  assert.ok(iHead<iRoutes&&iRoutes<iThumbs,'路线列表应夹在标题与缩略图之间');
});

/* ---------- 卡片头部 ---------- */

test('卡片头部只保留城市名（副标题与时间范围已删除）',async()=>{
  const {listEl}=await renderCards();
  const card=findAll(listEl,'city-card').find(c=>c.dataset.cityKey==='320500_苏州市');
  assert.equal(findFirst(card,'city-card-name').textContent,'苏州市');
  // 副标题「N 条路线 · M 次徒步」已删除
  assert.equal(findFirst(card,'city-card-sub'),null,'不应再有副标题元素');
  // 右上角时间范围已删除
  assert.equal(findFirst(card,'city-card-date'),null,'不应再有时间范围元素');
  // 头部只剩城市名一个元素
  const head=findFirst(card,'city-card-head');
  assert.equal(head.children.length,1,'头部只保留城市名一个元素');
  assert.equal(String(head.children[0].className||'').split(/\s+/)[0],'city-card-name');
});

test('网格卡主标题是城市名，副标题是省份',async()=>{
  const {gridEl}=await renderCards();
  const card=findAll(gridEl,'grid-card').find(c=>c.dataset.cityKey==='320500_苏州市');
  assert.ok(findFirst(card,'grid-card-name').textContent.includes('苏州'),'网格主标题应是城市名');
  assert.equal(findFirst(card,'grid-card-province').textContent,'📍 江苏省');
});

test('城市卡片缩略图汇总该城市全部路线的照片',async()=>{
  const {listEl}=await renderCards();
  const card=findAll(listEl,'city-card').find(c=>c.dataset.cityKey==='320500_苏州市');
  assert.equal(findAll(card,'city-card-thumb').length,3,'两条路线的照片应汇总到同一张城市卡');
});

/* ---------- 旧字段已移除 ---------- */

test('旧的路线级 item 字段已全部移除',()=>{
  assert.ok(!cardsBlock.includes('item.routeStats'),'不应再有 item.routeStats');
  assert.ok(!cardsBlock.includes('item.routeName'),'不应再有 item.routeName');
  assert.ok(!cardsBlock.includes('item.routeIndex'),'不应再有 item.routeIndex');
  assert.ok(cardsBlock.includes('item.cityStats'),'应改用 item.cityStats');
  assert.ok(cardsBlock.includes('item.routeRows'),'应新增 item.routeRows');
});

test('卡内路线行只保留 名称 / 日期·次数 / 爬升·距离',()=>{
  assert.ok(!cardsBlock.includes('row.difficulty'),'不应再渲染难度徽章');
  assert.ok(!cardsBlock.includes('row.coord'),'不应再渲染坐标');
  assert.ok(!cardsBlock.includes('row.timeRange'),'不应再渲染月份区间');
  assert.ok(cardsBlock.includes('row.lastDate'),'应使用最近一次徒步日期');
  assert.ok(cardsBlock.includes('row.visitCount'),'应保留次数');
  assert.ok(cardsBlock.includes('row.metrics'),'应保留第二行指标（爬升·距离）');
  assert.ok(cardsBlock.includes("'city-card-route-top'"),'应保留第一行容器');
});

/* ---------- CSS：变量化 + 不复用白字类 ---------- */

test('卡内路线列表样式走项目变量',()=>{
  const css=stripComments(productionBlock('  /* ===== 卡内徒步路线列表','  /* 空态提示'));
  assert.ok(/\.city-card-route\{[^}]*border:1px solid var\(--line\)/.test(css),'路线行描边应使用 var(--line)');
  assert.ok(/\.city-card-route\{[^}]*border-radius:var\(--radius-sm\)/.test(css),'路线行圆角应使用 var(--radius-sm)');
  assert.ok(/\.city-card-route\{[^}]*background:var\(--line-2\)/.test(css),'路线行背景应使用 var(--line-2)');
  assert.ok(/\.city-card-route\{[^}]*flex-direction:column/.test(css),'路线行应为两行制（列向 flex）');
  assert.ok(/\.city-card-route-name\{[^}]*color:var\(--ink\)/.test(css),'路线名应使用 var(--ink)');
  assert.ok(/\.city-card-route-name\{[^}]*text-overflow:ellipsis/.test(css),'路线名过长应省略号截断');
  assert.ok(/\.city-card-route-name\{[^}]*min-width:0/.test(css),'路线名需 min-width:0 才能截断');
  assert.ok(/\.city-card-route-meta\{[^}]*color:var\(--muted\)/.test(css),'路线数据应使用 var(--muted)');
  assert.ok(/\.city-card-route-time\{[^}]*color:var\(--muted\)/.test(css),'日期·次数应使用 var(--muted)');
  assert.ok(/\.city-card-route-time\{[^}]*flex:0 0 auto/.test(css),'日期·次数不可被挤压');
});

test('卡片头部样式：城市名弱化，副标题与时间范围已彻底删除',()=>{
  const css=stripComments(productionBlock('  .city-card-head{','  /* ===== 卡片缩略图容器'));
  assert.ok(css.includes('.city-card-name'),'应保留 .city-card-name');
  assert.ok(/\.city-card-name\{[^}]*font-size:13px/.test(css),'城市名应为 13px');
  assert.ok(/\.city-card-name\{[^}]*font-weight:600/.test(css),'城市名字重应为 600');
  assert.ok(/\.city-card-name\{[^}]*color:var\(--muted\)/.test(css),'城市名应使用 var(--muted)');
  assert.ok(!css.includes('text-shadow'),'城市名不应再有发光 text-shadow');
  assert.ok(!css.includes('.city-card-sub'),'副标题样式应已删除');
  assert.ok(!css.includes('.city-card-date'),'时间范围样式应已删除');
  assert.ok(!css.includes('.city-card-titles'),'标题包装层样式应已删除');
  // 全文件（含 JS）不得再有这三个类名，避免孤儿元素/样式
  assert.ok(!html.includes('city-card-sub'),'不应再有 city-card-sub');
  assert.ok(!html.includes('city-card-date'),'不应再有 city-card-date');
  assert.ok(!html.includes('city-card-titles'),'不应再有 city-card-titles');
});

test('难度徽章与坐标的样式已随之移除',()=>{
  const css=stripComments(productionBlock('  /* ===== 卡内徒步路线列表','  /* 空态提示'));
  assert.ok(!css.includes('.city-card-route-badge'),'难度徽章样式应已移除');
  assert.ok(!css.includes('.city-card-route-coord'),'坐标样式应已移除');
});

test('卡内路线列表不使用深色页专用的白字类（浅色主题会看不见）',()=>{
  assert.ok(!cardsBlock.includes("'route-metrics'"),'卡内不应复用 .route-metrics（白字）');
  assert.ok(!cardsBlock.includes("'route-coord'"),'卡内不应复用 .route-coord（白字）');
  const css=stripComments(productionBlock('  /* ===== 卡内徒步路线列表','  /* 空态提示'));
  assert.ok(!css.includes('.route-metrics'),'卡内路线样式不应引用 .route-metrics');
  assert.ok(!css.includes('.route-coord'),'卡内路线样式不应引用 .route-coord');
});

test('路线列表容器已加入 z-index 白名单（不被流星层遮挡）',()=>{
  const zIndex=productionBlock('  .city-card>.city-card-head,','  .meteors-layer .meteor{');
  assert.ok(zIndex.includes('.city-card>.city-card-routes'),'.city-card-routes 应提升到流星层之上');
});
