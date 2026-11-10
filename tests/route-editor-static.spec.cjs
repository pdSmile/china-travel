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
// 徒步路线数据层（routeVisits / normalizeVisit 等）
const modelBlock=productionBlock('  const ROUTE_DIFFICULTIES=','  // 时间与次数聚合：唯一权威来源');
// 经历浮层 JS：取经历 / 存经历字段 / 填值 / 改字段 / 画照片 / 绑事件 / 打开
const visitAtBlock=productionBlock('  // 取一条路线下的第 visitIdx 条经历（不存在返回 null）','  // 保存路线级字段（城市弹窗行内编辑，按类型归一）');
const saveVisitBlock=productionBlock('  // 保存经历级字段（体验浮层）','  // 保存后刷新当前入口的视图');
const editorBlock=productionBlock('  // 把一条徒步经历填进静态编辑器表单','  // 详情页旧入口 → 打开该路线下的第一条经历（保持调用点兼容）');
// 城市弹窗里的路线卡渲染（路线级字段就地编辑）
const routeCardBlock=productionBlock('  function renderAttractions(attractions){','  // 路线卡字段变更：落盘 → 回写归一化结果 → 局部刷新显示');
// 路线卡的表单构造器（行 / 输入框 / 显示刷新 / 填值 / 编辑态）
const routeCardHelpersBlock=productionBlock('  // 路线卡的一行（标签 + 控件容器）','  function renderAttractions(attractions){');
// 「添加徒步路线」（新路线自动进入编辑态）
const addRouteBlock=productionBlock('  // 添加徒步路线','  // 添加一条徒步经历');
// 经历浮层静态 HTML
const overlayHtml=productionBlock('  <!-- 徒步经历编辑浮层','  <!-- Toast -->');
// CSS
const overlayCss=productionBlock('  /* ===== 徒步路线编辑浮层','  /* ===== 徒步路线：难度徽章');
const routeCardCss=productionBlock('  /* ===== 城市弹窗内的徒步路线卡','  /* ===== 视图切换标签');

/* ---------- 极简 DOM 桩：让编辑器逻辑可在 node:test 里直接跑 ---------- */
// 选择器只支持「.class」与「[attr="value"]」的组合，够本文件用
function matchSel(el,sel){
  const clsMatch=/\.([\w-]+)/.exec(sel);
  const attrMatch=/\[([\w-]+)=["']?([^\]"']*)["']?\]/.exec(sel);
  if(clsMatch&&!String(el.className||'').split(/\s+/).includes(clsMatch[1])) return false;
  if(attrMatch){
    const k=attrMatch[1],v=attrMatch[2];
    // data-field 这类属性在 DOM 里存成 dataset.field（去掉 data- 前缀后转驼峰）
    const camel=k.replace(/^data-/,'').replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
    const actual=(el.attrs&&el.attrs[k]!==undefined)?el.attrs[k]
      :(el.dataset&&el.dataset[camel]!==undefined)?el.dataset[camel]:undefined;
    if(String(actual)!==v) return false;
  }
  return true;
}
function walk(node,fn){ fn(node); (node.children||[]).forEach(c=>walk(c,fn)); }
// 可记录状态的 classList（生产代码会调 classList.toggle('active',on)）
function makeClassList(){
  const set=new Set();
  return {
    add(...c){ c.forEach(x=>set.add(x)); },
    remove(...c){ c.forEach(x=>set.delete(x)); },
    toggle(c,force){
      const has=set.has(c);
      const want=(force===undefined)?!has:!!force;
      if(want) set.add(c); else set.delete(c);
      return want;
    },
    contains(c){ return set.has(c); }
  };
}
function makeEl(tag){
  const el={
    tagName:String(tag).toUpperCase(), className:'', textContent:'', value:'', src:'', type:'',
    children:[], dataset:{}, attrs:{}, handlers:{}, classList:makeClassList(),
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
    querySelector(sel){
      let hit=null;
      walk(this,n=>{ if(!hit&&n!==this&&matchSel(n,sel)) hit=n; });
      return hit;
    },
    querySelectorAll(sel){
      const out=[];
      walk(this,n=>{ if(n!==this&&matchSel(n,sel)) out.push(n); });
      return out;
    }
  };
  Object.defineProperty(el,'innerHTML',{
    get(){ return el._html||''; },
    set(v){ el._html=v; if(v==='') el.children.length=0; }
  });
  return el;
}
function buildEditor(route){
  const els={
    routeEditorTitle:makeEl('h2'),
    routeEditorClose:makeEl('button'),
    routeDateInput:makeEl('input'),
    routeNotesInput:makeEl('textarea'),
    routeEditorThumbs:makeEl('div'),
    routeUploadBtn:makeEl('button'),
    routePhotoInput:makeEl('input')
  };
  els.routeEditorThumbs.appendChild(els.routeUploadBtn);
  const meta={cityKey:'320500_苏州市',attractions:[route]};
  const calls=[];
  const deps={
    ...els,
    document:{createElement:tag=>makeEl(tag)},
    $:id=>els[id]||null,
    getCityMeta:async()=>meta,
    saveCityMeta:async()=>meta,
    refreshRouteViews:(ctx)=>calls.push('refresh:'+(ctx.anchor||'')),
    closeAttEditPanel:()=>calls.push('close'),
    routeUploadPhotos:()=>calls.push('upload'),
    routeDeletePhoto:()=>calls.push('delete'),
    routeSwapPhotos:()=>calls.push('swap'),
    attEditOverlay:{classList:{add(){},remove(){}}}
  };
  const src='let routeEditorCtx=null;\n'+modelBlock+visitAtBlock+saveVisitBlock+editorBlock+
    ';return {routeVisits,routeVisitAt,saveVisitField,fillVisitEditor,onVisitFieldChange,'+
    'renderRouteEditorPhotos,bindRouteEditorEvents,openVisitEditor};';
  const api=new Function(...Object.keys(deps),src)(...Object.values(deps));
  return {api,els,meta,calls};
}

