# 项目记忆交接文档：「记录我的中国行」

> **2026-10-02 当前状态**：开发目录为 `F:\03-agent项目\codex\codex-list\projects\002-Your-China-Travel`，分支 `codex/selected-province-sharing`，已提交基线 `d29c242`。本地已移除省份旁旧分享入口，统一使用顶部“分享书架”单选、多选、全选，保留“管理分享”及历史凭证兼容。Supabase `memory-shelf-share` v4 已部署，写协议 v3；GitHub Pages 新前端未推送，已有二维码仍可读取。本轮已清理缓存、空目录及部署临时文件约 8.75MB，保留两处个人旅行备份、测试依赖和共用资源。后续代码与文档修改仍未提交，禁止混入个人资料直接 git add .。README 和 `项目交接文档.md` 顶部已同步最新目录与清理记录；下方旧路径及上线描述仅为历史。

> **2026-10-07 最新状态**：以本文「当前 Agent 快速记忆」的 2026-10-07 章节及 `项目交接文档.md` 顶部为准。下方 10 月 6 日及更早路径、测试和发布描述仅为历史，不能覆盖当前状态。

> **2026-09-06 目录迁移（历史）**：当前根目录为 `F:\03-agent项目\codex\codex-list\projects\Your-China-Travel`。最新功能和验证状态以同目录 `项目交接文档.md` 的 0.27 节为准，旧路径仅供历史参考。

> **2026-09-29 当前交接**：当前开发目录为 `F:\03-agent项目\codex\codex-list\projects\002-Your-China-Travel`。当前目录状态与待处理文件以 `项目交接文档.md` 的 0.29 节为准；`HEAD=bfd1adc`、`origin/main=4bd0ae5`，工作树包含未提交的 `index.html` 修改、若干删除项及本地资料样例。

> 本文档供 Agent 间记忆传递使用。包含项目代码结构、各模块功能、本次会话全部修改记录、以及 GitHub 推送全流程。

> **2026-08-14 当前基线**：账号与跨设备照片同步已经完成。若本文后续旧章节与本节冲突，以本节为准。

---

## 〇、当前 Agent 快速记忆（优先阅读）

### 2026-10-07 最新交接（优先于本文旧状态）

- 当前目录 `F:\03-agent项目\codex\codex-list\projects\002-Your-China-Travel`，分支 `codex/selected-province-sharing`，本地 HEAD `98dedab`。多轮修改尚未提交发布；本次仅更新文档，未重跑代码测试或核对线上。详细接手说明见 `项目交接文档.md` 顶部 2026-10-07 章节。
- 地图省市名使用本地宋体，城市标签透明度 `.6`，省份/光点/提示框原样保留。全国已点亮名称缩放 2 起出现，2～5 倍拥挤时隐藏整名，5 倍起不因冲突隐藏，缩小恢复避让；未点亮城市原阈值 8 不变。四个实际渲染方向按完整文本宽度避让，已点亮标签 `overflow:'none',ellipsis:'',width:null`，不再截成「济…」。完整地图实际渲染尚待验收。
- 启动页两句文案及左上「记录我的中国行」/副文案换同系列宋体，不改字号、字重、位置、渐变或动画。原省市字库缺字；新增 `NotoSerifSC-Launch-400/700.woff2`（共 11,596 字节）及 OFL 许可证，覆盖文案、标题、引号，无新运行依赖。动画 `.smt-char` 要继承字体；新增文案必须逐字检查实际渲染字体，不能只检查 CSS 名称。
- 旅行轨迹 `tlBtnPlay` / `tlBtnOverview` 仅移除 `::after` 循环扫光，静态光晕、悬停与点击保留；菜单名称为「旅行书架」「光影相册」。
- 年轮树最新为底座按时间排序的年度城市轨迹，不再逐城镜头巡游/三秒停留；每道年轮一个年份，城市刻字高度 `.60`。独立拉绳及照片空间连续填圈保留；详见 `assets/travel-ring-tree/README.md` 顶部，旧巡游条目仅为历史。本次未改树代码。
- 最近字体/标签/按钮电脑专项 5/5 通过；此前非浏览器回归 32 通过、1 跳过。未完成最新全量浏览器回归，不等于线上验收。只跑电脑端，手机混合用例不能直接整套执行；`1/` 等个人资料禁止提交，不要直接 `git add .`。

### 2026-10-06 用户测试范围偏好

- 今后仅测试电脑端，不主动运行手机端测试或生成手机端验证截图；除非用户后续明确要求。执行测试前检查范围，含手机场景的混合测试不能直接整套运行。保留既有手机测试，不擅自删除；此前已完成的手机检查保留历史记录。

### 2026-10-06 旅行年轮树造型纠正

- 用户明确要“树形伞幕照片装置”，不是写实大树：单主干，上方伞状枝条及茂密叶冠，下方悬挂照片，不能用密集递归分枝挡住照片。此要求优先于此前“参天实体大树”的理解。
- `assets/travel-ring-tree/tree-model.js` 用单主干、顶部径向伞骨、实例化叶面实现；`scene.js` 的照片悬线与伞骨共用 `canopyHeight`，不改照片数据、尺寸和排列。EZ-Tree 源码仍保留，但当前主体不调用其递归生成器。源码变化须重建同目录 `embedded.js`。
- 原伞幕目录 43 个文件保持不变，年轮底座、花园、年份/城市选择和原图浏览保留。预览 `docs/images/travel-ring-tree.png` 为当前电脑端实际 161 张城市照片；旧 mobile 图片仅是历史，不代表本版验收。
- 随后用户确认仅优化体量/材质：主干有效高度 22.6→28.25，底/中/顶半径 1.30/.715/.52→1.755/.911625/.624；主枝 +15%、树根 +25%，不缩放 Group。桌面叶片 16,000→24,000、尺寸 ×1.2，原叶片 X/Z 和树冠平面路径保留。树冠/anchor 上移 5.65，照片位置/尺寸不动；取景 target.y 14→17。材质 roughness=.96、metalness=0、独立灰度 bump=.18；TubeGeometry 的 U 是沿管长、V 是周向，新增纹理密度补偿必须按此方向，已配回归断言。UI/花园/背景/动画/数据均不改。
- 最新用户确认冠层向外约15%、下方花园半径扩大20%：枝叶 X/Z×1.15，Y 曲线/主干/根部/照片/anchor/吊线不动，桌面叶片24,000→32,000；新8,000片补展开区域。花园14→16.8，种植外缘13.5→16.2，底座净空7.45不变；桌面花2400→4000，六种花形沿用。scene 的整树拟合改为读取实际花园半径，target/控制/UI不改。电脑端9/9、非浏览器回归68/68，真实161照片全部加载；draw calls634不变、三角形213,518（较上一阶段+13.1%），不承诺真实硬件FPS。预览 `docs/images/travel-ring-tree.png`；上阶段对照 `docs/images/travel-ring-tree-before-expansion.png`。原伞幕43文件未动，未提交发布。
- 随后修复根部悬空：底座顶面1.33，旧主干/根端1.4造成缝和露截口。不要直接改trunkCurve首点（会重分配全曲线getPointAt采样，地上变细）；保留原曲线，仅底部t<.1截面Y减`1.65*max(0,1-t/.1)^2`，底端中心到-.25；根外端降到.75藏入底座。底部截面/12根端/原上部顶点坐标测试RED→GREEN；最终电脑10/10、非浏览器68/68，161照片全部加载，634调用/213,518三角形/200纹理不变。近景 `docs/images/travel-ring-tree-roots.png`；未改UI、花园、树冠、照片、相机及原伞幕，未发布。

### 2026-10-06 照片墙接手速记

- README 使用 13 个功能画面：十二张双列展示，照片墙单独大图；用户提供的截图均已加入，最新增加城市详情与景点旋转木马相册。图片在 `docs/images/`，每张配功能名和简短说明；部署/测试/技术保留概览与链接，原详细说明在 `docs/DEVELOPMENT.md`。此次未改业务代码、提交或发布。
- 旅途影像照片数量旁：年轮照片 → 照片墙 → 伞幕照片。新入口 `lifePhotoWallBtn` / `openLifePhotoWall()` 直接读取 `getAllPhotos()`，排除视频及空 dataUrl，不按重复到访多次加入记录；仅展示当前浏览器已存储照片。
- `window.__imgViewer.open(photos,0,{mode:'wall'})` 强制打开已有胶片挂帘；省略 mode 保留旧偏好。点击照片直接定位原横向浏览；叠在时间轴上时 Esc 只关闭上层并返回新入口焦点。
- 最近完整回归：101 项，98 通过、1 失败、2 跳过。失败为 `tests/umbrella-canopy.spec.cjs` 的花草/河流场景断言；分享封面长标题断言前一轮失败、最近一轮通过，仍需关注。照片墙、布局、挂帘、年轮浏览相关 6 项定向测试通过。此次文档更新没有重跑代码测试。
- 保留共同工作树修改：index、年轮测试、挂帘/照片墙测试、伞幕 assets/测试；`1/` 为个人资料，禁止公开提交。最新功能未推送，不能用此前基线推送冒充上线。
- 照片流 Lightfall 最终叠加强度 `0.576`，Galaxy 在城市照片底层；修改源码后重建 `assets/photo-stream/embedded.js`，不要回退已完成的空格暂停和最小缩放修复。

