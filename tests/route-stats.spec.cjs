const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
// 从生产源码切片徒步路线数据层，避免测试里复制一份实现
function productionBlock(startMarker,endMarker){
  const start=html.indexOf(startMarker);
  const end=html.indexOf(endMarker,start);
  assert.ok(start>=0&&end>start,'切片失败: '+startMarker+' → '+endMarker);
  return html.slice(start,end);
}
const modelBlock=productionBlock('  const ROUTE_DIFFICULTIES=','  // 时间与次数聚合：唯一权威来源');
const statsBlock=productionBlock('  // 时间与次数聚合：唯一权威来源','  /* ---------- 城市元数据 CRUD');

function load(homeCityKey){
  const deps={
    localStorage:{getItem:key=>key==='footprintHomeCity'?(homeCityKey||''):null},
    cityPoints:[{name:'苏州市',cityKey:'320500_苏州市',value:[120.585316,31.298886]}]
  };
  return new Function(...Object.keys(deps),modelBlock+statsBlock+
    ';return {ROUTE_DIFFICULTIES,normalizeVisit,normalizeRoute,normalizeCityMeta,getRouteStats,'+
    'formatRouteTimeSummary,formatRouteTimeRange,normalizePublicRoutes,publicRoutesOf,'+
    'defaultRouteCoords,toRouteNumber,toRouteCoord,routeVisits,latestVisitDate,'+
    'routeVisitPhotos,routeMediaList};')(...Object.values(deps));
}

/* ---------- 次数与时间聚合 ---------- */

test('空城市没有路线时次数为 0 且没有时间',()=>{
  const {getRouteStats}=load();
  const stats=getRouteStats({cityKey:'320500_苏州市',attractions:[]});
  assert.equal(stats.count,0);
  assert.equal(stats.datedCount,0);
  assert.deepEqual(stats.months,[]);
  assert.equal(stats.firstMonth,'');
  assert.equal(stats.latestMonth,'');
  assert.equal(stats.firstDate,'');
});

test('次数等于路线条数，即使路线没有日期',()=>{
  const {getRouteStats}=load();
  const stats=getRouteStats({attractions:[{name:'A'},{name:'B'},{name:'C'}]});
  assert.equal(stats.count,3);
  assert.equal(stats.datedCount,0);
  assert.deepEqual(stats.months,[]);
});

test('月份去重并按时间升序，最早/最晚日期同时给出',()=>{
  const {getRouteStats}=load();
  const stats=getRouteStats({attractions:[
    {name:'B',visitDate:'2026-05-18'},
    {name:'A',visitDate:'2025-12-01'},
    {name:'C',visitDate:'2026-05-02'},
    {name:'D',visitDate:'2026-03-09'}
  ]});
  assert.equal(stats.count,4);
  assert.equal(stats.datedCount,4);
  assert.deepEqual(stats.months,['2025-12','2026-03','2026-05']);
  assert.equal(stats.firstMonth,'2025-12');
  assert.equal(stats.latestMonth,'2026-05');
  assert.equal(stats.firstDate,'2025-12-01');
  assert.equal(stats.latestDate,'2026-05-18');
});

test('非法或缺失的日期不参与时间统计但仍计入次数',()=>{
  const {getRouteStats}=load();
  const stats=getRouteStats({attractions:[
    {name:'A',visitDate:''},
    {name:'B',visitDate:'不是日期'},
    {name:'C',visitDate:'2026-13-99'},
    {name:'D',visitDate:'2026-07-01'}
  ]});
  assert.equal(stats.count,4);
  assert.equal(stats.datedCount,1);
  assert.deepEqual(stats.months,['2026-07']);
});

test('meta 缺少 attractions 字段时按空路线处理',()=>{
  const {getRouteStats}=load();
  assert.equal(getRouteStats({cityKey:'x'}).count,0);
  assert.equal(getRouteStats(null).count,0);
});

