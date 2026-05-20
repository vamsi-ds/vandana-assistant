/**
 * ===========================================================================
 * Vandana Valli — AI Voice Assistant | Web Frontend Logic
 * ===========================================================================
 * Features:
 *   - Web Speech API for voice input & output
 *   - Animated visualization canvas (pulsing rings + waveform)
 *   - Command processing (time, date, jokes, weather, web, youtube)
 *   - Typing effect for assistant responses
 *   - Particle background animation
 *   - Fully offline-capable for basic commands
 * ===========================================================================
 */

// ═══════════════════════════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════════════════════════

const state = {
    isListening: false,
    isSpeaking: false,
    status: "idle",          // idle | listening | thinking | speaking
    recognition: null,
    synthesis: window.speechSynthesis,
    animationId: null,
    particlesEnabled: true,
};

// ═══════════════════════════════════════════════════════════════════════════
//  DOM REFERENCES
// ═══════════════════════════════════════════════════════════════════════════

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const DOM = {
    loader:         $("#loader"),
    app:            $("#app"),
    micBtn:         $("#mic-btn"),
    micHint:        $("#mic-hint"),
    statusText:     $("#status-text"),
    vizIcon:        $(".viz-icon"),
    vizCanvas:      $("#viz-canvas"),
    vizContainer:   $(".viz-container"),
    chatMessages:   $("#chat-messages"),
    textInput:      $("#text-input"),
    sendBtn:        $("#send-btn"),
    clearChat:      $("#clear-chat"),
    themeToggle:    $("#theme-toggle"),
    particlesCanvas: $("#particles"),
};

// ═══════════════════════════════════════════════════════════════════════════
//  INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

document.addEventListener("DOMContentLoaded", () => {
    // Show loader for 2.2 seconds then reveal app
    setTimeout(() => {
        DOM.loader.style.opacity = "0";
        DOM.loader.style.transition = "opacity 0.5s ease";
        setTimeout(() => {
            DOM.loader.classList.add("hidden");
            DOM.app.classList.remove("hidden");
            initApp();
        }, 500);
    }, 2200);
});

function initApp() {
    initSpeechRecognition();
    initVisualization();
    initParticles();
    initEventListeners();

    // Welcome greeting after a short delay
    setTimeout(() => {
        const hour = new Date().getHours();
        let greeting = hour < 12 ? "Subhodayam! Good morning"
                     : hour < 17 ? "Shubha Madhyahnam! Good afternoon"
                     : hour < 21 ? "Shubha Sayantram! Good evening"
                     : "Shubha Ratri! Good night";
        addMessage("assistant", `Namaskaram! ${greeting}! Nenu Vandana Valli, mee AI assistant. Meeku ela help cheyali?`);
        speak(`Namaskaram! ${greeting}! Nenu Vandana Valli. Meeku help cheyataniki ready!`);
    }, 800);
}

// ═══════════════════════════════════════════════════════════════════════════
//  SPEECH RECOGNITION (Web Speech API)
// ═══════════════════════════════════════════════════════════════════════════

function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        addMessage("system", "⚠️ Speech recognition not supported in this browser. Please use Chrome or Edge.");
        return;
    }

    state.recognition = new SpeechRecognition();
    state.recognition.continuous = false;
    state.recognition.interimResults = true;
    state.recognition.lang = "en-IN";

    state.recognition.onstart = () => {
        state.isListening = true;
        setStatus("listening");
        DOM.micBtn.classList.add("listening");
        DOM.micHint.textContent = "Listening... Speak now";
    };

    state.recognition.onresult = (event) => {
        let finalTranscript = "";
        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }

        if (interimTranscript) {
            DOM.micHint.textContent = `"${interimTranscript}"`;
        }

        if (finalTranscript) {
            handleUserInput(finalTranscript.trim());
        }
    };

    state.recognition.onerror = (event) => {
        console.warn("[Speech] Error:", event.error);
        if (event.error === "no-speech") {
            addMessage("system", "No speech detected. Please try again.");
        }
        stopListening();
    };

    state.recognition.onend = () => {
        stopListening();
    };
}

function startListening() {
    if (!state.recognition) {
        addMessage("system", "Speech recognition not available.");
        return;
    }
    if (state.isSpeaking) {
        state.synthesis.cancel();
        state.isSpeaking = false;
    }
    try {
        state.recognition.start();
    } catch (e) {
        console.warn("[Speech] Already started");
    }
}

