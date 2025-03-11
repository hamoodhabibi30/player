// FUCK YEAH, ANDROID CHROME STYLE—URL INPUT, DIRECT FALLBACK
const player = videojs('video-player', {
    html5: {
        hls: { 
            withCredentials: false,
            overrideNative: true,
            smoothQualityChange: true,
            bandwidth: 5000000
        }
    },
    controls: true,
    autoplay: false,
    width: 360,
    height: 316,
    errorDisplay: false
});

const statusEl = document.getElementById('status');
const urlInput = document.getElementById('url-input');
const playBtn = document.getElementById('play-btn');
const directBtn = document.getElementById('direct-btn');

// Spoof Android Chrome Headers
function spoofAndroidFetch(url) {
    console.log(`FETCHING LIKE ANDROID: ${url}`);
    return fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36',
            'Referer': 'https://mdiskplay.com'
        }
    });
}

// DRM - Debugged
function setupDRM(hls, url) {
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
        statusEl.textContent = "Status: Manifest loaded—checking DRM!";
        console.log("MANIFEST PARSED—DRM TIME!");
    });
    hls.on(Hls.Events.KEY_LOADED, () => {
        statusEl.textContent = "Status: DRM key in—ready to rock!";
        console.log("DRM KEY LOADED—LET’S GO!");
    });

    spoofAndroidFetch(url)
        .then(res => {
            if (!res.ok) throw new Error(`Fetch got ${res.status}`);
            console.log(`DRM FETCH STATUS: ${res.status}`);
            return res.text();
        })
        .then(manifest => {
            console.log(`MANIFEST: ${manifest.slice(0, 300)}...`);
            const keyMatch = manifest.match(/#EXT-X-KEY:METHOD=AES-128,URI="([^"]+)"/);
            if (keyMatch) {
                const licenseUrl = keyMatch[1];
                player.tech_.hlsProvider_.keySystems = {
                    'com.widevine.alpha': {
                        url: licenseUrl,
                        licenseHeaders: { 'Content-Type': 'application/octet-stream' },
                        getLicense: (emeOptions, keyMessage, callback) => {
                            console.log(`FETCHING DRM LICENSE: ${licenseUrl}`);
                            spoofAndroidFetch(licenseUrl)
                                .then(res => {
                                    if (!res.ok) throw new Error(`License fetch got ${res.status}`);
                                    console.log(`LICENSE FETCH STATUS: ${res.status}`);
                                    return res.arrayBuffer();
                                })
                                .then(data => callback(null, new Uint8Array(data)))
                                .catch(err => {
                                    statusEl.textContent = `Status: DRM license failed—${err}`;
                                    console.log(`DRM LICENSE FETCH FAILED: ${err}`);
                                    callback(err);
                                });
                        }
                    }
                };
                console.log(`DRM DETECTED - License URL: ${licenseUrl}`);
            } else {
                console.log("NO DRM—OPEN ROAD!");
            }
        })
        .catch(e => {
            console.log(`DRM FETCH FAILED: ${e}`);
            statusEl.textContent = "Status: DRM check died—try direct!";
        });
}

// Player Logic - Android Direct
function playM3U8(url) {
    statusEl.textContent = "Status: Loading like Android Chrome—hold tight!";
    console.log(`PLAYING URL: ${url}`);
    if (!url || !url.endsWith('.m3u8')) {
        statusEl.textContent = "Status: Enter a valid .m3u8 URL, dipshit!";
        console.log("INVALID URL—NEEDS .m3u8!");
        return;
    }

    if (Hls.isSupported()) {
        const hls = new Hls({
            xhrSetup: (xhr, url) => {
                xhr.open('GET', url, true);
                console.log(`XHR FETCHING: ${url}`);
            },
            fetchSetup: (context, options) => spoofAndroidFetch(context.url),
            maxBufferLength: 60,
            maxMaxBufferLength: 120,
            liveSyncDurationCount: 3,
            debug: true
        });

        setupDRM(hls, url);

        spoofAndroidFetch(url)
            .then(res => {
                if (!res.ok) throw new Error(`Manifest fetch got ${res.status}`);
                console.log(`MANIFEST FETCH STATUS: ${res.status}`);
                return res.text();
            })
            .then(manifest => {
                console.log(`MANIFEST LOADED: ${manifest.slice(0, 300)}...`);
                hls.loadSource(url);
                hls.attachMedia(player.tech_.el_);
            })
            .catch(e => {
                statusEl.textContent = "Status: Fetch bombed—try 'Open Direct' for CORS!";
                console.log(`MANIFEST FETCH FAILED: ${e}`);
            });

        hls.on(Hls.Events.ERROR, (event, data) => {
            console.log(`HLS ERROR: ${data.type} - ${data.details} - ${data.response?.status || 'N/A'}`);
            statusEl.textContent = `Status: HLS error - ${data.details}`;
            if (data.fatal) {
                hls.destroy();
                statusEl.textContent = "Status: Fatal crash—use 'Open Direct'!";
                console.log("FATAL HLS ERROR—RETRY OR DIRECT!");
            }
        });

        player.on('loadedmetadata', () => {
            statusEl.textContent = "Status: Stream’s live—Android style, fuck yeah!";
            console.log("STREAM LOADED—PLAYING NOW!");
            player.play();
        });
    } else if (player.canPlayType('application/vnd.apple.mpegurl')) {
        console.log(`NATIVE HLS SUPPORT—LOADING: ${url}`);
        player.src({ src: url, type: 'application/vnd.apple.mpegurl' });
        player.on('loadedmetadata', () => {
            statusEl.textContent = "Status: Native HLS rocking it!";
            console.log("NATIVE HLS LOADED—PLAYING!");
            player.play();
        });
    } else {
        statusEl.textContent = "Status: Browser’s weak—falling back!";
        console.log("NO HLS SUPPORT—FALLBACK TIME!");
        const video = document.createElement('video');
        video.controls = true;
        video.autoplay = true;
        video.width = 360;
        video.height = 316;
        video.src = url;
        document.querySelector('.android-frame').replaceChild(video, document.getElementById('video-player'));
    }
}

// Button Handlers—Play or Direct
playBtn.addEventListener('click', () => {
    const url = urlInput.value.trim();
    console.log(`PLAY BUTTON SMASHED: ${url}`);
    playM3U8(url);
});

directBtn.addEventListener('click', () => {
    const url = urlInput.value.trim();
    console.log(`DIRECT BUTTON SMASHED: ${url}`);
    if (!url || !url.endsWith('.m3u8')) {
        statusEl.textContent = "Status: Enter a valid .m3u8 URL, dipshit!";
        console.log("INVALID URL FOR DIRECT—NEEDS .m3u8!");
        return;
    }
    statusEl.textContent = "Status: Opening direct in new tab—like Android!";
    window.open(url, '_blank');
});

// Enter Key—Play Default
urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const url = urlInput.value.trim();
        console.log(`ENTER SMASHED: ${url}`);
        playM3U8(url);
    }
});