test('getRouteStats 分别统计路线条数与经历次数，日期跨经历聚合',()=>{
  const {getRouteStats}=load();
  const stats=getRouteStats({attractions:[
    {name:'A',visits:[{visitDate:'2026-03-01'},{visitDate:'2026-05-18'}]},
    {name:'B',visits:[{visitDate:'2026-05-02'}]},
    {name:'C',visits:[]}
  ]});
  assert.equal(stats.count,3,'count 仍是路线条数');
  assert.equal(stats.visitCount,3,'visitCount 是经历条数');
  assert.equal(stats.datedCount,3);
  assert.equal(stats.visits.length,3);
  assert.deepEqual(stats.months,['2026-03','2026-05']);
  assert.equal(stats.firstDate,'2026-03-01');
  assert.equal(stats.latestDate,'2026-05-18');
  assert.equal(stats.routes.length,3);
});

test('getRouteStats 对旧形状（未迁移）仍能聚合',()=>{
  const {getRouteStats}=load();
  const stats=getRouteStats({attractions:[{name:'旧路线',visitDate:'2026-05-18'}]});
  assert.equal(stats.count,1);
  assert.equal(stats.visitCount,1,'旧记录兜底算作一次经历');
  assert.equal(stats.datedCount,1);
  assert.equal(stats.latestDate,'2026-05-18');
});

/* ---------- 归一化 ---------- */

test('normalizeRoute 补齐难度/里程/爬升/海拔/坐标',()=>{
  const {normalizeRoute}=load();
  const route=normalizeRoute({id:'a',name:'虎丘山径'});
  assert.equal(route.difficulty,'');
  assert.equal(route.distanceKm,0);
  assert.equal(route.elevationGain,0);
  assert.equal(route.maxAltitude,0);
  assert.equal(route.lng,null);
  assert.equal(route.lat,null);
  // 路线级不再承载日期/备注/照片（已下沉到 visits[]）
  assert.deepEqual(route.visits,[]);
  assert.equal(route.notes,undefined);
  assert.equal(route.visitDate,undefined);
  assert.equal(route.photos,undefined);
});

test('normalizeVisit 补齐经历字段并自动给 id',()=>{
  const {normalizeVisit}=load();
  const visit=normalizeVisit({});
  assert.ok(visit.id,'应自动生成经历 id');
  assert.equal(visit.visitDate,'');
  assert.equal(visit.notes,'');
  assert.deepEqual(visit.photos,[]);
  const again=normalizeVisit(visit);
  assert.equal(again.id,visit.id,'重复归一化不应改 id');
});

test('normalizeRoute 丢弃非法难度并把越界坐标置空',()=>{
  const {normalizeRoute}=load();
  const route=normalizeRoute({difficulty:'insane',lng:999,lat:91,distanceKm:'abc',elevationGain:'12'});
  assert.equal(route.difficulty,'');
  assert.equal(route.lng,null);
  assert.equal(route.lat,null);
  assert.equal(route.distanceKm,0);
  assert.equal(route.elevationGain,12);
});

test('normalizeRoute 把旧的日期/备注/照片迁移成一条经历',()=>{
  const {normalizeRoute}=load();
  const photos=[{id:'p1',dataUrl:'data:image/png;base64,AA'}];
  const route=normalizeRoute({id:'a',name:'旧路线',visitDate:'2026-05-18',notes:'老备注',photos});
  assert.equal(route.visits.length,1,'旧记录应折叠成一条经历');
  assert.equal(route.visits[0].visitDate,'2026-05-18');
  assert.equal(route.visits[0].notes,'老备注');
  assert.equal(route.visits[0].photos,photos,'照片数组保持同一引用');
  assert.equal(route.visitDate,undefined,'旧字段应被清掉');
  assert.equal(route.notes,undefined);
  assert.equal(route.photos,undefined);
});

test('normalizeRoute 迁移幂等：已有 visits 时不再重复折叠',()=>{
  const {normalizeRoute}=load();
  const route=normalizeRoute({id:'a',visits:[{visitDate:'2026-01-01',notes:'x',photos:[]}]});
  assert.equal(route.visits.length,1);
  normalizeRoute(route);
  normalizeRoute(route);
  assert.equal(route.visits.length,1,'重复归一化不应新增经历');
  assert.equal(route.visits[0].visitDate,'2026-01-01');
});

