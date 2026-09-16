'use client';
import {useEffect,useState} from 'react';
import {Monitor} from 'lucide-react';
import {useApp,Check,type Edit} from './ui';
declare global{interface Window{focusbaseDesktop?:{mini:boolean;getEnabled:()=>Promise<boolean>;setEnabled:(value:boolean)=>Promise<boolean>;setExpanded:(value:boolean)=>Promise<void>;drag:(phase:'start'|'move'|'end')=>void;showMenu:(english:boolean)=>void;onEnabled:(callback:(enabled:boolean)=>void)=>()=>void;open:(payload:{view?:string;edit?:Edit})=>Promise<void>;onOpen:(callback:(payload:{view?:string;edit?:Edit})=>void)=>()=>void}}}
export function DesktopSettings(){
  const {s,run,language}=useApp();const en=language==='en';const [available,setAvailable]=useState(false),[enabled,setEnabled]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  useEffect(()=>{
    const bridge=window.focusbaseDesktop;if(!bridge)return;setAvailable(true);
    const refresh=()=>void bridge.getEnabled().then(setEnabled).catch(()=>setError(en?'Unable to read desktop settings':'Не удалось прочитать настройки'));
    refresh();window.addEventListener('focus',refresh);const unsubscribe=bridge.onEnabled?.(setEnabled);
    return()=>{window.removeEventListener('focus',refresh);unsubscribe?.()};
  },[en]);
  return <section data-localized className="panel form-stack"><h2><Monitor size={21}/> {en?'FocusBase icon':'Иконка FocusBase'}</h2>
    {available?<>
      <Check checked={enabled} onChange={async value=>{if(busy)return;setBusy(true);try{setEnabled(await window.focusbaseDesktop!.setEnabled(value));setError('')}catch{setError(en?'Could not change desktop settings':'Не удалось изменить настройки')}finally{setBusy(false)}}}>{en?'Show above other windows':'Показывать поверх других окон'}</Check>
      <p className="muted">{en?'Drag the icon to move it. Right-click → Hide icon removes it from the desktop. Enable this switch to bring it back.':'Перетаскивай иконку мышью. ПКМ → «Убрать иконку» скроет её с рабочего стола. Этот переключатель вернёт её обратно.'}</p>
      <p className="muted">{en?'Closing the main window keeps the visible companion running. Use the tray menu to quit completely.':'После закрытия главного окна включённый питомец продолжит работать. Полностью выйти можно через значок FocusBase рядом с часами Windows.'}</p>
      <p className="muted">{en?'Browser and desktop data are separate. Transfer your workspace using a JSON backup below.':'У браузера и настольной версии отдельные данные. Перенеси своё пространство через JSON-копию в разделе ниже.'}</p>
    </>:<>
      <Check checked={s.settings.companionVisible} onChange={value=>void run(d=>{d.settings.companionVisible=value})}>{en?'Show quick access icon':'Показывать иконку быстрого доступа'}</Check>
      <p className="muted">{en?'Right-click the icon → Hide icon. You can bring it back here. Hiding it keeps your tasks and timer.':'ПКМ по иконке → «Убрать иконку». Вернуть её можно здесь. Задачи и таймер сохранятся.'}</p>
      <p className="muted">{en?'To keep the icon outside the browser, use FocusBase Desktop for Windows and enable “Show above other windows”.':'Для иконки за пределами браузера используй FocusBase Desktop для Windows и включи «Показывать поверх других окон».'}</p>
    </>}{error&&<p role="alert">{error}</p>}</section>;
}
