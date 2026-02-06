import { BskyAgent } from 'https://esm.sh/@atproto/api@0.13.20';

const status = document.getElementById('status');
const startBtn = document.getElementById('startBtn');
const debugLog = document.getElementById('debugLog');
const skipBtn = document.getElementById('skipBtn');
let agent = null, hls = null, audioTag = null, videoQueue = [], currentIndex = 0;

function log(msg) {
    const entry = document.createElement('div');
    entry.style.borderBottom = "1px solid #111";
    entry.style.padding = "4px 0";
    entry.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
    debugLog.prepend(entry);
}

localStorage.clear();
log("SKELETON READY: Cache Purged.");

startBtn.addEventListener('click', async () => {
    const handle = document.getElementById('handle').value.trim();
    const pass = document.getElementById('app-pw').value.trim();
    if (!handle || !pass) return log("Input Required.");

    try {
        status.innerText = "CONNECTING...";
        agent = new BskyAgent({ service: 'https://bsky.social' });
        const res = await agent.login({ identifier: handle, password: pass });
        
        if (res.success) {
            log("LOGIN SUCCESSFUL.");
            document.getElementById('loginSection').classList.add('hidden');
            document.getElementById('tunerSection').classList.remove('hidden');
            status.innerText = "CONNECTED";
        }
    } catch (e) {
        log(`LOGIN ERROR: ${e.message}`);
        status.innerText = "AUTH FAIL";
    }
});

async function clearAudio() {
    if (hls) { hls.destroy(); hls = null; }
    if (audioTag) {
        audioTag.pause();
        audioTag.src = "";
        audioTag.remove();
        audioTag = null;
    }
    return new Promise(res => setTimeout(res, 200));
}

async function playTrack(index) {
    if (index >= videoQueue.length) {
        log("End of Queue reached.");
        status.innerText = "QUEUE EMPTY";
        return;
    }

    await clearAudio();
    log(`Tuning: ${videoQueue[index].author}`);
    status.innerText = `PLAYING: ${videoQueue[index].author}`;

    audioTag = new Audio();
    audioTag.onended = () => { log("Track finished."); skipTrack(); };

    hls = new Hls();
    hls.loadSource(videoQueue[index].playlist);
    hls.attachMedia(audioTag);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
        audioTag.play().catch(e => {
            log("Autoplay blocked. Tap screen.");
            status.innerText = "TAP TO PLAY";
            window.addEventListener('click', () => audioTag.play(), {once: true});
        });
    });

    hls.on(Hls.Events.ERROR, (e, data) => {
        if (data.fatal) log(`HLS Error: ${data.details}`);
    });
}

async function skipTrack() {
    currentIndex++;
    log(`Skipping to index ${currentIndex}...`);
    await playTrack(currentIndex);
}

document.getElementById('tuneBtn').addEventListener('click', async () => {
    status.innerText = "SCANNING...";
    try {
        log("Fetching timeline (limit 100)...");
        const res = await fetch(`https://bsky.social/xrpc/app.bsky.feed.getTimeline?limit=100`, {
            headers: { "Authorization": `Bearer ${agent.session.accessJwt}` }
        });
        const data = await res.json();
        videoQueue = data.feed
            .filter(f => f.post.embed && f.post.embed.$type === 'app.bsky.embed.video#view')
            .map(f => ({ playlist: f.post.embed.playlist, author: f.post.author.handle }));
        
        log(`Found ${videoQueue.length} videos.`);
        if (videoQueue.length > 0) {
            currentIndex = 0;
            playTrack(0);
        } else {
            status.innerText = "NO VIDEOS FOUND";
        }
    } catch (e) { log(`SCAN ERROR: ${e.message}`); }
});

skipBtn.addEventListener('click', () => skipTrack());
