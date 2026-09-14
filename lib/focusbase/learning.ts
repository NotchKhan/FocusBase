import {addDays,baseRecord,examFor,localDay,noteSchema,openTask,taskSchema,visible,type State} from './domain';

export const reviewIntervals=[1,3,7,14,30] as const;
export function scheduleReview(s:State,id:string,today:string){
  const r=s.resources.find(r=>r.id===id&&visible(r));if(!r)throw Error('Материал не найден');
  if(!r.review)r.review={due:today,step:0,lastReviewed:''};r.updatedAt=Date.now();
}
export function recordReview(s:State,id:string,remembered:boolean,today:string,expectedDue:string){
  const r=s.resources.find(r=>r.id===id&&visible(r));
  if(!r?.review||r.review.due!==expectedDue||r.review.due>today)return false;
  const step=remembered?Math.min(4,r.review.step+1):0;
  r.review={step,due:addDays(today,reviewIntervals[step]),lastReviewed:today};r.updatedAt=Date.now();return true;
}
export function practiceResource(s:State,id:string,today:string,en=false){
  const r=s.resources.find(r=>r.id===id&&visible(r));if(!r)throw Error('Материал не найден');
  const existing=s.tasks.find(t=>openTask(t)&&t.resourceIds.includes(id));if(existing)return existing.id;
  const t=taskSchema.parse({...baseRecord((en?'Practice: ':'Практика: ')+r.title.slice(0,480)),description:r.why|| (en?'Practice without hints, check your answer, and note one mistake.':'Выполни задание без подсказок, проверь ответ и запиши одну ошибку.'),date:today,minutes:25,status:'todo',direction:r.direction,examId:examFor(r),examSection:r.examSection,projectId:r.projectId,resourceIds:[r.id]});
  s.tasks.push(t);r.status='Изучаю';r.updatedAt=Date.now();return t.id;
}
export function weekReport(s:State,start:string){
  const days=Array.from({length:7},(_,i)=>({date:addDays(start,i),minutes:0,sessions:0,planned:0}));
  const byDirection:Record<string,number>={};
  for(const session of s.sessions.filter(x=>!x.deletedAt)){
    const day=days.find(d=>d.date===localDay(s.settings.timezone,session.endedAt));if(!day)continue;
    const minutes=session.workMs/60000;day.minutes+=minutes;day.sessions++;
    const task=s.tasks.find(t=>t.id===session.taskId);const direction=task?.direction||'Свободный фокус';byDirection[direction]=(byDirection[direction]||0)+minutes;
  }
  const planned=s.tasks.filter(t=>visible(t)&&!['cancelled','archive'].includes(t.status)&&days.some(d=>d.date===t.date));
  for(const task of planned)days.find(d=>d.date===task.date)!.planned+=task.minutes;
  return {days,byDirection,minutes:days.reduce((n,d)=>n+d.minutes,0),sessions:days.reduce((n,d)=>n+d.sessions,0),activeDays:days.filter(d=>d.minutes>0).length,planned:planned.length,completed:planned.filter(t=>t.status==='done').length};
}
export function weeklyNote(s:State,start:string,en=false){
  const id='weekly-review:'+start;const existing=s.notes.find(n=>n.id===id);
  if(existing){existing.deletedAt=null;existing.archived=false;return id}
  const report=weekReport(s,start);
  const body=en?`## Week of ${start}\n\nFocus: ${Math.round(report.minutes)} min · ${report.sessions} sessions\n\n## What worked?\n\n## What was difficult?\n\n## One change for next week\n\n`:`## Неделя с ${start}\n\nФокус: ${Math.round(report.minutes)} мин · сессий: ${report.sessions}\n\n## Что получилось?\n\n## Что мешало?\n\n## Одно изменение на следующую неделю\n\n`;
  s.notes.push(noteSchema.parse({...baseRecord((en?'Weekly review · ':'Итоги недели · ')+start),id,body}));return id;
}
