import {localDay,pause,type State,type Task} from './domain';

export function taskExpired(task:Task,today:string){
  return task.status==='missed'||(!task.deletedAt&&!task.archived&&!!task.date&&task.date<today&&['inbox','todo','progress'].includes(task.status));
}
// Find the first instant after the scheduled calendar day, including DST zones.
export function taskDayEnd(date:string,timezone:string){
  const utc=Date.parse(date+'T00:00:00Z');let low=utc-86400000,high=utc+3*86400000;
  while(high-low>1){const mid=Math.floor((low+high)/2);if(localDay(timezone,mid)<=date)low=mid;else high=mid}
  return high;
}
export function expireTasks(s:State,now=Date.now()){
  const today=localDay(s.settings.timezone,now);let changed=false;
  for(const task of s.tasks){
    if(task.status==='missed'||!taskExpired(task,today))continue;
    const deadline=taskDayEnd(task.date,s.settings.timezone);
    task.status='missed';task.missedAt=deadline;task.updatedAt=now;changed=true;
    if(s.active?.taskId===task.id)pause(s.active,Math.min(now,deadline));
  }
  return changed;
}
export function protectExpiredTasks(before:Task[],after:Task[]){
  for(const task of before){
    const current=after.find(t=>t.id===task.id);
    // Trash/restore is still available for accidental records; restoring keeps
    // the missed status. No editing, rescheduling, completion or repeat allowed.
    const comparable=(value:Task)=>({...value,deletedAt:null});
    if(!current||JSON.stringify(comparable(task))!==JSON.stringify(comparable(current)))
      throw Error('Срок задачи прошёл. Редактирование, повтор и завершение недоступны.');
  }
}
