'use client';
import {useEffect,useState} from 'react';
import {ChartNoAxesCombined,ShieldCheck} from 'lucide-react';
import {localDay} from '@/lib/focusbase/domain';
import {taskActivity} from '@/lib/focusbase/task-activity';
import {useApp,TextInput} from './ui';

export function TaskActivity(){
  const {s,language}=useApp();const en=language==='en';const l=(ru:string,english:string)=>en?english:ru;
  const [now,setNow]=useState(()=>Date.now());const [selected,setSelected]=useState('');
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),60000);return()=>clearInterval(timer)},[]);
  const today=localDay(s.settings.timezone,now);const date=selected||today;
  const report=taskActivity(s,date);
  const labels={day:l('День','Day'),week:l('Неделя','Week'),month:l('Месяц','Month'),all:l('Всё время','All time')};
  const format=(value:string)=>new Intl.DateTimeFormat(en?'en-GB':'ru-RU',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(value+'T12:00:00Z'));
  return <section data-localized className="task-activity" aria-labelledby="task-activity-title">
    <div className="task-activity-heading"><div><p className="eyebrow">{l('ОТ ПЛАНА К РЕЗУЛЬТАТУ','FROM PLAN TO PROGRESS')}</p><h2 id="task-activity-title"><ChartNoAxesCombined size={22}/>{l('Твоя активность','Your activity')}</h2><p className="muted">{l('Создавай осознанно. Замечай то, что доводишь до конца.','Plan with purpose. Notice what you finish.')}</p></div>
      <div className="task-activity-date"><label htmlFor="activity-date">{l('Периоды вокруг даты','Periods containing')}</label><div className="inline"><TextInput id="activity-date" type="date" min="1900-01-01" max="9998-12-31" value={date} onChange={e=>{const v=e.target.value;if(v&&e.target.validity.valid)setSelected(v)}}/><button className="secondary" onClick={()=>setSelected('')}>{l('Сегодня','Today')}</button></div></div>
    </div>
    <div className="task-activity-scroll" role="region" aria-label={l('Таблица активности задач','Task activity table')} tabIndex={0}><table>
      <caption className="sr-only">{l('Создание и завершение задач по календарным периодам','Task creation and completion by calendar period')}</caption>
      <thead><tr><th scope="col">{l('Период','Period')}</th><th scope="col">{l('Создано','Created')}</th><th scope="col">{l('Завершено','Completed')}</th><th scope="col">{l('Ещё в работе¹','Still open¹')}</th><th scope="col">{l('Готово из созданных','Created tasks finished')}</th></tr></thead>
      <tbody>{report.rows.map(row=><tr key={row.id} data-period={row.id}><th scope="row"><strong>{labels[row.id]}</strong><small>{row.id==='all'?l('Вся история','Entire history'):row.from===row.to?format(row.from):`${format(row.from)} — ${format(row.to)}`}</small></th><td data-metric="created">{row.created}</td><td data-metric="completed" className="activity-completed">{row.completed}</td><td data-metric="open">{row.open}</td><td><div className="activity-ratio"><span>{row.percent===null?'—':`${row.percent}%`}</span><small>{row.completedFromCreated} / {row.created}</small></div><div className="activity-meter" role="progressbar" aria-label={labels[row.id]+': '+l('готово из созданных','created tasks finished')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={row.percent??0}><span style={{width:`${row.percent??0}%`}}/></div></td></tr>)}</tbody>
    </table></div>
    <div className="task-activity-notes"><p>{l('«Завершено» считается по дате завершения, даже если задача создана раньше. ¹ Открытые задачи, созданные в этом периоде, которые ещё не закрыты и не архивированы.','Completed uses the completion date, including tasks created earlier. ¹ Tasks created in this period that are still open and not archived.')}</p><p>{l('Неделя — с понедельника. Архив учитывается; корзина и примеры исключены. Фильтры списка не меняют таблицу.','Weeks start on Monday. Archived tasks count; trash and examples do not. List filters do not affect this table.')} {s.settings.timezone}.</p>{report.undatedCompletions>0&&<p className="activity-legacy" role="status">{l(`У ${report.undatedCompletions} ранее завершённых задач дата завершения не сохранена. Они учтены только в «Всё время» и готовности созданных задач.`,`Completion dates are missing for ${report.undatedCompletions} older tasks. They count only in All time and created-task progress.`)}</p>}</div>
    <p className="activity-storage"><ShieldCheck size={16}/>{l('Личное хранилище этого браузера. На другом устройстве — отдельные данные.','Personal storage in this browser. Other devices have separate data.')}</p>
  </section>;
}
