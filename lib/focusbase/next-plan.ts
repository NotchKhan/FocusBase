import {openTask, type State} from './domain';

// An unscheduled task is a fallback; a future task must never displace today's work.
export function nextPlan(s:State,today:string){
  const due=(t:State['tasks'][number])=>[t.date,t.deadline].filter(Boolean).sort()[0]||'9999-12-31';
  return s.tasks.filter(t=>openTask(t)&&t.id!==s.active?.taskId).sort((a,b)=>{
    const group=(t:typeof a)=>due(t)<=today?0:due(t)==='9999-12-31'?2:1;
    return group(a)-group(b)||
      (group(a)===0?Number(b.id===s.settings.mainTaskId)-Number(a.id===s.settings.mainTaskId):0)||
      due(a).localeCompare(due(b))||a.priority.localeCompare(b.priority)||a.time.localeCompare(b.time)||a.createdAt-b.createdAt;
  });
}
