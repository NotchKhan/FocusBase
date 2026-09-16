'use client';
import {useId} from 'react';
import {Timer} from 'lucide-react';
import {TextInput,useApp} from './ui';

export function TaskDuration({value,onChange,compact=false}:{value:string;onChange:(value:string)=>void;compact?:boolean}){
  const {language}=useApp();const en=language==='en';const id=useId();
  return <div data-localized className={compact?'task-duration-compact':'task-duration'}>
    <label htmlFor={id}>{!compact&&<Timer size={17}/>} {en?'Duration, minutes':'Длительность, минут'}</label>
    <div className="task-duration-controls"><TextInput id={id} name="taskMinutes" type="number" inputMode="numeric" min={1} max={1440} step={1} required value={value} onChange={e=>onChange(e.target.value)} aria-describedby={compact?undefined:id+'-hint'}/>
      {!compact&&<div className="task-duration-presets">{[15,25,45,60,90].map(n=><button key={n} type="button" className="secondary" aria-pressed={value===String(n)} onClick={()=>onChange(String(n))}>{n}</button>)}</div>}
    </div>
    {!compact&&<p id={id+'-hint'}>{en?'Focus starts with this duration. Enter any whole number from 1 to 1440.':'Фокус запустится на это время. Можно указать любое целое число от 1 до 1440.'}</p>}
  </div>;
}
