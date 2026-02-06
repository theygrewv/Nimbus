import { BskyAgent } from 'https://esm.sh/@atproto/api@0.13.20';

const status = document.getElementById('status');
const startBtn = document.getElementById('startBtn');
const visualizer = document.getElementById('visualizer');
let audioTag = null; 
let agent = null, hls = null, videoQueue = [], currentIndex = 0;

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

function killPlayback() {
    if (hls) {
        hls.destroy();
        hls = null;
    }
    if (audioTag) {
        audioTag.pause();
        audioTag.src = "";
        audioTag.load();
        audioTag.remove(); // Physically remove from DOM memory
        audioTag = null; 
    }
}

async function playVideoAudio(index) {
    if (index >= videoQueue.length) {
        status.innerText = "HORIZON CLEAR";
        visualizer.classList.remove('active');
        return;
    }

    killPlayback(); 

    // The "Pulse" delay: Gives the browser 50ms to flush the old buffer
    setTimeout(() => {
        audioTag = new Audio();
        audioTag.onended = () => { playNext(); };

        const { playlist, author } = videoQueue[index];
        
        hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 0 // Prevents the skip-stall
        });

        hls.loadSource(playlist);
        hls.attachMedia(audioTag);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            status.innerText = `SIGNAL: ${author}`;
            visualizer.classList.remove('hidden');
            visualizer.classList.add('active');
            
            // Interaction-safe play
            const playPromise = audioTag.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.log("Play error:", error);
                    status.innerText = "TAP TO RESYNC";
                    // If it stalls, we give it one more kick
                    document.body.addEventListener('click', () => audioTag.play(), {once: true});
                });
            }
        });

        // Error Recovery for Mobile
        hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
                switch (data.type) {
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        hls.recoverMediaError();
                        break;
                    default:
                        killPlayback();
                        break;
                }
            }
        });
    }, 50);
}

function playNext() {
    currentIndex++;
    status.innerText = "DRIFTING...";
    playVideoAudio(currentIndex);
}

document.getElementById('tuneBtn').addEventListener('click', async () => {
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
            playVideoAudio(currentIndex);
        } else { status.innerText = "NO SIGNALS"; }
    } catch (e) { status.innerText = "LOST SIGNAL"; }
});

document.getElementById('skipBtn').addEventListener('click', () => { 
    playNext();
});

document.getElementById('stopBtn').addEventListener('click', () => { 
    killPlayback();
    visualizer.classList.remove('active'); 
    status.innerText = "DISSIPATED"; 
});
