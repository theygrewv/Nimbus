import { BskyAgent } from 'https://esm.sh/@atproto/api@0.13.20';

const status = document.getElementById('status');
const startBtn = document.getElementById('startBtn');
const debugLog = document.getElementById('debugLog');
let agent = null, hls = null, videoQueue = [], currentIndex = 0;

function log(msg) {
    const entry = document.createElement('div');
    entry.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
    debugLog.prepend(entry);
    console.log(msg);
}

// Immediately clear any old session on load
localStorage.clear();
log("System Initialized: All local data wiped.");

startBtn.addEventListener('click', async () => {
    const handle = document.getElementById('handle').value.trim();
    const pass = document.getElementById('app-pw').value.trim();
    
    if (!handle || !pass) return log("Error: Credentials required.");

    try {
        status.innerText = "ATTEMPTING LOGIN...";
        log(`Connecting to Bsky for: ${handle}`);
        
        agent = new BskyAgent({ service: 'https://bsky.social' });
        const res = await agent.login({ identifier: handle, password: pass });
        
        if (res.success) {
            log("LOGIN SUCCESSFUL.");
            document.getElementById('loginSection').classList.add('hidden');
            document.getElementById('tunerSection').classList.remove('hidden');
            status.innerText = "ONLINE";
        }
    } catch (e) {
        log(`LOGIN FAILED: ${e.message}`);
        status.innerText = "ERROR - SEE LOG";
    }
});

// Minimal Tuner Logic
document.getElementById('tuneBtn').addEventListener('click', async () => {
    status.innerText = "FETCHING FEED...";
    try {
        const res = await fetch(`https://bsky.social/xrpc/app.bsky.feed.getTimeline?limit=50`, {
            headers: { "Authorization": `Bearer ${agent.session.accessJwt}` }
        });
        const data = await res.json();
        videoQueue = data.feed
            .filter(f => f.post.embed && f.post.embed.$type === 'app.bsky.embed.video#view')
            .map(f => ({ playlist: f.post.embed.playlist, author: f.post.author.handle }));
        
        log(`Found ${videoQueue.length} videos.`);
        status.innerText = `READY: ${videoQueue.length} TRACKS`;
    } catch (e) { log(`FETCH ERROR: ${e.message}`); }
});
