const test=require('node:test'),assert=require('node:assert/strict'),net=require('node:net');
const {main,choosePort,tunnelArgs}=require('./dev.cjs');
const apiArgs=['-e',"require('http').createServer((q,s)=>s.end('{}')).listen(Number(process.env.PORT))"];
test('skip an occupied port and leave its owner running',async()=>{const s=net.createServer();await new Promise(r=>s.listen(0,r));try{const p=s.address().port;assert.notEqual(await choosePort(p),p);assert.equal(s.listening,true);}finally{s.close();}});
test('Expo failure releases backend port and propagates failure',async()=>{const port=await choosePort(0);assert.equal(await main({port,runtime:process.execPath,apiArgs,expoArgs:['-e','process.exit(3)'],stdio:'ignore'}),3);assert.equal(await choosePort(port),port);});
test('Ctrl+C stops both children and releases backend port',async()=>{const port=await choosePort(0),timer=setTimeout(()=>process.emit('SIGINT'),1200);try{assert.equal(await main({port,runtime:process.execPath,apiArgs,expoArgs:['-e','setInterval(()=>{},1000)'],stdio:'ignore'}),0);assert.equal(await choosePort(port),port);}finally{clearTimeout(timer);}});
test('bare tunnel selects ngrok without overwriting an explicit provider',()=>{assert.deepEqual(tunnelArgs(['--tunnel','--clear']),['--tunnel','ngrok','--clear']);assert.deepEqual(tunnelArgs(['--tunnel','expo']),['--tunnel','expo']);});
