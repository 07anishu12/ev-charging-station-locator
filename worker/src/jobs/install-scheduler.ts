import { mkdir,writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
const xml=(value:string)=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
async function install() {
  if(process.platform!=='darwin')throw new Error('Use infrastructure/data-refresh.cron on Linux');
  const root=process.cwd();const label='com.fastcharger.data-refresh';
  const directory=path.join(os.homedir(),'Library/LaunchAgents');await mkdir(directory,{recursive:true});
  await mkdir(path.join(root,'.ingestion'),{recursive:true});
  const file=path.join(directory,label+'.plist');
  const node=process.execPath;const tsx=path.join(root,'node_modules/tsx/dist/cli.mjs');
  const args=[node,tsx,path.join(root,'worker/src/jobs/scheduled-run.ts')];
  await writeFile(file,`<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict>
<key>Label</key><string>${label}</string><key>ProgramArguments</key><array>${args.map(a=>'<string>'+xml(a)+'</string>').join('')}</array>
<key>WorkingDirectory</key><string>${xml(root)}</string><key>StartInterval</key><integer>900</integer>
<key>EnvironmentVariables</key><dict><key>PATH</key><string>${xml(process.env.PATH||'/usr/bin:/bin')}</string></dict>
<key>StandardOutPath</key><string>${xml(path.join(root,'.ingestion/scheduler.log'))}</string>
<key>StandardErrorPath</key><string>${xml(path.join(root,'.ingestion/scheduler-errors.log'))}</string>
</dict></plist>`,{mode:0o600});
  const domain=`gui/${process.getuid!()}`;
  try{execFileSync('launchctl',['bootout',domain,file],{stdio:'ignore'});}catch{}
  execFileSync('launchctl',['bootstrap',domain,file],{stdio:'pipe'});
  console.log(`Installed ${label}. Scheduler wakes every 15 minutes; provider metadata intervals default to 7 days.`);
}
install().catch(()=>{console.error('Scheduler installation failed; no credentials printed.');process.exitCode=1;});
