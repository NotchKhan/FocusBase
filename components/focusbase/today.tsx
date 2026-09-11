'use client';
import {TodayView as BaseTodayView} from './views';
import {useApp} from './ui';
import {localDay} from '@/lib/focusbase/domain';

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
  const {s}=useApp();
  const day=localDay(s.settings.timezone);
  const seed=day.split('-').reduce((sum,n)=>sum+Number(n),0);
  const quote=quotes[seed%quotes.length];
  return <section className="daily-quote" aria-label={quote.ru}><p className="daily-quote-japanese">{quote.jp}</p><p className="daily-quote-translation">{quote.ru}</p></section>;
}

export function TodayView(){
  const {s}=useApp();
  const date=new Intl.DateTimeFormat('ru',{timeZone:s.settings.timezone,weekday:'long',day:'numeric',month:'long'}).format(Date.now());
  return <><div className="today-heading-row"><div className="today-heading-copy"><p className="eyebrow">СЕГОДНЯ</p><h1>Сегодня</h1><p className="today-heading-date">{date}</p></div><DailyQuote/></div><BaseTodayView/></>;
}
