'use client';
import {createContext,useContext,useEffect,useRef,useState,type ComponentProps} from 'react';
import {DayButton} from 'react-day-picker';
import {ru,enGB} from 'date-fns/locale';
import {CalendarDays,Plus,Target,Flag,CheckCircle2,ChevronRight,Repeat2,ListTodo} from 'lucide-react';
import {Calendar} from '@/components/ui/calendar';
import {calendarItems,baseRecord,calendarEventSchema,localDay,weekStart,addDays,type CalendarItem,type CalendarEvent,type ExamId} from '@/lib/focusbase/domain';
import {exams} from '@/lib/focusbase/exams';
import {useApp,Field,TextInput,TextArea,Select,useSave} from './ui';

const dateKey=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const toDate=(date:string)=>new Date(date+'T12:00:00');
const itemIcons={task:ListTodo,deadline:Flag,goal:Target,event:CalendarDays,routine:Repeat2};
const PlannerContext=createContext<{items:CalendarItem[];en:boolean}>({items:[],en:false});
function PlannerDayButton({day,modifiers,children,...props}:ComponentProps<typeof DayButton>){
  const {items,en}=useContext(PlannerContext);const entries=items.filter(x=>x.date===dateKey(day.date));const ref=useRef<HTMLButtonElement>(null);
  useEffect(()=>{if(modifiers.focused)ref.current?.focus()},[modifiers.focused]);
  return <button {...props} ref={ref} className="planner-day-button" aria-label={props['aria-label']+(entries.length?`, ${entries.length} ${en?'items':'записей'}`:'')}><span className="planner-day-number">{children}</span><span className="planner-day-content" aria-hidden="true">{entries.slice(0,2).map(x=>{const Icon=itemIcons[x.kind];return <span className={'calendar-chip kind-'+x.kind+(x.completed?' is-complete':'')} key={x.kind+x.id}><Icon size={12}/><span>{x.title}</span></span>})}{entries.length>2&&<span className="calendar-more">+{entries.length-2}</span>}</span><span className="planner-mobile-count" aria-hidden="true">{entries.length||''}</span></button>
}

export function CalendarView(){
  const {s,edit,go,language}=useApp();const en=language==='en';const l=(ru:string,eng:string)=>en?eng:ru;
  const today=localDay(s.settings.timezone);const [selected,setSelected]=useState(today);const [month,setMonth]=useState(()=>toDate(today));
  const first=dateKey(new Date(month.getFullYear(),month.getMonth(),1));const from=weekStart(first);const items=calendarItems(s,from,addDays(from,41));const selectedItems=items.filter(x=>x.date===selected);
  const labels={task:l('Задача','Task'),deadline:l('Дедлайн','Deadline'),goal:l('Цель','Goal'),event:l('Событие','Event'),routine:l('Каждую неделю','Weekly')};
  function open(item:CalendarItem){if(item.kind==='task'||item.kind==='deadline')edit({kind:'tasks',id:item.id});else if(item.kind==='goal')edit({kind:'examGoals',id:item.id,examId:item.examId||undefined});else if(item.kind==='event')edit({kind:'calendarEvents',id:item.id});else go('План недели')}
  return <div className="calendar-workspace" data-localized>
    <div className="view-toolbar"><div className="calendar-view-switch"><button className="active" aria-pressed>{l('Месяц','Month')}</button><button onClick={()=>go('План недели')}>{l('Неделя','Week')}</button></div><button className="primary" onClick={()=>edit({kind:'calendarEvents',date:selected})}><Plus size={17}/>{l('Новое событие','New event')}</button></div>
    <div className="planner-layout"><section className="planner-panel"><PlannerContext.Provider value={{items,en}}><Calendar mode="single" required selected={toDate(selected)} onSelect={date=>{if(date){setSelected(dateKey(date));setMonth(date)}}} month={month} onMonthChange={date=>{setMonth(date);setSelected(dateKey(new Date(date.getFullYear(),date.getMonth(),1)))}} weekStartsOn={1} locale={en?enGB:ru} today={toDate(today)} fixedWeeks showOutsideDays className="planner-calendar" components={{DayButton:PlannerDayButton}}/></PlannerContext.Provider>
      <div className="calendar-legend"><span><ListTodo size={15}/>{l('Задачи','Tasks')}</span><span className="legend-deadline"><Flag size={15}/>{l('Дедлайны','Deadlines')}</span><span className="legend-goal"><Target size={15}/>{l('Цели','Goals')}</span><span><CalendarDays size={15}/>{l('События','Events')}</span><button className="text-link" onClick={()=>{setMonth(toDate(today));setSelected(today)}}>{l('Сегодня','Today')}</button></div>
    </section><aside className="day-agenda"><div className="agenda-heading"><p>{new Intl.DateTimeFormat(en?'en-GB':'ru-RU',{weekday:'long'}).format(toDate(selected))}</p><h2>{new Intl.DateTimeFormat(en?'en-GB':'ru-RU',{day:'numeric',month:'long',year:'numeric'}).format(toDate(selected))}</h2></div><div className="agenda-actions"><button className="secondary" onClick={()=>edit({kind:'tasks',date:selected})}><Plus size={16}/>{l('Задача','Task')}</button><button className="secondary" onClick={()=>edit({kind:'calendarEvents',date:selected})}><Plus size={16}/>{l('Событие','Event')}</button></div>
      {selectedItems.length?<div className="agenda-list">{selectedItems.map(item=>{const Icon=itemIcons[item.kind];return <button className={'agenda-item kind-'+item.kind+(item.completed?' is-complete':'')} key={item.kind+item.id} onClick={()=>open(item)}><span className="agenda-item-icon">{item.completed?<CheckCircle2 size={20}/>:<Icon size={20}/>}</span><span><small>{item.time||labels[item.kind]}{item.examId?' · '+exams[item.examId].name:''}</small><strong data-no-translate>{item.title}</strong>{item.time&&<small>{labels[item.kind]}</small>}</span><ChevronRight size={16}/></button>})}</div>:<div className="agenda-empty"><CalendarDays size={32} strokeWidth={1.4}/><h3>{l('День открыт для планов','Room for your plans')}</h3><p>{l('Добавь занятие или событие. Дедлайны задач появятся автоматически.','Add a task or an event. Task deadlines appear automatically.')}</p></div>}
    </aside></div>
  </div>
}

