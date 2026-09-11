'use client';
import {TodayView as BaseTodayView} from './views';
import {useApp} from './ui';
import {localDay} from '@/lib/focusbase/domain';

const quotes=[
  {jp:'千里の道も一歩から',ru:'Даже путь в тысячу ли начинается с одного шага.',roman:'Senri no michi mo ippo kara'},
  {jp:'七転び八起き',ru:'Упал семь раз — встань восемь.',roman:'Nana korobi ya oki'},
  {jp:'継続は力なり',ru:'Постоянство со временем становится силой.',roman:'Keizoku wa chikara nari'},
  {jp:'雨垂れ石を穿つ',ru:'Капля точит камень — маленькие усилия складываются.',roman:'Amadare ishi o ugatsu'},
  {jp:'急がば回れ',ru:'Если торопишься, выбери путь, который не придётся переделывать.',roman:'Isogaba maware'},
  {jp:'一期一会',ru:'Этот момент бывает только один раз — побудь в нём внимательно.',roman:'Ichi-go ichi-e'},
  {jp:'初心忘るべからず',ru:'Не забывай, с чего начал.',roman:'Shoshin wasuru bekarazu'},
] as const;

export function DailyQuote(){
  const {s}=useApp();
  const day=localDay(s.settings.timezone);
  const seed=day.split('-').reduce((sum,n)=>sum+Number(n),0);
  const quote=quotes[seed%quotes.length];
  return <section className="daily-quote" aria-label={quote.ru}><p className="daily-quote-japanese">{quote.jp}</p><p className="daily-quote-translation">{quote.ru}</p></section>;
}

export function TodayView(){return <><DailyQuote/><BaseTodayView/></>}