### 2026-10-03：照片册程序化翻页回弹——已获用户确认修复

- 症状：拖动书页正常，按钮和滚轮翻页时旧页先抬起/回弹，再翻目标页。
- 有效排查：先记录实际浏览器中的输入、目标页、逐帧进度、各纸页角度与曲率，不仅看页码或简化测试是否通过。相册内按 `Alt + Shift + D` 可导出 `album-turn-diagnostics.json`，不包含照片或账号资料。
- 实证：同一次“下一页”命令，进度先从 `4` 倒退至约 `3.8499` 再前进；上一页首帧也先逆行。没有重复命令，不能继续归因于重复绑定或缓存。
- 根因：`requestRender()` 以 `performance.now()` 初始化时间，`animate(timestamp)` 却用可能更早的 rAF 帧时间戳计算差值，负 `delta` 导致翻页引擎逆向推进。直接拖动使用指针位置，不受这条计时路径影响。
- 修复：启动和动画推进统一使用 `performance.now()`；将 `delta` 限制在 `[0, 0.04]`；首帧零时间差但尚未到达目标时仍继续请求下一帧。位置：`assets/vendor/album-3d-src/reader.js`。修改源码后须重建 `assets/vendor/album-3d.js` 并更新 HTML 引用版本。
- 回归：`tests/album-3d-settled-pages.spec.cjs` 模拟帧时间戳早于启动时间，验证正反向均不逆行、零时间差不停止；Edge 浏览器测试检查逐帧进度单调性，排除主动拖动片段。不要把“测试通过”当作用户实际症状已解决；本次最终由用户确认已修复。
- 辅助漏洞：`deltaY === 0` 的横向滚轮不得被当作上一页，已在 `memoryAlbumStageWheel()` 过滤。

### 当前架构

- 前端：`index.html`，无构建流程，部署于 `https://zwxll.github.io/Your-China-Travel/`。
- 本机缓存：IndexedDB `TravelPhotosDB`，stores 为 `photos`、`cityMeta`。
- 账号：Supabase Auth。
- 云端旅行快照：`public.travel_snapshots`，`user_id` 主键，RLS 限制用户只能操作自己的行。
- 实际图片：私有阿里云 OSS Bucket `your-china-travel-8877-hk`，中国香港地域。
- 签名代理：Supabase Edge Function `oss-media`，代码在 `supabase/functions/oss-media/index.ts`。
- 当前工作目录：`F:\03-agent项目\codex\codex-list\projects\Your-China-Travel`。
- 云同步安全基线：`9ee1b61`。

### 徒步路线数据模型（城市 → 徒步路线 → 徒步经历 三层）

数据层级已从「城市 → 扁平路线」升级为三层：一条城市下可挂**多条徒步路线**，每条路线下可挂**多条徒步经历**。城市不再有独立的游玩年月字段，所有时间与次数都从路线下的经历推导。

```text
城市 city（IndexedDB cityMeta，主键 cityKey = adcode_name）
 └── 徒步路线 route × N       ← meta.attractions[i]（物理键名仍是 attractions）
      ├── 路线名称 name / 线路难度 difficulty
      ├── 路线数据 distanceKm / elevationGain / maxAltitude
      ├── 坐标 lng / lat（新建默认取所选城市质心，**可编辑**）
      └── 徒步经历 visit × N   ← route.visits[j]
           ├── 游玩日期 visitDate
           ├── 路线备注 notes
           └── 路线照片 photos[]
```

| 概念 | 口径 |
|------|------|
| 存储键 | `cityMeta.attractions[]` —— **物理键名仍是 `attractions`**（内含徒步路线），只在其下新增 `visits[]`；IndexedDB / 云端快照 / 资料夹 `info.json` / OSS kind `'attractions'` 全部沿用，不要改名 |
| 路线字段 | `{id,name,difficulty,distanceKm,elevationGain,maxAltitude,lng,lat,visits[]}` |
| 经历字段 | `{id,visitDate(YYYY-MM-DD),notes,photos[]}`（照片是城市相册条目的「副本」，`id` 与相册一致） |
| 难度枚举 | `easy/moderate/hard/extreme/ultimate` = 轻松/适中/困难/挑战/极限；中文只在 UI 层映射 |
| 坐标 | GCJ-02（DataV/高德口径），**可编辑**（经度 / 纬度两个 number input，`step=0.0001`，lng 限 -180~180、lat 限 -90~90）；越界或非法值由 `toRouteCoord` 置 `null`，输入框回写空串；新建路线默认取所选城市质心（`defaultRouteCoords()`） |
| 路线数据 | 三个 number input（`min=0`，非法值经 `toRouteNumber()` 归 0），落库在 `meta.attractions[i].*`：**`distanceKm` 里程**（全程水平长度，km，step 0.1）/ **`elevationGain` 爬升**（全程累计**上升**高度，不含下降，m，step 1）/ **`maxAltitude` 最高海拔**（全程最高点海拔，m，step 1）。**三者都是选填** —— `routeMetricsText()` 只对有值字段拼串，全空则不显示指标摘要。**UI**：每个框包在 `.route-metric-field` 里，上方有**常驻小标签** `.route-metric-label`（「里程（km）」/「爬升（m）」/「最高海拔（m）」）、input 带 `title` 说明、行末有一句 `.route-card-hint` 解释三者含义与「路线级共用」 |
| 时间与次数 | **唯一来源 `getRouteStats(meta)`**：`count` = 路线条数、`visitCount` = 经历次数、`months[]`/`dates[]`/`firstDate`/`latestDate`/`datedCount` 改为**跨全部经历的 `visitDate` 聚合**；新增 `visits[]` = 扁平化的 `{route,visit,routeIndex,visitIndex}`；`formatRouteTimeSummary()` 输出「N 条路线 · 时间范围」 |
| 旧数据迁移 | `normalizeRoute()` 内**幂等**折叠：旧的平铺 `visitDate`/`notes`/`photos` → 一条 `visits[0]`（照片保持同一引用），随后 `delete` 旧字段；已有 `visits[]` 时不再重复折叠 |
| 兼容读取 | `routeVisits(route)` 对未归一化的旧形状返回 `[route]`，让聚合逻辑对旧对象也算得对 |
| 媒体读取 | `routeVisitPhotos(route)` 扁平取出该路线下全部经历的照片；`routeMediaList(routes)` 供云同步批量剥 `dataUrl` / 收 `storagePath` |
| 公开投影 | `normalizePublicRoutes()` / `publicRoutesOf()` 的 jsonb 形状不变，`visitDate` 取该路线**最近一次经历**的日期 |
| 家乡出生年月 | `cityMeta.birthMonth`（`YYYY-MM`），与路线完全解耦；老数据由 `normalizeCityMeta()` 从旧 `visitMonth`/`visitMonths[0]` 懒迁移 |
| 旧字段 | `visitMonth` / `visitMonths` 物理保留在 IndexedDB 但**不再写入**；`getVisitMonths()` 仅作 legacy 读取，已无调用方 |
| 归一化 | `normalizeVisit()` / `normalizeRoute()` / `normalizeCityMeta()` 在各边界惰性执行（IDB 读/写、云端还原、云端合并、资料夹还原），**就地修改**对象以保持 `cityMetaCache` 与调用方引用一致 |

**「路线数据」为什么是三个框、为什么在路线层（易误解点，务必记牢）**

- **三个框 = 三个互相独立、不可互推的量**：里程（水平长度）、爬升（累计上升）、最高海拔（最高点）。同为 20 km 的路线，爬升可以是 50 m 也可以是 1500 m；最高点 1200 m 的山，从 400 m 起步爬 800 m、从 1100 m 起步只爬 100 m。难度 `difficulty` 是**定性**档位，这三个是**定量**刻度，互为补充 —— 这是越野/徒步的通用三指标。
- **归属「路线」层，不在「经历」层**：路线是地理实体，经历是这条路径的一次经过。虎丘山径的里程/爬升/最高海拔是**路径属性**，走 N 次都不变；变的只有日期 / 备注 / 照片。→ **同一路线下的多条经历共享同一套这三个数值**。
- **三个框只出现在城市弹窗的路线卡上**（`renderAttractions()`，index.html:15305-15317），排在「路线名称 / 线路难度」之后、「坐标」之前。**经历浮层 `#attEditOverlay` 里没有它们** —— 浮层只有游玩日期 / 路线备注 / 路线照片三项（`openVisitEditor()` → `fillVisitEditor()`）。
- **只能手填**：项目未接 GPS / GPX / 高德轨迹自动计算；坐标同样手填（新建路线默认取所选城市质心）。若将来要做自动计算，属于独立需求。
- **消费点**：`routeMetricsText()` → 路线卡头 `.route-card-metrics`、城市详情页 `.route-metrics`；公开投影 `normalizePublicRoutes()` 的 6 字段也带这三个。**顶层城市卡内另走 `routeDistanceGainText()`**（只取爬升 + 距离，不含最高海拔）——`routeMetricsText()` 的三段口径在这两处**必须保持不变**。

