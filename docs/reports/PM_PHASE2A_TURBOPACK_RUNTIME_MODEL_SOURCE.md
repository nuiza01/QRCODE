# PM — แหล่งหลักฐานสำหรับ Turbopack runtime model (ไม่ต้อง build)

วันที่ 2026-09-18 (Asia/Bangkok) | Claude (PM) | อ่านไฟล์อย่างเดียว ไม่ได้ build ไม่ได้รันเบราว์เซอร์ ไม่ได้แก้โค้ด gate

## 1. ทำไมเรื่องนี้เคยติด

Stage A adapter จัด chunk `static/chunks/turbopack-*.js` เป็น `UNSUPPORTED_RUNTIME_BACKEND_SEMANTICS` เพราะยังไม่มี model ที่ผ่าน review ว่า runtime ของ Turbopack โหลด chunk อะไรตอน startup แผนเดิม (NQR129 §5) บอกว่าต้องได้ artifact จริงก่อน ซึ่งต้องขอสิทธิ์ build

## 2. สิ่งที่พบ: มี artifact จริงอยู่ในเครื่องแล้ว

แพ็กเกจ next ที่ติดตั้งไว้ (เวอร์ชัน 16.3.1 ตรงกับที่แอปใช้) แถม build ของ bundle-analyzer มาด้วย และ build นั้นถูก emit โดย Turbopack จริง

- ไฟล์: `node_modules/next/dist/bundle-analyzer/_next/static/chunks/turbopack-0_jd6_0ca14du.js`
- SHA-256: `3cc412f5084504791c03ba3b114dc8bf45383ab3bb984bf03c75e0267b401bb0`
- ขนาด: 19915 ไบต์ (minified บรรทัดเดียว)
- ข้างในโฟลเดอร์เดียวกันมี chunk อื่นอีก 7 ไฟล์ (js/css) จึงใช้เป็น fixture ครบชุดได้

ข้อจำกัดที่ต้องบันทึก: นี่คือ build ของแอป bundle-analyzer ไม่ใช่ของ NQR และอาจไม่ครอบคลุมเส้นทาง React Flight ของ app router จึงใช้เป็น **แหล่ง model ของ runtime semantics** และ fixture ของ adapter ได้ แต่ยังไม่ใช่หลักฐานยอมรับ (acceptance evidence) ของแอปเรา

## 3. Runtime model ที่อ่านได้จาก bytes จริง

### 3.1 โครงลงทะเบียน chunk

```js
(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push([
  "object"==typeof document?document.currentScript:void 0,
  {otherChunks:["static/chunks/0.8z-24o~zj6q.js","static/chunks/0qgq.-.c2spwh.js","static/chunks/0u_y6vsc_oa5w.js"],runtimeModuleIds:[7539]}
]),(()=>{ /* runtime */ })();
```

ท้ายไฟล์:

```js
let chunksToRegister=globalThis.TURBOPACK;
globalThis.TURBOPACK={push:registerChunk};
chunksToRegister.forEach(registerChunk);
```

แปลว่า chunk ทุกตัวก่อนหน้า runtime จะกองอยู่ใน array แล้วถูก register ย้อนหลัง ส่วน chunk ที่มาทีหลัง push เข้า `registerChunk` ตรง ๆ

### 3.2 พฤติกรรมตอน startup (จุดสำคัญของ gate)

```js
BACKEND={async registerChunk(chunk,params){
  let chunkPath=getPathFromScript(chunk);
  getOrCreateResolver(getUrlFromScript(chunk)).resolve();
  if(null!=params){
    for(let otherChunkData of params.otherChunks) getOrCreateResolver(getChunkRelativeUrl(getChunkPath(otherChunkData)));
    await Promise.all(params.otherChunks.map(otherChunkData=>loadInitialChunk(chunkPath,otherChunkData)));
    if(params.runtimeModuleIds.length>0) for(let moduleId of params.runtimeModuleIds) getOrInstantiateRuntimeModule(chunkPath,moduleId);
  }
}, loadChunkCached:(sourceType,chunkUrl)=>doLoadChunk(sourceType,chunkUrl), ...}
```

