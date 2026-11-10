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
const helpersBlock=productionBlock('  // 取一条路线下的第 visitIdx 条经历（不存在返回 null）','  // 上传经历照片/视频（同步写入城市主相册）');
const syncBlock=productionBlock('  // 上传经历照片/视频（同步写入城市主相册）','  // 交换经历照片位置（拖拽排序）');
const deleteRouteBlock=productionBlock('  // 删除徒步路线','  // 上传封面图');

const CITY_KEY='320500_苏州市';

/* ---------- 测试夹具 ---------- */
function makeMeta(photos){
  return {
    cityKey:CITY_KEY,
    attractions:[
      {name:'虎丘山径',visits:[{visitDate:'2026-03-18',notes:'',photos:photos}]}
    ]
  };
}
function makeAlbum(){
  return [
    {id:1,name:'a.jpg',kind:'image',dataUrl:'ph1',order:1},
    {id:2,name:'b.jpg',kind:'image',dataUrl:'ph2',order:2}
  ];
}

function setup(opts){
  opts=opts||{};
  const meta=opts.meta||makeMeta([{id:1,name:'a.jpg',kind:'image',dataUrl:'ph1'}]);
  const album=opts.album||makeAlbum();
  const calls={loadCityPhotos:[],refreshState:0,deletePhoto:[],saveCityMeta:0,toast:[],importMedia:[],renderEditorPhotos:0,renderVisits:0,cityCards:0,renderAttractions:0,getPhotosByCityCount:0,confirm:[]};

  const deps={
    // 数据层
    getCityMeta:async key=>key===CITY_KEY?meta:null,
    saveCityMeta:async()=>{ calls.saveCityMeta++; },
    getPhotosByCity:async key=>{ calls.getPhotosByCityCount++; return key===CITY_KEY?album:[]; },
    deletePhoto:async id=>{
      calls.deletePhoto.push(id);
      const i=album.findIndex(p=>String(p.id)===String(id));
      if(i>=0) album.splice(i,1);
    },
    cityPoints:[{cityKey:CITY_KEY,name:'苏州市',adcode:'320500'}],
    // 媒体导入（模拟真实实现的双写：相册 addPhoto + 经历副本 push）
    importAttractionMedia:async(file,city,visit,order)=>{
      calls.importMedia.push({file,order});
      if(opts.importThrows) throw new Error('导入失败');
      const id=100+album.length;
      const media={id,name:file.name,kind:'image',dataUrl:'new-'+id};
      album.push({id,name:file.name,kind:'image',dataUrl:'new-'+id,order});
      visit.photos.push(media);
      return media;
    },
    // 视图层
    renderRouteVisits:()=>{ calls.renderVisits++; },
    renderCityCards:()=>{ calls.cityCards++; },
    renderAttractions:()=>{ calls.renderAttractions++; },
    renderRouteEditorPhotos:()=>{ calls.renderEditorPhotos++; },
    renderAttractionDetailList:()=>{},
    attDetailMeta:null,
    attDetailCoverUrl:'',
    attDetailBg:{style:{}},
    currentCity:opts.currentCity===undefined?{cityKey:CITY_KEY}:opts.currentCity,
    loadCityPhotos:async key=>{ calls.loadCityPhotos.push(key); },
    refreshState:async()=>{ calls.refreshState++; },
    confirm:(msg)=>{ calls.confirm.push(msg); return opts.confirm!==false; },
    toast:(msg,isErr)=>{ calls.toast.push({msg,isErr:!!isErr}); },
    console
  };
  const src=modelBlock+helpersBlock+syncBlock+deleteRouteBlock+
    '\nreturn {routeUploadPhotos,routeDeletePhoto,deleteRoutePhotoFromAlbum,'+
    'deleteRoutePhotosFromAlbum,matchAlbumPhoto,deleteAttraction};';
  const api=new Function(...Object.keys(deps),src)(...Object.values(deps));
  return {api,meta,album,calls};
}

/* ---------- 上传：实时进入相册管理 ---------- */

test('上传经历照片后实时刷新该城市的相册管理并重算状态',async()=>{
  const {api,calls,meta}=setup();
  await api.routeUploadPhotos({cityKey:CITY_KEY,idx:0,visitIdx:0,anchor:'modal'},[{name:'new.jpg'}]);
  assert.equal(calls.importMedia.length,1,'应调用媒体导入');
  assert.equal(meta.attractions[0].visits[0].photos.length,2,'经历副本新增一条');
  assert.deepEqual(calls.loadCityPhotos,[CITY_KEY],'相册管理应即时刷新');
  assert.equal(calls.refreshState,1,'应重算统计（顶层卡片缩略图同步更新）');
  assert.equal(calls.renderEditorPhotos,1,'编辑浮层缩略图应重绘');
});

