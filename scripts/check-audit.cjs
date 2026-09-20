// Production-export regression checks in isolated Chromium profiles.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),Module=require('node:module');
const root=path.resolve(__dirname,'..'),out=path.join(root,'out'),results=path.join(root,'outputs','audit-ui');
fs.mkdirSync(results,{recursive:true});
app.commandLine.appendSwitch('force-device-scale-factor','1');
app.setPath('userData',path.join(app.getPath('temp'),'focusbase-audit-'+process.pid));
const mod=new Module(path.join(root,'lib/focusbase/domain.cjs'),module);mod.paths=Module._nodeModulePaths(root);mod.filename=path.join(root,'lib/focusbase/domain.cjs');
mod._compile(require('typescript').transpileModule(fs.readFileSync(path.join(root,'lib/focusbase/domain.ts'),'utf8'),{compilerOptions:{module:1,target:9}}).outputText,mod.filename);
const {emptyState,taskSchema,baseRecord,localDay,addDays,noteSchema,tableTemplate,resourceSchema,projectSchema}=mod.exports;
let server,win;const errors=[],report={viewports:[],checks:[]};
const timeout=setTimeout(()=>{console.error('Audit timed out');app.exit(1)},180000);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const js=code=>win.webContents.executeJavaScript(code);
async function wait(code){for(let i=0;i<100;i++){if(await js(code))return;await sleep(50)}throw Error('UI condition not met: '+code)}
const input=(selector,value)=>js(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('input',{bubbles:true}))})()`);
const clickText=(selector,text)=>js(`Array.from(document.querySelectorAll(${JSON.stringify(selector)})).find(el=>el.textContent.trim()===${JSON.stringify(text)}).click()`);
const read=()=>js(`new Promise((resolve,reject)=>{const r=indexedDB.open('focusbase',1);r.onsuccess=()=>{const db=r.result,q=db.transaction('workspace').objectStore('workspace').get('personal');q.onsuccess=()=>{db.close();resolve(q.result)};q.onerror=()=>reject(q.error)}})`);
const route=async hash=>{await js(`location.hash=${JSON.stringify(hash)}`);await sleep(220);await wait(`!!document.querySelector('main.page')`)};
app.whenReady().then(async()=>{
 server=http.createServer((req,res)=>{const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(out,'.'+(p==='/'?'/index.html':p));if(!file.startsWith(out+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return}res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res)});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 win=new BrowserWindow({show:false,width:1440,height:1000,webPreferences:{partition:'audit',sandbox:true,contextIsolation:true,backgroundThrottling:false,offscreen:true}});
 win.webContents.on('console-message',details=>{if(details.level==='error'&&!details.message.includes('favicon'))errors.push(details.message)});
 await win.loadURL(`http://127.0.0.1:${server.address().port}/`);await wait(`!!document.querySelector('[data-companion-toggle]')`);
 // Hiding/restoring from Today must work without visiting Settings and survive reload.
 await js(`document.querySelector('[data-companion-toggle]').click()`);await wait(`!document.querySelector('.companion-launcher')`);
 assert.equal((await read()).settings.companionVisible,false);win.reload();await wait(`document.querySelector('[data-companion-toggle]')?.getAttribute('aria-pressed')==='false'`);
 await js(`document.querySelector('[data-companion-toggle]').click()`);await wait(`!!document.querySelector('.companion-launcher')`);
 // Opening a browser context menu alone never hides the companion; explicit action does.
 await js(`document.querySelector('.companion-launcher').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,button:2,clientX:1300,clientY:850}))`);
 await wait(`!!document.querySelector('[role="menuitem"]')`);assert.equal((await read()).settings.companionVisible,true);
 await clickText('[role="menuitem"]','Убрать иконку');await wait(`!document.querySelector('.companion-launcher')`);
 await js(`document.querySelector('[data-companion-toggle]').click()`);await wait(`!!document.querySelector('.companion-launcher')`);report.checks.push('home toggle, persistence, explicit context-menu hide and recovery');
 const s=emptyState(),today=localDay(s.settings.timezone);s.revision=(await read()).revision+1;
 s.projects.push(projectSchema.parse(baseRecord('Проект с длинным названием '.repeat(10))));
 s.tasks.push(taskSchema.parse({...baseRecord('Сегодня'),date:today,status:'todo'}),taskSchema.parse({...baseRecord('ЗадачаБездлинныхПробелов'.repeat(16)),date:today,status:'todo'}));
 s.tasks.push(taskSchema.parse({...baseRecord('Истёкший срок'),date:addDays(today,-1),status:'todo',repeat:'daily'}));
 s.notes.push(noteSchema.parse({...baseRecord('Сегодня'),body:'<img src=x onerror=alert(1)>\n[javascript](javascript:alert(1))\n**Markdown**'}));
 s.resources.push(resourceSchema.parse({...baseRecord('Материал '.repeat(35)),url:'https://example.com/a',why:'Описание'.repeat(80)}));
 const table=tableTemplate('Большая таблица');table.rows=Array.from({length:121},(_,i)=>({id:crypto.randomUUID(),deletedAt:null,cells:{[table.columns[0].id]:'Строка '+String(i).padStart(3,'0')}}));s.tables.push(table);
 await js(`new Promise((resolve,reject)=>{const r=indexedDB.open('focusbase',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('workspace','readwrite');tx.objectStore('workspace').put(${JSON.stringify(s)},'personal');tx.oncomplete=()=>{db.close();resolve(true)};tx.onerror=()=>reject(tx.error)}})`);
 win.reload();await wait(`!!document.querySelector('.hero-task-title')`);
 await wait(`!!document.querySelector('.task-missed')`);assert.equal((await read()).tasks.find(t=>t.title==='Истёкший срок').status,'missed');
 await js(`document.querySelector('.task-missed .task-open').click()`);await wait(`!!document.querySelector('[role="dialog"] .task-missed')`);
 assert.equal(await js(`document.querySelectorAll('[role="dialog"] input,[role="dialog"] select').length`),0);
 await js(`document.querySelector('[role="dialog"] [data-slot="dialog-close"]').click()`);await wait(`!document.querySelector('[role="dialog"]')`);
 report.checks.push('expired task turns red, has a read-only form and cannot repeat');
 const slugs=['today','tasks','projects','focus','library','notes','tables','calendar','week','review','ielts','sat','unt','settings','archive','trash'];
 for(const width of (process.env.AUDIT_WIDTHS?process.env.AUDIT_WIDTHS.split(',').map(Number):[320,375,390,430,768,1024,1280,1440])){
   win.setContentSize(width,1000);await sleep(100);
   for(const slug of slugs){await route(slug);const bounds=await js(`({width:innerWidth,scroll:document.documentElement.scrollWidth,blank:!document.querySelector('main.page')?.textContent.trim()})`);if(bounds.scroll>bounds.width+1)bounds.overflowElements=await js(`Array.from(document.querySelectorAll('main.page *')).filter(el=>el.getBoundingClientRect().right>innerWidth+1).slice(0,12).map(el=>({tag:el.tagName,class:el.className,right:el.getBoundingClientRect().right,text:el.textContent.slice(0,80)}))`);report.viewports.push({width,slug,...bounds});assert.equal(await js(`document.body.innerText.includes('FocusBase')`),false);if((width===320||width===390||width===1440)&&['today','focus','calendar','library'].includes(slug))fs.writeFileSync(path.join(results,slug+'-'+width+'.png'),(await win.webContents.capturePage()).toPNG())}
 }
 win.setContentSize(1280,1000);await route('today');
 await clickText('.language-toggle button','EN');await wait(`document.documentElement.lang==='en'`);assert.equal(await js(`document.querySelector('.hero-task-title').textContent`),'Сегодня');
 await clickText('.language-toggle button','RU');await wait(`document.documentElement.lang==='ru'`);assert.equal(await js(`document.querySelector('.exam-top-nav').textContent.includes('SAT')`),true);report.checks.push('RU/EN round trip preserves user titles and SAT');
 await route('tables');await clickText('.table-card','▤Большая таблица121 строк · 1 столбцов');
 await wait(`document.querySelectorAll('.table-surface tbody tr').length===50`);
 await js(`document.querySelector('.table-pagination button:last-child').click()`);await wait(`document.querySelector('.table-surface tbody input')?.value==='Строка 050'`);
 await input('[aria-label="Поиск в таблице"]','120');await wait(`document.querySelectorAll('.table-surface tbody tr').length===1`);report.checks.push('table pagination and searching across all rows');
 await route('notes');await js(`document.querySelector('.note-card').click()`);await wait(`!!document.querySelector('.note-editor')`);
 await clickText('[role="dialog"] button','Предпросмотр');assert.equal(await js(`document.querySelector('.markdown img')!==null`),false);assert.equal(await js(`document.querySelector('.markdown a[href^="javascript:"]')!==null`),false);
 await clickText('[role="dialog"] button','Редактировать');await input('.note-editor','Текст сохраняется после перезагрузки 🗻');await sleep(650);await wait(`document.querySelector('[role="dialog"] [role="status"]')?.textContent==='Сохранено'`);assert.equal((await read()).notes[0].body,'Текст сохраняется после перезагрузки 🗻');await clickText('[role="dialog"] button','Сохранить и закрыть');await wait(`!document.querySelector('[role="dialog"]')`);report.checks.push('Markdown escapes HTML and script URLs; note autosave commits');
 // Offline mutations still work in the already loaded local-first app.
 win.webContents.session.enableNetworkEmulation({offline:true});await route('today');await js(`window.dispatchEvent(new Event('offline'))`);await input('[aria-label="Название быстрой задачи"]','Офлайн задача');await js(`document.querySelector('.quick-capture form').requestSubmit()`);await sleep(250);assert.ok((await read()).tasks.some(t=>t.title==='Офлайн задача'));win.webContents.session.disableNetworkEmulation();report.checks.push('offline local mutation');
 report.consoleErrors=errors;report.overflows=report.viewports.filter(v=>v.scroll>v.width+1||v.blank);fs.writeFileSync(path.join(results,'report.json'),JSON.stringify(report,null,2));
 assert.deepEqual(report.overflows,[],'Unexpected horizontal page overflow');assert.deepEqual(errors,[],'Browser console errors');
 console.log('AUDIT_UI_PASS '+JSON.stringify({views:report.viewports.length,checks:report.checks,results}));clearTimeout(timeout);win.destroy();server.close();app.quit();
}).catch(async error=>{console.error(error);report.consoleErrors=errors;report.failure=String(error);fs.writeFileSync(path.join(results,'report.json'),JSON.stringify(report,null,2));if(win&&!win.isDestroyed()){fs.writeFileSync(path.join(results,'failure.png'),(await win.webContents.capturePage()).toPNG());console.error(await js(`document.body.innerText.slice(-2500)`).catch(()=>''))}clearTimeout(timeout);server?.close();app.exit(1)});
