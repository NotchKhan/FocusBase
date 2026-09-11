import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,stateSchema,taskSchema,resourceSchema,eventSchema,examGoalSchema,calendarEventSchema,baseRecord,calendarItems,examFor,backup,parseBackup,completeTask} from '../lib/focusbase/domain.ts';

test('old workspaces and backups gain study defaults without losing existing data',()=>{
 const old=JSON.parse(JSON.stringify(emptyState()));delete old.examGoals;delete old.calendarEvents;delete old.settings.customQuote;delete old.settings.customQuoteJapanese;
 const task=taskSchema.parse({...baseRecord('Legacy task'),direction:'Математика / SAT'});delete task.examId;delete task.examSection;old.tasks.push(task);
 const migrated=stateSchema.parse(old);assert.deepEqual(migrated.examGoals,[]);assert.deepEqual(migrated.calendarEvents,[]);assert.equal(migrated.settings.customQuote,'');assert.equal(migrated.tasks[0].title,'Legacy task');assert.equal(examFor(migrated.tasks[0]),'sat');
 assert.deepEqual(parseBackup(JSON.stringify({format:'focusbase-backup',version:1,exportedAt:new Date().toISOString(),data:old})),migrated);
});
test('all exam goals, personal resources, events and quote round-trip through backup',()=>{
 const s=emptyState();for(const examId of ['ielts','sat','unt']){s.examGoals.push(examGoalSchema.parse({...baseRecord(examId+' goal'),examId,date:'2026-12-12',target:'Personal target'}));s.resources.push(resourceSchema.parse({...baseRecord(examId+' resource'),url:'https://example.com/'+examId,examId,examSection:'practice'}));}
 s.calendarEvents.push(calendarEventSchema.parse({...baseRecord('Exam session'),date:'2026-12-12',time:'14:30',examId:'sat',description:'Bring notes'}));s.settings.customQuote='Tasks stay in my own words.';s.settings.customQuoteJapanese='一歩ずつ';
 assert.deepEqual(parseBackup(backup(s)),s);assert.deepEqual(s.resources.map(examFor),['ielts','sat','unt']);
});
test('calendar includes scheduled tasks, distinct deadlines, goals, events and weekly routines',()=>{
 const s=emptyState();const task=taskSchema.parse({...baseRecord('Reading'),date:'2026-09-10',deadline:'2026-09-11',examId:'ielts'});s.tasks.push(task);
 s.tasks.push(taskSchema.parse({...baseRecord('Same day'),date:'2026-09-11',deadline:'2026-09-11',examId:'sat'}));
 s.tasks.push(taskSchema.parse({...baseRecord('Deleted'),date:'2026-09-11',deletedAt:1}));
 s.tasks.push(taskSchema.parse({...baseRecord('Cancelled'),date:'2026-09-11',status:'cancelled'}));
 s.tasks.push(taskSchema.parse({...baseRecord('Archived'),date:'2026-09-11',archived:true}));
 s.examGoals.push(examGoalSchema.parse({...baseRecord('UNT goal'),examId:'unt',date:'2026-09-11'}));
 s.calendarEvents.push(calendarEventSchema.parse({...baseRecord('Mock test'),date:'2026-09-11',time:'09:00'}));
 s.events.push(eventSchema.parse({...baseRecord('Friday lesson'),weekday:4,start:'15:00',end:'16:00'}));
 let items=calendarItems(s,'2026-09-10','2026-09-12');assert.equal(items.length,6);assert.equal(items.filter(x=>x.title==='Same day').length,1);assert.equal(items.find(x=>x.title==='Same day').kind,'deadline');assert.ok(items.some(x=>x.kind==='routine'&&x.date==='2026-09-11'));assert.equal(items.find(x=>x.kind==='goal').examId,'unt');
 completeTask(s,task.id);items=calendarItems(s,'2026-09-10','2026-09-12');assert.ok(items.filter(x=>x.id===task.id).every(x=>x.completed));
 s.examGoals[0].date='2026-10-01';s.calendarEvents[0].deletedAt=1;assert.equal(calendarItems(s,'2026-09-10','2026-09-12').length,4);
});
test('study date and time validation rejects impossible calendar input',()=>{
 for(const date of ['','2026-02-30','2026-13-01','not-a-date']){assert.equal(examGoalSchema.safeParse({...baseRecord('Goal'),examId:'ielts',date}).success,false);assert.equal(calendarEventSchema.safeParse({...baseRecord('Event'),date}).success,false);}
 assert.equal(calendarEventSchema.safeParse({...baseRecord('All day'),date:'2028-02-29'}).success,true);
 for(const time of ['24:00','10:99','9:30'])assert.equal(calendarEventSchema.safeParse({...baseRecord('Event'),date:'2026-09-11',time}).success,false);
});
