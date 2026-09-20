import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';

const port=4317;
const child=spawn(process.execPath,['server.mjs'],{
  cwd:process.cwd(),
  env:{...process.env,PORT:String(port),PILOT_INGEST_URL:'',PILOT_INGEST_TOKEN:''},
  stdio:['ignore','pipe','pipe']
});
let logs='';
child.stdout.on('data',d=>{logs+=d});
child.stderr.on('data',d=>{logs+=d});

async function waitForServer(){
  for(let i=0;i<40;i++){
    try{
      const r=await fetch(`http://127.0.0.1:${port}/healthz`);
      if(r.ok)return;
    }catch{}
    await new Promise(r=>setTimeout(r,100));
  }
  throw new Error('server did not start\n'+logs);
}

try{
  await waitForServer();

  const statusRes=await fetch(`http://127.0.0.1:${port}/api/pilot/status`);
  assert.equal(statusRes.status,200);
  const status=await statusRes.json();
  assert.equal(status.collectorConfigured,false);
  assert.equal(status.schemaVersion,1);

  const event={
    schemaVersion:1,
    eventId:'evt_server_12345',
    pilotId:'pilot_server_12345',
    type:'route_created',
    occurredAt:'2026-09-20T12:00:00Z',
    appVersion:'3.0.0',
    payload:{mode:'DENGELİ',plannedCount:3,totalMinutes:18,budget:20,energy:3,load:2,mood:'normal',context:'normal',note:'must_not_leave_browser'}
  };
  const sendRes=await fetch(`http://127.0.0.1:${port}/api/pilot/events`,{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({events:[event]})
  });
  assert.equal(sendRes.status,202);
  const send=await sendRes.json();
  assert.equal(send.ok,true);
  assert.equal(send.accepted,0);
  assert.equal(send.collectorConfigured,false);

  const invalidRes=await fetch(`http://127.0.0.1:${port}/api/pilot/events`,{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({events:[{type:'unknown'}]})
  });
  assert.equal(invalidRes.status,400);

  const wrongType=await fetch(`http://127.0.0.1:${port}/api/pilot/events`,{method:'POST',body:'{}'});
  assert.equal(wrongType.status,415);

  console.log('pilot-server: status, validation and no-collector retention contract passed');
}finally{
  child.kill('SIGTERM');
}
