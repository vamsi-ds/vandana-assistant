# 🎙️ Vandana Valli — AI Voice Assistant

A production-ready, modern AI voice assistant with a realistic Telugu-English female voice, powered by **Edge TTS**, **OpenAI**, and **CustomTkinter**.

---

## ✨ Features

- 🎤 **Voice Input** — Microphone-based speech recognition
- 🔊 **Realistic TTS** — Edge TTS with Telugu (`te-IN-ShrutiNeural`) female voice
- 🧠 **AI Chat** — OpenAI GPT-3.5 with conversational memory
- 🌐 **Web Commands** — Open YouTube, Google, search, play songs
- 📱 **App Launcher** — Open system applications by voice
- ⏰ **Time & Date** — Real-time clock
- 🌤️ **Weather** — Live weather updates via wttr.in
- 📖 **Wikipedia** — Instant knowledge search
- 😂 **Jokes** — Random programming jokes
- 🔈 **Volume Control** — System volume up/down/mute
- 📝 **Notes** — Save, list, and manage notes
- 🔍 **File Search** — Find files on your system
- 🎯 **Wake Word** — "Hey Vandana" / "Vandana Valli"
- 🖥️ **Dark Jarvis UI** — Animated mic, status indicators, typing effect

---

## 📁 Project Structure

```
assistent/
├── main.py              # Entry point — run this to start
├── gui.py               # CustomTkinter dark Jarvis-style GUI
├── voice_engine.py      # Edge TTS + SpeechRecognition + wake word
├── command_handler.py   # All command handlers
├── config.py            # Constants, API keys, voice settings
├── requirements.txt     # Python dependencies
├── README.md            # This file
├── assets/
│   └── logo.png         # Auto-generated logo
└── sounds/
    └── startup.wav      # Auto-generated startup chime
```

---

## 🚀 Installation

### Step 1: Install Python 3.9+
Download from [python.org](https://www.python.org/downloads/) (check "Add to PATH").

### Step 2: Install dependencies
```bash
cd c:\Users\Admin\OneDrive\Desktop\assistent
pip install -r requirements.txt
```

### Step 3: Install PyAudio (Windows — if pip fails)
```bash
pip install pipwin
pipwin install pyaudio
```
Or download the `.whl` from [Unofficial Binaries](https://www.lfd.uci.edu/~gohlke/pythonlibs/#pyaudio).

### Step 4: Set OpenAI API Key (optional — for AI chat)
```powershell
# PowerShell (permanent)
[System.Environment]::SetEnvironmentVariable("OPENAI_API_KEY", "sk-your-key-here", "User")

# Or CMD (session only)
set OPENAI_API_KEY=sk-your-key-here
```
> **Note:** All features work without the API key except AI chat conversations.

### Step 5: Run the assistant
```bash
python main.py
```

---

## 🎮 Usage

| Action | How |
|---|---|
| Start listening | Click 🎤 button or say "Hey Vandana" |
| Ask time | "What time is it?" |
| Ask date | "What's today's date?" |
| Play music | "Play Shape of You" |
| Open app | "Open notepad" |
| Weather | "What's the weather in Hyderabad?" |
| Wikipedia | "Tell me about Python programming" |
| Joke | "Tell me a joke" |
| Save note | "Take a note buy groceries" |
| Show notes | "Show my notes" |
| Volume | "Volume up" / "Volume down" / "Mute" |
| AI Chat | Any general question |
| Exit | "Goodbye" or close window |

---

## 🗣️ Voice Configuration

Edit `config.py` to change voice settings:

| Setting | Default | Description |
|---|---|---|
| `PRIMARY_VOICE` | `te-IN-ShrutiNeural` | Telugu female voice |
| `FALLBACK_VOICE` | `en-IN-NeerjaNeural` | Indian English fallback |
| `VOICE_RATE` | `+0%` | Speech speed (-50% to +100%) |
| `VOICE_PITCH` | `+0Hz` | Pitch adjustment |

---

## ⚠️ Troubleshooting

| Issue | Solution |
|---|---|
| PyAudio install fails | Use `pipwin install pyaudio` |
| Microphone not working | Check Windows microphone permissions |
| Edge TTS fails | Ensure internet connection |
| OpenAI errors | Check `OPENAI_API_KEY` env var |
| GUI lag | Close other heavy applications |

---

## 📝 License

This project is for educational and personal use.

---

Made with ❤️ by Vandana Valli AI Team
