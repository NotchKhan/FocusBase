import {baseRecord,canonicalUrl,resourceSchema,tableSchema,uid,type State,type Resource} from './domain';

type Copy=[string,string];
export type SchoolResource={id:string;title:string;subject:Copy;level:Copy;language:string;url:string;step:Copy;direction:string;type:Resource['type']};
// Source pages checked 2026-09-14. Suggested starting exercises are editorial guidance.
export const schoolResources:SchoolResource[]=[
  {id:'english',title:'British Council · LearnEnglish Teens',subject:['Английский','English'],level:['A2–B2','A2–B2'],language:'EN',url:'https://learnenglishteens.britishcouncil.org/skills',step:['Выбери свой уровень. Выполни одно Listening, затем проверь ответы по тексту.','Choose your level. Complete one listening lesson, then check against the transcript.'],direction:'Английский / IELTS',type:'Курс'},
  {id:'ielts',title:'IELTS · Academic sample tests',subject:['IELTS','IELTS'],level:['Знакомство с экзаменом','Exam practice'],language:'EN',url:'https://ielts.org/take-a-test/preparation-resources/sample-test-questions/academic-test',step:['Реши один Reading passage с таймером. Для каждой ошибки найди подтверждение в тексте.','Time one reading passage. Find evidence in the text for each incorrect answer.'],direction:'Английский / IELTS',type:'Документ'},
  {id:'math',title:'Khan Academy · Math',subject:['Математика','Math'],level:['Школьная программа','School mathematics'],language:'EN',url:'https://www.khanacademy.org/math',step:['Выбери тему, которая даётся трудно. Посмотри объяснение и реши упражнения без подсказок.','Choose a difficult topic. Watch its explanation, then try the exercises without hints.'],direction:'Школа',type:'Курс'},
  {id:'science',title:'PhET · Interactive Simulations',subject:['Физика и химия','Physics & chemistry'],level:['Школьные темы','School topics'],language:'EN · RU',url:'https://phet.colorado.edu/',step:['Открой симуляцию по текущей теме. Предскажи результат, измени один параметр и запиши вывод.','Open a simulation on your current topic. Predict a result, change one variable, and record your conclusion.'],direction:'Школа',type:'Инструмент'},
  {id:'biology',title:'Khan Academy · Biology',subject:['Биология','Biology'],level:['Основы и углубление','Foundations and beyond'],language:'EN',url:'https://www.khanacademy.org/science/biology',step:['Начни с клетки или генетики. После урока нарисуй схему по памяти и проверь себя.','Start with cells or genetics. Draw a diagram from memory after the lesson and check it.'],direction:'Школа',type:'Курс'},
  {id:'coding',title:'Harvard · CS50x',subject:['Программирование','Programming'],level:['Старшие классы · сложнее','Older students · challenging'],language:'EN',url:'https://cs50.harvard.edu/x/',step:['Начни с Week 0: Scratch. Разбей лекцию на короткие части и сделай свой маленький проект.','Start with Week 0: Scratch. Break the lecture into short sessions and build a small project.'],direction:'Программирование',type:'Курс'},
];
export function saveSchoolResource(s:State,item:SchoolResource,en=false){
  const existing=s.resources.find(r=>!r.deletedAt&&canonicalUrl(r.url)===canonicalUrl(item.url));
  if(existing){existing.archived=false;return existing.id}
  const r=resourceSchema.parse({...baseRecord(item.title),url:item.url,type:item.type,direction:item.direction,why:item.step[en?1:0],collection:en?'School resources':'Материалы для школьников'});s.resources.push(r);return r.id;
}
export function schoolTable(en=false){
  const titles=en?['Subject','Resource','Level','Language','Link','First step','Completed']:['Предмет','Ресурс','Уровень','Язык','Ссылка','Первый шаг','Изучено'];
  const columns=titles.map((title,i)=>({id:uid(),title,type:i===4?'Ссылка' as const:i===6?'Checkbox' as const:'Текст' as const,options:[],currency:'KZT',pinned:i===0}));
  return tableSchema.parse({...baseRecord(en?'School resources':'Материалы для школьников'),columns,rows:schoolResources.map(r=>({id:uid(),deletedAt:null,cells:Object.fromEntries([r.subject[en?1:0],r.title,r.level[en?1:0],r.language,r.url,r.step[en?1:0],false].map((value,i)=>[columns[i].id,value]))}))});
}