外部消费点（城市卡片、旅程档案、旅行轨迹、公开点评/主页、照片流）一律改调 `getRouteStats()`；旅程档案的「次数」语义已从「游玩年月条数」变为「徒步路线条数」。

### 编辑面：城市弹窗（路线级） + 经历浮层（经历级）

两个编辑面分工明确。**城市编辑弹窗结构：2026-11-05 起删掉了「标签管理」分区**（只删编辑 UI，`meta.tags` 数据与全部下游消费者保留；城市级「推荐指数」「城市简介」不动）：

| 编辑面 | 内容 | 载体 |
|---|---|---|
| 城市编辑弹窗 `#modalOverlay` | 城市封面 / **城市级**推荐指数 / 城市简介 / 家乡出生年月 / 相册管理 / 徒步路线（**「标签管理」已删除**）；「徒步路线」区块内每条路线一张 `.route-card`，**就地行内编辑** 8 个路线级字段（名称 / 难度 / **推荐指数（0-5 星）** / 里程 / 爬升 / 最高海拔 / 经度 / 纬度），`change` 即存；**2026-11-07 起默认查看态，需点右上角「编辑」才可输入** | `renderAttractions()` + `saveRouteField()` |
| 经历编辑浮层 `#attEditOverlay` | **只剩三项**：游玩日期 / 路线备注 / 路线照片 | 静态表单 + `openVisitEditor()` |

| 项 | 口径 |
|------|------|
| 浮层结构 | 表单写死在 `index.html`（`#attEditOverlay` 内），字段 id 固定：`routeEditorTitle` / `routeEditorClose` / `routeDateInput` / `routeNotesInput` / `routeEditorThumbs` / `routeUploadBtn` / `routePhotoInput`（隐藏的 file input）。路线级的 7 个 id（`routeNameInput` / `routeDifficultySelect` / `routeDistanceInput` / `routeElevationInput` / `routeAltitudeInput` / `routeLngInput` / `routeLatInput`）**已从浮层移除** |
| 职责拆分 | `openVisitEditor(cityKey,idx,visitIdx,anchor)` 只做「读数据 → `fillVisitEditor()` 填值 → `renderRouteEditorPhotos()` 画缩略图 → 显示浮层」；`onVisitFieldChange(field)` 负责单字段「读 DOM → `saveVisitField()` 落盘 → 回写归一化结果」；`bindRouteEditorEvents()` **只在初始化时调用一次**，避免重复打开叠加监听 |
| 路线卡 | `renderAttractions()` 渲染 `.route-card[data-route-idx]`：**头部 = `.route-card-head-main`（路线名 / 难度徽章 / 指标）+ 右上角 `.route-card-edit-btn`「编辑 / 取消」**；路线名称 input / 难度下拉（选项由 `ROUTE_DIFFICULTIES` 生成）/ **推荐指数 5 颗可点星 `.route-card-rating`（再点同一颗清零）** / 三个指标 number input（**各带常驻小标签 + `title` 说明 + 行末解释文案**）/ 经纬度两个 number input / 难度徽章 / 指标 / 坐标提示 / 经历列表（日期 · 备注 · 媒体徽章 · 编辑 · 删除）/ `[+ 添加徒步经历]` / `[删除路线]`；保存后**只更新受影响的显示节点**，不整表重绘（避免其它未失焦输入框被清空） |
| **查看态 / 编辑态** | **2026-11-07 起**：每张路线卡默认**查看态** —— 7 个路线级控件 `disabled`（置灰但仍可读、且移出 Tab 顺序）、星级 `pointer-events:none` + JS 守卫（点不动）；`[+ 添加徒步经历]` / `[删除路线]` **仍可点**。点右上角「编辑」→ 按钮变「取消」、控件解锁、星级可点；点「取消」→ **只退出编辑态，不回滚已保存的数据**。编辑态由 **DOM 上的 `.editing` 类**承载（不存模块级下标集合 → 整表重绘后自动回查看态，也避免删路线后下标错位）；`setRouteCardEditMode(card,on)` / `toggleRouteCardEditMode(card)` 两个 helper 落在 `routeCardHelpersBlock` 切片内。**新增路线自动进入编辑态并聚焦名称框** |
| 增删 | `addRouteToCity(city)` 新建路线（坐标预填城市质心，`rating:0`）；`addVisit(routeIdx)` / `deleteVisit(routeIdx,visitIdx)` / `deleteAttraction(idx)`（**二次确认 → 连带删相册图片 → 删路线 → 刷新相册网格与全局统计**，2026-11-05 起） |
| 照片区 | 缩略图由 JS 插到**静态**上传按钮之前（`insertBefore(t, routeUploadBtn)`），上传/删除/换序后只重绘缩略图，不再重建整个面板 |
| 配色 | 全部走项目变量：`var(--card)` / `var(--line)` / `var(--line-2)` / `var(--ink)` / `var(--muted)` / `var(--accent)` / `var(--radius)` / `var(--radius-sm)` / `var(--radius-xs)` / `var(--shadow)`；浅色主题另加 `body.light-theme .route-card-input{background:#ffffff}`、`.route-card-visits{background:rgba(0,0,0,.015)}`、`.route-card-edit-btn{background:var(--line-2)}`；`.route-card-input option{background:var(--card);color:var(--ink)}` 保证深色主题下拉可读 |
| 未跟随主题的部分 | 反馈弹窗 `.feedback-*`、账号弹窗 `.auth-*/.account-*` 仍是硬编码深色；城市详情页 `.att-detail-*` 是刻意保持深色的沉浸式照片页 |
| 护栏 | `tests/route-editor-static.spec.cjs`（**42 项**）：静态 id 齐全、路线级 id 已移除、浮层只剩三项、`openVisitEditor` 不再建表单、事件只有一个绑定点、配色变量化、难度选项与常量一致、**推荐指数 5 颗星的点亮/落盘/清零（须先进编辑态）**、**路线卡查看态/编辑态切换（12 项，2026-11-07 新增）**，并用极简 DOM 桩跑通填值/回写/照片区/编辑态逻辑 |

### 列表口径（城市名弱化标签 + 卡内两行制路线行）

顶层「已点亮城市」列表按**城市**组织：**一个城市一张卡**（列表视图 + 网格视图都是），卡内是**只读的两行制徒步路线列表**。

| 位置 | 主 | 次 |
|---|---|---|
| 顶层列表卡 | **城市名弱化标签** `.city-card-name`（13px / 600 / `var(--muted)` / 无发光，2026-10-30 起） | 无副标题、无右上角时间范围（`.city-card-sub` / `.city-card-date` 已彻底删除） |
| 顶层网格卡 | 城市名称 `.grid-card-name`（emoji + 去掉「市」后缀） | `.grid-card-province` = 「📍 省份」 |
| 城市详情页路线卡 | 路线名称 `.att-card-name` | 城市名称 `.att-card-city` |

卡内路线列表（`.city-card-routes`）插在 `.city-card-head` 与 `.city-card-thumbs` 之间，每行一个 `.city-card-route`（**列向 flex，两行**）：

| 行内元素 | 位置 | 内容 |
|---|---|---|
| `.city-card-route-top` | 第一行容器 | 装下名称 + 日期·次数 |
| `.city-card-route-name` | 第一行 · 左 | 路线名称（无名称时回退「路线 N」）；`flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis` → 长名省略号截断，不挤掉日期 |
| `.city-card-route-time` | 第一行 · 右 | **最近一次徒步日期 · 次数**（`getRouteStats().latestDate` + `visitCount`；无日期显示「未记录日期」，无经历则「未记录日期 · 0 次」）；`flex:0 0 auto` 不被挤压 |
| `.city-card-route-meta` | 第二行 | **爬升 · 距离**（`routeDistanceGainText()`，两段，**不含最高海拔**）。**两项都缺 → 该 span 根本不创建 → 整行不渲染，不留空行/空位**（2026-10-30 起） |

- **2026-10-30 起卡内路线行改两行制**：第一行 = 名称 + 日期·次数，第二行 = 爬升 · 距离。**次数始终跟时间**（`2026-05-02 · 2 次`），第二行不含次数。
- **难度徽章、坐标、最高海拔已从卡内移除** —— 但难度徽章在**省份地图卡**（`.province-map-card-badge`）、城市详情页、路线编辑器里仍然显示；坐标与最高海拔在**城市详情页 / 路线编辑器 / 城市弹窗路线卡**里仍然显示。
- **「最近一次徒步日期」取 `getRouteStats().latestDate`**（不是 `latestVisitDate()`）：前者带 `^(\d{4})-(\d{2})-(\d{2})` + 月日范围校验，脏数据（`2026-13-45` / `not-a-date`）会被丢弃，不会顶掉真实日期。
- **行是只读的**：不绑自己的 click，点击冒泡到卡片 → `focusCityOnMap()` + `openCityModal()`（与 v3.2「一条路线一张卡」时代的交互一致）。
- 最多显示 5 条，超出追加 `.city-card-route-more` = 「+N 条路线」。
- **禁止复用** `.route-metrics` / `.route-coord`（那是 `rgba(255,255,255,.62/.42)` 白字，为深色沉浸详情页设计）；卡内用新类 `.city-card-route-meta` / `.city-card-route-time`（`var(--muted)`），否则浅色主题下 `var(--card)` 白底白字看不见。
- `.city-card-routes` 已加入 z-index 白名单（`.city-card>.city-card-head,.city-card>.city-card-routes,…`），否则被 `.meteors-layer` 盖住。
- 排序按**城市**最新经历月份倒序，无月份的按照片 `order` 倒序排最后。

