import {type State,localDay,addDays,weekStart,openTask} from './domain';

export function taskActivity(s:State,anchor:string){
  const first=anchor.slice(0,7)+'-01';
  const nextMonth=new Date(first+'T12:00:00Z');nextMonth.setUTCMonth(nextMonth.getUTCMonth()+1);
  const startOfWeek=weekStart(anchor);
  const periods=[
    {id:'day',from:anchor,to:anchor},
    {id:'week',from:startOfWeek,to:addDays(startOfWeek,6)},
    {id:'month',from:first,to:addDays(nextMonth.toISOString().slice(0,10),-1)},
    {id:'all',from:'',to:''},
  ] as const;
  const tasks=s.tasks.filter(t=>t.deletedAt===null&&!t.demo);
  const isCompleted=(t:State['tasks'][number])=>t.status==='done'||(t.status==='archive'&&t.completedAt!==null);
  // Cache date conversion once per task, regardless of the number of periods.
  const dated=tasks.map(t=>({t,created:localDay(s.settings.timezone,t.createdAt),completed:t.completedAt===null?'':localDay(s.settings.timezone,t.completedAt)}));
  return {undatedCompletions:tasks.filter(t=>isCompleted(t)&&t.completedAt===null).length,rows:periods.map(period=>{
    const inside=(date:string)=>period.id==='all'||!!date&&date>=period.from&&date<=period.to;
    const created=dated.filter(t=>inside(t.created));
    const completed=dated.filter(({t,completed})=>isCompleted(t)&&inside(completed)).length;
    const completedFromCreated=created.filter(({t})=>isCompleted(t)).length;
    return {...period,created:created.length,completed,open:created.filter(({t})=>openTask(t)).length,completedFromCreated,percent:created.length?Math.round(completedFromCreated/created.length*100):null};
  })};
}
