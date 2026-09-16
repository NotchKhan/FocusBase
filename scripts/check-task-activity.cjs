// Runs the exported app in isolated Chromium storage partitions; no personal data is used.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs');const path=require('node:path');const http=require('node:http');const assert=require('node:assert/strict');const Module=require('node:module');
const root=path.resolve(__dirname,'..');const out=path.join(root,'out');
app.setPath('userData',path.join(app.getPath('temp'),'focusbase-activity-check-'+process.pid));
const domain=new Module(path.join(root,'lib/focusbase/domain.cjs'),module);domain.paths=Module._nodeModulePaths(root);
domain.filename=path.join(root,'lib/focusbase/domain.cjs');
domain._compile(require('typescript').transpileModule(fs.readFileSync(path.join(root,'lib/focusbase/domain.ts'),'utf8'),{compilerOptions:{module:1,target:9}}).outputText,domain.filename);
const {emptyState,taskSchema,baseRecord,localDay,addDays}=domain.exports;
let server;const windows=[];
const timeout=setTimeout(()=>{console.error('Activity check timed out');app.exit(1)},60000);
const wait=async(win,expression)=>{
  for(let attempt=0;attempt<100;attempt++){if(await win.webContents.executeJavaScript(expression))return;await new Promise(r=>setTimeout(r,50))}
  throw Error('UI condition not met: '+expression);
};
const read=win=>win.webContents.executeJavaScript(`new Promise((resolve,reject)=>{const r=indexedDB.open('focusbase',1);r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result;const q=db.transaction('workspace').objectStore('workspace').get('personal');q.onsuccess=()=>{db.close();resolve(q.result||null)};q.onerror=()=>reject(q.error)}})`);
const write=(win,s)=>win.webContents.executeJavaScript(`new Promise((resolve,reject)=>{const r=indexedDB.open('focusbase',1);r.onsuccess=()=>{const db=r.result;const tx=db.transaction('workspace','readwrite');tx.objectStore('workspace').put(${JSON.stringify(s)},'personal');tx.oncomplete=()=>{db.close();resolve(true)};tx.onerror=()=>reject(tx.error)}})`);
app.whenReady().then(async()=>{
  server=http.createServer((req,res)=>{
    const relative=new URL(req.url,'http://localhost').pathname;const file=path.resolve(out,'.'+(relative==='/'?'/index.html':decodeURIComponent(relative)));
    if(!file.startsWith(out+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return}
    const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
    res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
  });await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}/#tasks`;
  const make=async partition=>{const win=new BrowserWindow({show:false,width:1360,height:960,webPreferences:{partition,sandbox:true,contextIsolation:true,backgroundThrottling:false}});windows.push(win);await win.loadURL(url);await wait(win,`!!document.querySelector('[data-period="all"]')`);return win};
  const a=await make('visitor-a'),b=await make('visitor-b');assert.equal(await read(a),null);assert.equal(await read(b),null);
  const now=Date.now();const s=emptyState();const today=localDay(s.settings.timezone,now);const yesterday=Date.parse(addDays(today,-1)+'T10:00:00Z');
  const prior=taskSchema.parse({...baseRecord('Visitor A private task'),createdAt:yesterday,status:'todo'});
  s.tasks.push(prior,taskSchema.parse({...baseRecord('Finished today'),createdAt:now,completedAt:now,status:'done'}));await write(a,s);a.reload();await wait(a,`document.querySelector('[data-period="all"] [data-metric="created"]')?.textContent==='2'`);
  assert.equal(await b.webContents.executeJavaScript(`document.querySelector('[data-period="all"] [data-metric="created"]').textContent`),'0');
  assert.equal(await b.webContents.executeJavaScript(`document.body.innerText.includes('Visitor A private task')`),false);
  await a.webContents.executeJavaScript(`Array.from(document.querySelectorAll('.task-row')).find(row=>row.textContent.includes('Visitor A private task')).querySelector('[role="checkbox"]').click()`);
  await wait(a,`document.querySelector('[data-period="day"] [data-metric="completed"]')?.textContent==='2'`);
  const saved=await read(a);assert.equal(typeof saved.tasks.find(t=>t.id===prior.id).completedAt,'number');
  a.reload();await wait(a,`document.querySelector('[data-period="day"] [data-metric="completed"]')?.textContent==='2'`);
  // Creating a task via the real form in visitor B does not alter A.
  await b.webContents.executeJavaScript(`const input=document.querySelector('[aria-label="Название быстрой задачи"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Visitor B only');input.dispatchEvent(new Event('input',{bubbles:true}));`);
  await wait(b,`!document.querySelector('.quick-capture button[type="submit"]')?.disabled&&!!Array.from(document.querySelectorAll('input')).find(i=>i.value==='Visitor B only')`);
  await b.webContents.executeJavaScript(`document.querySelector('[aria-label="Название быстрой задачи"]').form.requestSubmit()`);
  await wait(b,`document.querySelector('[data-period="all"] [data-metric="created"]')?.textContent==='1'`);
  assert.equal((await read(b)).tasks[0].title,'Visitor B only');assert.equal((await read(a)).tasks.length,2);
  // A second tab in the same profile sees A's data, while a separate profile stays independent.
  const a2=await make('visitor-a');assert.equal((await read(a2)).tasks.length,2);assert.equal((await read(b)).tasks.length,1);
  await a.webContents.executeJavaScript(`const input=document.querySelector('#activity-date');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(addDays(today,-1))});input.dispatchEvent(new Event('input',{bubbles:true}));`);
  await wait(a,`document.querySelector('[data-period="day"] [data-metric="completed"]')?.textContent==='0'`);
  await a.webContents.executeJavaScript(`document.querySelector('.task-activity-date button').click()`);
  await wait(a,`document.querySelector('[data-period="day"] [data-metric="completed"]')?.textContent==='2'`);
  await a.webContents.executeJavaScript(`Array.from(document.querySelectorAll('button')).find(x=>x.textContent==='EN').click()`);
  await wait(a,`document.querySelector('#task-activity-title')?.textContent.includes('Your activity')`);
  await new Promise(r=>setTimeout(r,200));
  const shotDir=path.join(root,'outputs','ui-check-'+process.pid);await fs.promises.mkdir(shotDir,{recursive:true});fs.writeFileSync(path.join(shotDir,'desktop.png'),(await a.webContents.capturePage()).toPNG());
  a.setSize(390,844);await new Promise(r=>setTimeout(r,150));assert.equal(await a.webContents.executeJavaScript(`document.documentElement.scrollWidth<=innerWidth`),true);fs.writeFileSync(path.join(shotDir,'mobile.png'),(await a.webContents.capturePage()).toPNG());
  await a.webContents.executeJavaScript(`const icon=document.querySelector('.companion-launcher');const rect=icon.getBoundingClientRect();icon.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,button:2,clientX:rect.x+10,clientY:rect.y+10}));`);
  await wait(a,`!!Array.from(document.querySelectorAll('[role="menuitem"]')).find(el=>el.textContent.includes('Hide icon'))`);
  await a.webContents.executeJavaScript(`Array.from(document.querySelectorAll('[role="menuitem"]')).find(el=>el.textContent.includes('Hide icon')).click()`);
  await wait(a,`!document.querySelector('.companion-launcher')`);
  assert.equal((await read(a)).settings.companionVisible,false);assert.equal((await read(a)).tasks.length,2);
  a.reload();await wait(a,`!!document.querySelector('[data-period="all"]')`);assert.equal(await a.webContents.executeJavaScript(`!!document.querySelector('.companion-launcher')`),false);
  await a.webContents.executeJavaScript(`location.hash='settings'`);
  await wait(a,`!!Array.from(document.querySelectorAll('label')).find(el=>el.textContent==='Show quick access icon')`);
  await a.webContents.executeJavaScript(`Array.from(document.querySelectorAll('label')).find(el=>el.textContent==='Show quick access icon').querySelector('[role="checkbox"]').click()`);
  await wait(a,`!!document.querySelector('.companion-launcher')`);assert.equal((await read(a)).settings.companionVisible,true);
  console.log('ACTIVITY_CHECK_PASS: isolated storage, task activity, right-click hide, persistence and restore from settings.');
  clearTimeout(timeout);for(const win of windows)win.destroy();server.close();app.quit();
}).catch(error=>{console.error(error);clearTimeout(timeout);server?.close();app.exit(1)});