และใน `doLoadChunk`:

```js
if(sourceType===SourceType.Runtime) return resolver.loadingStarted=!0, isCss(chunkUrl)&&resolver.resolve(), resolver.promise;
```

สรุปกฎที่ใช้ตัดสินได้จริง

1. `otherChunks` ของ runtime chunk = รายการ chunk เริ่มต้น ซึ่ง runtime **ไม่ยิงโหลดเอง** (source type Runtime ไม่ inject script/link) แต่ถือว่า HTML ฝั่งเซิร์ฟเวอร์ใส่ `<script>`/`<link>` ให้แล้ว ดังนั้น **startup-reachable = ชุด script/link ใน HTML ∪ otherChunks ของ runtime chunk**
2. `runtimeModuleIds` = โมดูลที่ถูก instantiate ทันทีตอน startup (entry) การมี id อยู่ในรายการนี้แปลว่ารันแน่นอน ไม่ใช่โหลดเฉย ๆ
3. การโหลดที่เกิดจากโมดูล (`context.l` / `context.L`) ใช้ source type Parent ซึ่งจะ `document.createElement("script")` หรือ `link[rel=stylesheet]` เพิ่ม → นี่คือ dynamic ไม่ใช่ startup
4. รูป URL: `CHUNK_BASE_PATH="/_next/"` + path ที่ encodeURIComponent ทีละ segment + `ASSET_SUFFIX` (มาจาก `self.TURBOPACK_ASSET_SUFFIX` หรือ query string ของ `document.currentScript.src`) การเทียบ chunk path กับ URL จึงต้อง decode และตัด query/hash
5. ชนิด chunk ตัดสินด้วย `/\.js(?:\?[^#]*)?(?:#.*)?$/` และ `/\.css.../` เท่านั้น CSS ผ่าน `<link rel=stylesheet>` และถือว่า resolve ทันทีเมื่อเป็น Runtime source
6. chunkData เป็น string หรือ object `{path, included, moduleChunks}` ถ้าโมดูลที่ `included` มีครบใน `moduleFactories`/`availableModules` แล้ว จะไม่โหลดซ้ำ
7. registration ที่ยาวเกินสองช่องคือรูป compressed (`installCompressedModuleFactories`) คือรายการ id ต่อด้วย factory function ตัวเดียว
8. `getChunkFromRegistration` รองรับ worker ผ่าน `TURBOPACK_NEXT_CHUNK_URLS.pop()` และ `importScripts` การโหลดใน worker จึงเป็นอีกช่องทางที่ต้องนับแยก

## 4. ผลต่อแผนงาน

- ข้อ 2 ของ [แผน gate ที่เหลือ](PM_PHASE2A_NEXT_GATES_PLAN.md) เดินได้บางส่วน**โดยไม่ต้องขอสิทธิ์ build**: เขียน runtime model + fixture จาก bytes ชุดนี้ แล้วให้ adapter เลิกตอบ UNKNOWN เฉพาะกับ runtime chunk ที่ลายนิ้วมือตรงกับ model ที่ผ่าน review ส่วนที่ไม่ตรงยังต้อง UNKNOWN ตามเดิม (fail-closed)
- สิ่งที่ยัง**ต้อง**ใช้ build จริง: artifact ของ NQR เองสำหรับ QA และการ admit หลักฐาน เพราะ fixture นี้เป็นของแอปอื่น
- งานนี้จะเป็น Stage A iteration ใหม่ในพื้นที่แยก แตะเฉพาะ `scripts/inspect-turbopack-emission.mjs` กับไฟล์เทสต์ แล้วผ่าน review อิสระก่อน integrate ตามลำดับเดิม ยังไม่เริ่มจนกว่าผู้ใช้จะสั่ง เพราะไฟล์อยู่ใน SOURCE แล้ว