function stopListening() {
    state.isListening = false;
    DOM.micBtn.classList.remove("listening");
    DOM.micHint.textContent = 'Click to start • Say "Hey Vandana"';
    if (state.status === "listening") {
        setStatus("idle");
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//  SPEECH SYNTHESIS — Sweet Female Voice (no overlap)
// ═══════════════════════════════════════════════════════════════════════════
//
//  Uses a session ID to guarantee only ONE voice plays at a time.
//  Each speak() call increments the ID; older sessions auto-cancel.
//
//  Priority: StreamElements (Joanna) → Google TTS → Web Speech API
// ═══════════════════════════════════════════════════════════════════════════

const VOICE_PRIMARY   = "Joanna";   // sweet US English female
const VOICE_SECONDARY = "Amy";      // warm British female
const VOICE_INDIAN    = "Aditi";    // Indian English female

let _speechId = 0;  // increments on each speak() call

/**
 * Speak text. Cancels ALL previous speech before starting.
 */
function speak(text) {
    if (!text || !text.trim()) return;

    // ── Cancel everything from previous calls ──
    _cancelAllSpeech();

    // ── New session ──
    const id = ++_speechId;
    state.isSpeaking = true;
    setStatus("speaking");

    _runTTSChain(id, text);
}

/** Run the TTS engines one by one; stop if session expired. */
async function _runTTSChain(id, text) {
    // Engine 1: StreamElements
    try {
        await _speakStreamElements(id, text);
        return; // Success — done
    } catch (e) {
        if (id !== _speechId) return; // Stale session, stop
        console.log("[TTS] StreamElements failed, trying Google...");
    }

    // Engine 2: Google Translate TTS
    try {
        await _speakGoogleTTS(id, text);
        return;
    } catch (e) {
        if (id !== _speechId) return;
        console.log("[TTS] Google TTS failed, using browser voice...");
    }

    // Engine 3: Web Speech API (last resort)
    if (id === _speechId) {
        _speakWithWebSpeech(id, text);
    }
}

/** Cancel every possible sound source */
function _cancelAllSpeech() {
    // Stop Web Speech API
    if (state.synthesis) state.synthesis.cancel();
    // Stop any playing audio element
    if (state._currentAudio) {
        try {
            state._currentAudio.pause();
            state._currentAudio.src = "";
            state._currentAudio = null;
        } catch (e) {}
    }
    state.isSpeaking = false;
}

// ── ENGINE 1: StreamElements (Amazon Polly) ─────────────────────────────

async function _speakStreamElements(id, text) {
    const chunks = _splitText(text, 250);

    for (const chunk of chunks) {
        if (id !== _speechId) return; // newer speak() called, abort

        const encoded = encodeURIComponent(chunk);
        let played = false;

        for (const voice of [VOICE_PRIMARY, VOICE_SECONDARY, VOICE_INDIAN]) {
            if (played || id !== _speechId) break;
            const url = `https://api.streamelements.com/kappa/v2/speech?voice=${voice}&text=${encoded}`;
            try {
                await _playAudioUrl(id, url, 6000);
                played = true;
            } catch (e) {
                continue;
            }
        }

        if (!played) throw new Error("StreamElements unavailable");
    }

    if (id === _speechId) {
        state.isSpeaking = false;
        setStatus("idle");
    }
}

// ── ENGINE 2: Google Translate TTS ──────────────────────────────────────

async function _speakGoogleTTS(id, text) {
    const chunks = _splitText(text, 180);

    for (const chunk of chunks) {
        if (id !== _speechId) return;
        const encoded = encodeURIComponent(chunk);
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encoded}`;
        await _playAudioUrl(id, url, 6000);
    }

    if (id === _speechId) {
        state.isSpeaking = false;
        setStatus("idle");
    }
}

// ── ENGINE 3: Web Speech API ────────────────────────────────────────────

function _speakWithWebSpeech(id, text) {
    if (!state.synthesis || id !== _speechId) {
        state.isSpeaking = false;
        setStatus("idle");
        return;
    }

    // Make sure nothing else is playing
    state.synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const femaleVoice = _findBestFemaleVoice();

    if (femaleVoice) {
        utterance.voice = femaleVoice;
    }

    utterance.rate = 0.88;
    utterance.pitch = 1.25;
    utterance.volume = 1;

    utterance.onstart = () => {
        if (id !== _speechId) { state.synthesis.cancel(); return; }
        state.isSpeaking = true;
        setStatus("speaking");
    };

    utterance.onend = () => {
        if (id === _speechId) {
            state.isSpeaking = false;
            setStatus("idle");
        }
    };

    utterance.onerror = () => {
        if (id === _speechId) {
            state.isSpeaking = false;
            setStatus("idle");
        }
    };

    state.synthesis.speak(utterance);
}

// ── Female voice finder ─────────────────────────────────────────────────

function _findBestFemaleVoice() {
    const voices = state.synthesis ? state.synthesis.getVoices() : [];
    if (!voices.length) return null;

    const PREFER = [
        "neerja", "heera",
        "zira", "jenny", "aria", "sara", "sonia",
        "samantha", "karen", "moira", "tessa",
        "google uk english female", "google us english",
        "libby", "hazel", "susan", "linda", "emily",
        "female", "woman",
    ];

    const MALE = [
        "david", "mark", "james", "george", "ravi",
        "prabhat", "guy", "roger", "ryan", "male",
    ];

    for (const name of PREFER) {
        const v = voices.find(v => v.name.toLowerCase().includes(name));
        if (v) return v;
    }

    const indian = voices.find(v =>
        v.lang.startsWith("en-IN") && !MALE.some(m => v.name.toLowerCase().includes(m))
    );
    if (indian) return indian;

    const english = voices.find(v =>
        v.lang.startsWith("en") && !MALE.some(m => v.name.toLowerCase().includes(m))
    );
    if (english) return english;

    return voices[0];
}

// ── Audio player with session guard ─────────────────────────────────────

function _playAudioUrl(id, url, timeoutMs) {
    return new Promise((resolve, reject) => {
        if (id !== _speechId) return reject(new Error("stale"));

        const audio = new Audio();
        const timer = setTimeout(() => {
            audio.pause(); audio.src = "";
            reject(new Error("timeout"));
        }, timeoutMs);

        audio.oncanplaythrough = () => {
            clearTimeout(timer);
            if (id !== _speechId) { audio.src = ""; return reject(new Error("stale")); }

            state._currentAudio = audio;
            audio.play()
                .then(() => {
                    audio.onended = () => { state._currentAudio = null; resolve(); };
                    audio.onerror = () => { state._currentAudio = null; reject(); };
                })
                .catch(() => { state._currentAudio = null; reject(); });
        };

        audio.onerror = () => { clearTimeout(timer); reject(new Error("load error")); };
        audio.src = url;
    });
}

// ── Helpers ─────────────────────────────────────────────────────────────

function _splitText(text, maxLen) {
    if (text.length <= maxLen) return [text];
    const chunks = [];
    const parts = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
    let buf = "";
    for (const p of parts) {
        if ((buf + p).length > maxLen && buf) { chunks.push(buf.trim()); buf = p; }
        else buf += p;
    }
    if (buf.trim()) chunks.push(buf.trim());
    return chunks;
}

// Preload browser voices
if (window.speechSynthesis) {
    speechSynthesis.getVoices();
    speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
}

// ═══════════════════════════════════════════════════════════════════════════
//  COMMAND PROCESSING
// ═══════════════════════════════════════════════════════════════════════════

function handleUserInput(text) {
    addMessage("user", text);
    setStatus("thinking");

    // Simulate slight processing delay for realism
    setTimeout(() => {
        const response = processCommand(text.toLowerCase());
        addMessage("assistant", response, true);
        speak(response);
    }, 400 + Math.random() * 400);
}

function processCommand(cmd) {
    // ── Greetings ──
    if (/\b(hello|hi|hey|namaste|namaskaram|good morning|good afternoon|good evening|how are you)\b/i.test(cmd)) {
        const greetings = [
            "Namaskaram! Nenu baagunnanu. Meeru ela unnaru? How can I help you today?",
            "Hello! I'm Vandana Valli, always ready to help! Cheppandi, emiti kavali?",
            "Namaskaram! Nenu Vandana Valli. Meeku help cheyataniki happy ga unna!",
        ];
        return greetings[Math.floor(Math.random() * greetings.length)];
    }

    // ── Time ──
    if (/\b(what time|current time|time now|what's the time|tell.*time)\b/i.test(cmd)) {
        const now = new Date();
        return `The current time is ${now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}.`;
    }

    // ── Date ──
    if (/\b(what date|today.*date|current date|what day|today)\b/i.test(cmd)) {
        const now = new Date();
        return `Today is ${now.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.`;
    }

    // ── Open YouTube ──
    if (/\bopen youtube\b/i.test(cmd)) {
        window.open("https://www.youtube.com", "_blank");
        return "Sare, YouTube open chesthunna!";
    }

    // ── Open Google ──
    if (/\bopen google\b/i.test(cmd)) {
        window.open("https://www.google.com", "_blank");
        return "Sare, Google open chesthunna!";
    }

    // ── Play Song ──
    if (/\bplay\b/i.test(cmd)) {
        const song = cmd.replace(/play|song|music|video/gi, "").trim();
        if (song) {
            window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(song)}`, "_blank");
            return `Sare, playing '${song}' on YouTube!`;
        }
        return "Emiti play cheyali? Please tell me the song name.";
    }

    // ── Web Search ──
    if (/\b(search|google|look up|find online)\b/i.test(cmd)) {
        const query = cmd.replace(/search for|search|google|look up|find online/gi, "").trim();
        if (query) {
            window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, "_blank");
            return `Sare, '${query}' kosam searching on Google!`;
        }
        return "Emiti search cheyali? Please tell me what to search.";
    }

    // ── Jokes ──
    if (/\b(joke|funny|laugh)\b/i.test(cmd)) {
        const jokes = [
            "Why do programmers prefer dark mode? Because light attracts bugs! 😄",
            "Why was the computer cold? It left its Windows open! 🥶",
            "What's a computer's favorite snack? Microchips! 🍟",
            "Why do Java developers wear glasses? Because they can't C#! 😂",
            "What did the router say to the doctor? It hurts when IP! 🤣",
            "How do you comfort a JavaScript bug? You console it! 💻",
            "Why did the developer go broke? Because he used up all his cache! 💸",
        ];
        return jokes[Math.floor(Math.random() * jokes.length)];
    }

    // ── Weather ──
    if (/\b(weather|temperature|forecast)\b/i.test(cmd)) {
        const cityMatch = cmd.match(/(?:weather|temperature|forecast)\s+(?:in|at|for)\s+(.+)/i);
        const city = cityMatch ? cityMatch[1].trim() : "Hyderabad";
        fetchWeather(city);
        return `Fetching weather for ${city}... oka second aagandi!`;
    }

    // ── Wikipedia ──
    if (/\b(wikipedia|wiki|who is|what is|tell me about)\b/i.test(cmd)) {
        const query = cmd.replace(/wikipedia|wiki|who is|what is|tell me about/gi, "").trim();
        if (query) {
            window.open(`https://en.wikipedia.org/wiki/${encodeURIComponent(query)}`, "_blank");
            return `Sare, '${query}' gurinchi Wikipedia open chesthunna!`;
        }
        return "Emiti search cheyali? Please tell me the topic.";
    }

    // ── Your Name ──
    if (/\b(your name|who are you|what are you)\b/i.test(cmd)) {
        return "Nenu Vandana Valli! Mee AI Voice Assistant. Telugu and English lo maatladuthanu. Meeku help cheyataniki nenu ikkada unna!";
    }

    // ── Thank You ──
    if (/\b(thank|thanks|dhanyavaadalu)\b/i.test(cmd)) {
        return "You're welcome! Meeku help cheyagaliganu ani happy ga undi! 😊";
    }

    // ── Goodbye ──
    if (/\b(bye|goodbye|exit|quit|see you)\b/i.test(cmd)) {
        return "Sare, goodbye! Take care! Vandana Valli signing off. 👋";
    }

    // ── Calculator ──
    if (/\b(calculate|what is \d|how much is)\b/i.test(cmd)) {
        try {
            const expr = cmd.replace(/calculate|what is|how much is|equals/gi, "").trim();
            const safe = expr.replace(/[^0-9+\-*/().% ]/g, "");
            if (safe) {
                const result = Function('"use strict"; return (' + safe + ')')();
                return `The answer is ${result}.`;
            }
        } catch (e) { /* fall through */ }
        return "Sorry, I couldn't calculate that. Please try a simpler expression.";
    }

    // ── Fallback ──
    const fallbacks = [
        `Interesting! Unfortunately, my web version has limited AI capabilities. Try asking about time, weather, jokes, or to open websites!`,
        `Hmm, nenu ee question ki answer cheppalanante more AI power kavali. Try basic commands like "what time is it" or "tell me a joke"!`,
        `That's a great question! In the web version, I can handle time, date, jokes, weather, web searches, and opening YouTube/Google.`,
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

// ── Async Weather Fetch ──
async function fetchWeather(city) {
    try {
        const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
        const data = await res.json();
        const c = data.current_condition[0];
        const msg = `Weather in ${city}: ${c.weatherDesc[0].value}, ${c.temp_C}°C (${c.temp_F}°F), Feels like ${c.FeelsLikeC}°C, Humidity ${c.humidity}%.`;
        addMessage("assistant", msg);
        speak(msg);
    } catch (e) {
        addMessage("assistant", `Sorry, couldn't fetch weather for ${city}. Please check your internet.`);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//  CHAT UI
// ═══════════════════════════════════════════════════════════════════════════

function addMessage(sender, text, withTyping = false) {
    const msgDiv = document.createElement("div");
    msgDiv.className = `message ${sender}-msg`;

    const avatars = { user: "🗣️", assistant: "🤖", system: "⚙️" };
    const names = { user: "You", assistant: "Vandana Valli", system: "System" };

    msgDiv.innerHTML = `
        <div class="msg-avatar">${avatars[sender] || "💬"}</div>
        <div class="msg-body">
            <span class="msg-name">${names[sender] || sender}</span>
            <p class="msg-text"></p>
        </div>
    `;

    DOM.chatMessages.appendChild(msgDiv);
    const msgText = msgDiv.querySelector(".msg-text");

    if (withTyping && sender === "assistant") {
        typeText(msgText, text);
    } else {
        msgText.textContent = text;
    }

    // Scroll to bottom
    DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
}

function typeText(element, text, speed = 18) {
    let i = 0;
    element.textContent = "";
    const interval = setInterval(() => {
        if (i < text.length) {
            element.textContent += text[i];
            i++;
            DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
        } else {
            clearInterval(interval);
        }
    }, speed);
}

// ═══════════════════════════════════════════════════════════════════════════
//  STATUS MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

function setStatus(status) {
    state.status = status;
    const vizContainer = DOM.vizContainer;
    vizContainer.className = "viz-container";

    const icons = { idle: "🎙️", listening: "🎤", thinking: "💭", speaking: "🔊" };
    const labels = { idle: "Ready", listening: "Listening", thinking: "Thinking", speaking: "Speaking" };

    DOM.vizIcon.textContent = icons[status] || "🎙️";
    DOM.statusText.textContent = labels[status] || "Ready";
    vizContainer.classList.add(`status-${status}`);
}

// ═══════════════════════════════════════════════════════════════════════════
//  VISUALIZATION (Canvas)
// ═══════════════════════════════════════════════════════════════════════════

function initVisualization() {
    const canvas = DOM.vizCanvas;
    const ctx = canvas.getContext("2d");

    // Set canvas resolution for HiDPI
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    let t = 0;

    function draw() {
        const w = rect.width;
        const h = rect.height;
        const cx = w / 2;
        const cy = h / 2;

        ctx.clearRect(0, 0, w, h);
        t += 0.02;

        // ── Outer Rings ──
        for (let i = 0; i < 4; i++) {
            const r = 55 + i * 18;
            const pulse = Math.sin(t * 1.5 + i * 0.6) * 4;

            ctx.beginPath();
            ctx.arc(cx, cy, r + pulse, 0, Math.PI * 2);

            let alpha;
            if (state.status === "listening") {
                alpha = 0.15 + Math.sin(t * 3 + i) * 0.1;
                ctx.strokeStyle = `rgba(0, 212, 255, ${alpha})`;
            } else if (state.status === "speaking") {
                alpha = 0.15 + Math.sin(t * 4 + i) * 0.1;
                ctx.strokeStyle = `rgba(0, 255, 136, ${alpha})`;
            } else if (state.status === "thinking") {
                alpha = 0.15 + Math.sin(t * 2 + i) * 0.08;
                ctx.strokeStyle = `rgba(255, 170, 0, ${alpha})`;
            } else {
                alpha = 0.06 + Math.sin(t + i) * 0.03;
                ctx.strokeStyle = `rgba(107, 125, 179, ${alpha})`;
            }

            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        // ── Main Circle ──
        const mainR = 48;
        ctx.beginPath();
        ctx.arc(cx, cy, mainR, 0, Math.PI * 2);

        if (state.status === "listening") {
            ctx.fillStyle = "rgba(0, 212, 255, 0.06)";
            ctx.strokeStyle = "rgba(0, 212, 255, 0.5)";
        } else if (state.status === "speaking") {
            ctx.fillStyle = "rgba(0, 255, 136, 0.06)";
            ctx.strokeStyle = "rgba(0, 255, 136, 0.5)";
        } else if (state.status === "thinking") {
            ctx.fillStyle = "rgba(255, 170, 0, 0.06)";
            ctx.strokeStyle = "rgba(255, 170, 0, 0.4)";
        } else {
            ctx.fillStyle = "rgba(15, 19, 56, 0.6)";
            ctx.strokeStyle = "rgba(26, 32, 80, 0.6)";
        }
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();

        // ── Waveform Bars (when speaking or listening) ──
        if (state.status === "speaking" || state.status === "listening") {
            const barColor = state.status === "speaking"
                ? "rgba(0, 255, 136, 0.7)"
                : "rgba(0, 212, 255, 0.7)";
            const numBars = 9;
            const barWidth = 3;
            const barGap = 6;
            const startX = cx - ((numBars - 1) * (barWidth + barGap)) / 2;

            for (let i = 0; i < numBars; i++) {
                const barH = Math.abs(Math.sin(t * 5 + i * 0.7)) * 18 + 3;
                const x = startX + i * (barWidth + barGap);
                const y = cy + mainR + 18;

                ctx.fillStyle = barColor;
                ctx.fillRect(x - barWidth / 2, y - barH, barWidth, barH * 2);
            }
        }

        state.animationId = requestAnimationFrame(draw);
    }

    draw();
}

// ═══════════════════════════════════════════════════════════════════════════
//  PARTICLES BACKGROUND
// ═══════════════════════════════════════════════════════════════════════════

function initParticles() {
    const canvas = DOM.particlesCanvas;
    const ctx = canvas.getContext("2d");

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    const particles = [];
    const COUNT = 60;

    for (let i = 0; i < COUNT; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            r: Math.random() * 1.5 + 0.5,
            alpha: Math.random() * 0.3 + 0.1,
        });
    }

    function draw() {
        if (!state.particlesEnabled) {
            requestAnimationFrame(draw);
            return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw connections
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 120) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(0, 212, 255, ${0.06 * (1 - dist / 120)})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }

        // Draw and update particles
        for (const p of particles) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 212, 255, ${p.alpha})`;
            ctx.fill();

            p.x += p.vx;
            p.y += p.vy;

            if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
            if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        }

        requestAnimationFrame(draw);
    }

    draw();
}

// ═══════════════════════════════════════════════════════════════════════════
//  EVENT LISTENERS
// ═══════════════════════════════════════════════════════════════════════════

function initEventListeners() {
    // Mic button
    DOM.micBtn.addEventListener("click", () => {
        if (state.isListening) {
            state.recognition?.stop();
        } else {
            startListening();
        }
    });

    // Text input
    DOM.textInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && DOM.textInput.value.trim()) {
            handleUserInput(DOM.textInput.value.trim());
            DOM.textInput.value = "";
        }
    });

    DOM.sendBtn.addEventListener("click", () => {
        if (DOM.textInput.value.trim()) {
            handleUserInput(DOM.textInput.value.trim());
            DOM.textInput.value = "";
        }
    });

    // Quick action buttons
    $$(".quick-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const cmd = btn.dataset.cmd;
            if (cmd) handleUserInput(cmd);
        });
    });

    // Clear chat
    DOM.clearChat.addEventListener("click", () => {
        DOM.chatMessages.innerHTML = "";
        addMessage("system", "Conversation cleared. Start fresh!");
    });

    // Theme toggle (particles)
    DOM.themeToggle.addEventListener("click", () => {
        state.particlesEnabled = !state.particlesEnabled;
        DOM.particlesCanvas.style.opacity = state.particlesEnabled ? "0.4" : "0";
    });
}