### 省份地图卡片：点击省份 → 每条徒步经历一张卡（2026-10-29）

点击具体省份时，地图上不再「一个城市一张卡」，而是**该省每一条徒步经历一张卡**；城市视图（未选省份）保持「一城一卡」不变。

| 项 | 口径 |
|---|---|
| 粒度 | **每条徒步经历一张卡**（不是每条路线一张）。江苏省 2 路线 3 经历 → 3 张卡 |
| 卡片内容 | 路线名称 `.province-map-card-name` + 难度徽章 `.province-map-card-badge`（`routeDifficultyBadge()`，难度为空则不渲染徽章容器）+ 时间 `.province-map-card-date`；封面取**该经历自己的第一张照片**（`visitCoverOf()`：优先 `kind!=='video'` 的图片，只有视频时回落视频封面 JPEG，无照片 → 「无封面」占位） |
| 连线锚点 | **路线自己的坐标** `route.lng/lat`（`visitAnchorOf()`）；未填写坐标时回落到城市质心 `city.value` |
| 点击行为 | 经历卡 → `openAttractionDetail(city, routeIdx)` 打开城市详情页并滚动定位到该条路线；城市卡仍 → `openCityModal(city)` |
| 候选城市 | 省份分支**不再要求 `citiesWithPhotos`**（那是相册照片闸门，会漏掉「有路线但相册无照片」的城市）；该省**一条经历都没有**时才回退为城市卡 |
| 数量上限 | **不限**，全部铺出。底部「另有 N 个…」胶囊（`.province-focus-more` / `#provinceFocusMore`）已彻底删除 |
| 排序 | 时间倒序；没记日期的排最后；同日期按城市相册照片数倒序 |

**卡片条目统一形状**（`provinceFocusCities` 的元素）：

```js
{kind:'city'|'visit', city, key, anchor:[lng,lat], cover, name, difficulty, date,
 rating, tags, route, visit, routeIdx, visitIdx}
```

| 字段 | 口径 |
|---|---|
| `key` | 城市卡 = `city.cityKey`（历史图钉/位置缓存继续生效）；经历卡 = `cityKey + '#' + 路线下标 + '#' + 经历下标`。**用下标而非 `route.id`/`visit.id`** —— 旧数据每次加载都会重新生成 id，下标才跨会话稳定 |
| `anchor` | 城市卡 = 城市质心；经历卡 = 路线坐标（缺则回落城市质心） |

**key 化配对（本次重构核心）**：卡片与条目**一律按 `card.dataset.cardKey` 查表配对**，不再按数组下标。原因：经历卡按时间倒序后条目顺序会变，下标配对会把 `cards[0]` 的缓存位置静默转配给别的条目。涉及 6 处：`updateProvinceCardLines()` / `panFollowCards()` / `resolveProvinceCardOverlaps()` / `layoutProvinceFocusCards()` / `commitCityCardRoamTransform()` / `renderProvinceFocusCards()`。

| 配套改动 | 说明 |
|---|---|
| `provinceFocusLastPoints` | 数组 → **Map\<key,{x,y}\>**（平移检测基线按下标配对同样会算错卡片） |
| 连线属性 | SVG path 的 `data-city` → **`data-card-key`**（同一城市的多条经历卡共用 cityKey，按 cityKey 查会更新到错误的线） |
| `attachProvinceCardDrag(card, item)` | 第二参数由 `city` 改为**条目**：`city.value` → `item.anchor`（否则拖拽时连线画回城市质心），`cardPins[city.cityKey]` → `cardPins[item.key]` |
| localStorage 键 | `travelCardPinsV3` / `travelCardPosCacheV3` → **V4**（旧的城市级图钉不与新的复合键串味） |
| 同锚点错开 | 同一路线的多条经历共用一个锚点 → 候选半径按组内序号递增（`r + groupOrd*14`）并交替弯向，否则多条连线完全重叠成一条射线 |
| 入场动画 | `animationDelay = Math.min(index,8)*45 + 'ms'`（否则 30 张卡会出现 1.3 秒的波浪式入场） |
| 详情页定位 | `renderAttractionDetailList()` 给 `.att-card` 加 `data-route-index`；`openAttractionDetail(city, focusRouteIdx)` 渲染后 `scrollIntoView({block:'center'})` |
| CSS | 新增 `.province-map-card--visit` 修饰类（路线名 / 徽章 / 时间 三行叠放，尺寸沿用基础卡的 154×70）；**基础 `.province-map-card` 未改动** —— 足迹到站卡 `fpShowCityCard` 复用同一套类名 |
| 护栏 | `tests/province-visit-cards.spec.cjs`（20 项）：一经历一卡、key 唯一、封面取本经历首图、视频不抢占首图、三行内容、锚点回落、排序、点击分流、key 化配对、V4 缓存键、同锚点错开、胶囊已删、基础类未污染、详情页定位、足迹卡互斥 |

### 城市弹窗里的经历小图 + 相册实时同步

| 项 | 口径 |
|---|---|
| 经历缩略图 | `renderRouteVisits()` 在每条经历行尾追加 `.route-card-visit-thumbs`：**最多 4 张** `.route-card-visit-thumb`，超出显示 `.route-card-visit-thumb-more` = 「+N」。计数文字 `.route-card-visit-media`（「N张照片 · M个视频」）**保留** |
| 点击行为 | 缩略图 → `openPhotoViewer(photos, pi)`，`pi` 是**原数组下标**（预览范围 = 该条经历的全部照片，含未显示的第 5 张）；`+N` → `openPhotoViewer(photos, 0)`；两者都 `e.stopPropagation()` |
| 视频 | 视频副本的 `dataUrl` 是封面 JPEG，可直接 `<img>`；缩略图带 `.route-card-visit-thumb-play` 播放角标 |
| 布局 | 缩略图区 `flex:1 1 100%` → `.route-card-visit` 的 `flex-wrap` 把它换到独立一行，**编辑/删除按钮仍留在日期行** |
| 上传同步 | `routeUploadPhotos()` 末尾：`currentCity.cityKey===ctx.cityKey` 时 `await loadCityPhotos(ctx.cityKey)`（重画 `#thumbsGrid` 相册网格）+ `await refreshState()`（顶层卡片缩略图与统计）。**城市不匹配时不刷新别人的相册** |
| 删除同步 | `routeDeletePhoto()` 先取出 `target` 再 `splice`，再 `await deleteRoutePhotoFromAlbum(ctx.cityKey, target)` 删掉城市相册里的同一条 |
| 三级匹配 | `deleteRoutePhotoFromAlbum()`：**id 优先** → `storagePath` → `dataUrl`。本地上传两侧共享 `addPhoto` 自增 id；云端恢复的副本只有 `storagePath`；历史数据只有 `dataUrl`。id 优先是刻意的，避免重复上传同一张图时删错条目 |
| 反向同步 | 相册侧删除（`onDeletePhoto()`）仍按 `dataUrl`/`storagePath` 清理经历副本，两侧保持一致 |
| 不在范围 | `routeSwapPhotos()` 的拖拽换序**不同步**相册 `order`（用户已确认本轮不做） |

### 后端存储与三层结构的适配口径（2026-10-29 核查结论）

三层结构是**纯前端概念**，后端两个文件都**不需要改**。

