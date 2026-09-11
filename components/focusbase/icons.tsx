import {BookOpen,FileText,Film,GraduationCap,Link2,Wrench,Headphones,Languages,Calculator,Landmark,PenLine,Mic,Target,CalendarDays,ListTodo,NotebookPen,LibraryBig,type LucideIcon} from 'lucide-react';

export const resourceIcons:Record<string,LucideIcon>={'Ссылка':Link2,'Статья':FileText,'Видео':Film,'Курс':GraduationCap,'Учебник':BookOpen,'Документ':FileText,'Инструмент':Wrench};
export const sectionIcons:Record<string,LucideIcon>={listening:Headphones,reading:BookOpen,writing:PenLine,speaking:Mic,'reading-writing':Languages,math:Calculator,history:Landmark,'math-literacy':Calculator,'reading-literacy':BookOpen,profile:GraduationCap};
export const entityIcons:Record<string,LucideIcon>={tasks:ListTodo,resources:LibraryBig,notes:NotebookPen,calendarEvents:CalendarDays,examGoals:Target};
export function ResourceIcon({type,small=false}:{type:string;small?:boolean}){const Icon=resourceIcons[type]||Link2;return <span className={'resource-symbol '+(small?'is-small':'')} data-type={type} aria-hidden="true"><Icon size={small?17:21} strokeWidth={1.8}/></span>}