// 路线卡的渲染依赖（renderAttractions 用到的外部依赖）
function routeCardDeps(listEl,meta){
  return {
    attractionListEl:listEl,
    document:{createElement:tag=>makeEl(tag)},
    currentCity:{cityKey:'320500_苏州市'},
    renderRouteVisits:()=>{},
    // 失焦即存：把改动写回路线对象（生产实现走 saveRouteField）
    onRouteCardFieldChange:(idx,field,input)=>{
      const r=meta.attractions[idx];
      if(r) r[field]=input.value;
    },
    addVisit:()=>{},
    deleteAttraction:()=>{},
    routeDifficultyBadge:()=>'',
    routeMetricsText:()=>'',
    routeCoordText:()=>'',
    starSvgHTML:active=>'<svg class="star-svg'+(active?'':' inactive')+'" data-star="'+(active?'1':'0')+'"></svg>',
    saveRouteField:async(ctx,field,value)=>{
      const r=meta.attractions[ctx.idx];
      if(!r) return null;
      r[field]=value;
      return meta;
    }
  };
}
// 渲染城市弹窗里的路线卡（真实生产代码 + DOM 桩）
function buildRouteCard(routes){
  const listEl=makeEl('div');
  const meta={cityKey:'320500_苏州市',attractions:routes};
  const deps=routeCardDeps(listEl,meta);
  const src=modelBlock+routeCardHelpersBlock+routeCardBlock+
    '\nreturn {renderAttractions,onRouteCardRatingClick,setRouteCardEditMode,toggleRouteCardEditMode};';
  const api=new Function(...Object.keys(deps),src)(...Object.values(deps));
  api.renderAttractions(routes);
  return {listEl,api,meta};
}
// 跑一次「添加徒步路线」（验证新路线自动进入编辑态）
async function buildAddAttraction(){
  const listEl=makeEl('div');
  const meta={cityKey:'320500_苏州市',attractions:[]};
  const deps={...routeCardDeps(listEl,meta),
    addRouteToCity:async()=>{ meta.attractions.push({name:'新路线',visits:[]}); },
    getCityMeta:async()=>meta,
    renderCityCards:()=>{}
  };
  const src=modelBlock+routeCardHelpersBlock+routeCardBlock+addRouteBlock+
    '\nreturn {renderAttractions,setRouteCardEditMode,addAttraction};';
  const api=new Function(...Object.keys(deps),src)(...Object.values(deps));
  await api.addAttraction();
  return {listEl,api,meta};
}
async function click(el){
  const ev={stopPropagation(){}};
  for(const fn of (el.handlers.click||[])) await fn(ev);
}
const SAMPLE_ROUTE={
  name:'虎丘山径',difficulty:'moderate',
  distanceKm:8.5,elevationGain:320,maxAltitude:480,
  lng:120.5712,lat:31.3364,rating:4,visits:[]
};

// 浮层里必须存在的元素 id
const STATIC_IDS=[
  'attEditOverlay','attEditPanel',
  'routeEditorTitle','routeEditorClose',
  'routeDateInput','routeNotesInput',
  'routeEditorThumbs','routeUploadBtn','routePhotoInput'
];
// 路线级字段的 id：应已从经历浮层移除（改到城市弹窗路线卡里）
const REMOVED_IDS=[
  'routeNameInput','routeDifficultySelect',
  'routeDistanceInput','routeElevationInput','routeAltitudeInput',
  'routeLngInput','routeLatInput'
];

/* ---------- 静态结构 ---------- */