| 项 | 结论 |
|---|---|
| `supabase-setup.sql` | **无需修改**。新结构写入的仍是三列**无约束 jsonb**（无 CHECK / trigger / plpgsql 函数；RLS 谓词只判 `auth.uid()` / `is_public`）：`travel_snapshots.data`（完整三层）、`city_reviews.attractions` + `public_profiles.attractions`（公开投影） |
| 公开投影 | `normalizePublicRoutes()` 产出**固定 6 字段** `{name,difficulty,distanceKm,elevationGain,maxAltitude,visitDate}`，与三层结构之前**形状完全相同**；`visits[]`（坐标 / 备注 / 照片）**故意不外传**，在这一步被丢掉 |
| `city_reviews.visit_month` | 值 = `getRouteStats(meta).latestMonth`（城市下最近一条徒步路线的经历月份），列名与语义都不变 |
| `oss-media/index.ts` | **无需修改**。它是**路径无关**的 OSS 签名代理（鉴权 → `ownsPath()` → 签 300s PUT/GET URL）；object key 是**扁平**的 `users/<uid>/<kind>/<cloudId>.<ext>`，**不含 cityKey / routeId / visitId** → 嵌套变深不改变寻址参数（key ≈ 90 字符 ≪ `ownsPath` 的 1024 上限） |
| 前端上传链路 | 已适配三层：`routeMediaList()` → `routeVisitPhotos()` → `routeVisits()` **已递归到 `visit.photos[]`**；经历副本与相册主条目的 `dataUrl` **字面相同** → `photoPathByDataUrl` 命中 → **复用同一个 OSS 对象**，不重复上传；快照里 `photos[].dataUrl`(base64) 被剥掉，只留 `cloudId`/`storagePath` |
| 已知遗留 | `action:'delete'` 是**死代码**（前端只调 `action:'put'` / `action:'get'`）→ 删掉的照片其 OSS 对象永不清理，产生**孤儿对象**。要修需单独立项（补前端删除调用 + 批量分片） |
| 已知遗留 | **视频本体永不上云**：`importLocalVideo` 仅本机模式（blob 存 IndexedDB），`buildCloudSnapshot` 剔除 `kind==='video'` → 云端只有封面 JPEG。故 `travel-media` 桶的 image-only `allowed_mime_types` 不构成阻塞 |

### 权限模型

任何人可以注册登录，但只能管理自己的数据。前端请求路径为 `users/<user.id>/...`；Edge Function 先用 Supabase `auth.getUser(token)` 验证用户，再用 `ownsPath()` 校验路径。OSS 保持私有，浏览器只使用 300 秒有效的 PUT/GET 签名 URL。不要把 OSS 设置为公共读写。

Edge Function 控制台的 **Verify JWT with legacy secret 必须关闭**，因为项目使用 Publishable key 签发的新令牌；关闭网关旧校验不代表公开访问，函数内部仍执行用户验证。

### 必需云端配置

```text
Supabase Project Ref: zpqbbawremufcxxszgde
Edge Function: oss-media
OSS Bucket: your-china-travel-8877-hk
OSS ACL: 私有
正式 Origin: https://pdsmile.github.io/  与  https://pdsmile.github.io//china-travel/
本地 Origin: http://127.0.0.1:8765
```

Secrets 只记录名称，不记录值：

```text
ALIYUN_OSS_ACCESS_KEY_ID
ALIYUN_OSS_ACCESS_KEY_SECRET
ALIYUN_OSS_BUCKET
ALIYUN_OSS_REGION
```

OSS CORS 允许正式与本地 Origin，Methods 至少为 GET/PUT/DELETE/HEAD，Allowed Headers 为 `*`。RAM 自定义策略 `YourChinaTravelOSSAccess` 仅授权 `your-china-travel-8877-hk/users/*` 对象的读取、上传与删除。

### 同步代码的不可破坏约束

1. `cloudSuppressDirty` 为真时不得上传快照。
2. 云端恢复必须先完成所有照片下载和数据准备，之后才能 `clearLocalTravelData()`。
3. 恢复开始前必须取消已排队的同步 timer。
4. 不得根据某一次快照自动批量清理“未引用 OSS 对象”；竞态会误删真实照片。
5. 批量上传必须等待 IndexedDB 的全部写入完成，再构建快照。
6. 用户主动删除照片时，路径仍需经过当前 user ID 校验。
7. 同一用户且 `travelCloudUpdatedAt` 与云端 `updated_at` 一致时，只有在本地缓存包含快照所需的全部 OSS 路径后才能跳过恢复。
8. 云端版本变化时，应按 `storagePath` 复用 IndexedDB 中已有的 `dataUrl`，只下载本机缺少的 OSS 图片。
9. 退出前同步若命中 `travel_snapshots_user_id_fkey`，表示 Auth 用户已经不存在；此时只清除本机会话并保留 IndexedDB，方便重新注册后迁移，其他同步错误仍必须阻止退出。

### 已处理的云端故障

- `401`：关闭 Edge Function 的 legacy JWT 网关校验，函数内部继续验 token。
- `SignatureDoesNotMatch`：PUT 的 `content-type` 必须参与 V4 签名，浏览器上传时保持一致。
- OSS PUT `403`：RAM 策略必须绑定给正确 RAM 用户并指向香港 Bucket。
- `404 NoSuchKey`：对象已经不在 OSS，单纯重新获取签名无法恢复。
- 登录/退出竞态误清理：提交 `9ee1b61` 已禁止恢复期间覆盖云端和自动清理 OSS。

### 新增文件与最近提交

```text
supabase-config.js
supabase-setup.sql
supabase/functions/oss-media/index.ts
```

```text
2706876 feat: 新增账号登录与旅行资料跨设备云同步
0946393 fix: 修复批量添加照片时云端同步遗漏
0b0b63a feat: 使用阿里云 OSS 自动同步照片
a369567 fix: 兼容现有 Supabase 用户令牌
1765191 fix: 由 OSS 地域自动生成上传地址
1819cb0 fix: 签入 OSS 上传内容类型
875dc17 fix: 兼容旧页面的 OSS 上传签名
9ee1b61 fix: 防止恢复期间覆盖或删除云端照片
```

### 本地恢复资料

`recovery/` 和 `zwxll.github.io.har` 是本地事故分析资料，不得加入 Git。HAR 可能包含会话令牌和临时签名 URL。不要在回答、文档或日志中输出 AccessKey Secret。

---

## 一、项目概览

- **项目名称**：记录我的中国行（Chinese Footprint）
- **技术栈**：前端为单文件 HTML（内联 CSS/JS，无构建步骤）；云端使用 Supabase Auth/Database/Edge Functions 与阿里云 OSS
- **核心依赖**（CDN 运行时加载，无打包）：
  - ECharts 5.4.3 — 中国地图渲染（4 重 CDN 回退）
  - globe.gl — 3D 地球首屏
  - GSAP 3.12.5 — 动画引擎
  - Inter 可变字体（self-host）— Variable Proximity 标题动画
  - 中国 GeoJSON — 省份边界数据（geo.datav.aliyun.com）
- **数据存储**：IndexedDB 本机缓存 + Supabase 用户快照 + 私有阿里云 OSS 图片
- **工作目录**：`F:\03-agent项目\codex\codex-list\projects\Your-China-Travel`

---

## 二、项目文件结构

```
f:\trae\1\Your-China-Travel\
├── index.html              # 主页面（8544行，含全部内联 CSS/JS/动画）
├── china-geo.js            # 中国地理数据（城市坐标等）
├── china-geo.json          # 地理 JSON 数据
├── china-provinces-geo.js  # 省份边界数据
├── assets/fonts/           # 自托管字体（Inter、Playfair、Figtree）
├── vercel.json             # Vercel 部署配置
├── nginx.conf              # Nginx 配置
├── Dockerfile              # Docker 容器化
├── docker-compose.yml      # 一键编排
├── .gitignore
└── README.md               # 部署文档
```

---

## 三、index.html 代码结构与各部分功能

### 1. `<head>` 区（第 1-2836 行）

| 行范围 | 内容 |
|--------|------|
| 1-12 | meta 标签、DNS 预解析、标题 |
| 14-48 | Inter 可变字体 @font-face self-host |
| 49-66 | 全局配色变量（纯黑科技基底 + 青蓝主色）|
| 67-74 | 圆角系统（Shape Consistency Lock）|
| 75-85 | Z-Index 层级系统 |
| 268-324 | Star Border 星际边缘效果（reactbits）|
| 325-660 | 地图搜索框（Gooey 黏稠效果 + 圆锥渐变边框）|
| 668-750 | 加载动画（9柱放射小球弹跳）|
| 752-815 | 弹窗滚动隔离核心 |
| 816-918 | 城市卡片 3D 浮空透视 + 缩略图 |
| 919-960 | 切换按钮组 + Variable Proximity 可变字体 |
| 1040-1140 | 已点亮城市卡片（3D 卡牌 + 流星 + Border Glow）|

### 2. `<body>` 区（第 2837-3661 行）

| 行范围 | 模块 | 功能说明 |
|--------|------|----------|
| 2838-2867 | 首屏 3D 地球入口 | globe.gl 渲染旋转地球 + "开始记录"按钮 |
| 2868-2869 | 页面过渡遮罩 | GSAP 控制黑屏淡入淡出 |
| 2871-2881 | Gooey SVG Filter | 搜索框黏稠效果滤镜定义 |
| 2882-2900 | header 品牌区 | Chinese Footprint 品牌标识 |
| 2901 | `#map` | ECharts 中国地图主容器 |
| 2968-3002 | 搜索框 + 城市网格 | `#cityGrid` 已点亮城市卡片列表 |
| 3007-3037 | 地图加载器/错误提示 | `#mapLoader`、`#mapError` |
| **3147-3188** | **`#attDetailOverlay`** | **城市详情页（本次会话重点修改区）** |
| 3190-3197 | `#attEditOverlay` | 徒步**经历**编辑浮层（游玩日期 / 路线备注 / 路线照片） |
| 3198-3240 | 外部脚本引入 | china-geo、ECharts、globe.gl、GSAP |
| 3242-3661 | 主逻辑 JS | 数据层、地图、交互、动画 |

