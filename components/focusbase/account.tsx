'use client';
import './account.css';
import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import type {Session,User} from '@supabase/supabase-js';
import {Cloud,Focus,LogOut,ShieldCheck} from 'lucide-react';
import {cloudBackend,cloudClient,cloudEnabled,signInRedirect} from '@/lib/focusbase/cloud';
import {configureWorkspace,suspendWorkspace,readLocalWorkspace,download} from '@/lib/focusbase/store';
import {backup,kinds,parseBackup,type State} from '@/lib/focusbase/domain';
import {useApp} from './ui';

type Account={enabled:boolean;user:User|null;error:string;signIn:()=>Promise<void>;signOut:()=>Promise<void>};
const AccountContext=createContext<Account>({enabled:false,user:null,error:'',signIn:async()=>{},signOut:async()=>{}});
export const useAccount=()=>useContext(AccountContext);

export function AccountBoundary({children}:{children:ReactNode}){
  return cloudEnabled?<ConnectedBoundary>{children}</ConnectedBoundary>:children;
}
function ConnectedBoundary({children}:{children:ReactNode}){
  const [mode,setMode]=useState<'loading'|'gate'|'guest'|'account'>('loading');
  const [user,setUser]=useState<User|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[en,setEn]=useState(false);
  const identity=useRef<string|null|undefined>(undefined),sequence=useRef(0);
  useEffect(()=>{
    let live=true;identity.current=undefined;
    queueMicrotask(()=>{if(live){try{setEn(localStorage.getItem('focusbase-language')==='en')}catch{}}});
    if(window.focusbaseDesktop?.smoke){
      const ticket=++sequence.current;
      void configureWorkspace(null).then(()=>{if(live&&ticket===sequence.current){setMode('guest');setError('')}}).catch(()=>{if(live)setMode('gate')});
      return()=>{live=false;suspendWorkspace()};
    }
    const transition=(session:Session|null,event:string)=>{
      if(!live)return;
      const id=session?.user.id??null;
      if(identity.current===id&&event!=='SIGNED_OUT')return;
      identity.current=id;const ticket=++sequence.current;
      suspendWorkspace();setUser(null);setMode(id?'loading':'gate');
      if(!session)return;
      // Leave the auth callback before awaiting SDK requests.
      void Promise.resolve().then(async()=>{
        try{
          const result=await cloudClient().auth.getUser(session.access_token);
          if(!live||ticket!==sequence.current)return;
          if(result.error||result.data.user?.id!==id)throw Error('Не удалось проверить вход. Проверь соединение и войди снова.');
          await configureWorkspace(cloudBackend(id!));
          if(!live||ticket!==sequence.current)return;
          setUser(result.data.user);setMode('account');setError('');
        }catch(e){if(live&&ticket===sequence.current){identity.current=undefined;suspendWorkspace();setError(e instanceof Error?e.message:'Ошибка входа');setMode('gate')}}
      });
    };
    try{
      const auth=cloudClient().auth;
      const {data:{subscription}}=auth.onAuthStateChange((event,session)=>transition(session,event));
      void auth.getSession().then(({error:failure})=>{
        if(!live)return;
        const url=new URL(window.location.href);
        if(failure||url.searchParams.has('error')){setError('Вход не завершён. Попробуй ещё раз.');if(!identity.current)setMode('gate')}
        if(url.searchParams.has('code')||url.searchParams.has('error')){
          for(const key of ['code','error','error_code','error_description'])url.searchParams.delete(key);
          history.replaceState(null,'',url.pathname+url.search+url.hash);
        }
      }).catch(()=>{if(live){setMode('gate');setError('Сервис входа недоступен. Попробуй позже.')}});
      return()=>{live=false;subscription.unsubscribe();suspendWorkspace()};
    }catch(e){queueMicrotask(()=>{if(live){setError(e instanceof Error?e.message:'Ошибка настройки');setMode('gate')}})}
    return()=>{live=false;suspendWorkspace()};
  },[]);
  const signIn=async()=>{
    setBusy(true);setError('');
    try{const desktop=window.focusbaseDesktop;const {data,error}=await cloudClient().auth.signInWithOAuth({provider:'google',options:{redirectTo:signInRedirect(),skipBrowserRedirect:Boolean(desktop),queryParams:{prompt:'select_account'}}});if(error)throw error;if(desktop){if(!data.url||!await desktop.openAuth(data.url))throw Error('OAuth launch failed')}}
    catch{setError(en?'Google sign-in is unavailable. Check your connection or try again later.':'Вход через Google пока недоступен. Проверь соединение или попробуй позже.');setBusy(false)}
  };
  const signOut=async()=>{
    ++sequence.current;identity.current=null;suspendWorkspace();setUser(null);setMode('gate');setBusy(true);
    try{await cloudClient().auth.signOut({scope:'local'})}catch{setError(en?'Could not contact the sign-in service.':'Не удалось связаться с сервисом входа.')}finally{setBusy(false)}
  };
  const guest=async()=>{
    setBusy(true);++sequence.current;identity.current=null;
    try{
      // A failed/revoked session must not silently reactivate over a guest workspace.
      await cloudClient().auth.signOut({scope:'local'});
    }catch{}
    const ticket=++sequence.current;
    await configureWorkspace(null);
    if(ticket!==sequence.current){setBusy(false);return}
    setUser(null);setMode('guest');setError('');setBusy(false);
  };
  const context:Account={enabled:true,user,error,signIn,signOut};
  if(mode==='account'||mode==='guest')return <AccountContext.Provider value={context}>{error&&<p data-localized className="error-banner" role="alert">{error}<button onClick={()=>setError('')}>{en?'Dismiss':'Закрыть'}</button></p>}<div key={user?.id||'guest'}>{children}</div></AccountContext.Provider>;
  return <main className="account-screen" data-localized>
    <div className="account-card"><div className="account-brand"><span className="brand-mark"><Focus size={23}/></span><b>ÇalışBase</b><div className="language-toggle"><button aria-pressed={!en} onClick={()=>{setEn(false);localStorage.setItem('focusbase-language','ru')}}>RU</button><button aria-pressed={en} onClick={()=>{setEn(true);localStorage.setItem('focusbase-language','en')}}>EN</button></div></div>
      <p className="eyebrow">{en?'YOUR OWN SPACE':'ТВОЁ ПРОСТРАНСТВО'}</p>
      <h1>{en?'Your plans.\nAlways with you.':'Твои планы.\nВсегда с тобой.'}</h1>
      <p className="account-description">{en?'Tasks, notes and study progress — one account on the website and in the app.':'Задачи, заметки и прогресс в учёбе — один аккаунт на сайте и в приложении.'}</p>
      {mode==='loading'?<p role="status">{en?'Opening your workspace…':'Открываем твоё пространство…'}</p>:<>
        <button className="primary account-google" disabled={busy} onClick={()=>void signIn()}><span aria-hidden="true">G</span>{busy?(en?'Please wait…':'Подожди…'):(en?'Continue with Google':'Продолжить с Google')}</button>
        <p className="account-fineprint">{en?'Your account is created on first sign-in. Your email and profile are used to identify your account. Workspace data is stored in Supabase.':'При первом входе аккаунт создастся автоматически. Почта и профиль нужны для входа, записи пространства хранятся в Supabase.'}</p>
        <button className="secondary account-guest" disabled={busy} onClick={()=>void guest()}>{en?'Continue without an account':'Продолжить без аккаунта'}</button>
        <p className="account-fineprint">{en?'Existing records stay on this device. You decide whether to copy them to your account.':'Прежние записи остаются на устройстве. Ты сам решаешь, переносить ли их в аккаунт.'}</p>
      </>}
      {error&&<p role="alert" className="notice">{error}</p>}
      {mode==='loading'&&<button className="text-link" onClick={()=>void signOut()}>{en?'Back to sign-in':'Вернуться ко входу'}</button>}
      <div className="account-security"><ShieldCheck size={16}/>{en?'Each account has its own workspace':'У каждого аккаунта — своё пространство'}</div>
    </div><span className="account-signature">NEXERA · ÇalışBase</span>
  </main>;
}
export function AccountProfile(){
  const account=useAccount();const {language}=useApp();const en=language==='en';
  if(!account.enabled)return <div className="profile"><span>Я</span><div>{en?'My workspace':'Моё пространство'}<small>{en?'Study · projects · growth':'Учёба · проекты · развитие'}</small></div></div>;
  return <div className="account-profile" data-localized><Cloud size={18}/><div><b>{account.user?(en?'My account':'Мой аккаунт'):(en?'On this device':'На этом устройстве')}</b><small data-no-translate>{account.user?.email||(en?'Without sync':'Без синхронизации')}</small></div><button className="text-link" onClick={()=>void(account.user?account.signOut():account.signIn())}>{account.user?<LogOut size={17} aria-label={en?'Sign out':'Выйти'}/>:en?'Sign in':'Войти'}</button></div>;
}
export function AccountPanel(){
  const account=useAccount();const {s,run,language}=useApp();const en=language==='en';
  const [local,setLocal]=useState<State|null>(null),[preview,setPreview]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  useEffect(()=>{let live=true;if(account.user)void readLocalWorkspace().then(value=>{if(live)setLocal(value)}).catch(()=>{});return()=>{live=false}},[account.user]);
  if(!account.enabled)return null;
  const count=local?kinds.reduce((sum,k)=>sum+local[k].length,0):0;
  return <section className="panel form-stack" data-localized><h2>{en?'Account & sync':'Аккаунт и синхронизация'}</h2>
    {account.user?<><p data-no-translate>{account.user.email}</p><p className="muted">{en?'Changes are saved after server confirmation. Internet access is required; other devices refresh within 30 seconds or when you return to the tab.':'Изменения сохраняются после подтверждения сервера. Нужен интернет; другие устройства обновляются в течение 30 секунд или при возвращении во вкладку.'}</p><button className="secondary" onClick={()=>void account.signOut()}>{en?'Sign out on this device':'Выйти на этом устройстве'}</button>
      {local&&count>0&&s.revision===0&&<div className="account-import"><h3>{en?'Records found on this device':'На устройстве есть записи'}</h3><p>{en?`${count} records. Copy them into this empty account? The local original will stay here.`:`Записей: ${count}. Можно скопировать их в этот пустой аккаунт. Локальный оригинал останется на устройстве.`}</p><button className="secondary" onClick={()=>download(backup(local),'ÇalışBase-local-backup.json')}>{en?'Download a backup':'Скачать резервную копию'}</button>{!preview?<button className="secondary" onClick={()=>setPreview(true)}>{en?'Review transfer':'Подготовить перенос'}</button>:<><p className="notice">{en?`These records will be uploaded to ${account.user.email}. Confirm that they belong to you.`:`Записи будут загружены в аккаунт ${account.user.email}. Убедись, что это твои записи.`}</p><button className="primary" disabled={busy} onClick={()=>{setBusy(true);void run(d=>{if(d.revision!==0)throw Error('Аккаунт уже содержит данные. Обнови страницу.');Object.assign(d,parseBackup(backup(local)))},undefined,{restoringBackup:true}).then(ok=>{setMessage(ok?(en?'Records copied.':'Записи скопированы.'):(en?'Transfer failed. The original is unchanged.':'Перенос не выполнен. Оригинал сохранён.'));setBusy(false);setPreview(false)})}}>{en?'Copy to my account':'Скопировать в мой аккаунт'}</button><button className="text-link" disabled={busy} onClick={()=>setPreview(false)}>{en?'Cancel':'Отмена'}</button></>}</div>}
    </>:<><p className="muted">{en?'This workspace is local. Sign in with Google to use a separate cloud workspace.':'Это локальное пространство. Войди через Google, чтобы пользоваться отдельным облачным пространством.'}</p><button className="primary" onClick={()=>void account.signIn()}>{en?'Continue with Google':'Продолжить с Google'}</button></>}
    {message&&<p role="status">{message}</p>}
  </section>;
}
