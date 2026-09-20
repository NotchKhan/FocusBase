import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import {emptyState,taskSchema,baseRecord,startFocus,finishFocus,requireActive,pause,eventSchema,parseBackup,backup,noteSchema} from '../lib/focusbase/domain.ts';
async function sourceModule(path){const source=stripTypeScriptTypes(await readFile(new URL(path,import.meta.url),'utf8'));return import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))}
const {assertUnchanged}=await sourceModule('../lib/focusbase/edit-conflict.ts');
const {translateText}=await sourceModule('../components/focusbase/i18n.ts');

test('a stale finish dialog cannot finish, pause or complete the next task',()=>{
  const s=emptyState();s.tasks.push(taskSchema.parse(baseRecord('First')),taskSchema.parse(baseRecord('Second')));
  startFocus(s,s.tasks[0].id,'countdown',25,5,1000);const id=s.active.id;
  pause(requireActive(s,id),61000);
  finishFocus(s,{summary:'',result:'',nextStep:'',done:false},61000);
  startFocus(s,s.tasks[1].id,'countdown',25,5,62000);
  const before=structuredClone(s);
  assert.throws(()=>{requireActive(s,id);finishFocus(s,{summary:'Wrong task',result:'',nextStep:'',done:true},63000)},/Сессия изменилась/);
  assert.throws(()=>pause(requireActive(s,id),63000),/Сессия изменилась/);
  assert.deepEqual(s,before);
});

test('stale forms reject changed and deleted records without losing the newer version',()=>{
  const s=emptyState();const note=noteSchema.parse(baseRecord('Note'));s.notes.push(note);const snapshot=structuredClone(note);
  assert.doesNotThrow(()=>assertUnchanged(s,'notes',note.id,snapshot));
  note.body='Saved in another tab';assert.throws(()=>assertUnchanged(s,'notes',note.id,snapshot));
  const updated=structuredClone(note);note.deletedAt=Date.now();assert.throws(()=>assertUnchanged(s,'notes',note.id,updated));
  assert.equal(note.body,'Saved in another tab');
});

test('invalid calendar dates, times and timestamps cannot enter through a backup',()=>{
  for(const date of ['2026-02-30','2026-99-01','2026-00-01'])assert.equal(taskSchema.safeParse({...baseRecord('Invalid'),date}).success,false);
  assert.equal(taskSchema.safeParse({...baseRecord('Leap day'),date:'2028-02-29'}).success,true);
  assert.equal(eventSchema.safeParse({...baseRecord('Invalid time'),weekday:0,start:'99:99',end:'25:00'}).success,false);
  const s=emptyState();s.tasks.push(taskSchema.parse(baseRecord('Valid')));
  const json=JSON.parse(backup(s));json.data.tasks[0].createdAt=1e100;
  assert.throws(()=>parseBackup(JSON.stringify(json)));
});

test('Russian keeps English proper names, and interface translation stays deterministic',()=>{
  assert.equal(translateText('SAT','ru'),'SAT');assert.equal(translateText('Next.js','ru'),'Next.js');
  assert.equal(translateText('Сегодня','en'),'Today');assert.equal(translateText('Сегодня','ru'),'Сегодня');
});