### 3. 核心 JS 模块（`<script>` 区）

| 功能模块 | 关键函数/变量 | 说明 |
|----------|--------------|------|
| 数据层 | `IndexedDB`（TravelPhotosDB）| 照片存储，`cityMeta` 仓库存城市元数据 |
| 城市元数据 | `getCityMeta()`/`setCityMeta()`/`cityMetaCache` | 字段：`coverImage`、`description`、`birthMonth`(YYYY-MM，家乡出生年月)、`rating`(0-5)、`attractions[]`（徒步路线） |
| 徒步路线数据 | `attractions[].{id,name,difficulty,distanceKm,elevationGain,maxAltitude,lng,lat,visits[]}`，`visits[].{id,visitDate(YYYY-MM-DD),notes,photos[]}` | 物理键名仍是 `attractions`；难度取 easy/moderate/hard/extreme/ultimate，坐标为 GCJ-02 且**可编辑**，未填为 null |
| 地图渲染 | `myChart`(ECharts实例)、`updateScatterData()` | 散点图叠加地图，已点亮城市高亮 |
| 地图交互 | `myChart.on('click'/'dblclick')` | 单击→城市弹窗；双击已点亮→详情页 |
| 状态刷新 | `refreshState()` | 遍历照片统计 `photoCountByCity`、`totalAttractionCount` |
| 详情页 | `openAttractionDetail(city)` | 加载城市 meta，渲染封面/简介/徒步路线网格 |
| 路线渲染 | `renderAttractionDetailList(attractions)` | 生成路线卡片（主=路线名称/次=城市名称、难度徽章/里程/坐标/经历列表），卡内经历行「编辑」→ 经历浮层 |
| 照片查看器 | `openPhotoViewer(photos,idx,loop,opts)` | 1.1倍旋转木马，虚化封面背景 |
| 城市弹窗 | `openCityModal(cityData)` | 城市编辑（简介、星级、徒步路线卡行内编辑 + 经历增删；家乡额外有出生年月） |

---

## 四、城市详情页（`#attDetailOverlay`）当前结构

这是本次会话的核心修改区域。当前 HTML 结构（第 3147-3188 行）：

```
#attDetailOverlay（详情页根容器）
├── .att-detail-bg #attDetailBg          ← 虚化城市封面背景（保留不动）
├── #attDetailCloseBtn                     ← 右上角关闭按钮（保留不动）
├── .att-tech-deco                         ← 科技装饰层（z-index:5）
│   ├── .att-tech-grid                     ← 极低透明度网格辅助线
│   ├── .att-tech-side-l / -r             ← 左右竖向流动蓝光条
│   └── .att-tech-particles #attTechParticles ← 12个GSAP漂浮粒子
└── .att-detail-inner                      ← 内容容器（z-index:10）
    ├── h1.att-detail-city-name           ← 金色城市大标题（保留不动）
    ├── .att-desc-wrap #attDescWrap       ← 城市简介（透明无背景边框）
    │   └── .att-detail-desc #attDetailDesc
    ├── .att-info-bar #attInfoBar         ← 数据信息栏（玻璃面板，横向4项）
    │   ├── 徒步路线时间 / 推荐星级 / 路线总数 / 相册影像
    ├── .att-grid-title（隐藏占位）
    └── .att-grid #attDetailBody          ← 徒步路线网格卡片（无外层包装）
```

---

## 五、本次会话全部修改记录（按时间顺序）

### 修改 1：景点卡片视觉增强
**目标**：封面背景更清晰、文字更醒目、新增游玩日期显示

| 修改点 | 修改前 | 修改后 |
|--------|--------|--------|
| 背景模糊 | `blur(8px)` | `blur(4px)` |
| 背景亮度 | `brightness(0.65)` | `brightness(0.70)` |
| 城市简介字号 | 15px / weight 500 | 17px / weight 600 |
| 简介颜色 | `rgba(255,255,255,.78)` | `rgba(255,255,255,.92)` |
| 城市名字号 | 12px | 13px→14px |
| 景点名字号 | 22px | 24px→26px |
| 新增 | — | `.att-card-date` 游玩年月日显示（YYYY年M月D日）|

### 修改 2：Shiny Text 闪光效果 + 缓慢呈现
**目标**：参照 reactbits.dev/shiny-text，景点文字应用闪光扫过效果

- 新增 `.shiny-text` CSS 类：`linear-gradient` + `background-clip:text` + `shinySweep` 动画（110°渐变，金色基底+白色高光带循环扫过）
- 景点标题应用 Shiny Text，景点名应用白底金光 Shiny
- 城市简介新增 `descReveal` 动画：`clip-path` 从左到右逐字呈现（1.6s）
- 删除标题英文 `ATTRACTIONS`

### 修改 3：design-taste skill 配色检视
**目标**：修复纯白文字与暖金背景不搭的问题

- 城市简介文字色：`#ffffff`（纯白）→ `#f5e6c8`（暖香槟色），与金色标题 `#e8c068` 同色系
- text-shadow：纯黑 `rgba(0,0,0,...)` → 暖棕 `rgba(20,12,4,...)`

### 修改 4：删除"景点·数量"标题
- 移除详情页 `景点 · N` 字样，`#attGridTitle` 设为 `display:none`

### 修改 5：地图双击已点亮城市跳转详情页
**目标**：双击地图上已点亮城市散点直接进入详情页

- 新增 `myChart.on('dblclick')` 事件，判断 `photoCountByCity.has(cityKey)` 后调用 `openAttractionDetail()`
- **单击/双击冲突修复**：已点亮城市单击延迟 250ms（`pendingClickTimer`），dblclick 触发时 `clearTimeout` 取消挂起的单击，避免弹窗与详情页冲突
- 未点亮城市单击立即响应（无双击需求）

### 修改 6：城市详情页大幅增强（新增5大模块）
**目标**：补充内容、提升饱满度、强化深色科技质感

新增模块：
1. **数据信息栏** `.att-info-bar`：玻璃面板横向4项（游玩年月/推荐星级/景点总数/相册影像），金色数值带呼吸发光
2. **城市简介玻璃面板** `.att-desc-wrap`（后改为透明）
3. **景点网格玻璃包装** `.att-grid-wrap`（后删除）
4. **底部统计光条** `.att-stats-bar`（后删除）
5. **全局科技装饰层** `.att-tech-deco`：网格辅助线 + 竖向流动蓝光条 + 12个GSAP漂浮粒子

新增 JS 函数：
- `fillCityInfoBar(meta,attractions)` — 填充4项数据
- `fillCityStatsBar(meta,attractions)` — 填充底部统计（后移除调用）
- `initTechParticles()` — 生成12个粒子，GSAP yoyo 漂浮
- `playDetailEntrance()` — GSAP timeline 入场动画（标题→简介→数据栏→卡片）
- 全局变量 `window.totalAttractionCount` — 在 `refreshState()` 中计算

卡片增强：
- hover：`translateY(-8px) scale(1.02)` + 蓝色外发光 `rgba(100,170,255,.25)`
- 新增 `.att-card-photo-count`：右上角照片数量小字徽章

### 修改 7：布局调整（最终当前状态）
**目标**：精简视觉，调整顺序

| 调整项 | 操作 |
|--------|------|
| 景点卡片玻璃包装边框 | **删除** `.att-grid-wrap`，卡片直接展示 |
| 底部统计光条 | **删除** `.att-stats-bar` 及 `fillCityStatsBar` 调用 |
| 简介与数据栏位置 | **互换**：简介在上（紧接标题），数据栏在下 |
| 简介背景边框 | **删除**：`.att-desc-wrap` 改为全透明 `background:transparent;border:none` |
| 简介尺寸 | 字号 17→18px，行高 1.85→1.9 |
| GSAP动画顺序 | 标题→简介→数据栏→景点卡片（移除统计栏）|

---

## 六、关键代码位置索引

便于后续 Agent 快速定位：

| 功能 | 文件 | 行范围（约） |
|------|------|-------------|
| 详情页 HTML 结构 | index.html | 3147-3188 |
| 详情页 CSS | index.html | 1760-2010 |
| 科技装饰层 CSS | index.html | 1850-1880 |
| 数据信息栏 CSS | index.html | 1875-1900 |
| 简介容器 CSS | index.html | 1889-1900 |
| 景点卡片 CSS | index.html | 1960-2010 |
| `openAttractionDetail()` | index.html | 6344-6384 |
| `fillCityInfoBar()` | index.html | 6406-6430 |
| `initTechParticles()` | index.html | 6455-6475 |
| `playDetailEntrance()` | index.html | 6480-6490 |
| `renderAttractionDetailList()` | index.html | 6516-6600 |
| 地图 click/dblclick | index.html | 4306-4330 |
| `refreshState()` | index.html | 6296-6329 |

---

## 七、GitHub 推送全流程

### 前置条件
- 本地已安装 Git
- 已有 GitHub 账号
- 项目目录：`f:\trae\1\Your-China-Travel`

### 步骤 1：初始化本地 Git 仓库（若尚未初始化）

