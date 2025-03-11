// FUCK YEAH, ANDROID CHROME STYLE—URL INPUT, PROXY-POWERED DIRECT WITH DRM
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

// Proxy to Smash CORS
const CORS_PROXY = 'https://cors-anywhere.herokuapp.com/';

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

// Proxy Fetch for Direct Player
function proxyFetch(url) {
    const proxyUrl = `${CORS_PROXY}${url}`;
    console.log(`PROXY FETCH: ${proxyUrl}`);
    return fetch(proxyUrl)
        .then(res => {
            if (!res.ok) throw new Error(`Proxy fetch got ${res.status}`);
            return res.text();
        })
        .then(data => {
            console.log(`PROXY RESPONSE: ${data.slice(0, 300)}...`);
            return new Response(data, {
                status: 200,
                headers: { 'Content-Type': 'application/vnd.apple.mpegurl' }
            });
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

// Direct Player Window - Proxy-Powered with DRM
function openDirectPlayer(url) {
    const directWindow = window.open('', '_blank');
    directWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>.m3u8 Direct Player</title>
            <link href="https://vjs.zencdn.net/8.10.0/video-js.css" rel="stylesheet" />
            <style>
                body { margin: 0; background: #000; display: flex; justify-content: center; align-items: center; height: 100vh; }
                .video-js { width: 100%; max-width: 800px; height: auto; background: #000; }
            </style>
        </head>
        <body>
            <video id="direct-player" class="video-js vjs-default-skin" controls autoplay></video>
            <script src="https://vjs.zencdn.net/8.10.0/video.min.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/hls.js@1.5.7/dist/hls.min.js"></script>
            <script>
                const CORS_PROXY = 'https://cors-anywhere.herokuapp.com/';
                function proxyFetch(url) {
                    const proxyUrl = \`\${CORS_PROXY}\${url}\`;
                    console.log(\`PROXY FETCH IN DIRECT: \${proxyUrl}\`);
                    return fetch(proxyUrl)
                        .then(res => {
                            if (!res.ok) throw new Error(\`Proxy fetch got \${res.status}\`);
                            return res.text();
                        })
                        .then(data => {
                            console.log(\`PROXY RESPONSE: \${data.slice(0, 300)}...\`);
                            return new Response(data, {
                                status: 200,
                                headers: { 'Content-Type': 'application/vnd.apple.mpegurl' }
                            });
                        });
                }

                if (Hls.isSupported()) {
                    const hls = new Hls({
                        fetchSetup: (context, options) => proxyFetch(context.url),
                        debug: true
                    });
                    hls.loadSource('${url}');
                    hls.attachMedia(document.getElementById('direct-player'));

                    // DRM Handling
                    proxyFetch('${url}')
                        .then(res => res.text())
                        .then(manifest => {
                            console.log(\`DIRECT MANIFEST: \${manifest.slice(0, 300)}...\`);
                            const keyMatch = manifest.match(/#EXT-X-KEY:METHOD=AES-128,URI="([^"]+)"/);
                            if (keyMatch) {
                                const licenseUrl = keyMatch[1];
                                console.log(\`DRM DETECTED - License URL: \${licenseUrl}\`);
                                const player = videojs('direct-player');
                                player.tech_.hlsProvider_.keySystems = {
                                    'com.widevine.alpha': {
                                        url: licenseUrl,
                                        licenseHeaders: { 'Content-Type': 'application/octet-stream' },
                                        getLicense: (emeOptions, keyMessage, callback) => {
                                            console.log(\`FETCHING DRM LICENSE: \${licenseUrl}\`);
                                            proxyFetch(licenseUrl)
                                                .then(res => res.blob())
                                                .then(data => callback(null, new Uint8Array(data)))
                                                .catch(err => {
                                                    console.error(\`DRM LICENSE FETCH FAILED: \${err}\`);
                                                    callback(err);
                                                });
                                        }
                                    }
                                };
                            } else {
                                console.log("NO DRM DETECTED!");
                            }
                        })
                        .catch(e => console.error('Direct DRM Fetch Failed:', e));

                    hls.on(Hls.Events.ERROR, (event, data) => {
                        console.error('Direct Player HLS Error:', data.type, data.details, data.response?.status);
                    });
                    hls.on(Hls.Events.MANIFEST_PARSED, () => {
                        console.log('Direct Player: Manifest loaded');
                    });
                    hls.on(Hls.Events.KEY_LOADED, () => {
                        console.log('Direct Player: DRM key loaded');
                    });
                } else if (document.getElementById('direct-player').canPlayType('application/vnd.apple.mpegurl')) {
                    document.getElementById('direct-player').src = '${url}';
                    document.getElementById('direct-player').play();
                } else {
                    console.error('Direct Player: Browser doesn’t support HLS');
                }
            </script>
        </body>
        </html>
    `);
    directWindow.document.close();
}

// Button Handlers
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
    statusEl.textContent = "Status: Opening direct player—like Android!";
    openDirectPlayer(url);
});

// Enter Key—Play Default
urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const url = urlInput.value.trim();
        console.log(`ENTER SMASHED: ${url}`);
        playM3U8(url);
    }
});
