import type {State,EntityKind} from './domain';

// Forms hold snapshots. Reject stale saves instead of resurrecting deleted records
// or overwriting work from another tab / desktop window.
export function assertUnchanged(s:State,kind:EntityKind,id:string,expected:unknown){
  const current=s[kind].find(item=>item.id===id)??null;
  if(JSON.stringify(current)!==JSON.stringify(expected??null))
    throw Error('Запись изменилась в другом окне. Скопируйте изменения и откройте её заново.');
}
