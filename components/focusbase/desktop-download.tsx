'use client';
import {useEffect,useState} from 'react';
import {ArrowDownToLine,ArrowUpRight,CheckCircle2,Monitor} from 'lucide-react';
import {Modal,useApp} from './ui';
import {useSidebar} from '@/components/ui/sidebar';
import release from '@/lib/desktop-release.json';

type InstallPromptEvent=Event&{
  prompt:()=>Promise<void>;
  userChoice:Promise<{outcome:'accepted'|'dismissed';platform:string}>;
};

export function DesktopDownload(){
  const {language,go}=useApp();
  const {setOpenMobile}=useSidebar();
  const en=language==='en';
  const [desktop,setDesktop]=useState(true),[open,setOpen]=useState(false);
  const [prompt,setPrompt]=useState<InstallPromptEvent|null>(null);
  const [installed,setInstalled]=useState(false);
  const [dismissed,setDismissed]=useState(false);
  useEffect(()=>{
    const inDesktop=Boolean(window.focusbaseDesktop);
    queueMicrotask(()=>setDesktop(inDesktop));
    if(inDesktop)return;
    const media=window.matchMedia('(display-mode: standalone)');
    const syncInstalled=()=>setInstalled(media.matches||Boolean((navigator as Navigator&{standalone?:boolean}).standalone));
    const beforeInstall=(event:Event)=>{event.preventDefault();setPrompt(event as InstallPromptEvent);setDismissed(false)};
    const appInstalled=()=>{setInstalled(true);setPrompt(null);setDismissed(false)};
    syncInstalled();
    media.addEventListener('change',syncInstalled);
    window.addEventListener('beforeinstallprompt',beforeInstall);
    window.addEventListener('appinstalled',appInstalled);
    if('serviceWorker' in navigator)void navigator.serviceWorker.register('/sw.js').catch(()=>undefined);
    return ()=>{media.removeEventListener('change',syncInstalled);window.removeEventListener('beforeinstallprompt',beforeInstall);window.removeEventListener('appinstalled',appInstalled)};
  },[]);
  if(desktop)return null;
  const downloadUrl=release.downloadUrl as string|null;
  const releaseUrl=release.releaseUrl as string|null;
  const size=release.sizeBytes?`${Math.round(Number(release.sizeBytes)/1024/1024)} MB`:'';
  const install=async()=>{
    if(!prompt)return;
    await prompt.prompt();
    const choice=await prompt.userChoice;
    if(choice.outcome==='accepted')setInstalled(true);
    else setDismissed(true);
    setPrompt(null);
  };
  return <div data-localized>
    <button type="button" className="desktop-download" onClick={()=>setOpen(true)}>
      <Monitor size={19}/><span>{en?'Install app':'Установить приложение'}<small>{en?'No Windows warning':'Без предупреждения Windows'}</small></span><ArrowDownToLine size={16}/>
    </button>
    {open&&<Modal title={en?'Install ÇalışBase':'Установить ÇalışBase'} description={en?'The safe way through Chrome or Edge':'Безопасный способ через Chrome или Edge'} close={()=>setOpen(false)}>
      <div className="download-dialog" data-localized>
        <p className="download-intro">{en?'This installs the site as an app. There is no downloaded .exe file, so Windows SmartScreen does not block it.':'Сайт установится как приложение. Файл .exe не скачивается, поэтому Windows SmartScreen его не блокирует.'}</p>
        {installed?<p className="install-status"><CheckCircle2 size={18}/>{en?'ÇalışBase is already installed.':'ÇalışBase уже установлен.'}</p>:prompt?<button className="primary download-installer" type="button" onClick={()=>void install()}><ArrowDownToLine size={18}/>{en?'Install now':'Установить сейчас'}</button>:<p className="download-pending">{en?'In Chrome or Edge, click the install icon on the right side of the address bar. If it is hidden, open the ⋯ menu, choose Apps, then Install ÇalışBase.':'В Chrome или Edge нажми значок установки справа в адресной строке. Если его нет: меню ⋯ → «Приложения» → «Установить ÇalışBase».'}</p>}
        {dismissed&&<p className="download-note">{en?'Installation was cancelled. You can start it again from the browser menu.':'Установка отменена. Её можно снова запустить через меню браузера.'}</p>}
        <ol className="download-steps">
          <li>{en?'The app opens in its own window and can be pinned to the taskbar.':'Приложение откроется в отдельном окне. Его можно закрепить на панели задач.'}</li>
          <li>{en?'Sign in with the same Google account to see the same cloud workspace on the site and in the app.':'Войди через тот же Google-аккаунт. На сайте и в приложении будет одно общее пространство.'}</li>
          <li>{en?'Open it once while online. The main screen can later open without internet. Google sign-in and cloud saving need a connection.':'Один раз открой его с интернетом. Потом главный экран откроется и без сети. Для Google-входа и облачного сохранения нужен интернет.'}</li>
        </ol>
        <button className="secondary" type="button" onClick={()=>{setOpen(false);setOpenMobile(false);go('Настройки')}}>{en?'Open account settings':'Открыть настройки аккаунта'}<ArrowUpRight size={16}/></button>
        {downloadUrl&&<details className="download-verification"><summary>{en?'Extra Windows companion':'Дополнительное Windows-приложение'}</summary>
          <p>{en?'This version adds a companion that stays above other windows. Its installer is not digitally signed yet, so Windows can show a warning. The browser installation above is the recommended option.':'В этой версии есть питомец поверх других окон. Установщик пока не подписан, поэтому Windows может показать предупреждение. Способ через браузер выше безопаснее.'}</p>
          <p className="download-meta">{release.platform} · v{release.version}{size&&` · ${size}`}</p>
          <a className="secondary download-installer" href={downloadUrl} rel="noopener noreferrer"><ArrowDownToLine size={18}/>{en?'Download unsigned .exe':'Скачать неподписанный .exe'}</a>
          {release.sha256&&<p>SHA-256<code>{release.sha256}</code></p>}
          {releaseUrl&&<a href={releaseUrl} target="_blank" rel="noopener noreferrer">{en?'Release notes and verification reports':'Описание выпуска и отчёты проверки'}<ArrowUpRight size={14}/></a>}
        </details>}
      </div>
    </Modal>}
  </div>;
}
