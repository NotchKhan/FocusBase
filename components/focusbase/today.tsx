'use client';
import {TodayView as BaseTodayView} from './views';
import {useApp,Field,TextArea,TextInput} from './ui';
import {localDay} from '@/lib/focusbase/domain';
import {useEffect,useState} from 'react';
import {Pencil,RotateCcw} from 'lucide-react';
import {translateText} from './i18n';

const quotes=[
  {jp:'誰もあなたを救わない',ru:'Никто не придёт спасать твой план.'},
  {jp:'時間は戻らない',ru:'Время не вернётся. Пропущенная практика сама не станет навыком.'},
  {jp:'行動が結果を作る',ru:'Намерение ничего не меняет. Меняет только действие.'},
  {jp:'今日を捨てるな',ru:'Каждый отданный прокрастинации день потом оплачивается усилием.'},
  {jp:'才能より継続',ru:'Талант без повторений проигрывает тому, кто продолжает.'},
  {jp:'現実を見る',ru:'Цель не обязана случиться. Без часов работы это только желание.'},
  {jp:'自分に勝つ',ru:'Самая неприятная конкуренция — с версией себя, которой ты мог стать.'},
] as const;

export function DailyQuote(){
  const {s,edit,language}=useApp();
  const [now,setNow]=useState(Date.now());
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),60000);return()=>clearInterval(timer)},[]);
  const day=localDay(s.settings.timezone,now);
  const seed=Math.floor(Date.parse(day+'T12:00:00Z')/86400000);
  const quote=quotes[seed%quotes.length];
  const custom=s.settings.customQuote.trim();const jp=custom?s.settings.customQuoteJapanese:quote.jp;
  return <section className="daily-quote" data-localized><button className="quote-edit-button" aria-label={language==='en'?'Change quote':'Изменить цитату'} title={language==='en'?'Change quote':'Изменить цитату'} onClick={()=>edit({kind:'quote'})}><Pencil size={15}/></button>{jp&&<p className="daily-quote-japanese" lang="ja">{jp}</p>}<p className="daily-quote-translation" data-no-translate>{custom||translateText(quote.ru,language)}</p></section>;
}

export function QuoteForm(){
  const {s,run,edit,language}=useApp();const en=language==='en';const l=(ru:string,eng:string)=>en?eng:ru;
  const [quote,setQuote]=useState(s.settings.customQuote),[japanese,setJapanese]=useState(s.settings.customQuoteJapanese),[saving,setSaving]=useState(false);
  const save=async(reset=false)=>{setSaving(true);const ok=await run(d=>{d.settings.customQuote=reset?'':quote.trim();d.settings.customQuoteJapanese=reset?'':japanese.trim()},l('Цитата обновлена','Quote updated'));setSaving(false);if(ok)edit(null)};
  return <form className="form-stack" data-localized onSubmit={e=>{e.preventDefault();if(quote.trim())void save()}}>
    <Field label={l('Твоя цитата','Your quote')}><TextArea autoFocus required maxLength={240} rows={3} value={quote} onChange={e=>setQuote(e.target.value)} placeholder={l('Слова, которые двигают именно тебя.','Words that move you forward.')}/></Field><p className="muted quote-counter">{quote.length}/240</p>
    <details className="form-details"><summary>{l('Маленькая строка сверху (необязательно)','Small line above (optional)')}</summary><Field label={l('Декоративная строка','Decorative line')}><TextInput maxLength={80} value={japanese} onChange={e=>setJapanese(e.target.value)} placeholder="一歩ずつ"/></Field></details>
    {quote.trim()&&<div className="quote-preview" data-no-translate>{japanese&&<small>{japanese}</small>}<p>{quote}</p></div>}
    <div className="form-actions"><button className="secondary" type="button" disabled={saving} onClick={()=>void save(true)}><RotateCcw size={16}/>{l('Автоматические цитаты','Daily quotes')}</button><button className="primary push-right" type="submit" disabled={saving||!quote.trim()}>{saving?l('Сохраняю…','Saving…'):l('Поставить свою','Use my quote')}</button></div>
  </form>
}

export function TodayView(){
  const {s,language}=useApp();
  const date=new Intl.DateTimeFormat(language==='en'?'en-US':'ru-RU',{timeZone:s.settings.timezone,weekday:'long',day:'numeric',month:'long'}).format(Date.now());
    return <><div className="today-heading-row"><div className="today-heading-copy"><p className="eyebrow">СЕГОДНЯ</p><h1>Сегодня</h1><p className="today-heading-date">{date}</p></div><span className="today-heading-divider" aria-hidden="true"/><DailyQuote/></div><BaseTodayView/></>;
}
