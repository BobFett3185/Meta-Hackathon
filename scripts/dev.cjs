// Start Node directly: no npm/cmd grandchildren left running on Windows.
const {spawn}=require('node:child_process');
const net=require('node:net'),http=require('node:http'),path=require('node:path'),fs=require('node:fs');
const root=path.resolve(__dirname,'..');
async function choosePort(start){
 if(!Number.isInteger(start)||start<0||start>65535)throw Error('Invalid API port');
 for(let port=start;port<=Math.min(start+20,65535);port++){
  const free=await new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',e=>e.code==='EADDRINUSE'?resolve(false):reject(e));s.listen(port,()=>{const selected=s.address().port;s.close(()=>resolve(selected));});});
  if(free!==false)return free;
 }
 throw Error('No free API port found');
}
function ready(port){return new Promise(resolve=>{const r=http.get('http://127.0.0.1:'+port+'/api/health',s=>{s.resume();resolve(s.statusCode===200);});r.setTimeout(500,()=>r.destroy());r.on('error',()=>resolve(false));});}
async function stop(p){
 if(!p.pid||p.exitCode!==null||p.signalCode!==null)return;
 const closed=new Promise(resolve=>p.once('close',resolve));
 if(process.platform==='win32')await new Promise(resolve=>{const k=spawn('taskkill.exe',['/PID',String(p.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});k.once('error',()=>{p.kill();resolve();});k.once('close',resolve);});
 else p.kill('SIGTERM');
 const force=setTimeout(()=>p.kill('SIGKILL'),750);let timer;
 try{await Promise.race([closed,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Failed to stop child '+p.pid)),5000);})]);}finally{clearTimeout(force);clearTimeout(timer);}
}
function tunnelArgs(args){const result=[...args];const i=result.indexOf('--tunnel');if(i>=0&&!['expo','ngrok'].includes(result[i+1]))result.splice(i+1,0,'ngrok');return result;}
async function main(options={}){
 const bundled=path.join(root,'.tools/node-v22.23.5-win-x64/node.exe');
 const node=options.runtime||(process.platform==='win32'&&fs.existsSync(bundled)?bundled:process.execPath);
 const requested=Number(options.port??process.env.EXPO_PUBLIC_NEST_API_PORT??process.env.PORT??8787),port=await choosePort(requested);
 const env={...process.env,PORT:String(port),EXPO_PUBLIC_NEST_API_PORT:String(port),PATH:path.dirname(node)+path.delimiter+(process.env.PATH||'')};
 const children=[];let stopping,finish;const done=new Promise(resolve=>finish=resolve);
 const shutdown=code=>{if(stopping)return stopping;stopping=Promise.resolve().then(async()=>{const results=await Promise.allSettled(children.map(stop));const failed=results.filter(r=>r.status==='rejected');failed.forEach(r=>console.error('[dev]',r.reason));finish(failed.length?1:code);});return stopping;};
 const signal=()=>{void shutdown(0);};process.on('SIGINT',signal);process.on('SIGTERM',signal);
 const run=(name,args)=>{const p=spawn(node,args,{cwd:root,env,stdio:options.stdio||'inherit',shell:false,windowsHide:true});children.push(p);p.once('error',e=>{console.error('[dev]',name,e.message);void shutdown(1);});p.once('close',(code,sig)=>{if(!stopping){console.log('[dev] '+name+' exited; stopping both processes.');void shutdown(code??(sig==='SIGINT'?0:1));}});return p;};
 try{
  console.log('[dev] Nest API port: '+port+(port!==requested?' (requested port occupied)':''));
  const api=run('api',options.apiArgs||['--env-file-if-exists=.env','--env-file-if-exists=.env.local','--import','tsx','server/index.mts']);
  let healthy=false;const deadline=Date.now()+20000;
  while(!stopping&&api.exitCode===null&&Date.now()<deadline){if(await ready(port)){healthy=true;break;}await new Promise(r=>setTimeout(r,100));}
  if(!stopping&&healthy){const args=tunnelArgs(process.argv.slice(2));console.log('[dev] API ready. Starting Expo '+args.join(' '));run('expo',options.expoArgs||[path.join(path.dirname(require.resolve('expo/package.json')),'bin/cli'),'start',...args]);}
  else if(!stopping){console.error('[dev] API failed to start. Expo was not launched.');await shutdown(1);}
  return await done;
 }catch(e){await shutdown(1);throw e;}finally{process.removeListener('SIGINT',signal);process.removeListener('SIGTERM',signal);}
}
module.exports={main,choosePort,tunnelArgs};
if(require.main===module)main().then(code=>process.exitCode=code,e=>{console.error(e);process.exitCode=1;});
