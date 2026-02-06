import { BskyAgent } from 'https://esm.sh/@atproto/api@0.13.20';

const status = document.getElementById('status');
const startBtn = document.getElementById('startBtn');
const visualizer = document.getElementById('visualizer');
let audioTag = null; 
let agent = null, hls = null, videoQueue = [], currentIndex = 0;
let isSwitching = false; // The Interlock Lock

const savedHandle = localStorage.getItem('bt_handle');
if (savedHandle) document.getElementById('handle').value = savedHandle;

(async function init() {
    status.innerText = "ATMOSPHERE STABLE";
    startBtn.disabled = false;
    startBtn.innerText = "IGNITE";
})();

startBtn.addEventListener('click', async () => {
    const handle = document.getElementById('handle').value.trim();
    const pass = document.getElementById('app-pw').value.trim();
    try {
        status.innerText = "ASCENDING...";
        localStorage.setItem('bt_handle', handle);
        agent = new BskyAgent({ service: 'https://bsky.social' });
        await agent.login({ identifier: handle, password: pass });
        document.getElementById('loginSection').classList.add('hidden');
        document.getElementById('tunerSection').classList.remove('hidden');
        status.innerText = "ALTITUDE REACHED";
    } catch (e) { status.innerText = "IGNITION FAILED"; }
});

// Clean-up logic with explicit promise return
async function clearCore() {
    if (hls) {
        hls.stopLoad();
        hls.detachMedia();
        hls.destroy();
        hls = null;
    }
    if (audioTag) {
        audioTag.pause();
        audioTag.src = "";
        audioTag.load();
        audioTag.remove();
        audioTag = null;
    }
    // Give the hardware decoder a moment to release memory
    return new Promise(resolve => setTimeout(resolve, 100));
}

async function playVideoAudio(index) {
    if (index >= videoQueue.length) {
        status.innerText = "HORIZON CLEAR";
        visualizer.classList.remove('active');
        isSwitching = false;
        return;
    }

    await clearCore(); // Await the full cleanup

    audioTag = new Audio();
    audioTag.onended = () => { playNext(); };

    const { playlist, author } = videoQueue[index];
    
    hls = new Hls({
        enableWorker: true,
        backBufferLength: 0,
        manifestLoadingMaxRetry: 5
    });

    hls.loadSource(playlist);
    hls.attachMedia(audioTag);
    
    hls.on(Hls.Events.MANIFEST_PARSED, async () => {
        status.innerText = `SIGNAL: ${author}`;
        visualizer.classList.remove('hidden');
        visualizer.classList.add('active');
        
        try {
            await audioTag.play();
            isSwitching = false; // Unlock after successful play
        } catch (error) {
            console.log("Stall recovery active");
            status.innerText = "TAP TO RESYNC";
            isSwitching = false;
        }
    });

    hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) hls.recoverMediaError();
    });
}

async function playNext() {
    if (isSwitching) return; // Prevent double-triggering
    isSwitching = true;
    
    currentIndex++;
    status.innerText = "TUNING...";
    await playVideoAudio(currentIndex);
}

document.getElementById('tuneBtn').addEventListener('click', async () => {
    if (isSwitching) return;
    status.innerText = "SCANNING...";
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
            isSwitching = true;
            await playVideoAudio(currentIndex);
        } else { status.innerText = "NO SIGNALS"; }
    } catch (e) { status.innerText = "LOST SIGNAL"; isSwitching = false; }
});

document.getElementById('skipBtn').addEventListener('click', async () => { 
    await playNext();
});

document.getElementById('stopBtn').addEventListener('click', async () => { 
    await clearCore();
    visualizer.classList.remove('active'); 
    status.innerText = "DISSIPATED"; 
    isSwitching = false;
});
