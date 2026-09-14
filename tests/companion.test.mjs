import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import {emptyState,baseRecord,taskSchema,startFocus,pause,elapsed,finishFocus,backup,parseBackup} from '../lib/focusbase/domain.ts';

async function loadModule(name){
  const source=await readFile(new URL('../lib/focusbase/'+name+'.ts',import.meta.url),'utf8');
  const js=stripTypeScriptTypes(source).replace("'./domain'",JSON.stringify(new URL('../lib/focusbase/domain.ts',import.meta.url).href));
  return import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
}
const {nextPlan}=await loadModule('next-plan');
const {schoolResources,schoolTable,saveSchoolResource}=await loadModule('school');

test('next plan prioritizes due work, excludes active and closed tasks, and preserves future work',()=>{
  const s=emptyState();const add=(title,fields={})=>{const t=taskSchema.parse({...baseRecord(title),...fields});s.tasks.push(t);return t};
  const unscheduled=add('Inbox');const future=add('Future',{date:'2026-09-20'});s.settings.mainTaskId=future.id;
  const due=add('Deadline',{deadline:'2026-09-14'});const old=add('Overdue',{date:'2026-09-13'});
  const closed=add('Done',{date:'2026-09-12',status:'done'});add('Deleted',{date:'2026-09-12',deletedAt:1});add('Archived',{date:'2026-09-12',archived:true});add('Cancelled',{status:'cancelled'});
  assert.deepEqual(nextPlan(s,'2026-09-14').map(t=>t.id),[old.id,due.id,future.id,unscheduled.id]);
  s.settings.mainTaskId=due.id;assert.equal(nextPlan(s,'2026-09-14')[0].id,due.id);
  startFocus(s,due.id,'countdown',25,5,1000);assert.equal(nextPlan(s,'2026-09-14')[0].id,old.id);
  pause(s.active,61000);assert.equal(elapsed(s.active,121000),60000);
  finishFocus(s,{summary:'Done',result:'',nextStep:'',done:true},121000);
  assert.equal(s.sessions.length,1);assert.ok(!nextPlan(s,'2026-09-14').some(t=>[due.id,closed.id].includes(t.id)));
});

test('school resources save idempotently, recover archived links, and preserve existing notes',()=>{
  const s=emptyState();const item=schoolResources[0];const id=saveSchoolResource(s,item);
  s.resources[0].why='My personal note';s.resources[0].archived=true;
  assert.equal(saveSchoolResource(s,item,true),id);assert.equal(s.resources.length,1);
  assert.equal(s.resources[0].archived,false);assert.equal(s.resources[0].why,'My personal note');
  s.resources[0].deletedAt=1;assert.notEqual(saveSchoolResource(s,item),id);
});

test('curated table is fully editable and survives backup in both languages',()=>{
  for(const en of [false,true]){
    const s=emptyState();const table=schoolTable(en);s.tables.push(table);
    assert.equal(table.rows.length,schoolResources.length);assert.equal(table.columns[4].type,'Ссылка');assert.equal(table.columns[6].type,'Checkbox');
    for(const row of table.rows){assert.equal(Object.keys(row.cells).length,7);assert.ok(String(row.cells[table.columns[4].id]).startsWith('https://'));}
    table.rows[0].cells[table.columns[6].id]=true;table.rows[0].cells[table.columns[5].id]='My next step';
    assert.deepEqual(parseBackup(backup(s)),s);
    assert.notEqual(schoolTable(en).id,table.id);
  }
});
