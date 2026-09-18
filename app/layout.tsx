import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import '@/components/focusbase/learning.css';
import '@/components/focusbase/companion.css';
import '@/components/focusbase/study.css';
import '@/components/focusbase/task-activity.css';
export const metadata: Metadata = { title:'FocusBase — личное пространство для учёбы', description:'Задачи, материалы, заметки и фокус в одном рабочем пространстве.', icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ru" suppressHydrationWarning><body>{children}{process.env.FOCUSBASE_DESKTOP !== '1' && <Analytics />}</body></html>}
