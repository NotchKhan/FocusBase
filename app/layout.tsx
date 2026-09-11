import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title:'FocusBase — личное пространство для учёбы', description:'Задачи, материалы, заметки и фокус в одном рабочем пространстве.', icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ru" suppressHydrationWarning><body>{children}</body></html>}
