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
const mediaBlock=productionBlock('  function countMedia(items){','  window.TravelVideo=');
const visitsBlock=productionBlock('  // 渲染某条路线下的徒步经历列表（只重绘这一块，不动其它输入框）','  // 在指定城市下新建一条徒步路线');

/* ---------- 极简 DOM 桩（支持 querySelector / 多参 append / innerHTML 清空） ---------- */
function matchSel(el,sel){
  const clsMatch=/\.([\w-]+)/.exec(sel);
  const attrMatch=/\[([\w-]+)=["']?([^\]"']*)["']?\]/.exec(sel);
  if(clsMatch&&!String(el.className||'').split(/\s+/).includes(clsMatch[1])) return false;
  if(attrMatch){
    const k=attrMatch[1],v=attrMatch[2];
    const actual=(el.attrs&&el.attrs[k]!==undefined)?el.attrs[k]:(el.dataset?el.dataset[k]:undefined);
    if(String(actual)!==v) return false;
  }
  return true;
}
function walk(node,fn){ fn(node); (node.children||[]).forEach(c=>walk(c,fn)); }
function queryIn(root,sel){
  let hit=null;
  walk(root,n=>{ if(!hit&&n!==root&&matchSel(n,sel)) hit=n; });
  return hit;
}
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
    getBoundingClientRect(){ return {left:0,top:0,width:100,height:100}; },
    querySelector(sel){ return queryIn(this,sel); }
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
function findAll(root,cls){
  const out=[];
  walk(root,n=>{ if(String(n.className||'').split(/\s+/).includes(cls)) out.push(n); });
  return out;
}
function findFirst(root,cls){ return findAll(root,cls)[0]||null; }

/* ---------- 测试数据：5 张（1 个视频）+ 1 张 ---------- */
const PHOTOS=[
  {id:1,name:'a.jpg',kind:'image',dataUrl:'ph1'},
  {id:2,name:'v.mp4',kind:'video',dataUrl:'poster2'},
  {id:3,name:'b.jpg',kind:'image',dataUrl:'ph3'},
  {id:4,name:'c.jpg',kind:'image',dataUrl:'ph4'},
  {id:5,name:'d.jpg',kind:'image',dataUrl:'ph5'}
];
const ROUTE={
  name:'虎丘山径',
  visits:[
    {visitDate:'2026-03-18',notes:'第一次徒步',photos:PHOTOS},
    {visitDate:'2026-05-02',notes:'雨后',photos:[{id:9,name:'e.jpg',kind:'image',dataUrl:'ph9'}]},
    {visitDate:'2026-06-11',notes:'',photos:[]}
  ]
};

function setup(){
  const listEl=makeEl('div');
  const routeCard=makeEl('div');
  routeCard.className='route-card';
  routeCard.setAttribute('data-route-idx','0');
  const visitsBox=makeEl('div');
  visitsBox.className='route-card-visits';
  routeCard.appendChild(visitsBox);
  listEl.appendChild(routeCard);

  const viewerCalls=[];
  const deps={
    attractionListEl:listEl,
    currentCity:{cityKey:'320500_苏州市'},
    openVisitEditor:()=>{},
    deleteVisit:()=>{},
    openPhotoViewer:(photos,idx)=>{ viewerCalls.push({photos,idx}); },
    document:{createElement:tag=>makeEl(tag),createTextNode:t=>({nodeType:3,textContent:String(t)})}
  };
  const src=modelBlock+mediaBlock+visitsBlock+'\nreturn renderRouteVisits;';
  const render=new Function(...Object.keys(deps),src)(...Object.values(deps));
  return {render,listEl,visitsBox,viewerCalls};
}
function click(el){
  let stopped=false;
  const ev={stopPropagation(){ stopped=true; }};
  (el.handlers.click||[]).forEach(fn=>fn(ev));
  return stopped;
}

/* ---------- 经历列表渲染 ---------- */

test('每条徒步经历渲染成一行，并保留照片计数文字',()=>{
  const {render,visitsBox}=setup();
  render(0,ROUTE);
  const rows=findAll(visitsBox,'route-card-visit');
  assert.equal(rows.length,3,'3 条经历 → 3 行');
  const media=findAll(rows[0],'route-card-visit-media');
  assert.equal(media.length,1);
  assert.equal(media[0].textContent,'4张照片 · 1个视频','计数文字仍保留（不再只是笼统提示）');
  assert.equal(findAll(rows[0],'route-card-visit-date')[0].textContent,'2026-03-18');
  assert.equal(findAll(rows[0],'route-card-visit-notes')[0].textContent,'第一次徒步');
});

test('无照片的经历不渲染缩略图',()=>{
  const {render,visitsBox}=setup();
  render(0,ROUTE);
  const rows=findAll(visitsBox,'route-card-visit');
  assert.equal(findAll(rows[2],'route-card-visit-thumb').length,0);
  assert.equal(findAll(rows[2],'route-card-visit-thumb-more').length,0);
});

/* ---------- 缩略图区 ---------- */

