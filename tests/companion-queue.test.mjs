import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import {emptyState,baseRecord,taskSchema,stateSchema,startFocus,nextPhase,pause,backup,parseBackup} from '../lib/focusbase/domain.ts';
const domainUrl=new URL('../lib/focusbase/domain.ts',import.meta.url).href;
const source=async file=>stripTypeScriptTypes(await readFile(new URL('../lib/focusbase/'+file,import.meta.url),'utf8')).replaceAll("'./domain'",JSON.stringify(domainUrl));
const dataUrl=js=>'data:text/javascript;base64,'+Buffer.from(js).toString('base64');
const nextUrl=dataUrl(await source('next-plan.ts'));
const {companionQueue,selectCompanionTask,moveCompanionTask,playCompanionTask,skipCompanionTask}=await import(dataUrl((await source('companion-queue.ts')).replace("'./next-plan'",JSON.stringify(nextUrl))));
function fixture(){const s=emptyState();s.tasks=['Reading','Listening','Writing'].map((title,i)=>taskSchema.parse({...baseRecord(title),id:title,createdAt:i,minutes:20+i*10}));return s}
const order=s=>companionQueue(s).map(t=>t.id);
test('choose, reorder and skip persist without changing dates or completing tasks',()=>{
  const s=fixture();selectCompanionTask(s,'Writing');assert.deepEqual(order(s),['Writing','Reading','Listening']);
  moveCompanionTask(s,'Listening',-1);assert.deepEqual(order(s),['Writing','Listening','Reading']);
  skipCompanionTask(s,'Writing',null,false);assert.deepEqual(order(s),['Listening','Reading','Writing']);
  assert.ok(s.tasks.every(t=>t.status==='inbox'&&t.completedAt===null&&t.date===''));assert.equal(s.active,null);
  assert.deepEqual(order(parseBackup(backup(s))),order(s));
});
test('switch saves exact worked time and thoughts but never completes a recurring task',()=>{
  const s=fixture();s.tasks[0].repeat='daily';playCompanionTask(s,'Reading',null,1000);s.active.thoughts.push('Remember this');
  skipCompanionTask(s,'Reading',s.active.id,true,61000);
  assert.equal(s.active.taskId,'Listening');assert.equal(s.active.workMinutes,30);
  assert.equal(s.sessions.length,1);assert.equal(s.sessions[0].workMs,60000);assert.deepEqual(s.sessions[0].thoughts,['Remember this']);
  assert.equal(s.tasks[0].status,'progress');assert.equal(s.tasks[0].completedAt,null);assert.equal(s.tasks.length,3);
  assert.deepEqual(order(s),['Listening','Writing','Reading']);
});
test('paused and break sessions preserve only actual work when switching',()=>{
  const s=fixture();startFocus(s,'Reading','pomodoro',1,5,1000);nextPhase(s,61000);
  playCompanionTask(s,'Writing',s.active.id,121000);assert.equal(s.sessions[0].workMs,60000);
  pause(s.active,151000);skipCompanionTask(s,'Writing',s.active.id,false,211000);
  assert.equal(s.active,null);assert.equal(s.sessions[1].workMs,30000);assert.equal(s.tasks[2].completedAt,null);
});
test('invalid and stale switches do not stop or duplicate the current session',()=>{
  const s=fixture();playCompanionTask(s,'Reading',null,1000);const old=s.active.id;
  assert.throws(()=>playCompanionTask(s,'missing',old,3000));assert.equal(s.active.id,old);assert.equal(s.sessions.length,0);
  playCompanionTask(s,'Writing',old,4000);const current=s.active.id;
  assert.throws(()=>skipCompanionTask(s,'Reading',old,true,5000));assert.equal(s.active.id,current);assert.equal(s.sessions.length,1);
  playCompanionTask(s,'Writing',current,6000);assert.equal(s.active.id,current);assert.equal(s.sessions.length,1);
});
test('old data migrates; removed and completed tasks vanish; new tasks join the queue',()=>{
  const s=fixture();delete s.settings.companionQueue;const migrated=stateSchema.parse(s);assert.deepEqual(migrated.settings.companionQueue,[]);
  migrated.settings.companionQueue=['Writing','Writing','missing','Reading'];migrated.tasks[0].deletedAt=1;migrated.tasks[2].status='done';
  assert.deepEqual(order(migrated),['Listening']);migrated.tasks.push(taskSchema.parse({...baseRecord('New'),id:'New'}));assert.deepEqual(order(migrated),['Listening','New']);
});
test('a sole task can be put aside without completing it; next does not restart it',()=>{
  const s=fixture();s.tasks=s.tasks.slice(0,1);playCompanionTask(s,'Reading',null,1000);const id=s.active.id;
  skipCompanionTask(s,'Reading',id,true,2000);assert.equal(s.active.id,id);
  skipCompanionTask(s,'Reading',id,false,31000);assert.equal(s.active,null);assert.equal(s.sessions[0].workMs,30000);assert.equal(s.tasks[0].completedAt,null);
});