test('normalizeRoute 幂等且保留 photos 数组引用',()=>{
  const {normalizeRoute}=load();
  const photos=[{id:1,dataUrl:'data:image/png;base64,AA'}];
  const route=normalizeRoute({id:'a',photos});
  const first=route.visits[0].photos;
  assert.equal(first,photos);
  normalizeRoute(route);
  assert.equal(route.visits.length,1);
  assert.equal(route.visits[0].photos,first);
  assert.equal(route.visits[0].photos[0],photos[0]);
  assert.equal(route.id,'a');
});

test('routeVisits 兼容未归一化的旧形状',()=>{
  const {routeVisits}=load();
  assert.equal(routeVisits({visitDate:'2026-05-18'}).length,1);
  assert.equal(routeVisits({notes:'x'}).length,1);
  assert.equal(routeVisits({photos:[{id:1}]}).length,1);
  assert.equal(routeVisits({name:'空路线'}).length,0);
  assert.equal(routeVisits(null).length,0);
});

test('最新经历日期取该路线所有经历里最晚的一次',()=>{
  const {latestVisitDate}=load();
  assert.equal(latestVisitDate({visits:[{visitDate:'2026-05-18'},{visitDate:'2026-08-02'}]}),'2026-08-02');
  assert.equal(latestVisitDate({visits:[{visitDate:'2026-05-18'},{visitDate:''}]}),'2026-05-18');
  assert.equal(latestVisitDate({visits:[]}),'');
});

test('路线下的媒体副本可扁平取出',()=>{
  const {routeVisitPhotos,routeMediaList}=load();
  const route={visits:[{photos:[{id:1}]},{photos:[{id:2}]}]};
  assert.equal(routeVisitPhotos(route).length,2);
  assert.equal(routeMediaList([route,{visits:[{photos:[{id:3}]}]}]).length,3);
  assert.equal(routeMediaList(null).length,0);
});

test('normalizeCityMeta 给旧路线补齐新字段并迁移旧记录',()=>{
  const {normalizeCityMeta}=load();
  const meta=normalizeCityMeta({cityKey:'320500_苏州市',attractions:[{id:'a',name:'旧路线',notes:'保留备注'}]});
  assert.equal(meta.attractions.length,1);
  assert.equal(meta.attractions[0].name,'旧路线');
  assert.equal(meta.attractions[0].difficulty,'');
  assert.equal(meta.attractions[0].distanceKm,0);
  assert.equal(meta.attractions[0].lng,null);
  assert.equal(meta.attractions[0].visits.length,1,'旧记录应迁移成一条经历');
  assert.equal(meta.attractions[0].visits[0].notes,'保留备注');
});

test('家乡出生年月从旧 visitMonth 懒迁移，其它城市不受影响',()=>{
  const {normalizeCityMeta}=load('320500_苏州市');
  const home=normalizeCityMeta({cityKey:'320500_苏州市',visitMonth:'1995-06',visitMonths:['1995-06','1998-01']});
  assert.equal(home.birthMonth,'1995-06');
  const other=normalizeCityMeta({cityKey:'110100_北京市',visitMonth:'1995-06'});
  assert.equal(other.birthMonth,'');
});

test('normalizeCityMeta 不覆盖已有的出生年月且幂等',()=>{
  const {normalizeCityMeta}=load('320500_苏州市');
  const meta=normalizeCityMeta({cityKey:'320500_苏州市',birthMonth:'2000-01',visitMonth:'1995-06'});
  assert.equal(meta.birthMonth,'2000-01');
  normalizeCityMeta(meta);
  assert.equal(meta.birthMonth,'2000-01');
});

test('normalizeCityMeta 把缺失的 attractions 补成空数组',()=>{
  const {normalizeCityMeta}=load();
  const meta=normalizeCityMeta({cityKey:'x'});
  assert.deepEqual(meta.attractions,[]);
});

/* ---------- 公开投影 ---------- */

