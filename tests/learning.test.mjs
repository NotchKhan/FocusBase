import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import {emptyState,baseRecord,resourceSchema,taskSchema,sessionSchema,stateSchema,backup,parseBackup} from '../lib/focusbase/domain.ts';
const source=await readFile(new URL('../lib/focusbase/learning.ts',import.meta.url),'utf8');
const js=stripTypeScriptTypes(source).replace("'./domain'",JSON.stringify(new URL('../lib/focusbase/domain.ts',import.meta.url).href));
const {scheduleReview,recordReview,practiceResource,weekReport,weeklyNote}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const material=()=>resourceSchema.parse({...baseRecord('Reading'),url:'https://example.com/reading',examId:'ielts',examSection:'reading'});

test('legacy resources migrate and review state survives backup',()=>{
  const s=emptyState();const r=material();delete r.review;s.resources.push(r);
  const migrated=stateSchema.parse(s);assert.equal(migrated.resources[0].review,null);
  scheduleReview(migrated,r.id,'2026-09-14');assert.deepEqual(parseBackup(backup(migrated)),migrated);
});
test('review scheduler advances, retries tomorrow, and rejects stale double-clicks',()=>{
  const s=emptyState();const r=material();s.resources.push(r);scheduleReview(s,r.id,'2026-09-14');
  assert.equal(recordReview(s,r.id,true,'2026-09-14','2026-09-14'),true);
  assert.equal(r.review.due,'2026-09-17');assert.equal(r.review.step,1);
  assert.equal(recordReview(s,r.id,true,'2026-09-14','2026-09-14'),false);
  assert.equal(recordReview(s,r.id,true,'2026-09-15','2026-09-17'),false);
  assert.equal(recordReview(s,r.id,false,'2026-09-17','2026-09-17'),true);assert.equal(r.review.due,'2026-09-18');assert.equal(r.review.step,0);
  r.deletedAt=1;assert.equal(recordReview(s,r.id,true,'2026-09-18','2026-09-18'),false);
});
test('practice reuses an open linked task and carries exam/resource metadata',()=>{
  const s=emptyState();const r=material();s.resources.push(r);const id=practiceResource(s,r.id,'2026-09-14');
  assert.equal(practiceResource(s,r.id,'2026-09-15'),id);assert.equal(s.tasks.length,1);
  assert.deepEqual(s.tasks[0].resourceIds,[r.id]);assert.equal(s.tasks[0].examId,'ielts');assert.equal(s.tasks[0].examSection,'reading');
  s.tasks[0].status='done';assert.notEqual(practiceResource(s,r.id,'2026-09-15'),id);
});
test('weekly report uses saved work minutes and local completion dates, excluding deleted sessions',()=>{
  const s=emptyState();const t=taskSchema.parse({...baseRecord('Practice'),date:'2026-09-14',minutes:45,status:'done'});s.tasks.push(t);
  const session=(at,fields={})=>sessionSchema.parse({...baseRecord('Focus'),taskId:t.id,startedAt:at-600000,endedAt:at,workMs:600000,summary:'',result:'',nextStep:'',thoughts:[],...fields});
  s.sessions.push(session(Date.parse('2026-09-13T20:00:00Z'))); // Monday in Qyzylorda.
  s.sessions.push(session(Date.parse('2026-09-14T12:00:00Z'),{deletedAt:1}));
  s.sessions.push(session(Date.parse('2026-09-21T12:00:00Z')));
  const report=weekReport(s,'2026-09-14');assert.equal(report.minutes,10);assert.equal(report.sessions,1);assert.equal(report.activeDays,1);assert.equal(report.days[0].minutes,10);assert.equal(report.days[0].planned,45);assert.equal(report.completed,1);
  const id=weeklyNote(s,'2026-09-14');s.notes[0].body='My reflection';assert.equal(weeklyNote(s,'2026-09-14'),id);assert.equal(s.notes[0].body,'My reflection');
});