test('经历浮层是静态 HTML，必需 id 都在页面上',()=>{
  STATIC_IDS.forEach(id=>{
    assert.ok(html.includes('id="'+id+'"'),'缺少静态元素 id="'+id+'"');
  });
});

test('浮层只保留游玩日期 / 路线备注 / 路线照片三项',()=>{
  assert.ok(overlayHtml.includes('游玩日期'),'缺少游玩日期');
  assert.ok(overlayHtml.includes('路线备注'),'缺少路线备注');
  assert.ok(overlayHtml.includes('路线照片'),'缺少路线照片');
  ['路线名称','线路难度','路线数据','坐标'].forEach(label=>{
    assert.ok(!overlayHtml.includes('>'+label+'<'),'浮层里不应再有「'+label+'」');
  });
});

test('路线级字段的 id 已从浮层移除（改到城市弹窗路线卡）',()=>{
  REMOVED_IDS.forEach(id=>{
    assert.ok(!html.includes('id="'+id+'"'),'不应再出现 id="'+id+'"');
  });
});

test('文件选择框是静态且隐藏的，不再由 JS 动态创建',()=>{
  assert.ok(/<input type="file" id="routePhotoInput"[^>]*hidden/.test(html),'routePhotoInput 应为静态隐藏 input');
  assert.ok(!/document\.createElement\('input'\)/.test(editorBlock),'编辑器 JS 不应动态创建 input');
  assert.ok(!/document\.createElement\('select'\)/.test(editorBlock),'编辑器 JS 不应动态创建 select');
  assert.ok(!/document\.createElement\('textarea'\)/.test(editorBlock),'编辑器 JS 不应动态创建 textarea');
});

test('openVisitEditor 只负责填值与展示，不再重建表单',()=>{
  assert.ok(!/attEditPanel\.innerHTML\s*=/.test(editorBlock),'openVisitEditor 不应清空并重建面板');
  assert.ok(/fillVisitEditor\(visit,route\)/.test(editorBlock),'openVisitEditor 应调用 fillVisitEditor');
  assert.ok(/renderRouteEditorPhotos\(visit\)/.test(editorBlock),'openVisitEditor 应调用 renderRouteEditorPhotos');
  assert.ok(!/routeEditorRow|routeEditorField/.test(editorBlock),'旧的行/字段构造函数应已删除');
});

test('事件绑定只做一次，不随每次打开叠加',()=>{
  assert.ok(/function bindRouteEditorEvents\(\)/.test(editorBlock),'缺少 bindRouteEditorEvents');
  const calls=html.split('bindRouteEditorEvents();').length-1;
  assert.equal(calls,1,'bindRouteEditorEvents 应只有一个调用点（当前 '+calls+' 处匹配）');
});

test('绑定表只含游玩日期与路线备注两个字段',()=>{
  assert.ok(/\['routeDateInput','visitDate'\]/.test(editorBlock),'应绑定 routeDateInput → visitDate');
  assert.ok(/\['routeNotesInput','notes'\]/.test(editorBlock),'应绑定 routeNotesInput → notes');
  REMOVED_IDS.forEach(id=>{
    assert.ok(!editorBlock.includes("'"+id+"'"),'编辑器不应再绑定 '+id);
  });
});

/* ---------- 城市弹窗里的路线卡（路线级字段就地编辑） ---------- */

