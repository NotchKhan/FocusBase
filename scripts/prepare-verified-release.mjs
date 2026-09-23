import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const json=path=>JSON.parse(fs.readFileSync(path,'utf8'));
const hash=path=>crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex');
const run=json('verified-run.json'),scan=json('release/antivirus-report.json'),update=json('release/installer-update-report.json');
const files=['CalisBase-Setup-1.0.7.exe','SHA256SUMS.txt','antivirus-report.json','installer-update-report.json'];
const digest=hash('release/'+files[0]);
assert.equal(run.conclusion,'success');assert.equal(scan.sha256.toLowerCase(),digest);assert.equal(update.installerSha256.toLowerCase(),digest);
assert.equal(scan.exitCode,0);assert.equal(scan.result,'No threats detected');assert.equal(update.result,'passed');assert.equal(update.publisher,'NEXERA');assert.equal(update.sourceCommit,run.head_sha);
for(const key of ['cleanInstall','upgrade','repeatInstall','installedLaunch','companionSmoke'])assert.equal(update[key],true,key);
assert.ok(fs.readFileSync('release/SHA256SUMS.txt','utf8').startsWith(digest));
if(process.argv[2]==='verify-upload'){
  const uploaded=json('uploaded-release.json');assert.equal(uploaded.assets.length,files.length);
  for(const file of files){const asset=uploaded.assets.find(a=>a.name===file);assert.ok(asset,file);assert.equal(asset.size,fs.statSync('release/'+file).size);assert.equal(asset.digest,'sha256:'+hash('release/'+file))}
  console.log('Uploaded file sizes and SHA-256 digests match verified artifacts.');
}else{
  fs.writeFileSync('release-notes.md',`ÇalışBase для Windows 10/11 x64. Издатель в сведениях приложения: **NEXERA**.

## Установка и обновление
Скачайте **CalisBase-Setup-1.0.7.exe** из Assets и откройте его. Запустите ÇalışBase через меню «Пуск» или ярлык на рабочем столе.

Перед обновлением сохраните JSON-копию в настройках и выйдите из приложения через меню значка рядом с часами. Запустите установщик в той же учётной записи Windows. Данные сохраняются. У сайта и приложения отдельные хранилища: для переноса экспортируйте JSON-копию на сайте и импортируйте её в приложении.

## Изменения
- Новое название ÇalışBase и сведения издателя NEXERA.
- Исправления питомца, очереди задач и сохранения данных.
- Просроченные обычные задачи отмечаются красным и становятся недоступны для изменения.

## Проверки именно этого файла
- Microsoft Defender: угроз не обнаружено. Базы ${scan.signatureVersion}, дата проверки ${scan.scannedAt}.
- В отдельной Windows-среде прошли установка 1.0.6, обновление до 1.0.7, повторная установка, запуск приложения и проверка питомца.
- Сохранены тестовые задачи, заметки, проекты, материалы, таблицы, настройки и язык. Личные данные пользователей в тестах не использовались.
- SHA-256: \`${digest}\`.
- [Журнал проверки](${run.html_url}). Контрольная сумма и отчёты приложены ниже.

**Цифровой подписи издателя у выпуска нет.** NEXERA указана в метаданных, это не подтверждённая Windows подпись. Проверка Defender не гарантирует отсутствие всех угроз и не подтверждает репутацию в AVG/SmartScreen. При блокировке не отключайте защиту и не добавляйте исключения: дождитесь анализа или используйте [веб-версию](https://calisbase.vercel.app/).
`);
}
