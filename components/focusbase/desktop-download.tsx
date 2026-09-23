'use client';
import {useEffect,useState} from 'react';
import {ArrowDownToLine,ArrowUpRight,Monitor} from 'lucide-react';
import {Modal,useApp} from './ui';
import {useSidebar} from '@/components/ui/sidebar';
import release from '@/lib/desktop-release.json';

export function DesktopDownload(){
  const {language,go}=useApp();
  const {setOpenMobile}=useSidebar();
  const en=language==='en';
  const [desktop,setDesktop]=useState(true),[open,setOpen]=useState(false);
  useEffect(()=>{queueMicrotask(()=>setDesktop(Boolean(window.focusbaseDesktop)))},[]);
  if(desktop)return null;
  const downloadUrl=release.downloadUrl as string|null;
  const releaseUrl=release.releaseUrl as string|null;
  const size=release.sizeBytes?`${Math.round(Number(release.sizeBytes)/1024/1024)} MB`:'';
  return <div data-localized>
    <button type="button" className="desktop-download" onClick={()=>setOpen(true)}>
      <Monitor size={19}/><span>{en?'Download app':'Скачать приложение'}<small>Windows · NEXERA</small></span><ArrowDownToLine size={16}/>
    </button>
    {open&&<Modal title={en?'ÇalışBase for Windows':'ÇalışBase для Windows'} description={en?'Installation and updates':'Установка и обновление'} close={()=>setOpen(false)}>
      <div className="download-dialog" data-localized>
        <p className="download-intro">{en?'Your study space, with a companion that stays above other windows.':'Твоё учебное пространство и питомец, который остаётся поверх других окон.'}</p>
        <p className="download-meta">{release.platform} · v{release.version}{size&&` · ${size}`}<br/>{en?'Publisher':'Издатель'}: {release.publisher}</p>
        {downloadUrl?<a className="primary download-installer" href={downloadUrl} rel="noopener noreferrer"><ArrowDownToLine size={18}/>{en?'Download installer .exe':'Скачать установщик .exe'}</a>:<p role="status" className="download-pending">{en?'The installer is being verified. Download will appear here once the checks pass.':'Установщик проходит проверку. Скачивание появится здесь после завершения проверок.'}</p>}
        <ol className="download-steps">
          <li>{en?'Open the downloaded installer. Then launch ÇalışBase from the Start menu or desktop shortcut.':'Открой скачанный установщик. Затем запусти ÇalışBase через меню «Пуск» или ярлык на рабочем столе.'}</li>
          <li>{en?'Already installed? Quit the app using its tray menu, then run the new installer under the same Windows account. Your workspace stays in place.':'Приложение уже установлено? Выйди из него через меню значка рядом с часами и запусти новый установщик в той же учётной записи Windows. Твоё пространство сохранится.'}</li>
          <li>{en?'Browser and app storage are separate. Export a JSON backup in Settings, then import it in the app. Make a backup before updating too.':'У сайта и приложения отдельные хранилища. Экспортируй JSON-копию в настройках сайта и импортируй её в приложении. Перед обновлением тоже сделай копию.'}</li>
        </ol>
        <button className="secondary" type="button" onClick={()=>{setOpen(false);setOpenMobile(false);go('Настройки')}}>{en?'Open backup settings':'Открыть настройки и копии'}<ArrowUpRight size={16}/></button>
        {downloadUrl&&<details className="download-verification"><summary>{en?'File verification':'Проверка файла'}</summary>
          <p>{release.signed?(en?'Digitally signed installer.':'Установщик подписан цифровой подписью.'):(en?'NEXERA is listed in the application metadata. This release has no digital publisher signature; Windows may display “Unknown publisher”. If antivirus blocks it, wait for the review instead of disabling protection.':'NEXERA указана в сведениях приложения. У этого выпуска нет цифровой подписи издателя: Windows может показать «Неизвестный издатель». Если антивирус блокирует файл, дождись проверки, не отключая защиту.')}</p>
          {release.sha256&&<p>SHA-256<code>{release.sha256}</code></p>}
          {releaseUrl&&<a href={releaseUrl} target="_blank" rel="noopener noreferrer">{en?'Release notes and verification reports':'Описание выпуска и отчёты проверки'}<ArrowUpRight size={14}/></a>}
        </details>}
      </div>
    </Modal>}
  </div>;
}
