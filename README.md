# CirkleFlix

A Netflix-style local web app for the **Circle FTP (BDIX)** media server — featuring posters, curated categories, instant search, IMDb ratings & metadata via Cinemeta, multi-audio Compat playback, Continue Watching, My List, VLC handoff, and bilingual **English / বাংলা** UI.

## Features

- **Netflix-Style Interface**: Auto-rotating Featured Hero carousel with Cinemeta backdrops, logos, and IMDb ratings, plus curated rows for Latest Releases, English Movies, Hindi Movies, South Indian Dubbed, TV Series, Dubbed Series, Anime, and Animation.
- **Browse & Infinite Scroll**: Dedicated sections for Movies, TV Series, Anime, and Games/Software/More, with year/subcategory filters and smooth infinite scroll.
- **Instant Search**: Debounced search across the entire Circle FTP library with Movies / Series / Files & Games filters and `/` keyboard shortcut.
- **Rich Detail Pages**: IMDb ratings, plots, director & cast, trailers, related titles, season/episode lists with episode thumbnails and watched indicators, and direct file downloads for games/software.
- **Smart Built-in Video Player**:
  - **Direct Mode** for browser-native MP4/WebM streams.
  - **Compat Mode** (`/api/stream`) using `ffmpeg` to remux video and transcode AC3/DTS/EAC3 audio to AAC on the fly — enabling audio track switching (e.g., Hindi / English) right in the browser.
  - **Transcode Mode (x264)** fallback for unsupported video codecs.
  - Seek bar with hover preview, playback speed (`0.5x–2x`), keyboard shortcuts (`Space`/`K`, `←`/`→`, `↑`/`↓`, `M`, `F`, `Esc`), resume & auto-save, and next-episode auto-play countdown.
- **One-Click VLC Handoff**: Launches locally installed VLC Media Player at your exact resume timestamp (or loads a whole season as a playlist).
- **Continue Watching & My List**: Saved locally in `localStorage` with progress bars and one-click clear options.
- **Bilingual UI**: Switch seamlessly between **English (EN)** and **Bengali (বাংলা)**.

## Requirements

- [Node.js](https://nodejs.org/) v18+
- Access to Circle FTP (`http://new.circleftp.net:5000`) on your BDIX network
- *(Optional)* `ffmpeg` & `ffprobe` in `PATH` (for Compat Mode, audio track switching, and x264 transcode)
- *(Optional)* [VLC Media Player](https://www.videolan.org/vlc/) (for "Open in VLC" button)

## Quick Start

### Windows (One-Click)
Double-click **`start.bat`** — it installs dependencies on the first run, builds the frontend, starts the local server at `http://localhost:4000`, and opens your browser automatically.

### Manual / Cross-Platform
```bash
npm install
npm start
```
Then open `http://localhost:4000` in your browser.

### Development Mode
Run the backend and Vite dev server in two terminals:
```bash
npm run dev:server
npm run dev:web
```

## Environment Variables

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `4000` | Local HTTP server port |
| `CIRCLE_API` | `http://new.circleftp.net:5000` | Circle FTP API base URL |
| `FFMPEG` | `ffmpeg` | Custom path to `ffmpeg` executable |
| `FFPROBE` | `ffprobe` | Custom path to `ffprobe` executable |
| `VLC_PATH` | Auto-detected | Custom path to VLC executable |
| `NO_OPEN` | *(unset)* | Set to `1` to disable auto-opening the browser |

## Project Structure

```text
cirkleflix/
├── server/
│   ├── index.js       # Express server + static dist hosting
│   ├── circle.js      # Cached proxy for Circle FTP API
│   ├── meta.js        # Cinemeta (IMDb) metadata lookup & disk cache
│   ├── stream.js      # ffprobe track inspection + ffmpeg Compat/Transcode streaming
│   └── vlc.js         # Local VLC detection & launcher
├── web/
│   ├── index.html     # App shell
│   ├── index.css      # Design system & responsive styles
│   ├── main.js        # Hash router, nav, shortcuts
│   ├── api.js         # API client & Circle FTP parsers
│   ├── store.js       # Settings, Continue Watching & My List persistence
│   ├── i18n.js        # English & Bengali translations
│   ├── ui.js          # Shared components (cards, rows, modals, toasts)
│   └── views/         # home, browse, search, detail, player, settings
├── package.json
├── vite.config.js
├── start.bat
├── LICENSE
└── README.md
```

## License

This project is licensed under the [MIT License](LICENSE).
