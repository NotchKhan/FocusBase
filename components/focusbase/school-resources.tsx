'use client';
import {useState} from 'react';
import {BookmarkPlus,Check,Table2,GraduationCap} from 'lucide-react';
import {Table,TableHeader,TableHead,TableBody,TableRow,TableCell} from '@/components/ui/table';
import {schoolResources,schoolTable,saveSchoolResource} from '@/lib/focusbase/school';
import {canonicalUrl,visible} from '@/lib/focusbase/domain';
import {useApp,SafeLink} from './ui';

export function SchoolResources(){
  const {s,run,go,edit,language}=useApp();const en=language==='en';const l=(ru:string,eng:string)=>en?eng:ru;
  const [busy,setBusy]=useState('');
  return <section data-localized className="school-resources"><div className="school-heading"><div><h2><GraduationCap size={22}/>{l('Для школьной учёбы','For school and study')}</h2><p>{l('Выбери предмет и начни с одного упражнения. Полезное можно сохранить в библиотеку.','Choose a subject and start with one exercise. Save useful resources to your library.')}</p></div><button disabled={!!busy} className="secondary" onClick={async()=>{setBusy('table');const ok=await run(d=>{d.tables.push(schoolTable(en))},l('Таблица добавлена в «Мои таблицы»','Added to My tables'));setBusy('');if(ok)go('Мои таблицы')}}><Table2 size={17}/>{l('В мою таблицу','Copy to My tables')}</button></div>
    <Table className="school-table"><TableHeader><TableRow>{[l('Предмет','Subject'),l('Материал','Resource'),l('С чего начать','Where to start'),l('В библиотеку','Library')].map(label=><TableHead key={label}>{label}</TableHead>)}</TableRow></TableHeader><TableBody>{schoolResources.map(r=>{const saved=s.resources.find(x=>visible(x)&&canonicalUrl(x.url)===canonicalUrl(r.url));return <TableRow key={r.id}><TableCell><strong>{r.subject[en?1:0]}</strong><small>{r.level[en?1:0]}</small></TableCell><TableCell><SafeLink url={r.url}>{r.title}</SafeLink><small>{r.language}</small></TableCell><TableCell>{r.step[en?1:0]}</TableCell><TableCell><button className="secondary" disabled={!!busy} onClick={async()=>{if(saved){edit({kind:'resources',id:saved.id});return}setBusy(r.id);await run(d=>{saveSchoolResource(d,r,en)},l('Материал сохранён','Resource saved'));setBusy('')}}>{saved?<Check size={16}/>:<BookmarkPlus size={16}/>} {saved?l('Сохранено','Saved'):l('Сохранить','Save')}</button></TableCell></TableRow>})}</TableBody></Table>
  </section>
}
