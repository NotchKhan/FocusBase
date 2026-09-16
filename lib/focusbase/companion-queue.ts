import {finishFocus,localDay,startFocus,type State} from './domain';
import {nextPlan} from './next-plan';

// Keep a personal playback order without changing task dates or priorities.
export function companionQueue(s:State){
  const tasks=nextPlan({...s,active:null},localDay(s.settings.timezone));
  const byId=new Map(tasks.map(t=>[t.id,t]));
  const ids=[...new Set([...s.settings.companionQueue,...tasks.map(t=>t.id)])];
  return ids.flatMap(id=>{const task=byId.get(id);return task?[task]:[]});
}
export function selectCompanionTask(s:State,id:string){
  const queue=companionQueue(s).map(t=>t.id);
  if(!queue.includes(id))throw Error('Задача больше недоступна');
  s.settings.companionQueue=[id,...queue.filter(key=>key!==id)];
}
export function moveCompanionTask(s:State,id:string,direction:-1|1){
  const queue=companionQueue(s).map(t=>t.id);const index=queue.indexOf(id),other=index+direction;
  if(index<0||other<0||other>=queue.length)return;
  [queue[index],queue[other]]=[queue[other],queue[index]];s.settings.companionQueue=queue;
}
function checkSession(s:State,expected:string|null){
  if((s.active?.id??null)!==expected)throw Error('Таймер уже изменился. Повторите действие.');
}
export function playCompanionTask(s:State,id:string,expected:string|null,now=Date.now()){
  checkSession(s,expected);
  const task=companionQueue(s).find(t=>t.id===id);
  if(!task)throw Error('Задача больше недоступна');
  if(s.active?.taskId===id)return;
  if(s.active)finishFocus(s,{summary:'',result:'',nextStep:'',done:false},now);
  selectCompanionTask(s,id);startFocus(s,id,'countdown',task.minutes,5,now);
}
export function skipCompanionTask(s:State,id:string,expected:string|null,playNext:boolean,now=Date.now()){
  checkSession(s,expected);
  const queue=companionQueue(s).map(t=>t.id);
  const rest=queue.filter(key=>key!==id);
  if(playNext&&!rest.length)return;
  if(s.active)finishFocus(s,{summary:'',result:'',nextStep:'',done:false},now);
  s.settings.companionQueue=[...rest,...queue.filter(key=>key===id)];
  if(playNext)playCompanionTask(s,rest[0],null,now);
}