test('相册弹窗停留在别的城市时，不刷新别人的相册',async()=>{
  const {api,calls}=setup({currentCity:{cityKey:'330100_杭州市'}});
  await api.routeUploadPhotos({cityKey:CITY_KEY,idx:0,visitIdx:0,anchor:'modal'},[{name:'new.jpg'}]);
  assert.deepEqual(calls.loadCityPhotos,[],'不应刷新其它城市的相册');
  assert.equal(calls.refreshState,1,'但仍需重算统计');
});

test('没有当前城市时同样不刷新相册',async()=>{
  const {api,calls}=setup({currentCity:null});
  await api.routeUploadPhotos({cityKey:CITY_KEY,idx:0,visitIdx:0,anchor:'modal'},[{name:'new.jpg'}]);
  assert.deepEqual(calls.loadCityPhotos,[]);
  assert.equal(calls.refreshState,1);
});

test('部分文件导入失败也照样刷新相册并提示失败数',async()=>{
  const {api,calls}=setup({importThrows:true});
  await api.routeUploadPhotos({cityKey:CITY_KEY,idx:0,visitIdx:0,anchor:'modal'},[{name:'bad.jpg'}]);
  assert.deepEqual(calls.loadCityPhotos,[CITY_KEY],'失败也要刷新（用户看得到真实状态）');
  assert.equal(calls.refreshState,1);
  assert.equal(calls.toast.length,1);
  assert.ok(calls.toast[0].isErr,'失败应按错误提示');
});

test('没有文件时不做任何事',async()=>{
  const {api,calls}=setup();
  await api.routeUploadPhotos({cityKey:CITY_KEY,idx:0,visitIdx:0,anchor:'modal'},[]);
  assert.deepEqual(calls.loadCityPhotos,[]);
  assert.equal(calls.refreshState,0);
});

/* ---------- 删除：同步移除相册条目 ---------- */

test('删除经历照片时同步移除城市相册里的同一条',async()=>{
  const {api,calls,meta,album}=setup();
  await api.routeDeletePhoto({cityKey:CITY_KEY,idx:0,visitIdx:0,anchor:'modal'},0);
  assert.equal(meta.attractions[0].visits[0].photos.length,0,'经历副本已删除');
  assert.deepEqual(calls.deletePhoto,[1],'相册里的原始条目也应删除');
  assert.equal(album.length,1,'相册只剩 b.jpg');
  assert.deepEqual(calls.loadCityPhotos,[CITY_KEY],'相册网格应即时刷新');
  assert.equal(calls.refreshState,1);
});

test('删除时先取出目标再移除，避免删错条目',async()=>{
  const {api,calls,meta}=setup({
    meta:makeMeta([
      {id:1,name:'a.jpg',kind:'image',dataUrl:'ph1'},
      {id:2,name:'b.jpg',kind:'image',dataUrl:'ph2'}
    ])
  });
  await api.routeDeletePhoto({cityKey:CITY_KEY,idx:0,visitIdx:0,anchor:'modal'},1);
  assert.deepEqual(calls.deletePhoto,[2],'删的是第 2 条（id=2）');
  assert.deepEqual(meta.attractions[0].visits[0].photos.map(p=>p.id),[1],'剩下第 1 条');
});

test('越界删除不触发任何删除动作',async()=>{
  const {api,calls,meta}=setup();
  await api.routeDeletePhoto({cityKey:CITY_KEY,idx:0,visitIdx:0,anchor:'modal'},99);
  assert.deepEqual(calls.deletePhoto,[]);
  assert.equal(meta.attractions[0].visits[0].photos.length,1,'副本保持不变');
});

test('删除时相册弹窗在别的城市则不刷新别人的相册',async()=>{
  const {api,calls}=setup({currentCity:{cityKey:'330100_杭州市'}});
  await api.routeDeletePhoto({cityKey:CITY_KEY,idx:0,visitIdx:0,anchor:'modal'},0);
  assert.deepEqual(calls.loadCityPhotos,[]);
  assert.deepEqual(calls.deletePhoto,[1],'但相册数据本身仍应同步删除');
});

/* ---------- 副本 → 相册条目 的三级匹配 ---------- */

test('按 id 优先匹配（重复图片不会删错条目）',async()=>{
  const {api,calls}=setup();
  // dataUrl 指向第 2 条，但 id 指向第 1 条 → 必须按 id 删
  const ok=await api.deleteRoutePhotoFromAlbum(CITY_KEY,{id:1,dataUrl:'ph2'});
  assert.equal(ok,true);
  assert.deepEqual(calls.deletePhoto,[1],'优先按 id 命中');
});