export function CalendarEventForm({id,date,examId}:{id?:string;date?:string;examId?:ExamId}){
  const {s,run,edit,language}=useApp();const en=language==='en';const l=(ru:string,eng:string)=>en?eng:ru;const existing=s.calendarEvents.find(x=>x.id===id);
  const [event,setEvent]=useState<CalendarEvent>(()=>existing?structuredClone(existing):{...baseRecord(''),date:date||localDay(s.settings.timezone),time:'',description:'',examId:examId||''});const {save,saving}=useSave();
  return <form className="form-stack" data-localized onSubmit={e=>{e.preventDefault();void save(d=>{const value=calendarEventSchema.parse({...event,title:event.title.trim(),updatedAt:Date.now()});const i=d.calendarEvents.findIndex(x=>x.id===value.id);if(i<0)d.calendarEvents.push(value);else d.calendarEvents[i]=value})}}>
    <Field label={l('Название события','Event name')}><TextInput autoFocus required maxLength={500} value={event.title} onChange={e=>setEvent({...event,title:e.target.value})} placeholder={l('Пробный IELTS, занятие с репетитором…','Mock IELTS, tutoring session…')}/></Field>
    <div className="form-grid"><Field label={l('Дата','Date')}><TextInput required type="date" value={event.date} onChange={e=>setEvent({...event,date:e.target.value})}/></Field><Field label={l('Время (необязательно)','Time (optional)')}><TextInput type="time" value={event.time} onChange={e=>setEvent({...event,time:e.target.value})}/></Field></div>
    <Field label={l('Экзамен','Exam')}><Select value={event.examId} options={ [['',l('Без экзамена','No exam')],...Object.entries(exams).map(([id,e])=>[id,e.name] as [string,string])]} onChange={value=>setEvent({...event,examId:value as ExamId|''})}/></Field>
    <details className="form-details" open={event.description?true:undefined}><summary>{l('Добавить описание','Add a description')}</summary><Field label={l('Описание','Description')}><TextArea maxLength={2000} value={event.description} onChange={e=>setEvent({...event,description:e.target.value})}/></Field></details>
    <div className="form-actions">{existing&&<button className="danger" type="button" onClick={()=>void run(d=>{d.calendarEvents.find(x=>x.id===id)!.deletedAt=Date.now()}).then(ok=>{if(ok)edit(null)})}>{l('В корзину','Move to trash')}</button>}<button className="primary push-right" type="submit" disabled={saving}>{saving?l('Сохраняю…','Saving…'):l('Сохранить событие','Save event')}</button></div>
  </form>
}
