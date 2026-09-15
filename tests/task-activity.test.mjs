import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import {emptyState,baseRecord,taskSchema,completeTask,setTaskStatus,stateSchema,backup,parseBackup,startFocus,finishFocus} from '../lib/focusbase/domain.ts';
const source=await readFile(new URL('../lib/focusbase/task-activity.ts',import.meta.url),'utf8');
const js=stripTypeScriptTypes(source).replace("'./domain'",JSON.stringify(new URL('../lib/focusbase/domain.ts',import.meta.url).href));
const {taskActivity}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const at=date=>Date.parse(date);
const task=(date,fields={})=>taskSchema.parse({...baseRecord('Test'),createdAt:at(date),...fields});

test('creation and completion use separate dates and the workspace time zone',()=>{
  const s=emptyState();const t=task('2026-09-13T20:00:00Z');s.tasks.push(t); // Monday in Qyzylorda.
  completeTask(s,t.id,at('2026-09-15T20:00:00Z')); // Wednesday.
  const monday=taskActivity(s,'2026-09-14').rows[0];assert.equal(monday.created,1);assert.equal(monday.completed,0);
  const wednesday=taskActivity(s,'2026-09-16').rows[0];assert.equal(wednesday.created,0);assert.equal(wednesday.completed,1);assert.equal(wednesday.percent,null);
  const week=taskActivity(s,'2026-09-16').rows[1];assert.equal(week.created,1);assert.equal(week.completed,1);assert.equal(week.percent,100);
});
test('Monday weeks, year boundaries, and leap months are calendar periods',()=>{
  const s=emptyState();const rows=taskActivity(s,'2024-02-29').rows;
  assert.equal(rows[2].from,'2024-02-01');assert.equal(rows[2].to,'2024-02-29');
  const jan=taskActivity(s,'2027-01-01').rows[1];assert.equal(jan.from,'2026-12-28');assert.equal(jan.to,'2027-01-03');
});
test('completion is idempotent, reopening resets it, and repeat copies are not completed',()=>{
  const s=emptyState();const t=task('2026-09-14T10:00:00Z',{repeat:'daily',date:'2026-09-14'});s.tasks.push(t);
  completeTask(s,t.id,100);completeTask(s,t.id,200);assert.equal(t.completedAt,100);assert.equal(s.tasks.length,2);assert.equal(s.tasks[1].completedAt,null);
  setTaskStatus(s,t.id,'todo',250);assert.equal(t.completedAt,null);
  setTaskStatus(s,t.id,'done',300);assert.equal(t.completedAt,300);assert.equal(s.tasks.length,2);
  setTaskStatus(s,t.id,'archive',400);assert.equal(t.completedAt,300);
});
test('archives count, trash and demo do not, old completed tasks have no invented date',()=>{
  const s=emptyState();const date='2026-09-14T10:00:00Z';
  s.tasks.push(task(date,{status:'done',completedAt:at(date),archived:true}),task(date,{status:'done',completedAt:at(date),deletedAt:1}),task(date,{demo:true}),task(date,{status:'done'}),task(date,{status:'todo'}),task(date,{status:'cancelled'}));
  const result=taskActivity(s,'2026-09-14');assert.equal(result.rows[0].created,4);assert.equal(result.rows[0].completed,1);assert.equal(result.rows[0].open,1);assert.equal(result.rows[0].percent,50);assert.equal(result.rows[3].completed,2);assert.equal(result.undatedCompletions,1);
  delete s.tasks[3].completedAt;const migrated=stateSchema.parse(s);assert.equal(migrated.tasks[3].completedAt,null);assert.deepEqual(parseBackup(backup(migrated)),migrated);
});
test('finishing focus records its supplied completion time',()=>{
  const s=emptyState();const t=task('2026-09-14T10:00:00Z');s.tasks.push(t);startFocus(s,t.id,'free',25,5,1000);finishFocus(s,{summary:'',result:'',nextStep:'',done:true},61000);assert.equal(t.completedAt,61000);
});
