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
const routeVisitsBlock=productionBlock('  function routeVisits(route){','  // 一条路线最近一次经历的日期');
const difficultyBlock=productionBlock('  const ROUTE_DIFFICULTIES=','  const DIFFICULTY_COLORS=');
const badgeBlock=productionBlock('  function routeDifficultyBadge(difficulty){','  // 指标行文本：里程 / 爬升 / 最高海拔');
const cardBlock=productionBlock('  // 经历卡的连线锚点：路线自己的坐标；未填写坐标则回落到城市质心','  function requestProvinceFocusLayout(){');
const layoutBlock=productionBlock('  function layoutProvinceFocusCards(){','  /* ============================================================\n   * 本机资料文件夹');
const dragBlock=productionBlock('  // 第二个参数是卡片条目（不是城市）：经历卡的连线锚点是路线坐标，图钉/位置缓存按条目 key 记录','  // 拖动结束后抑制一次点击');

/* ---------- 极简 DOM 桩 ---------- */
function makeEl(tag){
  let ownText=null;
  const el={
    tagName:String(tag).toUpperCase(),
    className:'',value:'',src:'',alt:'',type:'',title:'',draggable:false,
    children:[],parent:null,dataset:{},attrs:{},handlers:{},style:{},
    classList:{add(){},remove(){},toggle(){},contains(){return false;}},
    appendChild(c){ c.parent=this; this.children.push(c); return c; },
    append(...nodes){ nodes.forEach(n=>this.appendChild(n)); },
    insertBefore(c,ref){ c.parent=this; const i=this.children.indexOf(ref); this.children.splice(i<0?this.children.length:i,0,c); return c; },
    remove(){ const p=this.parent; if(p) p.children.splice(p.children.indexOf(this),1); },
    addEventListener(type,fn){ (this.handlers[type]||(this.handlers[type]=[])).push(fn); },
    setAttribute(k,v){ this.attrs[k]=v; },
    getBoundingClientRect(){ return {left:0,top:0,width:154,height:70}; }
  };
  el.style.setProperty=()=>{};
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

/* ---------- 测试数据 ---------- */
// 江苏省：2 条路线 3 条经历；浙江省：1 条路线 1 条经历（无难度、无照片）
const METAS={
  '320500_苏州市':{
    coverImage:'city-cover-suzhou',
    rating:4,
    tags:[{text:'园林'}],
    attractions:[
      {name:'虎丘山径',difficulty:'moderate',distanceKm:8.5,elevationGain:320,maxAltitude:48,lng:120.5712,lat:31.3364,
       visits:[
         {visitDate:'2026-03-18',notes:'第一次徒步',photos:[{id:1,name:'a.jpg',kind:'image',dataUrl:'ph1'},{id:3,name:'v.mp4',kind:'video',dataUrl:'poster3'}]},
         {visitDate:'2026-05-02',notes:'',photos:[{id:2,name:'b.jpg',kind:'image',dataUrl:'ph2'}]}
       ]},
      {name:'太湖环线',difficulty:'hard',distanceKm:21,elevationGain:600,maxAltitude:120,
       visits:[{visitDate:'2026-04-11',notes:'',photos:[]}]}
    ]
  },
  '320100_南京市':{
    attractions:[
      {name:'老山步道',difficulty:'',lng:118.8,lat:32.05,
       visits:[{visitDate:'2026-01-05',notes:'',photos:[{id:9,name:'c.jpg',kind:'image',dataUrl:'ph9'}]}]}
    ]
  },
  '330100_杭州市':{
    attractions:[
      {name:'西湖环湖',difficulty:'easy',lng:120.15,lat:30.25,
       visits:[{visitDate:'2025-11-08',notes:'',photos:[]}]}
    ]
  },
  // 安徽省：只有相册照片，没有任何徒步路线 → 省份视图回退为城市卡
  '340100_合肥市':{attractions:[]}
};
const ALBUMS={
  '320500_苏州市':[{id:1,dataUrl:'ph1',kind:'image',order:1}],
  '320100_南京市':[],                                  // 有路线但相册无照片 → 必须仍出现在省份卡里
  '330100_杭州市':[{id:7,dataUrl:'ph7',kind:'image',order:1}],
  '340100_合肥市':[{id:8,dataUrl:'ph8',kind:'image',order:1}]
};
const CITY_POINTS=[
  {cityKey:'320500_苏州市',name:'苏州市',value:[120.5853,31.2989],adcode:'320500'},
  {cityKey:'320100_南京市',name:'南京市',value:[118.7969,32.0603],adcode:'320100'},
  {cityKey:'330100_杭州市',name:'杭州市',value:[120.1551,30.2741],adcode:'330100'},
  {cityKey:'340100_合肥市',name:'合肥市',value:[117.2830,31.8612],adcode:'340100'}
];
const PROVINCES={'32':'江苏省','33':'浙江省','34':'安徽省'};

/* ---------- 载入生产实现 ---------- */
function build(overrides){
  const calls={openedDetail:[],openedModal:[],dragged:[],layout:0,fpSync:0};
  const cardsEl=makeEl('div'),linesEl=makeEl('div'),layerEl=makeEl('div');
  const doc={
    createElement:tag=>makeEl(tag),
    createElementNS:(ns,tag)=>makeEl(tag),
    createTextNode:text=>({nodeType:3,textContent:String(text)}),
    body:{classList:{contains(){return false;}}}
  };
  const state={currentView:'province',selectedProvinceName:'江苏省'};
  const deps={
    cityPoints:CITY_POINTS,
    citiesWithPhotos:new Set(Object.keys(ALBUMS).filter(k=>ALBUMS[k].length)),
    photoCountByCity:new Map(Object.entries(ALBUMS).map(([k,v])=>[k,v.length])),
    getCityMeta:async key=>METAS[key]||{},
    provinceOf:adcode=>PROVINCES[String(adcode).slice(0,2)]||'未知',
    renderStars:n=>'<span class="star-display-inner">'+'★'.repeat(n)+'</span>',
    provinceFocusCards:cardsEl,
    provinceFocusLines:linesEl,
    provinceFocusLayer:layerEl,
    mapWrapEl:{clientWidth:1200,clientHeight:800},
    provinceCardInsets:()=>({left:18,right:18,top:18,bottom:58,w:154,h:70}),
    resetCityCardRoamTransform:()=>{},
    requestProvinceFocusLayout:()=>{ calls.layout++; },
    fpSyncCardsVisibility:()=>{ calls.fpSync++; },
    openAttractionDetail:(city,idx)=>calls.openedDetail.push([city.cityKey,idx]),
    openCityModal:city=>calls.openedModal.push(city.cityKey),
    attachProvinceCardDrag:(card,item)=>{ calls.dragged.push([card.dataset.cardKey,item&&item.key]); },
    document:doc,
    ...(overrides||{})
  };
  // cardBlock 里用到的可变状态放进闭包，便于断言
  const src=`
    let provinceFocusCities=[];
    let provinceFocusRenderToken=0;
    const cardPosCache={};
    let currentView=${JSON.stringify(state.currentView)};
    let selectedProvinceName=${JSON.stringify(state.selectedProvinceName)};
    ${routeVisitsBlock}
    ${difficultyBlock}
    ${badgeBlock}
    ${cardBlock}
    return {
      render:renderProvinceFocusCards,
      entries:()=>provinceFocusCities,
      cardPosCache,
      setView:(v,p)=>{ currentView=v; selectedProvinceName=p; }
    };
  `;
  const api=new Function(...Object.keys(deps),src)(...Object.values(deps));
  return {api,calls,cardsEl,linesEl,layerEl,state};
}

/* ---------- 1. 一条徒步经历一张卡 ---------- */

test('点击省份后：该省每条徒步经历一张卡（不再一城一卡）',async()=>{
  const {api,cardsEl}=build();
  await api.render('江苏省');
  const cards=findAll(cardsEl,'province-map-card');
  assert.equal(cards.length,4,'江苏省 3 条经历（虎丘山径×2 + 太湖环线×1 + 老山步道×1）应产出 4 张卡');
  assert.equal(cards.every(c=>String(c.className).includes('province-map-card--visit')),true,'全部是经历卡');
});

test('城市视图（未选省份）仍是一城一卡',async()=>{
  const {api,cardsEl}=build();
  api.setView('city','');
  await api.render('');
  const cards=findAll(cardsEl,'province-map-card');
  assert.equal(cards.length,3,'有相册照片的 3 个城市各一张卡');
  assert.equal(cards.every(c=>!String(c.className).includes('province-map-card--visit')),true,'城市视图不出现经历卡');
});

test('有路线但相册无照片的城市也必须出现在省份卡里（不受相册照片闸门限制）',async()=>{
  const {api,cardsEl}=build();
  await api.render('江苏省');
  const keys=findAll(cardsEl,'province-map-card').map(c=>c.dataset.cardKey);
  assert.ok(keys.includes('320100_南京市#0#0'),'南京市相册无照片，但有徒步经历 → 必须出卡');
});

test('该省没有任何徒步经历时回退为城市卡（不出现空白省份）',async()=>{
  const {api,cardsEl}=build();
  api.setView('province','安徽省');
  await api.render('安徽省');
  const cards=findAll(cardsEl,'province-map-card');
  assert.equal(cards.length,1,'安徽省无徒步经历 → 回退为城市卡');
  assert.equal(String(cards[0].className).includes('province-map-card--visit'),false,'回退的是城市卡');
  assert.equal(findFirst(cards[0],'province-map-card-name').textContent,'合肥市');
  assert.ok(findFirst(cards[0],'province-map-card-rating'),'城市卡保留星级行');
});

test('经历无照片 → 「无封面」占位',async()=>{
  const {api,cardsEl}=build();
  api.setView('province','浙江省');
  await api.render('浙江省');
  const cards=findAll(cardsEl,'province-map-card');
  assert.equal(cards.length,1);
  assert.equal(String(cards[0].className).includes('province-map-card--visit'),true);
  const empty=findFirst(cards[0],'province-map-card-image-empty');
  assert.ok(empty,'无照片 → 无封面占位');
  assert.equal(empty.textContent,'无封面');
});

/* ---------- 2. key 唯一 ---------- */

test('经历卡 key 唯一：城市#路线下标#经历下标',async()=>{
  const {api}=build();
  await api.render('江苏省');
  const keys=api.entries().map(e=>e.key);
  assert.equal(new Set(keys).size,keys.length,'key 不重复');
  assert.deepEqual([...keys].sort(),[
    '320100_南京市#0#0',
    '320500_苏州市#0#0',
    '320500_苏州市#0#1',
    '320500_苏州市#1#0'
  ]);
});

/* ---------- 3. 封面取该经历自己的第一张照片（核心回归护栏） ---------- */

test('封面取该经历自己的第一张照片，不串到别的经历',async()=>{
  const {api,cardsEl}=build();
  await api.render('江苏省');
  const byKey={};
  findAll(cardsEl,'province-map-card').forEach(c=>{ byKey[c.dataset.cardKey]=c; });
  const imgOf=key=>{
    const img=findFirst(byKey[key],'province-map-card-image');
    return img?img.src:null;
  };
  assert.equal(imgOf('320500_苏州市#0#0'),'ph1','第一次徒步的封面是它自己的 ph1');
  assert.equal(imgOf('320500_苏州市#0#1'),'ph2','第二次徒步的封面是它自己的 ph2，不能是 ph1');
  assert.equal(imgOf('320100_南京市#0#0'),'ph9');
});

test('视频不抢占首图：图片在前取图片，只有视频时回落视频封面',async()=>{
  const {api}=build();
  await api.render('江苏省');
  const e=api.entries().find(x=>x.key==='320500_苏州市#0#0');
  assert.equal(e.cover,'ph1','photos=[图片,视频] → 封面是图片');
  // 单独验证只有视频时的回落
  const solo={photos:[{id:3,kind:'video',dataUrl:'poster-only'}]};
  assert.equal(api.entries().length>0,true);
  const coverOfSource=productionBlock('  function visitCoverOf(visit){','  // 城市列表 → 徒步经历卡片条目');
  const fn=new Function(coverOfSource+';return visitCoverOf;')();
  assert.equal(fn(solo),'poster-only','只有视频 → 回落视频封面');
  assert.equal(fn({photos:[]}),'','无照片 → 空串');
});

/* ---------- 4. 三行内容 ---------- */

test('经历卡显示：路线名称 / 难度徽章 / 时间',async()=>{
  const {api,cardsEl}=build();
  await api.render('江苏省');
  const card=findAll(cardsEl,'province-map-card').find(c=>c.dataset.cardKey==='320500_苏州市#0#0');
  assert.equal(findFirst(card,'province-map-card-name').textContent,'虎丘山径');
  const badge=findFirst(card,'province-map-card-badge');
  assert.ok(badge,'应有难度徽章容器');
  assert.ok(badge.innerHTML.includes('data-difficulty="moderate"'),'徽章带 data-difficulty');
  assert.ok(badge.innerHTML.includes('适中'),'徽章显示难度文案');
  assert.equal(findFirst(card,'province-map-card-date').textContent,'2026-03-18');
});

test('难度为空 → 不渲染空徽章容器',async()=>{
  const {api,cardsEl}=build();
  await api.render('江苏省');
  const card=findAll(cardsEl,'province-map-card').find(c=>c.dataset.cardKey==='320100_南京市#0#0');
  assert.equal(findFirst(card,'province-map-card-badge'),null,'无难度 → 无徽章容器');
  assert.equal(findFirst(card,'province-map-card-name').textContent,'老山步道');
});

/* ---------- 5. 锚点 ---------- */

test('连线锚点：优先路线坐标，未填写则回落城市质心',async()=>{
  const {api}=build();
  await api.render('江苏省');
  const byKey={};
  api.entries().forEach(e=>{ byKey[e.key]=e; });
  assert.deepEqual(byKey['320500_苏州市#0#0'].anchor,[120.5712,31.3364],'有路线坐标 → 用路线坐标');
  assert.deepEqual(byKey['320500_苏州市#1#0'].anchor,[120.5853,31.2989],'无路线坐标 → 回落城市质心');
  assert.deepEqual(byKey['320100_南京市#0#0'].anchor,[118.8,32.05],'有路线坐标 → 用路线坐标');
});

/* ---------- 6. 排序 ---------- */

test('排序：时间倒序，没记日期的排最后',async()=>{
  const {api}=build();
  await api.render('江苏省');
  const dates=api.entries().map(e=>e.date);
  const sorted=[...dates].filter(Boolean).sort().reverse();
  assert.deepEqual(dates.filter(Boolean),sorted,'有日期的按倒序');
});

/* ---------- 7. 点击分流 ---------- */

test('点击分流：经历卡打开城市详情页并带路线下标，城市卡打开城市弹窗',async()=>{
  const {api,cardsEl,calls}=build();
  await api.render('江苏省');
  const card=findAll(cardsEl,'province-map-card').find(c=>c.dataset.cardKey==='320500_苏州市#0#1');
  card.handlers.click[0]();
  assert.deepEqual(calls.openedDetail,[['320500_苏州市',0]],'经历卡 → openAttractionDetail(city, routeIdx)');

  const {api:api2,cardsEl:cards2,calls:calls2}=build();
  api2.setView('city','');
  await api2.render('');
  const cityCard=findAll(cards2,'province-map-card')[0];
  cityCard.handlers.click[0]();
  assert.deepEqual(calls2.openedModal,['320500_苏州市'],'城市卡 → openCityModal');
  assert.equal(calls2.openedDetail.length,0);
});

/* ---------- 8. 回归护栏：按下标配对已全部改为按 key ---------- */

test('卡片与条目按 key 配对，不再用下标',()=>{
  assert.ok(!layoutBlock.includes('provinceFocusCities[index]'),'布局不得按下标配对');
  assert.ok(!layoutBlock.includes('provinceFocusCities[i]'),'布局不得按下标配对');
  assert.ok(layoutBlock.includes('dataset.cardKey'),'布局按 data-card-key 查条目');
  assert.ok(!dragBlock.includes('path[data-city='),'拖拽连线查询必须用 data-card-key');
  assert.ok(dragBlock.includes('path[data-card-key='),'拖拽连线查询用 data-card-key');
  assert.ok(!html.includes("setAttribute('data-city'"),'生产代码不再写 data-city 属性');
});

test('图钉/位置缓存按条目 key 记录，且存储键已升到 V4',()=>{
  assert.ok(html.includes("const CARD_PINS_KEY='travelCardPinsV4'"));
  assert.ok(html.includes("const CARD_POS_CACHE_KEY='travelCardPosCacheV4'"));
  assert.ok(!html.includes('travelCardPinsV3'));
  assert.ok(!html.includes('travelCardPosCacheV3'));
  assert.ok(!dragBlock.includes('cardPins[city.cityKey]'),'图钉不再按 cityKey 记录');
  assert.ok(dragBlock.includes('cardPins[item.key]'),'图钉按条目 key 记录');
});

test('同锚点的多条经历错开搜索半径（连线不再完全重叠）',()=>{
  assert.ok(layoutBlock.includes('groupOrd'),'布局含组内序号');
  assert.ok(/radii[^\n]*groupOrd\s*\*\s*14/.test(layoutBlock),'候选半径按组内序号递增');
});

/* ---------- 9. 死代码清理 ---------- */

test('「另有 N 个」胶囊已彻底移除',()=>{
  assert.ok(!html.includes('province-focus-more'),'CSS 已删除');
  assert.ok(!html.includes('provinceFocusMore'),'HTML/JS 引用已删除');
});

/* ---------- 10. 基础类未被污染 ---------- */

test('基础 .province-map-card 类未被改动（足迹到站卡复用同一套类名）',()=>{
  const css=productionBlock('  .province-map-card{','  .province-map-card-image,');
  assert.ok(/\.province-map-card\{[^}]*width:154px/.test(css),'基础卡宽度不变');
  assert.ok(/\.province-map-card\{[^}]*height:70px/.test(css),'基础卡高度不变');
  assert.ok(css.includes('grid-template-columns:62px 1fr'),'基础卡列宽不变');
});

/* ---------- 11. 详情页定位 ---------- */

test('详情页：路线卡带 data-route-index，openAttractionDetail 支持定位参数',()=>{
  const detailBlock=productionBlock('  function renderAttractionDetailList(attractions){','  // 难度徽章 HTML');
  assert.ok(detailBlock.includes('card.dataset.routeIndex=String(idx)'),'路线卡带下标');
  const openBlock=productionBlock('  async function openAttractionDetail(city,focusRouteIdx){','  function fillCityInfoBar(');
  assert.ok(openBlock.includes('focusRouteIdx'),'详情页接受定位参数');
  assert.ok(openBlock.includes('scrollIntoView'),'定位到对应路线');
});

/* ---------- 12. 足迹到站卡互斥 ---------- */

test('渲染省份卡会调用 fpSyncCardsVisibility（与足迹到站卡互斥）',async()=>{
  const {api,calls}=build();
  await api.render('江苏省');
  assert.ok(calls.fpSync>0,'渲染后应同步一次足迹卡可见性');
});
