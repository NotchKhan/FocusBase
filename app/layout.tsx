import type {Metadata,Viewport} from 'next';
import { SiteAnalytics } from '@/components/site-analytics';
import './globals.css';
import '@/components/focusbase/learning.css';
import '@/components/focusbase/companion.css';
import '@/components/focusbase/study.css';
import '@/components/focusbase/task-activity.css';
import '@/components/focusbase/desktop-download.css';
export const metadata:Metadata={title:'ÇalışBase — личное пространство для учёбы',description:'Задачи, материалы, заметки и фокус в одном рабочем пространстве.',applicationName:'ÇalışBase',manifest:'/manifest.webmanifest',icons:{icon:'/favicon.svg',apple:'/app-icon.png'},appleWebApp:{capable:true,title:'ÇalışBase',statusBarStyle:'default'}};
export const viewport:Viewport={themeColor:'#081f3f'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ru" suppressHydrationWarning><body>{children}{process.env.FOCUSBASE_DESKTOP !== '1' && <SiteAnalytics />}</body></html>}
