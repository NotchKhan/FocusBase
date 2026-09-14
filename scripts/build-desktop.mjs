import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const result=spawnSync(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'build'],{cwd:root,env:{...process.env,FOCUSBASE_DESKTOP:'1'},stdio:'inherit'});
if(result.status!==0)process.exit(result.status||1);
await require('sharp')(path.join(root,'public/favicon.svg')).resize(64,64).png().toFile(path.join(root,'desktop/icon.png'));
console.log('Desktop site and icon ready.');
