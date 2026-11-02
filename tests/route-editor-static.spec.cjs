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
// 路线卡的表单构造器（行 / 输入框 / 显示刷新 / 填值）
const routeCardHelpersBlock=productionBlock('  // 路线卡的一行（标签 + 控件容器）','  function renderAttractions(attractions){');
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
function makeEl(tag){
  const el={
    tagName:String(tag).toUpperCase(), className:'', textContent:'', value:'', src:'', type:'',
    children:[], dataset:{}, attrs:{}, handlers:{},
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

// 渲染城市弹窗里的路线卡（真实生产代码 + DOM 桩）
function buildRouteCard(routes){
  const listEl=makeEl('div');
  const deps={
    attractionListEl:listEl,
    document:{createElement:tag=>makeEl(tag)},
    currentCity:{cityKey:'320500_苏州市'},
    renderRouteVisits:()=>{},
    onRouteCardFieldChange:()=>{},
    addVisit:()=>{},
    deleteAttraction:()=>{},
    routeDifficultyBadge:()=>'',
    routeMetricsText:()=>'',
    routeCoordText:()=>''
  };
  const src=modelBlock+routeCardHelpersBlock+routeCardBlock+'\nreturn renderAttractions;';
  const render=new Function(...Object.keys(deps),src)(...Object.values(deps));
  render(routes);
  return {listEl,render};
}
const SAMPLE_ROUTE={
  name:'虎丘山径',difficulty:'moderate',
  distanceKm:8.5,elevationGain:320,maxAltitude:480,
  lng:120.5712,lat:31.3364,visits:[]
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
  const hints=listEl.querySelectorAll('.route-card-hint');
  assert.ok(hints.length>=2,'应有路线数据说明 + 坐标说明');
  const metricHint=hints[0].textContent;
  ['里程','爬升','最高海拔','共用'].forEach(word=>{
    assert.ok(metricHint.includes(word),'路线数据说明里缺少「'+word+'」');
  });
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
