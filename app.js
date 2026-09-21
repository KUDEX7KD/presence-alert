const connect=document.getElementById('connect');
const panel=document.getElementById('panel');
const start=document.getElementById('start');
const stop=document.getElementById('stop');
const status=document.getElementById('status');
const last=document.getElementById('last');

let timer=null;
let previous=null;

connect.onclick=()=>{
  // Replace this demo step with your secure backend's official Telegram auth flow.
  panel.classList.remove('hidden');
  connect.textContent='Telegram connected (demo)';
  connect.disabled=true;
  status.textContent='Ready — authorization required';
};

start.onclick=()=>{
  const contact=document.getElementById('contact').value.trim();
  if(!contact){ alert('Enter the authorized contact.'); return; }

  // Demo polling placeholder. A production app must fetch permitted
  // presence data from your backend, not directly from the browser.
  clearInterval(timer);
  status.textContent='Monitoring requested';
  last.textContent='Waiting for authorized backend status…';

  timer=setInterval(async()=>{
    // TODO: fetch('/api/presence?contact='+encodeURIComponent(contact))
    // and update the UI from the server response.
    last.textContent='Backend connection not configured yet.';
  },5000);
};

stop.onclick=()=>{
  clearInterval(timer);
  timer=null;
  status.textContent='Monitoring stopped';
};

function updatePresence(isOnline){
  status.textContent=isOnline?'🟢 Online':'⚪ Offline';
  status.className='status '+(isOnline?'online':'offline');
  last.textContent='Updated: '+new Date().toLocaleString();
  if(isOnline && previous===false && 'Notification' in window){
    if(Notification.permission==='granted') new Notification('Telegram contact is online');
  }
  previous=isOnline;
}