test('副本没有 id 时按 storagePath 匹配',async()=>{
  const {api,calls}=setup({
    album:[{id:7,name:'cloud.jpg',kind:'image',dataUrl:'ph7',storagePath:'uploads/cloud.jpg'}]
  });
  const ok=await api.deleteRoutePhotoFromAlbum(CITY_KEY,{storagePath:'uploads/cloud.jpg',dataUrl:'ph7'});
  assert.equal(ok,true);
  assert.deepEqual(calls.deletePhoto,[7]);
});

test('副本既没有 id 也没有 storagePath 时退到 dataUrl 匹配',async()=>{
  const {api,calls}=setup();
  const ok=await api.deleteRoutePhotoFromAlbum(CITY_KEY,{dataUrl:'ph2'});
  assert.equal(ok,true);
  assert.deepEqual(calls.deletePhoto,[2]);
});

test('匹配不到时不删任何东西，返回 false',async()=>{
  const {api,calls}=setup();
  const ok=await api.deleteRoutePhotoFromAlbum(CITY_KEY,{id:999,dataUrl:'nope'});
  assert.equal(ok,false);
  assert.deepEqual(calls.deletePhoto,[]);
});

test('相册为空或参数缺失时返回 false',async()=>{
  const {api,calls}=setup({album:[]});
  assert.equal(await api.deleteRoutePhotoFromAlbum(CITY_KEY,{id:1}),false);
  assert.equal(await api.deleteRoutePhotoFromAlbum(CITY_KEY,null),false);
  assert.equal(await api.deleteRoutePhotoFromAlbum('',{id:1}),false);
  assert.deepEqual(calls.deletePhoto,[]);
});

/* ---------- 删除路线：连带删相册里的对应图片 ---------- */

test('删除路线连带删掉该路线在相册里的照片，其它相册条目保留',async()=>{
  const {api,calls,meta,album}=setup({
    meta:makeMeta([
      {id:1,name:'a.jpg',kind:'image',dataUrl:'ph1'},
      {id:2,name:'b.jpg',kind:'image',dataUrl:'ph2'}
    ]),
    album:[
      {id:1,name:'a.jpg',kind:'image',dataUrl:'ph1',order:1},
      {id:2,name:'b.jpg',kind:'image',dataUrl:'ph2',order:2},
      {id:3,name:'c.jpg',kind:'image',dataUrl:'ph3',order:3}
    ]
  });
  await api.deleteAttraction(0);
  assert.deepEqual(calls.deletePhoto,[1,2],'该路线挂着的两张都应从相册删除');
  assert.deepEqual(album.map(p=>p.id),[3],'未挂到该路线的图片必须保留');
  assert.equal(meta.attractions.length,0,'路线本身已删除');
  assert.equal(calls.saveCityMeta,1,'路线变更已落盘');
  assert.equal(calls.renderAttractions,1,'路线列表已重绘');
  assert.deepEqual(calls.loadCityPhotos,[CITY_KEY],'相册管理网格应刷新');
  assert.equal(calls.refreshState,1,'全局统计应重算');
  assert.equal(calls.toast.length,1);
  assert.ok(!calls.toast[0].isErr,'不应报错');
});

test('批量删相册只读一次相册（不是每张照片读一遍）',async()=>{
  const {api,calls}=setup({
    meta:makeMeta([
      {id:1,dataUrl:'ph1'},{id:2,dataUrl:'ph2'},{id:3,dataUrl:'ph3'}
    ]),
    album:[{id:1,dataUrl:'ph1'},{id:2,dataUrl:'ph2'},{id:3,dataUrl:'ph3'}]
  });
  await api.deleteAttraction(0);
  assert.equal(calls.deletePhoto.length,3,'三张都删');
  assert.equal(calls.getPhotosByCityCount,1,'整条路线只读一次相册');
});

test('取消确认时什么都不做（不删相册、不删路线）',async()=>{
  const {api,calls,meta,album}=setup({confirm:false});
  await api.deleteAttraction(0);
  assert.deepEqual(calls.deletePhoto,[],'取消后不应删相册');
  assert.equal(album.length,2,'相册保持原样');
  assert.equal(meta.attractions.length,1,'路线仍在');
  assert.equal(calls.saveCityMeta,0,'不应落盘');
});

test('路线没有照片时直接删除，不牵连相册',async()=>{
  const {api,calls,meta,album}=setup({meta:makeMeta([])});
  await api.deleteAttraction(0);
  assert.deepEqual(calls.deletePhoto,[],'没有照片就不该删相册');
  assert.equal(album.length,2,'相册条目原样保留');
  assert.equal(meta.attractions.length,0,'路线已删除');
  assert.equal(calls.saveCityMeta,1);
});

