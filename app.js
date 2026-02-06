import { BskyAgent } from 'https://esm.sh/@atproto/api@0.13.20';

const status = document.getElementById('status');
const startBtn = document.getElementById('startBtn');
const visualizer = document.getElementById('visualizer');
const audioTag = new Audio();
let agent = null, hls = null, videoQueue = [], currentIndex = 0;

// Auto-load session handle
const savedHandle = localStorage.getItem('bt_handle');
if (savedHandle) document.getElementById('handle').value = savedHandle;

(async function init() {
    status.innerText = "CORE READY";
    startBtn.disabled = false;
    startBtn.innerText = "POWER ON";
})();

startBtn.addEventListener('click', async () => {
    const handle = document.getElementById('handle').value.trim();
    const pass = document.getElementById('app-pw').value.trim();
    try {
        status.innerText = "CONNECTING...";
        localStorage.setItem('bt_handle', handle);
        agent = new BskyAgent({ service: 'https://bsky.social' });
        await agent.login({ identifier: handle, password: pass });
        document.getElementById('loginSection').classList.add('hidden');
        document.getElementById('tunerSection').classList.remove('hidden');
        status.innerText = "SYSTEM ONLINE";
    } catch (e) { status.innerText = "AUTH ERROR"; }
});

// CRITICAL: Dedicated Eject function to clear memory
function ejectHls() {
    if (hls) {
        hls.stopLoad();
        hls.detachMedia();
        hls.destroy();
        hls = null;
    }
    audioTag.pause();
    audioTag.src = "";
    audioTag.load();
}

// Playback Logic
async function playVideoAudio(index) {
    if (index >= videoQueue.length) {
        status.innerText = "END OF BROADCAST";
        visualizer.classList.remove('active');
        return;
    }

    ejectHls(); // Kill any ghost streams
    const { playlist, author } = videoQueue[index];
    
    hls = new Hls();
    hls.loadSource(playlist);
    hls.attachMedia(audioTag);
    
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
        status.innerText = `ON-AIR: ${author}`;
        visualizer.classList.remove('hidden');
        visualizer.classList.add('active');
        audioTag.play().catch(() => { status.innerText = "TAP TO PLAY"; });
    });
}

function playNext() {
    currentIndex++;
    status.innerText = "BUFFERING NEXT...";
    playVideoAudio(currentIndex);
}

// Natural end listener
audioTag.onended = () => { playNext(); };

document.getElementById('tuneBtn').addEventListener('click', async () => {
    status.innerText = "SCANNING BANDS...";
    try {
        const response = await fetch(`https://bsky.social/xrpc/app.bsky.feed.getTimeline?limit=50`, {
            headers: { "Authorization": `Bearer ${agent.session.accessJwt}` }
        });
        const data = await response.json();
        videoQueue = data.feed
            .filter(f => f.post.embed && f.post.embed.$type === 'app.bsky.embed.video#view')
            .map(f => ({ playlist: f.post.embed.playlist, author: f.post.author.handle }));
        
        if (videoQueue.length > 0) {
            currentIndex = 0;
            playVideoAudio(currentIndex);
        } else { status.innerText = "NO SIGNALS"; }
    } catch (e) { status.innerText = "FETCH ERR"; }
});

// MANUAL SKIP BUTTON
document.getElementById('skipBtn').addEventListener('click', () => { 
    playNext();
});

document.getElementById('stopBtn').addEventListener('click', () => { 
    ejectHls();
    visualizer.classList.remove('active'); 
    status.innerText = "OFF-AIR"; 
});