test('路线卡包含名称 / 难度 / 路线数据 / 坐标七个可编辑控件',()=>{
  ['name','difficulty','distanceKm','elevationGain','maxAltitude','lng','lat'].forEach(field=>{
    assert.ok(routeCardBlock.includes("'"+field+"'"),'路线卡缺少字段 '+field);
  });
  // 坐标是两个可编辑的 number input（经度 / 纬度）
  assert.ok(/\{field:'lng',placeholder:'经度 lng',min:'-180',max:'180'\}/.test(routeCardBlock),'经度输入框定义缺失');
  assert.ok(/\{field:'lat',placeholder:'纬度 lat',min:'-90',max:'90'\}/.test(routeCardBlock),'纬度输入框定义缺失');
  assert.ok(/routeCardInput\('input',spec\.field,\{type:'number',step:'0\.0001'/.test(routeCardBlock),'坐标应为可编辑的数字输入框');
});

test('路线卡提供添加徒步经历与删除路线入口',()=>{
  assert.ok(/textContent='\+ 添加徒步经历'/.test(routeCardBlock),'缺少「+ 添加徒步经历」');
  assert.ok(/textContent='删除路线'/.test(routeCardBlock),'缺少「删除路线」');
  assert.ok(/addVisit\(idx\)/.test(routeCardBlock),'添加经历按钮未绑定 addVisit');
});

/* ---------- 路线数据三指标：常驻小标签 + 说明 ---------- */

test('三个指标各带一个常驻小标签（填了值标签也不消失）',()=>{
  const {listEl}=buildRouteCard([SAMPLE_ROUTE]);
  const fields=listEl.querySelectorAll('.route-metric-field');
  assert.equal(fields.length,3,'三个指标各一个字段容器');
  const labels=fields.map(f=>f.querySelector('.route-metric-label').textContent);
  assert.deepEqual(labels,['里程（km）','爬升（m）','最高海拔（m）'],'标签应写明指标名与单位');
});

test('三个指标输入框仍带 data-field，且各自有悬停说明',()=>{
  const {listEl}=buildRouteCard([SAMPLE_ROUTE]);
  const inputs=listEl.querySelectorAll('.route-metric-field').map(f=>f.querySelector('.route-card-input'));
  assert.deepEqual(inputs.map(i=>i.dataset.field),['distanceKm','elevationGain','maxAltitude']);
  inputs.forEach((input,i)=>{
    assert.ok(input.attrs.title&&input.attrs.title.length>4,'第 '+(i+1)+' 个指标缺少 title 说明');
  });
  assert.ok(/水平长度/.test(inputs[0].attrs.title),'里程说明应讲水平长度');
  assert.ok(/上升/.test(inputs[1].attrs.title),'爬升说明应讲累计上升');
  assert.ok(/海拔/.test(inputs[2].attrs.title),'最高海拔说明应讲海拔');
});

test('路线数据行有一句解释三个指标含义的说明',()=>{
  const {listEl}=buildRouteCard([SAMPLE_ROUTE]);
  // 按行定位说明文案（路线卡里现在有「推荐指数」「路线数据」「坐标」三条说明）
  const rows=listEl.querySelectorAll('.route-card-row');
  const metricRow=rows.find(r=>(r.children[0]||{}).textContent==='路线数据');
  assert.ok(metricRow,'缺少「路线数据」行');
  const metricHint=metricRow.querySelector('.route-card-hint');
  assert.ok(metricHint,'路线数据行缺少说明');
  ['里程','爬升','最高海拔','共用'].forEach(word=>{
    assert.ok(metricHint.textContent.includes(word),'路线数据说明里缺少「'+word+'」');
  });
  assert.ok(listEl.querySelectorAll('.route-card-hint').length>=3,'应有推荐指数 / 路线数据 / 坐标三条说明');
});

test('填值：三个指标回填到对应输入框（不因加标签而错位）',()=>{
  const {listEl}=buildRouteCard([SAMPLE_ROUTE]);
  const inputs=listEl.querySelectorAll('.route-metric-field').map(f=>f.querySelector('.route-card-input'));
  assert.deepEqual(inputs.map(i=>String(i.value)),['8.5','320','480']);
});

test('指标小标签样式走项目变量',()=>{
  assert.ok(/\.route-metric-label\{[^}]*color:var\(--muted\)/.test(routeCardCss),'小标签应使用 var(--muted)');
  assert.ok(/\.route-metric-field\{[^}]*display:flex/.test(routeCardCss),'字段容器应为纵向 flex');
  assert.ok(/\.route-metric-field>\.route-card-input\{[^}]*width:100%/.test(routeCardCss),'输入框应填满字段容器宽度');
});

/* ---------- 路线推荐指数（0-5 星） ---------- */

test('路线卡有「推荐指数」行与 5 颗可点星',()=>{
  const {listEl}=buildRouteCard([SAMPLE_ROUTE]);
  const rows=listEl.querySelectorAll('.route-card-row');
  const ratingRow=rows.find(r=>(r.children[0]||{}).textContent==='推荐指数');
  assert.ok(ratingRow,'缺少「推荐指数」行');
  const box=ratingRow.querySelector('.route-card-rating');
  assert.ok(box,'缺少星级容器');
  const stars=box.querySelectorAll('.star');
  assert.equal(stars.length,5,'5 颗星');
  assert.deepEqual(stars.map(s=>s.dataset.val),['1','2','3','4','5']);
  assert.ok(stars.every(s=>s.title.includes('星')),'每颗星都应有 title 提示');
});

test('推荐指数按值点亮对应数量的星（rating:4 → 前 4 颗亮）',()=>{
  const {listEl}=buildRouteCard([SAMPLE_ROUTE]);
  const stars=listEl.querySelectorAll('.route-card-rating').flatMap(b=>b.querySelectorAll('.star'));
  const on=stars.map(s=>s.classList.contains('active'));
  assert.deepEqual(on,[true,true,true,true,false]);
});

test('未打分的路线 0 颗星点亮',()=>{
  const {listEl}=buildRouteCard([{name:'未打分',visits:[]}]);
  const stars=listEl.querySelectorAll('.route-card-rating').flatMap(b=>b.querySelectorAll('.star'));
  assert.equal(stars.length,5);
  assert.ok(stars.every(s=>!s.classList.contains('active')),'未打分时不应有星点亮');
});

test('编辑态下点击星星落盘并点亮；再点同一颗清零',async()=>{
  const route={name:'待打分',visits:[]};
  const {listEl,meta}=buildRouteCard([route]);
  const card=listEl.querySelectorAll('.route-card')[0];
  const box=listEl.querySelector('.route-card-rating');
  const stars=box.querySelectorAll('.star');

  await click(card.querySelector('.route-card-edit-btn'));   // 先进入编辑态
  assert.ok(card.classList.contains('editing'),'应进入编辑态');

  await click(stars[3]);   // 第 4 颗
  assert.equal(route.rating,4,'应写入 4 星');
  assert.equal(box.dataset.value,'4','容器应同步当前分值');
  assert.deepEqual(box.querySelectorAll('.star').map(s=>s.classList.contains('active')),
    [true,true,true,true,false],'前 4 颗应点亮');

  await click(stars[3]);   // 再点同一颗 → 清零
  assert.equal(route.rating,0,'再次点击同一颗星应清零');
  assert.equal(box.dataset.value,'0');
  assert.ok(box.querySelectorAll('.star').every(s=>!s.classList.contains('active')),'清零后不应有星点亮');
  assert.equal(meta.attractions[0],route,'落盘的是同一条路线');
});

test('详情页路线卡展示只读星级',()=>{
  const detailBlock=productionBlock('  function renderAttractionDetailList(attractions){','  // 难度徽章 HTML');
  assert.ok(detailBlock.includes("ratingEl.className='att-card-rating'"),'详情页缺少只读星级节点');
  assert.ok(detailBlock.includes('renderStars(routeRating)'),'详情页星级应由 renderStars 渲染');
  assert.ok(detailBlock.includes('if(routeRating>0)'),'0 星不应显示星级');
});

test('路线卡星级样式走项目既有 .star-svg 体系',()=>{
  assert.ok(/\.route-card-rating\{[^}]*display:inline-flex/.test(routeCardCss),'星级容器应为 inline-flex');
  assert.ok(/\.route-card-rating \.star\{[^}]*cursor:pointer/.test(routeCardCss),'星星应可点');
  assert.ok(/\.att-card-rating\{[^}]*display:flex/.test(html),'详情页星级容器应为 flex');
});

/* ---------- 路线卡编辑态：查看态防误输入 ---------- */

test('每张路线卡右上角都有「编辑 / 取消」按钮',()=>{
  const {listEl}=buildRouteCard([SAMPLE_ROUTE]);
  const cards=listEl.querySelectorAll('.route-card');
  assert.equal(cards.length,1);
  const btn=cards[0].querySelector('.route-card-edit-btn');
  assert.ok(btn,'缺少编辑按钮');
  assert.equal(btn.textContent,'编辑','默认应是「编辑」');
  const head=cards[0].querySelector('.route-card-head');
  assert.equal(head.children[head.children.length-1],btn,'编辑按钮应在头部最后一个位置（右上角）');
});

test('头部结构：标题 / 徽章 / 指标收在 .route-card-head-main 里',()=>{
  const {listEl}=buildRouteCard([SAMPLE_ROUTE]);
  const head=listEl.querySelector('.route-card-head');
  const headMain=head.children[0];
  assert.equal(headMain.className,'route-card-head-main','头部第一个子节点应是标题区');
  assert.ok(headMain.querySelector('.route-card-title'),'标题区应含路线名');
  assert.ok(headMain.querySelector('.route-card-badge'),'标题区应含难度徽章');
  assert.ok(headMain.querySelector('.route-card-metrics'),'标题区应含指标');
});

test('查看态：七个路线级控件全部只读',()=>{
  const {listEl}=buildRouteCard([SAMPLE_ROUTE]);
  const card=listEl.querySelectorAll('.route-card')[0];
  const inputs=card.querySelectorAll('.route-card-input');
  assert.equal(inputs.length,7,'名称 / 难度 / 里程 / 爬升 / 最高海拔 / 经度 / 纬度 共 7 个');
  inputs.forEach(i=>{
    assert.equal(i.disabled,true,'控件应被禁用：'+(i.dataset.field||''));
  });
});

test('点「编辑」→ 控件解锁、按钮变「取消」',async()=>{
  const {listEl}=buildRouteCard([SAMPLE_ROUTE]);
  const card=listEl.querySelectorAll('.route-card')[0];
  const btn=card.querySelector('.route-card-edit-btn');
  await click(btn);
  assert.ok(card.classList.contains('editing'),'卡片应进入编辑态');
  card.querySelectorAll('.route-card-input').forEach(i=>{
    assert.equal(i.disabled,false,'控件应解锁：'+(i.dataset.field||''));
  });
  assert.equal(btn.textContent,'取消','按钮应变成「取消」');
  assert.ok(btn.classList.contains('on'),'按钮应带上 .on 状态类');
  assert.equal(btn.attrs['aria-pressed'],'true','应同步 aria-pressed');
});

test('点「取消」→ 控件重新锁上、按钮变回「编辑」',async()=>{
  const {listEl}=buildRouteCard([SAMPLE_ROUTE]);
  const card=listEl.querySelectorAll('.route-card')[0];
  const btn=card.querySelector('.route-card-edit-btn');
  await click(btn);   // 编辑
  await click(btn);   // 取消
  assert.ok(!card.classList.contains('editing'),'应退出编辑态');
  card.querySelectorAll('.route-card-input').forEach(i=>{
    assert.equal(i.disabled,true,'控件应重新锁上：'+(i.dataset.field||''));
  });
  assert.equal(btn.textContent,'编辑','按钮应变回「编辑」');
  assert.ok(!btn.classList.contains('on'),'不应再带 .on 状态类');
});

test('「取消」只退出编辑态，不回滚已保存的数据',async()=>{
  const route={name:'原名',visits:[]};
  const {listEl}=buildRouteCard([route]);
  const card=listEl.querySelectorAll('.route-card')[0];
  const btn=card.querySelector('.route-card-edit-btn');
  const nameInput=card.querySelector('.route-card-input[data-field="name"]');
  await click(btn);   // 进入编辑态
  nameInput.value='新名';
  for(const fn of (nameInput.handlers.change||[])) await fn({});
  assert.equal(route.name,'新名','编辑态下失焦即存');
  await click(btn);   // 取消
  assert.equal(route.name,'新名','取消不应回滚已保存的数据');
});

test('查看态点星星是空操作（防误打分）',async()=>{
  const route={name:'待打分',visits:[]};
  const {listEl}=buildRouteCard([route]);
  const card=listEl.querySelectorAll('.route-card')[0];
  const stars=card.querySelector('.route-card-rating').querySelectorAll('.star');
  await click(stars[3]);
  assert.equal(route.rating,undefined,'查看态不应写入评分');
  assert.ok(stars.every(s=>!s.classList.contains('active')),'查看态不应点亮任何星');
});

test('各卡编辑态互相独立',async()=>{
  const {listEl}=buildRouteCard([SAMPLE_ROUTE,{name:'第二条',visits:[]}]);
  const cards=listEl.querySelectorAll('.route-card');
  assert.equal(cards.length,2);
  await click(cards[0].querySelector('.route-card-edit-btn'));
  assert.ok(cards[0].classList.contains('editing'),'第一张卡应进入编辑态');
  assert.ok(!cards[1].classList.contains('editing'),'第二张卡不应受影响');
  assert.equal(cards[1].querySelectorAll('.route-card-input')[0].disabled,true,'第二张卡仍应只读');
});

test('查看态「+ 添加徒步经历」「删除路线」仍可点',()=>{
  const {listEl}=buildRouteCard([SAMPLE_ROUTE]);
  const card=listEl.querySelectorAll('.route-card')[0];
  const btns=card.querySelectorAll('.route-summary-btn');
  assert.equal(btns.length,2,'应有「+ 添加徒步经历」与「删除路线」两个按钮');
  btns.forEach(b=>{
    assert.notEqual(b.disabled,true,'这两个操作在查看态应保持可点');
  });
});

test('新增路线后自动进入编辑态',async()=>{
  const {listEl}=await buildAddAttraction();
  const cards=listEl.querySelectorAll('.route-card');
  assert.equal(cards.length,1,'应渲染出一张新卡');
  const card=cards[0];
  assert.ok(card.classList.contains('editing'),'新路线应自动进入编辑态');
  const inputs=card.querySelectorAll('.route-card-input');
  assert.equal(inputs.length,7);
  inputs.forEach(i=>assert.equal(i.disabled,false,'新路线的控件应解锁'));
  assert.equal(card.querySelector('.route-card-edit-btn').textContent,'取消','按钮应显示「取消」');
});

test('源码护栏：路线卡默认是查看态（防误输入的兜底）',()=>{
  assert.ok(routeCardBlock.includes('setRouteCardEditMode(card,false)'),'渲染时应默认置为查看态');
  assert.ok(routeCardBlock.includes('if(!card.classList.contains(\'editing\')) return;'),'星级点击应有编辑态守卫');
});

test('编辑态样式走项目变量，查看态控件置灰',()=>{
  assert.ok(/\.route-card-edit-btn\{[^}]*border:1px solid var\(--line\)/.test(routeCardCss),'按钮描边应使用 var(--line)');
  assert.ok(/\.route-card-edit-btn\{[^}]*border-radius:var\(--radius-xs\)/.test(routeCardCss),'按钮圆角应使用 var(--radius-xs)');
  assert.ok(/\.route-card-edit-btn\{[^}]*color:var\(--muted\)/.test(routeCardCss),'按钮文字应使用 var(--muted)');
  assert.ok(/\.route-card-head-main\{[^}]*flex:1 1 auto/.test(routeCardCss),'标题区应占满剩余宽度');
  assert.ok(/\.route-card-input:disabled\{[^}]*cursor:not-allowed/.test(routeCardCss),'查看态输入框应禁用光标');
  assert.ok(/\.route-card:not\(\.editing\) \.route-card-rating\{[^}]*pointer-events:none/.test(routeCardCss),'查看态星级应不可点');
  assert.ok(/body\.light-theme \.route-card-edit-btn\{/.test(routeCardCss),'浅色主题应覆盖编辑按钮底色');
});

/* ---------- 配色：跟随项目变量与浅色主题 ---------- */

test('面板质感完全照搬 modalOverlay（用项目变量而非硬编码）',()=>{
  const panel=productionBlock('  .att-edit-panel{','  @keyframes attCardIn');
  assert.ok(/background:var\(--card\)/.test(panel),'面板背景应使用 var(--card)');
  assert.ok(/border:1px solid var\(--line\)/.test(panel),'面板描边应使用 var(--line)');
  assert.ok(/border-radius:var\(--radius\)/.test(panel),'面板圆角应使用 var(--radius)');
  assert.ok(/box-shadow:var\(--shadow\)/.test(panel),'面板阴影应使用 var(--shadow)');
});

test('输入框与标签使用主题变量，浅色主题另有覆盖',()=>{
  assert.ok(/\.att-edit-row label\{[^}]*color:var\(--muted\)/.test(overlayCss),'标签应使用 var(--muted)');
  assert.ok(/\.att-edit-row input[^{]*\{[^}]*background:var\(--line-2\)/.test(overlayCss),'输入框背景应使用 var(--line-2)');
  assert.ok(/\.att-edit-row input[^{]*\{[^}]*color:var\(--ink\)/.test(overlayCss),'输入框文字应使用 var(--ink)');
  assert.ok(/body\.light-theme \.att-edit-row input/.test(overlayCss),'浅色主题应覆盖输入框背景');
  assert.ok(/body\.light-theme \.att-edit-overlay\{/.test(overlayCss),'浅色主题应覆盖遮罩');
  assert.ok(/body\.light-theme \.att-edit-head\{/.test(overlayCss),'浅色主题应覆盖头栏');
});

test('旧的硬编码深色玻璃样式已全部移除',()=>{
  assert.ok(!/rgba\(16,20,26,\.82\)/.test(overlayCss),'不应再有硬编码深色玻璃面板');
  assert.ok(!/backdrop-filter:blur\(24px\)/.test(overlayCss),'面板不应再做 24px 磨砂');
  assert.ok(!/rgba\(232,192,104,\.5\)/.test(overlayCss),'焦点描边应改用 var(--accent)');
  assert.ok(/border-color:var\(--accent\)/.test(overlayCss),'焦点描边应使用 var(--accent)');
});

test('路线卡样式走项目变量，浅色主题另有覆盖',()=>{
  assert.ok(/\.route-card\{[^}]*background:var\(--card\)/.test(routeCardCss),'路线卡背景应使用 var(--card)');
  assert.ok(/\.route-card\{[^}]*border:1px solid var\(--line\)/.test(routeCardCss),'路线卡描边应使用 var(--line)');
  assert.ok(/\.route-card\{[^}]*border-radius:var\(--radius\)/.test(routeCardCss),'路线卡圆角应使用 var(--radius)');
  assert.ok(/\.route-card-input\{[^}]*background:var\(--line-2\)/.test(routeCardCss),'输入框背景应使用 var(--line-2)');
  assert.ok(/\.route-card-input\{[^}]*color:var\(--ink\)/.test(routeCardCss),'输入框文字应使用 var(--ink)');
  assert.ok(/body\.light-theme \.route-card-input\{/.test(routeCardCss),'浅色主题应覆盖路线卡输入框');
});

/* ---------- 难度选项与常量一致 ---------- */

test('静态难度选项与 ROUTE_DIFFICULTIES / DIFFICULTY_LABELS 一致',()=>{
  const listMatch=modelBlock.match(/ROUTE_DIFFICULTIES\s*=\s*\[([^\]]*)\]/);
  assert.ok(listMatch,'找不到 ROUTE_DIFFICULTIES');
  const keys=listMatch[1].split(',').map(s=>s.trim().replace(/^['"]|['"]$/g,'')).filter(Boolean);
  assert.deepEqual(keys,['easy','moderate','hard','extreme','ultimate']);

  const labelMatch=modelBlock.match(/DIFFICULTY_LABELS=\{([\s\S]*?)\}/);
  assert.ok(labelMatch,'找不到 DIFFICULTY_LABELS');
  const labels={};
  labelMatch[1].split(',').forEach(pair=>{
    const m=pair.match(/([A-Za-z]+)\s*:\s*'([^']*)'/);
    if(m) labels[m[1]]=m[2];
  });

  // 路线卡下拉框里的 option（由 JS 依据常量生成）
  assert.ok(/\[''\]\.concat\(ROUTE_DIFFICULTIES\)/.test(routeCardBlock),'难度下拉应从 ROUTE_DIFFICULTIES 生成');
  assert.ok(/opt\.textContent=key\?DIFFICULTY_LABELS\[key\]:'未标注'/.test(routeCardBlock),'难度中文名应来自 DIFFICULTY_LABELS');
});

/* ---------- 编辑器逻辑（用 DOM 桩直接跑生产代码） ---------- */

test('填值：经历字段写进静态表单',()=>{
  const {api,els}=buildEditor({name:'虎丘山径',visits:[]});
  api.fillVisitEditor({visitDate:'2026-05-18',notes:'备注'},{name:'虎丘山径'});
  assert.equal(els.routeEditorTitle.textContent,'徒步经历 · 虎丘山径');
  assert.equal(els.routeDateInput.value,'2026-05-18');
  assert.equal(els.routeNotesInput.value,'备注');

  api.fillVisitEditor({visitDate:'',notes:''},null);
  assert.equal(els.routeEditorTitle.textContent,'徒步经历');
  assert.equal(els.routeDateInput.value,'');
  assert.equal(els.routeNotesInput.value,'');
});

test('改字段：落盘到 route.visits[visitIdx] 并回写归一化结果',async()=>{
  const {api,els,meta,calls}=buildEditor({
    name:'虎丘山径',visits:[{visitDate:'',notes:''},{visitDate:'2026-01-01',notes:'第二条'}]
  });
  await api.openVisitEditor('320500_苏州市',0,1,'detail');

  els.routeDateInput.value='2026-05-18';
  await api.onVisitFieldChange('visitDate');
  assert.equal(meta.attractions[0].visits[1].visitDate,'2026-05-18');
  assert.equal(els.routeDateInput.value,'2026-05-18');

  els.routeNotesInput.value='新备注';
  await api.onVisitFieldChange('notes');
  assert.equal(meta.attractions[0].visits[1].notes,'新备注');
  assert.equal(meta.attractions[0].visits[0].notes,'','不应写到别的经历上');

  assert.deepEqual(calls.filter(c=>c.startsWith('refresh:')),['refresh:detail','refresh:detail'],'每次保存都应刷新当前入口的视图');
});

test('照片区：缩略图插在上传按钮之前，重复渲染不累积',()=>{
  const {api,els}=buildEditor({name:'A',visits:[]});
  const thumbs=els.routeEditorThumbs;
  api.renderRouteEditorPhotos({photos:[{dataUrl:'a'},{dataUrl:'b',kind:'video'}]});
  assert.equal(thumbs.children.length,3,'两张缩略图 + 上传按钮');
  assert.equal(thumbs.children[2],els.routeUploadBtn,'上传按钮应保持在最后');
  assert.equal(thumbs.children[0].className,'att-edit-thumb');
  assert.equal(thumbs.children[1].className,'att-edit-thumb');

  api.renderRouteEditorPhotos({photos:[{dataUrl:'c'}]});
  assert.equal(thumbs.children.length,2,'重绘后不应累积旧缩略图');
  assert.equal(thumbs.children[0].children.find(c=>c.tagName==='IMG').src,'c');
});

test('打开编辑器：填值并显示浮层，不重建表单节点',async()=>{
  const {api,els}=buildEditor({
    name:'原路线',visits:[{visitDate:'2026-05-18',notes:'n',photos:[]}]
  });
  const nameNode=els.routeDateInput;
  await api.openVisitEditor('320500_苏州市',0,0,'detail');
  assert.equal(els.routeDateInput,nameNode,'表单节点应保持同一对象');
  assert.equal(els.routeDateInput.value,'2026-05-18');
  assert.equal(els.routeNotesInput.value,'n');
});

test('打开不存在的经历时直接返回，不弹浮层',async()=>{
  const {api,els}=buildEditor({name:'A',visits:[]});
  await api.openVisitEditor('320500_苏州市',0,0,'detail');
  assert.equal(els.routeDateInput.value,'','不应写入任何值');
});