test('公开路线兼容旧版字符串数组',()=>{
  const {normalizePublicRoutes}=load();
  const routes=normalizePublicRoutes(['虎丘山径','太湖步道']);
  assert.equal(routes.length,2);
  assert.equal(routes[0].name,'虎丘山径');
  assert.equal(routes[0].difficulty,'');
  assert.equal(routes[0].distanceKm,0);
});

test('公开路线读取对象数组并过滤无名路线',()=>{
  const {normalizePublicRoutes,publicRoutesOf}=load();
  const routes=normalizePublicRoutes([
    {name:'虎丘山径',difficulty:'moderate',distanceKm:8.5,elevationGain:320,maxAltitude:480,visitDate:'2026-05-18'},
    {name:'',difficulty:'easy'},
    {name:'太湖步道',difficulty:'unknown'}
  ]);
  assert.equal(routes.length,2);
  assert.equal(routes[0].difficulty,'moderate');
  assert.equal(routes[0].distanceKm,8.5);
  assert.equal(routes[0].maxAltitude,480);
  assert.equal(routes[0].visitDate,'2026-05-18');
  assert.equal(routes[1].difficulty,'');
  assert.equal(publicRoutesOf({attractions:['A']})[0].name,'A');
});

test('公开路线的 visitDate 取该路线最近一次经历',()=>{
  const {normalizePublicRoutes,publicRoutesOf}=load();
  const routes=normalizePublicRoutes([
    {name:'虎丘山径',visits:[{visitDate:'2026-05-18'},{visitDate:'2026-08-02'}]}
  ]);
  assert.equal(routes[0].visitDate,'2026-08-02');
  assert.equal(publicRoutesOf({attractions:[{name:'A',visits:[{visitDate:'2026-01-01'}]}]})[0].visitDate,'2026-01-01');
});

/* ---------- 文案 ---------- */

test('时间摘要展示路线条数与时间范围',()=>{
  const {formatRouteTimeSummary,formatRouteTimeRange,getRouteStats}=load();
  const stats=getRouteStats({attractions:[
    {name:'A',visitDate:'2026-03-01'},
    {name:'B',visitDate:'2026-05-18'}
  ]});
  assert.equal(formatRouteTimeRange(stats),'2026-03 ~ 2026-05');
  assert.equal(formatRouteTimeSummary(stats),'2 条路线 · 2026-03 ~ 2026-05');
  const single=getRouteStats({attractions:[{name:'A',visitDate:'2026-03-01'}]});
  assert.equal(formatRouteTimeRange(single),'2026-03');
  const undated=getRouteStats({attractions:[{name:'A'}]});
  assert.equal(formatRouteTimeRange(undated),'时间未记录');
  assert.equal(formatRouteTimeSummary(getRouteStats({attractions:[]})),'');
});

/* ---------- 数值与坐标 ---------- */

test('数字归一把空值与非法值退回默认值',()=>{
  const {toRouteNumber}=load();
  assert.equal(toRouteNumber('',0),0);
  assert.equal(toRouteNumber(null,3),3);
  assert.equal(toRouteNumber('abc',3),3);
  assert.equal(toRouteNumber('4.5',0),4.5);
  assert.equal(toRouteNumber(0,7),0);
});

test('坐标归一在越界时返回 null，0 坐标保留',()=>{
  const {toRouteCoord}=load();
  assert.equal(toRouteCoord('', -180, 180),null);
  assert.equal(toRouteCoord('181',-180,180),null);
  assert.equal(toRouteCoord('-91',-90,90),null);
  assert.equal(toRouteCoord('0',-180,180),0);
  assert.equal(toRouteCoord('120.5712',-180,180),120.5712);
});

test('新建路线预填城市质心坐标（保留四位小数）',()=>{
  const {defaultRouteCoords}=load();
  const coords=defaultRouteCoords('320500_苏州市');
  assert.equal(coords.lng,120.5853);
  assert.equal(coords.lat,31.2989);
  const unknown=defaultRouteCoords('不存在_城市');
  assert.equal(unknown.lng,null);
  assert.equal(unknown.lat,null);
});