```powershell
cd f:\trae\1\Your-China-Travel
git init
git add .
git commit -m "feat: 记录我的中国行 - 城市详情页视觉增强与交互优化"
```

### 步骤 2：在 GitHub 创建远程仓库

1. 登录 GitHub → 点击 `+` → `New repository`
2. 仓库名填 `Your-China-Travel`
3. 选择 `Public` 或 `Private`
4. **不要**勾选 "Add a README"（本地已有）
5. 点击 `Create repository`

### 步骤 3：关联远程仓库并推送

```powershell
# 关联远程仓库（替换 YOUR_USERNAME 为你的 GitHub 用户名）
git remote add origin https://github.com/YOUR_USERNAME/Your-China-Travel.git

# 重命名主分支为 main（GitHub 默认）
git branch -M main

# 首次推送
git push -u origin main
```

### 步骤 4：后续修改的增量推送

每次修改 `index.html` 后：

```powershell
cd f:\trae\1\Your-China-Travel
git add index.html
git commit -m "style: 城市详情页布局调整 - 简介与数据栏互换、移除玻璃包装"
git push
```

### 步骤 5：使用 GitHub CLI（可选，更便捷）

若安装了 `gh` CLI：

```powershell
# 一键创建仓库并推送
cd f:\trae\1\Your-China-Travel
gh repo create Your-China-Travel --public --source=. --push
```

### 步骤 6：认证方式

- **HTTPS**：推送时输入 GitHub 用户名 + Personal Access Token（非密码）
  - Token 生成：GitHub → Settings → Developer settings → Personal access tokens → Generate new token（勾选 `repo` 权限）
- **SSH**（推荐）：配置 SSH key 后无需每次输入凭证
  ```powershell
  ssh-keygen -t ed25519 -C "your_email@example.com"
  # 将 ~/.ssh/id_ed25519.pub 内容添加到 GitHub → Settings → SSH and GPG keys
  git remote set-url origin git@github.com:YOUR_USERNAME/Your-China-Travel.git
  ```

### .gitignore 已有内容

项目根目录 `.gitignore` 已配置，无需额外修改。

---

## 八、本地预览方式

```powershell
# 方式1：Python 简易服务器
cd f:\trae\1\Your-China-Travel
python -m http.server 8765
# 浏览器打开 http://localhost:8765/

# 方式2：Node http-server
npx http-server -p 8765
```

---

## 九、注意事项

1. **IndexedDB 是本机缓存**：未登录时数据仅在本机；登录后 Supabase + OSS 才是跨设备来源，同一账号可自动恢复
2. **地图数据依赖外网**：需能访问 `geo.datav.aliyun.com`，内网无外网时地图无法加载
3. **ECharts CDN 回退**：已配置 4 重 CDN 回退（jsdelivr / fastly / bootcdn / unpkg）
4. **修改原则**：所有修改均保留原有功能（虚化背景、金色标题、关闭按钮、卡片交互、旋转木马、编辑弹窗、3D地球、旅行轨迹等）
5. **动画引擎**：GSAP 3.12.5 已通过 CDN 加载（第 3218 行），新增动画均使用 GSAP timeline 管理

---

## 十、本次会话使用的工具与 Skill

- **solo-design skill**：页面编辑主流程规范
- **design-taste-frontend skill**：配色检视（taste-skill），修复纯白与暖金背景不搭问题
- **integrated_browser MCP**：浏览器自动化验证（导航、点击、截图、JS评估）
- **WebFetch**：获取 reactbits.dev/shiny-text 参考效果

---

*初始文档生成时间：2026-07-21*
*当前基线更新时间：2026-08-14*

## 十一、2026-09-29 功能交接补充

### 11.1 本地资料文件夹与媒体同步

- 本机模式支持选择资料文件夹、自动同步、从文件夹恢复，以及导出资料文件夹。
- 资料结构包含 `profile.json`、`index.json`、城市目录、`photos/`、`videos/` 和 `徒步路线/`（旧存档的 `景点/` 目录仍可读取）；视频同时保存原文件和封面图。
- 使用 IndexedDB `TravelPhotosDB` 保存文件夹句柄、照片 Blob、视频 Blob 与城市/徒步路线元数据；浏览器更换后需要重新选择或从已有资料文件夹恢复。
- 视频仍限制在“本机模式 + 资料文件夹”，云端快照只同步照片元数据/封面，不上传本地视频原文件。

### 11.2 相册、视频与查看器

- 城市详情中的“相册管理”支持照片/视频分类、视频上传、视频封面、视频播放器和“查看全部相册”。
- 路线卡片单击查看媒体，右上角“编辑路线”进入编辑；路线视频会同步进入城市媒体库。
- 路线旋转木马和城市堆叠相册均支持“照片 / 视频”切换；视频弹窗支持上一条/下一条、键盘方向键、全屏、下载和“查看全部视频”缩略条。
- 图片查看器支持横向浏览与照片墙模式；照片墙中的视频使用封面和播放标记，点击进入视频播放器。

### 11.3 旅行轨迹与记忆书架

- 旅行轨迹预览地球在预览态始终显示；鼠标移入轨迹区域时自转，移出后保持当前角度并暂停，不再淡出隐藏。
- 记忆书架中心书籍默认显示书脊，长按拖动继续展示旋转后的书脊厚度。
- 章节页和相册页采用统一暖象牙纸张、低对比度纸纹、中缝阴影和边缘暗角；翻页动画的旋转页使用独立纸张背面与纹理，避免动画中露出默认灰白底色。

### 11.4 验证与接手注意

- 回归命令：`node tests/local-folder.spec.cjs`。
- 当前回归测试覆盖本机资料夹导出/恢复、视频 Blob 和封面、路线视频归档、云模式限制、相册标签、单击路线查看、徒步路线数据层与迁移（`tests/route-stats.spec.cjs`）、路线/经历编辑面（`tests/route-editor-static.spec.cjs`）、资料夹往返（`tests/folder-media-roundtrip.spec.cjs`）、路线卡片媒体计数（`tests/attraction-media-count.spec.cjs`）、照片墙以及最新查看器/地球/书脊/翻页源代码回归检查。
- 修改集中在单文件 `index.html`；无构建步骤。启动本地页面建议使用 HTTP 服务，不要直接依赖 `file://` 验证 IndexedDB、Blob 和媒体播放。
- 当前未创建提交，也未推送 GitHub；提交前应检查 `git diff --check`、运行回归测试，并在浏览器实际检查视频弹窗和记忆书架翻页中间帧。

*交接补充更新时间：2026-09-29*
*项目路径：F:\03-agent项目\codex\codex-list\projects\002-Your-China-Travel*
*文档整理前发布基线：9ee1b61*

## 十二、2026-09-29 当前目录检索校准

- 当前 `HEAD` 为 `bfd1adc`，该提交回退了记忆书架翻页实验；`origin/main` 仍为 `4bd0ae5`。
- 当前工作树的 `index.html` 有未提交相册布局/纸张视觉调整；不将其描述为已发布功能。
- `tests/local-folder.spec.cjs`、`vercel.json` 和两份记忆书架实验文档当前在工作树中被删除，交接仅记录现状，不自动恢复。
- `旅行资料/` 与 `_shelf_shot.png` 为未跟踪本机样例/截图，保留在本地，提交前需单独确认是否纳入版本库。
- 因本地回归测试文件缺失，不能声称 `node tests/local-folder.spec.cjs` 已通过；后续应先恢复或替换测试入口，再进行完整验证。

*本节更新时间：2026-09-29*

## 十三、2026-09-30 章节页布局微调

- `index.html` 桌面章节页书本恢复由容器自身居中，返回按钮左移、章节标题右移；移动端规则保持不变。
- 已通过章节布局源码检查与 `git diff --check`；历史回归测试文件当前缺失，未声称其通过。

*本节更新时间：2026-09-30*

## 十四、2026-11-05 删路线连带删相册图 / 删除标签管理 / 路线推荐指数

三项需求一次性落地，完整流水账见 `项目交接文档.md` §0.41（含逐行改动点、边界表、测试清单）。

### 14.1 需求一：删徒步路线连带删相册图片

- **新增** `matchAlbumPhoto(photos, mediaCopy)`（纯函数）：副本 → 相册条目的**三级匹配 `id → storagePath → dataUrl`**，单条删与批量删共用这一套规则。
- **新增** `deleteRoutePhotosFromAlbum(cityKey, mediaCopies)`：一次读相册 → 逐个命中 → 去重 → 逐条删（避免 N 张照片 N 次 IndexedDB 读事务）。
- **改造** `deleteRoutePhotoFromAlbum`：改为薄封装（返回值语义逐字不变，旧用例继续通过）。
- **改造** `deleteAttraction(idx)`：`confirm()` 二次确认（写明连带删除张数）→ 先删相册 → 再删路线 → `renderAttractions` / `renderCityCards` / **`loadCityPhotos`（新增，原先缺失）** / **`refreshState`（新增，原先缺失）** → toast。相册删除失败则报错且**不删路线**。
- **绝不误删**：只遍历该路线 `visits[].photos[]` 的副本清单；未挂任何路线的相册图片不动。

