'use client';
import {useApp} from './ui';
export function StorageExplanation(){
  const {language}=useApp();const en=language==='en';
  return <div data-localized className="muted"><p>{en?'Your records are stored locally in this browser (IndexedDB), not in a shared server database. Visitors using other devices or browser profiles have separate workspaces.':'Записи хранятся локально в этом браузере (IndexedDB), а не в общей серверной базе. У посетителей на других устройствах или в других профилях браузера — отдельные пространства.'}</p><p className="tail-note">{en?'There are no accounts or automatic sync. People sharing the same browser profile share this workspace; use separate browser profiles on a shared computer. Transfer data to another device using a JSON backup.':'Аккаунтов и автоматической синхронизации нет. Люди в одном профиле браузера используют общее пространство; на общем компьютере используйте разные профили браузера. Для переноса на другое устройство сохраните JSON-копию.'}</p></div>;
}
