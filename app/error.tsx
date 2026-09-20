'use client';
export default function ErrorPage({reset}:{reset:()=>void}){
  return <main className="loading-screen"><h1>Не удалось открыть экран</h1><p>Попробуйте ещё раз. Сохранённые данные остаются на этом устройстве.</p><button className="primary" onClick={reset}>Повторить</button><button className="secondary" onClick={()=>{window.location.hash='settings';reset()}}>Настройки и резервные копии</button></main>;
}
