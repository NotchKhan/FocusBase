'use client';
import {useEffect,useRef,useState} from 'react';
import {useApp} from './ui';

// The desktop preference is shared by the tray, native menu and all app controls.
export function useCompanionVisibility(){
  const {s,run,language}=useApp();
  const [native,setNative]=useState<boolean|null>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const locked=useRef(false);
  useEffect(()=>{
    const bridge=window.focusbaseDesktop;if(!bridge)return;
    let alive=true;
    const refresh=()=>void bridge.getEnabled().then(value=>{if(alive)setNative(value)}).catch(()=>{if(alive)setError(language==='en'?'Could not read icon settings':'Не удалось прочитать настройки иконки')});
    refresh();window.addEventListener('focus',refresh);
    const off=bridge.onEnabled(value=>{if(alive)setNative(value)});
    return()=>{alive=false;off();window.removeEventListener('focus',refresh)};
  },[language]);
  async function change(value:boolean){
    if(locked.current)return;locked.current=true;setBusy(true);setError('');
    try{
      const bridge=window.focusbaseDesktop;
      if(bridge)setNative(await bridge.setEnabled(value));
      else await run(d=>{d.settings.companionVisible=value});
    }catch{setError(language==='en'?'Could not change icon settings':'Не удалось изменить настройки иконки')}
    finally{locked.current=false;setBusy(false)}
  }
  return {available:native!==null,enabled:native??s.settings.companionVisible,busy,error,change};
}
