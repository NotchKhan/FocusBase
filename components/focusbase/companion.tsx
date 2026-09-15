'use client';
import {useEffect,useState} from 'react';
import {Focus,Timer,Play,Pause,Check,CalendarDays,ListTodo,NotebookPen,LibraryBig,ArrowUpRight,X} from 'lucide-react';
import {Popover,PopoverTrigger,PopoverContent} from '@/components/ui/popover';
import {elapsed,phaseLimit,pause,nextPhase,startFocus,localDay} from '@/lib/focusbase/domain';
import {nextPlan} from '@/lib/focusbase/next-plan';
import {useApp,type Edit} from './ui';
import {useCompanionPosition} from './use-companion-position';

const timeText=(ms:number)=>{const seconds=Math.floor(Math.max(0,ms)/1000);return `${Math.floor(seconds/60).toString().padStart(2,'0')}:${(seconds%60).toString().padStart(2,'0')}`};
export function Companion({hidden=false,desktop=false}:{hidden?:boolean;desktop?:boolean}){
  const {s,run,go,edit,language}=useApp();const en=language==='en';const l=(ru:string,eng:string)=>en?eng:ru;
  const [open,setOpen]=useState(false),[now,setNow]=useState(()=>Date.now()),[busy,setBusy]=useState(false);
  const positionProps=useCompanionPosition(desktop);
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer)},[]);
  const a=s.active;const today=localDay(s.settings.timezone,now);const next=nextPlan(s,today)[0];
  const activeTask=s.tasks.find(t=>t.id===a?.taskId);const limit=a?phaseLimit(a):0;const passed=a?elapsed(a,now):0;const ended=!!a&&passed>=limit;
  const clock=a?timeText(a.mode==='free'?passed:limit-passed):'';
  const changeOpen=(value:boolean)=>{setOpen(value);if(desktop)void window.focusbaseDesktop?.setExpanded(value)};
  const navigate=(view:string)=>{changeOpen(false);go(view)};
  const form=(value:Edit)=>{changeOpen(false);edit(value)};
  async function change(fn:Parameters<typeof run>[0]){setBusy(true);try{return await run(fn)}finally{setBusy(false)}}
  const nextDate=next&&[next.date,next.deadline].filter(Boolean).sort()[0];
  const dateLabel=nextDate?new Intl.DateTimeFormat(en?'en-GB':'ru-RU',{day:'numeric',month:'short'}).format(new Date(nextDate+'T12:00:00')):l('Без даты','Unscheduled');
  if(hidden)return null;
  return <Popover open={open} onOpenChange={changeOpen}>{desktop&&<div className="desktop-drag-handle" title={l('Перетащить иконку','Drag companion')}>•••</div>}
    <PopoverTrigger asChild><button {...positionProps} data-localized className={'companion-launcher '+(a?'has-timer':'')} aria-label={l('Открыть быстрый доступ FocusBase','Open FocusBase quick access')} title={l('Нажми, чтобы открыть. Потяни, чтобы переместить.','Click to open. Drag to move.')}><Focus size={25} strokeWidth={1.8}/>{a&&<span aria-hidden="true">{ended?<Check size={15}/>:a.runSince===null?<Pause size={14}/>:clock}</span>}</button></PopoverTrigger>
    <PopoverContent data-localized side="top" align="end" sideOffset={12} collisionPadding={12} className="companion-panel" aria-label={l('Быстрый доступ FocusBase','FocusBase quick access')}>
      <div className="companion-heading"><span><Focus size={18}/>FocusBase</span><button className="icon-button" onClick={()=>changeOpen(false)} aria-label={l('Закрыть панель','Close panel')}><X size={18}/></button></div>
      {a?<section className="companion-timer"><p>{ended?l('Интервал завершён','Interval complete'):a.runSince===null?l('На паузе','Paused'):a.phase==='break'?l('Перерыв','Break'):l('В фокусе','Focusing')}</p><strong className="companion-clock" role="timer" aria-label={l('Время таймера','Timer time')}>{clock}</strong><button className="companion-task-title" onClick={()=>activeTask?form({kind:'tasks',id:activeTask.id}):navigate('Фокус')}>{activeTask?.title||l('Свободный фокус','Free focus')}</button><div className="companion-timer-actions">
        {!ended&&<button className="secondary" disabled={busy} onClick={()=>void change(d=>{if(d.active?.id!==a.id)return;if(d.active.runSince===null)d.active.runSince=Date.now();else pause(d.active)})}>{a.runSince===null?<Play size={16}/>:<Pause size={16}/>} {a.runSince===null?l('Продолжить','Resume'):l('Пауза','Pause')}</button>}
        {ended&&a.mode==='pomodoro'&&<button className="secondary" disabled={busy} onClick={()=>void change(d=>{if(d.active?.id===a.id)nextPhase(d)})}>{a.phase==='work'?l('Начать перерыв','Start break'):l('Следующий фокус','Next focus')}</button>}
        <button className="primary" disabled={busy} onClick={async()=>{if(await change(d=>{if(d.active?.id===a.id)pause(d.active)}))form({kind:'finish'})}}><Check size={16}/>{l('Завершить','Finish')}</button>
      </div><button className="text-link" onClick={()=>navigate('Фокус')}>{l('Открыть таймер','Open timer')}<ArrowUpRight size={14}/></button></section>:<section className="companion-start"><p>{l('Время для одной задачи','Time for one task')}</p><button className="primary" disabled={busy} onClick={()=>void change(d=>startFocus(d,'','countdown',25,5))}><Play size={17}/>{l('25 минут фокуса','25 minutes of focus')}</button><button className="text-link" onClick={()=>navigate('Фокус')}><Timer size={15}/>{l('Настроить таймер','Set up timer')}</button></section>}
      <section className="companion-next"><p className="companion-label">{l('Дальше по плану','Next on your plan')}</p>{next?<><button className="companion-next-title" onClick={()=>form({kind:'tasks',id:next.id})}>{next.title}<ArrowUpRight size={16}/></button><p className="companion-meta">{dateLabel} · {next.minutes} {l('мин','min')}{nextDate&&nextDate<today?' · '+l('Просрочено','Overdue'):''}</p>{!a&&<button className="secondary" disabled={busy} onClick={()=>void change(d=>startFocus(d,next.id,'countdown',next.minutes,5))}><Play size={15}/>{l('Начать эту задачу','Start this task')}</button>}</>:<p className="companion-meta">{l('Открытых задач пока нет. Добавь следующий шаг.','No open tasks yet. Add your next step.')}</p>}</section>
      <div className="companion-shortcuts"><button onClick={()=>form({kind:'tasks',date:today})}><ListTodo size={19}/>{l('Новая задача','New task')}</button><button onClick={()=>form({kind:'notes'})}><NotebookPen size={19}/>{l('Заметка','Note')}</button><button onClick={()=>navigate('Календарь')}><CalendarDays size={19}/>{l('Календарь','Calendar')}</button><button onClick={()=>navigate('Библиотека')}><LibraryBig size={19}/>{l('Материалы','Resources')}</button></div>
    </PopoverContent>
  </Popover>
}
