import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import {emptyState,baseRecord,taskSchema,startFocus,completeTask,openTask} from '../lib/focusbase/domain.ts';
const source=stripTypeScriptTypes(await readFile(new URL('../lib/focusbase/task-expiry.ts',import.meta.url),'utf8')).replace("'./domain'",JSON.stringify(new URL('../lib/focusbase/domain.ts',import.meta.url).href));
const {expireTasks,protectExpiredTasks,taskDayEnd}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const make=(s,date,extra={})=>{const t=taskSchema.parse({...baseRecord('Task'),date,...extra});s.tasks.push(t);return t};

test('tasks expire after their selected local day, not their creation date',()=>{
 const s=emptyState(),now=Date.parse('2026-09-19T12:00:00Z');
 const old=make(s,'2026-09-18'),today=make(s,'2026-09-19'),future=make(s,'2026-09-20'),undated=make(s,''),done=make(s,'2026-09-18',{status:'done'});
 assert.equal(expireTasks(s,now),true);assert.equal(old.status,'missed');assert.equal(openTask(old),false);
 for(const task of [today,future,undated])assert.equal(task.status,'inbox');assert.equal(done.status,'done');
 assert.equal(expireTasks(s,now),false);assert.equal(expireTasks(s,Date.parse('2026-09-19T19:00:00Z')),true);assert.equal(today.status,'missed');assert.equal(future.status,'inbox');
});
test('expired tasks are immutable, cannot repeat or complete, but can be trashed and restored',()=>{
 const s=emptyState(),t=make(s,'2026-09-18',{repeat:'daily'});expireTasks(s,Date.parse('2026-09-19T12:00:00Z'));const before=structuredClone([t]);
 assert.throws(()=>completeTask(s,t.id),/Срок/);assert.equal(s.tasks.length,1);
 assert.throws(()=>startFocus(s,t.id,'countdown',25,5),/Выберите/);
 for(const patch of [{title:'Changed'},{date:'2026-09-20'},{status:'todo'},{repeat:'none'}])assert.throws(()=>protectExpiredTasks(before,[{...t,...patch}]));
 assert.doesNotThrow(()=>protectExpiredTasks(before,[{...t,deletedAt:123}]));assert.doesNotThrow(()=>protectExpiredTasks(before,[{...t,deletedAt:null}]));
 assert.throws(()=>protectExpiredTasks(before,[]));
});
test('a timer crossing midnight is capped at the task deadline, including DST boundaries',()=>{
 const s=emptyState(),t=make(s,'2026-09-18');const end=taskDayEnd(t.date,s.settings.timezone);
 assert.equal(end,Date.parse('2026-09-18T19:00:00Z'));
 startFocus(s,t.id,'free',25,5,end-60000);expireTasks(s,end+3600000);
 assert.equal(s.active.runSince,null);assert.equal(s.active.phaseMs,60000);assert.equal(t.missedAt,end);
 assert.equal(taskDayEnd('2026-03-08','America/New_York'),Date.parse('2026-03-09T04:00:00Z'));
});