### 14.2 需求二：删除城市编辑弹窗的「标签管理」

- 删除：`.tag-section` DOM 整块、`tagList`/`tagInput`/`tagCategory`/`tagAddBtn` 元素引用与事件、`renderTagList`/`addTag`/`removeTag` 三个函数、`loadCityMeta` 与 `openCityModal` 里的两处调用、`.tag-section`/`.tag-list`/`.tag-pill .tag-del`/`.tag-add-row` 系列 CSS + 浅色主题覆盖。
- **保留**：`meta.tags` **数据**与全部下游消费者（城市卡 / 网格卡 / 省份地图卡 / 足迹卡 / 点评发布 / 公开主页 / Supabase 同步 / 资料文件夹导出导入 / `hasLocalTravelData`）；`.tag-pill` 基础样式；城市级「推荐指数」与「城市简介」。
- 版式不受影响：徒步路线区与相册管理之间的虚线分隔来自 `.attraction-section` 自带的 `border-top`，与 `.tag-section` 无关。

### 14.3 需求三：徒步路线推荐指数（0-5 星）

- 字段 `rating`；归一函数 `toRouteRating(value)`（空/非法→0，超界截断，小数四舍五入）放在 `toRouteNumber` 之后 → 落在 `modelBlock` 切片内，测试无需改 deps。
- 落点：`normalizeRoute` / `saveRouteField` / `addRouteToCity`（初值 0）/ **资料文件夹导出白名单**（不加会静默丢字段）/ 导入（`normalizeCityMeta` 自动归一，无需改）。
- UI：城市弹窗路线卡新增「推荐指数」行（难度行之后、路线数据行之前），5 颗可点星，**再次点击同一颗清零**；`updateRouteCardDisplay` 负责点亮（`fillRouteCard` 末尾已调 → 回填自动生效）；详情页路线卡显示只读星级（`.att-card-rating`，`rating>0` 才渲染）。
- 配色复用既有 `.star-svg` / `.star-svg.inactive` 体系（深浅主题自动跟随），只新增尺寸与指针样式。
- **云同步无需改 SQL**：`city_reviews.attractions` / `public_profiles.attractions` / `travel_snapshots.data` 均为 jsonb。
- 范围限制：**不给城市卡路线行加星级**（`city-card-route-list.spec.cjs` 已断言该行内容）；**不改公开投影** `normalizePublicRoutes`。

### 14.4 测试与验证

| spec | 结果 |
|---|---|
| `tests/route-stats.spec.cjs` | 28/28（新增推荐指数归一断言） |
| `tests/route-editor-static.spec.cjs` | 30/30（新增 6 项；DOM 桩升级为**可记录状态的 `classList`**） |
| `tests/route-photo-album-sync.spec.cjs` | 23/23（新增 8 项；新增 `deleteRouteBlock` 切片） |
| `tests/province-visit-cards.spec.cjs` | 20/20（无需修改） |
| `tests/city-card-route-list.spec.cjs` | 19/19（无需修改） |
| `tests/visit-thumb-row.spec.cjs` | 10/10（无需修改） |

- 非浏览器全量回归：**185 通过 / 0 失败 / 3 跳过**（基线 170/0/3，新增 15 项）。
- `git diff --check` 无空白错误；内联 `<script>` 解析 #1–#4/#6/#7 通过（#5 是既有的 globe.gl `import()` 报错，`HEAD` 同样报错）。
- 已知边界：`deleteVisit`（删单条经历）仍留相册孤儿；同一副本跨路线共用时删一条会让另一条裂图；相册 `order` 空洞不重排。

*本节更新时间：2026-11-05*

## 十五、2026-11-07 徒步路线卡「编辑 / 取消」按钮 + 查看态防误输入

### 15.1 需求原文

> 添加徒步路线后，名称、路线数据、 坐标等可以随意改变，这样在用户查看时，可能会不小心点击或者输出错误，在每个徒步路线的右上角怎么编辑/取消 按钮，只有在编辑状态时，才能输入，防止用户误输入

### 15.2 已确认口径（AskUserQuestion）

| # | 决策 | 说明 |
|---|---|---|
| D1 | 「取消」= **只退出编辑模式** | 保留现有「失焦即存」；取消**不回滚**已保存的值 |
| D2 | **只锁输入框 + 星级** | `[+ 添加徒步经历]` / `[删除路线]` 在查看态**仍可点** |
| D3 | 查看态**照常显示但置灰** | 用 `disabled`（不是 `readonly`，`<select>` 不支持 readonly），不隐藏 |
| D4 | **新增路线后自动进入编辑态** | 其余路线一律查看态 |

### 15.3 关键设计：编辑态存在 DOM 上，不用模块级状态

- **编辑态由路线卡上的 `.editing` class 承载**，不用模块级 `Set<index>`：删掉一条路线后，后面所有下标会整体前移 → 集合里的下标全错位。
- DOM class 天然跟随重绘：`renderAttractions` 有 4 个整表重绘点（`loadCityMeta` / `addAttraction` / `deleteAttraction` / 删相册照片后），重绘后新卡没有 `.editing` → 自动回到查看态，**无需任何清理逻辑**。
- **字段级改动（`change` 事件即存）不会丢编辑态**：`refreshRouteViews`（index.html:15077-15086）在 `anchor==='modal'` 时**只重绘经历列表** `renderRouteVisits(ctx.idx, ...)`，**不整表重绘** `renderAttractions` → 卡片 DOM 不被重建。

### 15.4 生产改动（`index.html`，6 处）

| # | 位置 | 改动 |
|---|---|---|
| C1 | 15438-15463（`routeCardHelpersBlock` 切片内） | 新增 `setRouteCardEditMode(card,on)` / `toggleRouteCardEditMode(card)`：切 `.editing` 类 → 7 个 `.route-card-input` 的 `disabled` → 按钮文案/`.on`/`aria-pressed` |
| C2 | 15478-15497 | 头部重构：新增 `.route-card-head-main` 包裹标题/徽章/指标 + 右上角 `.route-card-edit-btn`「编辑 / 取消」 |
| C3 | 15525-15531 | 星级点击加守卫 `if(!card.classList.contains('editing')) return;` |
| C4 | 15606-15608 | `setRouteCardEditMode(card,false)` → 卡片默认查看态 |
| C5 | 15731-15747 | `addAttraction` 定位最后一张卡 → 自动进编辑态 → 聚焦名称框 |
| C6 | 3643-3653 / 3670-3673 / 3698-3699（CSS） | `.route-card-head-main`、`.route-card-edit-btn`（含 `.on` / `:hover`）、`.route-card-input:disabled{opacity:.72;cursor:not-allowed}`、`.route-card:not(.editing) .route-card-rating{pointer-events:none}`、浅色主题 `.route-card-edit-btn{background:var(--line-2)}` |

**C2 为什么加 `.route-card-head-main` 包裹层**：`.route-card-head` 是 `display:flex;flex-wrap:wrap`，不包裹的话按钮会和标题抢同一行空间 → 窄卡片里按钮换行到第二行。标题/徽章/指标包进 `headMain`（`flex:1 1 auto;min-width:0`），按钮作为兄弟节点 `flex:0 0 auto;margin-left:auto` → 永远贴右上角、且不换行。
`updateRouteCardDisplay` 里的 `card.querySelector('.route-card-title')` 是后代查找 → 加了包裹层仍能取到。

**C5 为什么用 `routes.length-1`**：`renderAttractions` 用的是数组下标，不是 `addRouteToCity` 的返回值对象。

### 15.5 已知边界（本次不处理）

- 「取消」**不回滚**已保存的数据（D1 明确要求）。
- 删除某条路线后，**其它卡片的编辑态会被重置**为查看态（整表重绘的副作用）。
- 徒步**经历**行（`visits`）不在路线卡上就地编辑，仍走独立经历浮层 → 本次不动。
- 查看态用 `disabled` 而非 `readonly`：`<select>` 不支持 `readonly`；`disabled` 同时把控件移出 Tab 顺序，额外防误触。

### 15.6 测试与验证

- `tests/route-editor-static.spec.cjs`：**30 → 42 项**（新增 12 项、改写 1 项星级用例）。
  - 新增切片 `addRouteBlock`（`// 添加徒步路线` → `// 添加一条徒步经历`）+ 新增 `buildAddAttraction()` 跑真实「添加路线」全流程。
  - 抽出共享 deps `routeCardDeps(listEl,meta)`（`buildRouteCard` 与 `buildAddAttraction` 共用）。
- 非浏览器全量回归：**197 通过 / 0 失败 / 3 跳过**（基线 185/0/3，新增 12 项）。
- `git diff --check` 无空白错误；内联 `<script>` 解析 #1–#4/#6/#7 通过（#5 是既有的 globe.gl `import()` 报错，`HEAD` 同样报错）。
- 作用域核查：169 行新 JS 全部落在同一个 `<script>` 块（7627-21130）；`setRouteCardEditMode` 定义于 15458、使用于 15479 / 15624 / 15760 → 同块 ✓。

*本节更新时间：2026-11-07*