test('同一张图出现在多条经历里，相册条目也只删一次',async()=>{
  const {api,calls}=setup({
    meta:{
      cityKey:CITY_KEY,
      attractions:[{name:'A',visits:[
        {visitDate:'2026-01-01',photos:[{id:1,dataUrl:'ph1'}]},
        {visitDate:'2026-02-01',photos:[{id:1,dataUrl:'ph1'}]}
      ]}]
    },
    album:[{id:1,dataUrl:'ph1'}]
  });
  await api.deleteAttraction(0);
  assert.deepEqual(calls.deletePhoto,[1],'同一相册条目只删一次');
});

test('删路线前弹二次确认，文案写明会连带删除的照片张数',async()=>{
  const {api,calls}=setup({
    meta:makeMeta([{id:1,dataUrl:'ph1'},{id:2,dataUrl:'ph2'}]),
    album:[{id:1,dataUrl:'ph1'},{id:2,dataUrl:'ph2'}]
  });
  await api.deleteAttraction(0);
  assert.equal(calls.confirm.length,1,'应弹一次确认');
  assert.ok(calls.confirm[0].includes('2'),'文案应写明连带删除 2 张');
  assert.ok(calls.confirm[0].includes('不可恢复'),'文案应提示不可恢复');
});

test('没有照片的路线，确认文案不提照片张数',async()=>{
  const {api,calls}=setup({meta:makeMeta([])});
  await api.deleteAttraction(0);
  assert.equal(calls.confirm.length,1);
  assert.ok(!calls.confirm[0].includes('张照片'),'无照片时不该提张数');
});

test('matchAlbumPhoto 三级匹配：id 优先 → storagePath → dataUrl',()=>{
  const {api}=setup();
  const photos=[{id:1,dataUrl:'ph1',storagePath:'uploads/a.jpg'}];
  assert.equal(api.matchAlbumPhoto(photos,{id:1,dataUrl:'other'}).id,1,'id 优先');
  assert.equal(api.matchAlbumPhoto([{id:7,storagePath:'uploads/b.jpg'}],{storagePath:'uploads/b.jpg'}).id,7,'次级按 storagePath');
  assert.equal(api.matchAlbumPhoto([{id:8,dataUrl:'ph8'}],{dataUrl:'ph8'}).id,8,'兜底按 dataUrl');
  assert.equal(api.matchAlbumPhoto(photos,{id:99}),null,'匹配不到返回 null');
  assert.equal(api.matchAlbumPhoto(photos,{dataUrl:'nope'}),null,'dataUrl 也不匹配返回 null');
  assert.equal(api.matchAlbumPhoto([],{id:1}),null,'相册为空返回 null');
  assert.equal(api.matchAlbumPhoto(photos,null),null,'副本为空返回 null');
});

/* ---------- 反向同步仍在（相册删 → 经历副本清掉） ---------- */

test('从相册删除照片时，经历里的副本同步消失（既有行为不回归）',async()=>{
  const deleteBlock=productionBlock('  async function onDeletePhoto(id){','  /* ---------- 上传 ---------- */');
  const meta=makeMeta([{id:1,name:'a.jpg',kind:'image',dataUrl:'ph1'}]);
  const album=makeAlbum();
  const calls={saveCityMeta:0,loadCityPhotos:0,refreshState:0,toast:[]};
  const deps={
    currentCityPhotos:album,
    currentCity:{cityKey:CITY_KEY},
    confirm:()=>true,
    deletePhoto:async id=>{
      const i=album.findIndex(p=>p.id===id);
      if(i>=0) album.splice(i,1);
    },
    getCityMeta:async()=>meta,
    saveCityMeta:async()=>{ calls.saveCityMeta++; },
    renderAttractions:()=>{},
    renderCityCards:()=>{},
    loadCityPhotos:async()=>{ calls.loadCityPhotos++; },
    refreshState:async()=>{ calls.refreshState++; },
    toast:(msg,isErr)=>{ calls.toast.push({msg,isErr:!!isErr}); }
  };
  const src=modelBlock+deleteBlock+'\nreturn onDeletePhoto;';
  const onDeletePhoto=new Function(...Object.keys(deps),src)(...Object.values(deps));
  await onDeletePhoto(1);
  assert.equal(album.length,1,'相册条目已删除');
  assert.equal(meta.attractions[0].visits[0].photos.length,0,'经历里的副本同步清掉');
  assert.equal(calls.saveCityMeta,1,'副本变更后落盘');
  assert.equal(calls.loadCityPhotos,1);
  assert.equal(calls.refreshState,1);
});
