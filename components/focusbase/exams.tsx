'use client';
import {useState} from 'react';
import {Plus,Target,CalendarDays,ArrowUpRight,Check,BookmarkPlus,Link2,Pencil,CheckCircle2,BookOpen,Calculator} from 'lucide-react';
import {Progress} from '@/components/ui/progress';
import {exams,studyResources} from '@/lib/focusbase/exams';
import {baseRecord,examFor,examGoalSchema,resourceSchema,canonicalUrl,visible,localDay,type ExamId,type ExamGoal} from '@/lib/focusbase/domain';
import {useApp,Field,TextInput,Select,TaskRow,ResourceLink,useSave} from './ui';
import {ResourceIcon,sectionIcons} from './icons';

export function ExamView({examId}:{examId:ExamId}){
  const {s,run,edit,go,language}=useApp();const en=language==='en';const l=(ru:string,eng:string)=>en?eng:ru;
  const exam=exams[examId];const [section,setSection]=useState('');
  const goals=s.examGoals.filter(g=>visible(g)&&g.examId===examId).sort((a,b)=>Number(a.completed)-Number(b.completed)||a.date.localeCompare(b.date));
  const tasks=s.tasks.filter(t=>visible(t)&&!['archive','cancelled'].includes(t.status)&&examFor(t)===examId);
  const materials=s.resources.filter(r=>visible(r)&&examFor(r)===examId&&(!section||r.examSection===section));
  const suggested=studyResources.filter(r=>r.examId===examId&&r.section===section);
  const today=localDay(s.settings.timezone);const done=tasks.filter(t=>t.status==='done').length;
  const dateLabel=(date:string)=>new Intl.DateTimeFormat(en?'en-GB':'ru-RU',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));
  const [savingResource,setSavingResource]=useState('');
  return <div className="exam-workspace" data-localized>
    <div className="exam-intro"><div><span className={'exam-emblem exam-'+examId} aria-hidden="true">{examId==='ielts'?<BookOpen/>:examId==='sat'?<Calculator/>:<Target/>}</span><p>{exam.subtitle[en?1:0]}</p></div><button className="secondary" onClick={()=>go('Календарь')}><CalendarDays size={17}/>{l('Календарь','Calendar')}</button></div>
    <div className="exam-layout">
      <section className="exam-main">
        <div className="section-title"><h2>{l('Ресурсы для подготовки','Study resources')}</h2><button className="primary" onClick={()=>edit({kind:'resources',examId,examSection:section})}><Plus size={17}/>{l('Своя ссылка','Add a link')}</button></div>
        <div className="subject-tabs" role="group" aria-label={l('Раздел экзамена','Exam section')}>
          <button aria-pressed={!section} className={!section?'active':''} onClick={()=>setSection('')}><BookOpen size={16}/>{l('Общее','Overview')}</button>
          {exam.sections.map(x=>{const Icon=sectionIcons[x.id]||BookOpen;return <button key={x.id} aria-pressed={section===x.id} className={section===x.id?'active':''} onClick={()=>setSection(x.id)}><Icon size={16}/>{x.label[en?1:0]}</button>})}
        </div>
        <div className="study-resource-grid">{suggested.map(r=>{
          const saved=s.resources.find(x=>visible(x)&&examFor(x)===examId&&canonicalUrl(x.url)===canonicalUrl(r.url)&&x.examSection===r.section);
          return <article className="study-resource" key={r.id}><div className="study-resource-top"><ResourceIcon type={r.type}/><span>{r.source}</span><ArrowUpRight size={17} aria-hidden="true"/></div><a className="study-resource-title" href={r.url} target="_blank" rel="noopener noreferrer">{r.title}</a><p>{r.description[en?1:0]}</p><div className="study-resource-foot"><span>{l('Официальный ресурс','Official resource')}</span><button className="icon-button" title={saved?l('Открыть сохранённый материал','Edit saved material'):l('Сохранить в библиотеку','Save to library')} aria-label={(saved?l('Открыть: ','Edit: '):l('Сохранить: ','Save: '))+r.title} disabled={savingResource===r.id} onClick={async()=>{if(saved){edit({kind:'resources',id:saved.id});return}setSavingResource(r.id);await run(d=>{if(d.resources.some(x=>visible(x)&&examFor(x)===examId&&canonicalUrl(x.url)===canonicalUrl(r.url)&&x.examSection===r.section))return;d.resources.push(resourceSchema.parse({...baseRecord(r.title),url:r.url,type:r.type,why:r.description[en?1:0],direction:exam.direction,examId,examSection:r.section}))},l('Материал сохранён','Material saved'));setSavingResource('')}}>{saved?<Check size={17}/>:<BookmarkPlus size={17}/>}</button></div></article>
        })}</div>
        <div className="section-title"><h3>{l('Мои материалы','My materials')}</h3><span className="count-label">{materials.length}</span></div>
        {materials.length?<div className="exam-saved-resources">{materials.map(r=><div key={r.id}><ResourceLink r={r}/><button className="icon-button" aria-label={l('Изменить: ','Edit: ')+r.title} onClick={()=>edit({kind:'resources',id:r.id})}><Pencil size={16}/></button></div>)}</div>:<button className="exam-empty-link" onClick={()=>edit({kind:'resources',examId,examSection:section})}><Link2 size={20}/><span>{l('Сохрани полезную ссылку — она будет здесь.','Save a useful link to keep it here.')}</span><Plus size={17}/></button>}
        <div className="section-title"><h2>{l('Практика','Practice')}</h2><button className="text-link" onClick={()=>edit({kind:'tasks',examId,date:today})}><Plus size={17}/>{l('Добавить задачу','Add task')}</button></div>
        {tasks.length?<><div className="exam-progress-label"><span>{l('Выполнено','Completed')}</span><b>{done} / {tasks.length}</b></div><Progress value={done/tasks.length*100}/><div className="task-list exam-task-list">{tasks.filter(t=>t.status!=='done').sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999')).map(t=><TaskRow key={t.id} t={t}/>)}{done>0&&<details className="completed-practice"><summary>{l('Завершённые задачи','Completed tasks')} · {done}</summary>{tasks.filter(t=>t.status==='done').map(t=><TaskRow key={t.id} t={t}/>)}</details>}</div></>:<button className="exam-empty-link" onClick={()=>edit({kind:'tasks',examId,date:today})}><CheckCircle2 size={20}/><span>{l('Запланируй первую тренировку.','Plan your first practice session.')}</span><Plus size={17}/></button>}
      </section>
      <aside className="exam-goal-rail"><section className="exam-goals-panel"><div className="section-title"><h2><Target size={19}/>{l('Мои цели','My goals')}</h2><button className="icon-button" aria-label={l('Добавить цель','Add goal')} onClick={()=>edit({kind:'examGoals',examId})}><Plus size={19}/></button></div>
        {goals.length?goals.map(g=><article key={g.id} className={'exam-goal '+(g.completed?'is-complete':'')}><div className="goal-title-row"><button className="goal-check icon-button" aria-pressed={g.completed} aria-label={(g.completed?l('Вернуть в работу: ','Reopen: '):l('Завершить цель: ','Complete goal: '))+g.title} onClick={()=>void run(d=>{const x=d.examGoals.find(x=>x.id===g.id)!;x.completed=!x.completed;x.updatedAt=Date.now()})}>{g.completed?<CheckCircle2 size={21}/>:<Target size={21}/>}</button><button className="goal-edit" onClick={()=>edit({kind:'examGoals',id:g.id,examId})}><strong data-no-translate>{g.title}</strong><Pencil size={14}/></button></div>{g.target&&<p className="goal-target" data-no-translate>{g.target}</p>}<p className={'goal-date '+(!g.completed&&g.date<today?'overdue':'')}><CalendarDays size={15}/>{dateLabel(g.date)}{g.completed?<Check size={15}/>:g.date<today?<span>{l('Срок прошёл','Overdue')}</span>:null}</p></article>):<div className="goal-empty"><Target size={32} strokeWidth={1.5}/><h3>{l('К чему идёшь?','What are you aiming for?')}</h3><p>{l('Запиши цель и дату. Срок появится в календаре.','Set a goal and a date. It will appear in your calendar.')}</p><button className="primary" onClick={()=>edit({kind:'examGoals',examId})}><Plus size={16}/>{l('Поставить цель','Set a goal')}</button></div>}
      </section><button className="calendar-shortcut" onClick={()=>go('Календарь')}><CalendarDays size={24}/><span><b>{l('Всё по датам','Everything by date')}</b><small>{l('Цели, занятия и дедлайны','Goals, sessions and deadlines')}</small></span><ArrowUpRight size={18}/></button></aside>
    </div>
  </div>
}

export function ExamGoalForm({id,examId='ielts'}:{id?:string;examId?:ExamId}){
  const {s,run,edit,language}=useApp();const en=language==='en';const l=(ru:string,eng:string)=>en?eng:ru;
  const existing=s.examGoals.find(x=>x.id===id);
  const [goal,setGoal]=useState<ExamGoal>(()=>existing?structuredClone(existing):{...baseRecord(''),examId,target:'',date:'',completed:false});const {save,saving}=useSave();
  return <form className="form-stack" data-localized onSubmit={e=>{e.preventDefault();void save(d=>{const value=examGoalSchema.parse({...goal,title:goal.title.trim(),target:goal.target.trim(),updatedAt:Date.now()});const i=d.examGoals.findIndex(x=>x.id===value.id);if(i<0)d.examGoals.push(value);else d.examGoals[i]=value})}}>
    <Field label={l('Экзамен','Exam')}><Select value={goal.examId} options={Object.entries(exams).map(([id,e])=>[id,e.name])} onChange={v=>setGoal({...goal,examId:v as ExamId})}/></Field>
    <Field label={l('Моя цель','My goal')}><TextInput autoFocus required maxLength={500} value={goal.title} placeholder={en?'Your target score or next milestone':exams[goal.examId].placeholder} onChange={e=>setGoal({...goal,title:e.target.value})}/></Field>
    <Field label={l('Срок выполнения','Target date')}><TextInput required type="date" value={goal.date} onChange={e=>setGoal({...goal,date:e.target.value})}/></Field>
    <details className="form-details"><summary>{l('Уточнить результат','Add a target result')}</summary><Field label={l('Желаемый результат (необязательно)','Target result (optional)')}><TextInput maxLength={120} value={goal.target} placeholder={en?'For example: Reading 8.0':'Например: Reading 8.0'} onChange={e=>setGoal({...goal,target:e.target.value})}/></Field></details>
    <div className="form-actions">{existing&&<button type="button" className="danger" onClick={()=>void run(d=>{d.examGoals.find(x=>x.id===id)!.deletedAt=Date.now()}).then(ok=>{if(ok)edit(null)})}>{l('В корзину','Move to trash')}</button>}<button type="submit" className="primary push-right" disabled={saving}>{saving?l('Сохраняю…','Saving…'):l('Сохранить цель','Save goal')}</button></div>
  </form>
}
