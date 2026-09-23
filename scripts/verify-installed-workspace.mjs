// CDP is enabled only on a disposable CI runner, never in normal application launches.
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
if(process.env.GITHUB_ACTIONS!=='true'||process.env.RUNNER_ENVIRONMENT!=='github-hosted')throw Error('Disposable CI runner required');
const mode=process.argv[2];
assert.ok(['seed','verify'].includes(mode));
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let target;
for(let n=0;n<120;n++){
  try{target=(await (await fetch('http://127.0.0.1:9229/json')).json()).find(t=>t.type==='page'&&t.url==='focusbase://app/');if(target)break}catch{}
  await sleep(250);
}
assert.ok(target,'Installed application did not expose its main page');
const ws=new WebSocket(target.webSocketDebuggerUrl),pending=new Map();let nextId=0;
await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject});
ws.onmessage=event=>{const m=JSON.parse(event.data),p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result)}};
const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++nextId;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));setTimeout(()=>{if(pending.delete(id))reject(Error(`CDP timed out: ${method}`))},15000).unref()});
const evaluate=async expression=>{const result=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails));return result.result.value};
try{
  let ready=false;
  for(let n=0;n<120;n++){if(await evaluate(`!!document.querySelector('main.page')`)){ready=true;break}await sleep(250)}
  assert.ok(ready,'Installed application did not render');
  const read=`new Promise((resolve,reject)=>{const r=indexedDB.open('focusbase',1);r.onsuccess=()=>{const db=r.result,q=db.transaction('workspace').objectStore('workspace').get('personal');q.onsuccess=()=>{db.close();resolve(q.result)};q.onerror=()=>reject(q.error)}})`;
  if(mode==='seed'){
    // A normal old-version UI action creates the workspace using its own schema.
    await evaluate(`document.querySelector('.top-actions .primary').click()`);
    // Seed a complete old-version state from its domain module; no new-schema defaults.
    const {createRequire}=await import('node:module');
    const require=createRequire(import.meta.url),ts=require('typescript'),Module=require('node:module'),path=require('node:path');
    const filename=path.resolve('previous/lib/focusbase/domain.cjs'),mod=new Module(filename);mod.filename=filename;mod.paths=Module._nodeModulePaths(path.dirname(filename));
    mod._compile(ts.transpileModule(await readFile('previous/lib/focusbase/domain.ts','utf8'),{compilerOptions:{module:1,target:9}}).outputText,filename);
    const {emptyState,baseRecord,taskSchema,noteSchema,projectSchema,resourceSchema,tableTemplate}=mod.exports;
    const state=emptyState();state.revision=42;
    const task=taskSchema.parse({...baseRecord('IELTS — keep this task'),minutes:37,status:'todo',date:''});
    state.tasks.push(task);state.notes.push(noteSchema.parse({...baseRecord('Keep this note'),body:'Сохранённый текст / preserved text'}));
    state.projects.push(projectSchema.parse(baseRecord('Study project')));
    state.resources.push(resourceSchema.parse({...baseRecord('Study resource'),url:'https://ielts.org'}));
    state.tables.push(tableTemplate('Keep this table'));
    state.settings.companionQueue=[task.id];state.settings.mainTaskId=task.id;state.settings.customQuote='Persistent quote';
    await evaluate(`new Promise((resolve,reject)=>{const r=indexedDB.open('focusbase',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('workspace','readwrite');tx.objectStore('workspace').put(${JSON.stringify(state)},'personal');tx.oncomplete=()=>{db.close();resolve(true)};tx.onerror=()=>reject(tx.error)}})`);
    await evaluate(`localStorage.setItem('focusbase-language','en')`);
    await writeFile('outputs/update-before.json',JSON.stringify(await evaluate(read),null,2));
  }else{
    const before=JSON.parse(await readFile('outputs/update-before.json','utf8')),after=await evaluate(read);
    // Additive schema defaults are allowed, but every existing value must survive.
    const contains=(actual,expected,location='state')=>{
      if(Array.isArray(expected)){assert.equal(actual.length,expected.length,location);expected.forEach((v,i)=>contains(actual[i],v,`${location}[${i}]`))}
      else if(expected&&typeof expected==='object'){for(const key of Object.keys(expected))contains(actual[key],expected[key],`${location}.${key}`)}
      else assert.equal(actual,expected,location);
    };
    contains(after,before);
    assert.equal(await evaluate(`localStorage.getItem('focusbase-language')`),'en');
    await evaluate(`location.hash='#tasks'`);
    let taskVisible=false;
    for(let n=0;n<80;n++){if(await evaluate(`document.querySelector('main.page')?.innerText.includes('IELTS — keep this task')`)){taskVisible=true;break}await sleep(100)}
    assert.ok(taskVisible,'Preserved task is not visible in the task list');
  }
  console.log(`INSTALLED_WORKSPACE_${mode.toUpperCase()}_PASS`);
  await call('Page.close');
}finally{ws.close()}
