import type {MetadataRoute} from 'next';

export default function manifest():MetadataRoute.Manifest{
  return {
    name:'ÇalışBase',
    short_name:'ÇalışBase',
    description:'Личное пространство для учёбы, задач и фокуса.',
    start_url:'/',
    scope:'/',
    display:'standalone',
    background_color:'#f7f1e8',
    theme_color:'#081f3f',
    categories:['education','productivity'],
    icons:[
      {src:'/favicon.svg',sizes:'any',type:'image/svg+xml',purpose:'any'},
      {src:'/app-icon.png',sizes:'256x256',type:'image/png',purpose:'any'},
    ],
  };
}