test('经历下方生成缩略图区，最多 4 张',()=>{
  const {render,visitsBox}=setup();
  render(0,ROUTE);
  const rows=findAll(visitsBox,'route-card-visit');
  const thumbsBox=findAll(rows[0],'route-card-visit-thumbs');
  assert.equal(thumbsBox.length,1,'每条经历一个缩略图区');
  assert.equal(findAll(thumbsBox[0],'route-card-visit-thumb').length,4,'5 张照片只显示 4 张缩略图');
  // 少于 4 张时按实际数量
  assert.equal(findAll(findAll(rows[1],'route-card-visit-thumbs')[0],'route-card-visit-thumb').length,1);
});

test('超过 4 张时显示 +N 按钮',()=>{
  const {render,visitsBox}=setup();
  render(0,ROUTE);
  const rows=findAll(visitsBox,'route-card-visit');
  const more=findAll(findAll(rows[0],'route-card-visit-thumbs')[0],'route-card-visit-thumb-more');
  assert.equal(more.length,1);
  assert.equal(more[0].textContent,'+1','5 张 → +1');
});

test('视频副本显示播放角标，图片没有',()=>{
  const {render,visitsBox}=setup();
  render(0,ROUTE);
  const rows=findAll(visitsBox,'route-card-visit');
  const thumbs=findAll(findAll(rows[0],'route-card-visit-thumbs')[0],'route-card-visit-thumb');
  assert.equal(findAll(thumbs[0],'route-card-visit-thumb-play').length,0,'第一张是图片');
  assert.equal(findAll(thumbs[1],'route-card-visit-thumb-play').length,1,'第二张是视频 → 有播放角标');
  assert.ok(String(thumbs[1].className).includes('is-video'));
  assert.ok(String(thumbs[1].title).includes('视频'));
});

test('缩略图区追加在编辑/删除按钮之后（换行显示，不挤掉按钮）',()=>{
  const {render,visitsBox}=setup();
  render(0,ROUTE);
  const rows=findAll(visitsBox,'route-card-visit');
  const row=rows[0];
  const cls=row.children.map(c=>String(c.className||'').split(/\s+/));
  const iThumbs=cls.findIndex(list=>list.includes('route-card-visit-thumbs'));
  const iEdit=cls.findIndex(list=>list.includes('route-summary-btn'));
  const iDel=cls.findIndex(list=>list.includes('route-summary-del'));
  assert.ok(iThumbs>iEdit&&iThumbs>iDel,'缩略图区应在编辑/删除按钮之后');
  assert.ok(iEdit>=0&&iDel>=0,'编辑/删除按钮仍存在');
});

/* ---------- 点击预览 ---------- */

test('点击缩略图打开该条经历的图片预览（传原数组 + 原下标）',()=>{
  const {render,visitsBox,viewerCalls}=setup();
  render(0,ROUTE);
  const rows=findAll(visitsBox,'route-card-visit');
  const thumbs=findAll(findAll(rows[0],'route-card-visit-thumbs')[0],'route-card-visit-thumb');
  click(thumbs[1]);  // 第 2 张（视频）
  assert.equal(viewerCalls.length,1);
  assert.equal(viewerCalls[0].photos,PHOTOS,'传入的是该条经历的全部照片（同一引用）');
  assert.equal(viewerCalls[0].photos.length,5,'包含未显示的第 5 张');
  assert.equal(viewerCalls[0].idx,1,'startIdx 是原数组下标');
});

test('点击缩略图阻止冒泡（不触发行/卡级行为）',()=>{
  const {render,visitsBox}=setup();
  render(0,ROUTE);
  const rows=findAll(visitsBox,'route-card-visit');
  const thumbs=findAll(findAll(rows[0],'route-card-visit-thumbs')[0],'route-card-visit-thumb');
  assert.equal(click(thumbs[0]),true,'应调用 e.stopPropagation()');
});

test('点击 +N 按钮打开该条经历的预览（从第 1 张开始）',()=>{
  const {render,visitsBox,viewerCalls}=setup();
  render(0,ROUTE);
  const rows=findAll(visitsBox,'route-card-visit');
  const more=findAll(findAll(rows[0],'route-card-visit-thumbs')[0],'route-card-visit-thumb-more')[0];
  click(more);
  assert.equal(viewerCalls.length,1);
  assert.equal(viewerCalls[0].photos,PHOTOS);
  assert.equal(viewerCalls[0].idx,0);
});

/* ---------- CSS ---------- */

test('经历缩略图样式走项目变量，且独立成行',()=>{
  const css=html.replace(/\/\*[\s\S]*?\*\//g,'');
  assert.ok(/\.route-card-visit-thumbs\{[^}]*flex:1 1 100%/.test(css),'缩略图区应独占一行（flex-wrap 换行）');
  assert.ok(/\.route-card-visit-thumb\{[^}]*border-radius:var\(--radius-sm\)/.test(css));
  assert.ok(/\.route-card-visit-thumb\{[^}]*border:1px solid var\(--line\)/.test(css));
  assert.ok(/\.route-card-visit-thumb img\{[^}]*object-fit:cover/.test(css));
});
