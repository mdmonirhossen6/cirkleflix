// Bilingual EN / BN translations for CirkleFlix

const STRINGS = {
  en: {
    navHome: 'Home',
    navMovies: 'Movies',
    navSeries: 'Series',
    navAnime: 'Anime',
    navMore: 'More',
    navList: 'My List',
    searchPlaceholder: 'Search movies, TV series, anime, games…',
    searchTitle: 'Search',
    searchSub: 'Search across the entire Circle FTP library',
    searchEmptyTitle: 'Find something to watch',
    searchEmptyDesc: 'Type a movie, series, anime, or game name above.',
    searchNoResults: 'No results found',
    searchNoResultsDesc: 'Try a shorter title or a different spelling.',
    filterAll: 'All',
    filterMovies: 'Movies',
    filterSeries: 'Series',
    filterFiles: 'Files & Games',

    featured: 'Featured on Circle FTP',
    play: 'Play',
    resume: 'Resume',
    details: 'Details',
    myList: 'My List',
    inMyList: 'In My List',
    addedToList: 'Added to My List',
    removedFromList: 'Removed from My List',
    openVlc: 'Open in VLC',
    launchingVlc: 'Opening in VLC…',
    vlcFailed: 'Could not launch VLC',
    trailer: 'Trailer',
    copyLink: 'Copy Link',
    linkCopied: 'Direct link copied',
    download: 'Download',

    continueWatching: 'Continue Watching',
    latestReleases: 'Latest Releases',
    englishMovies: 'English Movies',
    hindiMovies: 'Hindi Movies',
    southDubbed: 'South Indian Dubbed',
    tvSeries: 'TV Series',
    dubbedSeries: 'Dubbed Series & Shows',
    animeSeries: 'Anime Series',
    animationMovies: 'Animation Movies',
    moreLikeThis: 'More in this category',
    seeAll: 'See all',
    loadMore: 'Load more',
    loading: 'Loading…',

    director: 'Director',
    cast: 'Cast',
    source: 'Source',
    episodes: 'Episodes',
    season: 'Season',
    episode: 'Episode',
    watched: 'Watched',
    unavailable: 'Link unavailable',
    filesTitle: 'Files',
    resumeAt: 'Resume at {time}',
    remaining: '{time} left',

    moviesTitle: 'Movies',
    moviesSub: 'Browse all movie collections from Circle FTP',
    seriesTitle: 'TV Series',
    seriesSub: 'Binge-worthy shows, serials & dubbed series',
    animeTitle: 'Anime & Animation',
    animeSub: 'Anime series and animated films',
    moreTitle: 'Games, Software & More',
    moreSub: 'PC & console games, apps, tutorials, comics and more',
    myListTitle: 'My List',
    myListSub: 'Titles you saved to watch later',
    myListEmpty: 'Your list is empty',
    myListEmptyDesc: 'Tap "+ My List" on any movie or series to save it here.',
    allYears: 'All',
    clearHistory: 'Clear History',
    clearList: 'Clear My List',
    historyCleared: 'Watch history cleared',
    listCleared: 'My List cleared',

    // Player
    back: 'Back',
    modeDirect: 'Direct',
    modeCompat: 'Compat',
    modeTranscode: 'Transcode',
    audioTracks: 'Audio Track',
    playbackSettings: 'Playback',
    speed: 'Speed',
    mode: 'Mode',
    modeAutoLabel: 'Direct (Fastest)',
    modeCompatLabel: 'Compat (Remux + AAC)',
    modeTranscodeLabel: 'Transcode (x264)',
    modeCompatNote: 'Compat mode fixes missing audio (AC3/DTS) and lets you switch Hindi/English tracks.',
    noAudioInfo: 'Probing audio tracks…',
    singleAudioNote: 'Single audio track detected.',
    switchingAudio: 'Switching audio to {label}…',
    switchingMode: 'Switching to {mode} mode…',
    nextEpisodeIn: 'Next episode in {sec}s',
    playNext: 'Play Next',
    cancel: 'Cancel',
    playerErrTitle: 'Playback error',
    playerErrDesc: 'The browser could not play this file directly. Try Compat Mode, x264 Transcode, or open it in VLC.',
    tryCompat: 'Try Compat Mode',
    tryTranscode: 'Try x264 Transcode',
    fileNotFound: 'This file was not found on Circle FTP (404).',

    // Settings
    settingsTitle: 'Settings',
    settingLang: 'Language',
    settingPlayback: 'Playback Mode',
    settingPlaybackAuto: 'Auto (Recommended)',
    settingPlaybackDirect: 'Always Direct',
    settingPlaybackCompat: 'Always Compat',
    settingPlaybackHelp: 'Auto uses Direct playback for MP4s and switches to Compat mode for MKVs or multi-audio files.',
    settingPrefAudio: 'Preferred Audio',
    audioAny: 'Default',
    audioHin: 'Hindi',
    audioEng: 'English',
    audioBen: 'Bengali',
    settingAutoplay: 'Auto-play Next Episode',
    on: 'On',
    off: 'Off',
    settingData: 'Local Data',
    settingShortcuts: 'Player Shortcuts: Space/K Play · ←/→ ±10s · ↑/↓ Volume · M Mute · F Fullscreen · / Search',
    close: 'Done',

    // Offline
    offlineTitle: 'Circle FTP is not reachable',
    offlineDesc: 'Make sure you are connected to a BDIX network that can reach new.circleftp.net:5000 and that the local CirkleFlix server is running.',
    retry: 'Retry',
  },

  bn: {
    navHome: 'হোম',
    navMovies: 'মুভি',
    navSeries: 'সিরিজ',
    navAnime: 'অ্যানিমে',
    navMore: 'আরও',
    navList: 'আমার তালিকা',
    searchPlaceholder: 'মুভি, সিরিজ, অ্যানিমে, গেম খুঁজুন…',
    searchTitle: 'খুঁজুন',
    searchSub: 'সম্পূর্ণ Circle FTP লাইব্রেরিতে খুঁজুন',
    searchEmptyTitle: 'কী দেখতে চান খুঁজুন',
    searchEmptyDesc: 'উপরে যেকোনো মুভি, সিরিজ, অ্যানিমে বা গেমের নাম লিখুন।',
    searchNoResults: 'কিছু পাওয়া যায়নি',
    searchNoResultsDesc: 'অন্য বানান বা ছোট নাম দিয়ে চেষ্টা করুন।',
    filterAll: 'সব',
    filterMovies: 'মুভি',
    filterSeries: 'সিরিজ',
    filterFiles: 'ফাইল ও গেম',

    featured: 'Circle FTP ফিচার্ড',
    play: 'চালান',
    resume: 'আবার শুরু করুন',
    details: 'বিস্তারিত',
    myList: 'তালিকায় রাখুন',
    inMyList: 'তালিকায় আছে',
    addedToList: 'আমার তালিকায় যোগ হয়েছে',
    removedFromList: 'তালিকা থেকে সরানো হয়েছে',
    openVlc: 'VLC-তে চালান',
    launchingVlc: 'VLC চালু হচ্ছে…',
    vlcFailed: 'VLC চালু করা যায়নি',
    trailer: 'ট্রেইলার',
    copyLink: 'লিংক কপি',
    linkCopied: 'ডাইরেক্ট লিংক কপি হয়েছে',
    download: 'ডাউনলোড',

    continueWatching: 'দেখা চালিয়ে যান',
    latestReleases: 'সর্বশেষ সংযোজন',
    englishMovies: 'ইংলিশ মুভি',
    hindiMovies: 'হিন্দি মুভি',
    southDubbed: 'সাউথ ইন্ডিয়ান ডাবড',
    tvSeries: 'টিভি সিরিজ',
    dubbedSeries: 'ডাবড সিরিজ ও শো',
    animeSeries: 'অ্যানিমে সিরিজ',
    animationMovies: 'অ্যানিমেশন মুভি',
    moreLikeThis: 'এই ক্যাটাগরির আরও',
    seeAll: 'সব দেখুন',
    loadMore: 'আরও দেখুন',
    loading: 'লোড হচ্ছে…',

    director: 'পরিচালক',
    cast: 'অভিনয়শিল্পী',
    source: 'উৎস',
    episodes: 'পর্বসমূহ',
    season: 'সিজন',
    episode: 'পর্ব',
    watched: 'দেখা হয়েছে',
    unavailable: 'লিংক নেই',
    filesTitle: 'ফাইলসমূহ',
    resumeAt: '{time} থেকে আবার শুরু',
    remaining: '{time} বাকি',

    moviesTitle: 'মুভি',
    moviesSub: 'Circle FTP-এর সব মুভি কালেকশন',
    seriesTitle: 'টিভি সিরিজ',
    seriesSub: 'জনপ্রিয় শো, সিরিয়াল ও ডাবড সিরিজ',
    animeTitle: 'অ্যানিমে ও অ্যানিমেশন',
    animeSub: 'অ্যানিমে সিরিজ ও অ্যানিমেশন মুভি',
    moreTitle: 'গেম, সফটওয়্যার ও অন্যান্য',
    moreSub: 'পিসি ও কনসোল গেম, অ্যাপ, টিউটোরিয়াল ও বই',
    myListTitle: 'আমার তালিকা',
    myListSub: 'পরে দেখার জন্য সংরক্ষিত তালিকা',
    myListEmpty: 'আপনার তালিকা খালি',
    myListEmptyDesc: 'যেকোনো মুভি বা সিরিজে "তালিকায় রাখুন" চাপুন।',
    allYears: 'সব',
    clearHistory: 'হিস্ট্রি মুছুন',
    clearList: 'তালিকা মুছুন',
    historyCleared: 'দেখার হিস্ট্রি মুছে ফেলা হয়েছে',
    listCleared: 'আমার তালিকা খালি করা হয়েছে',

    back: 'ফিরুন',
    modeDirect: 'ডাইরেক্ট',
    modeCompat: 'কম্প্যাট',
    modeTranscode: 'ট্রান্সকোড',
    audioTracks: 'অডিও ট্র্যাক',
    playbackSettings: 'প্লেব্যাক',
    speed: 'গতি',
    mode: 'মোড',
    modeAutoLabel: 'ডাইরেক্ট (সবচেয়ে দ্রুত)',
    modeCompatLabel: 'কম্প্যাট (Remux + AAC)',
    modeTranscodeLabel: 'ট্রান্সকোড (x264)',
    modeCompatNote: 'কম্প্যাট মোড AC3/DTS অডিও সমস্যা ঠিক করে এবং হিন্দি/ইংলিশ অডিও বদলাতে সাহায্য করে।',
    noAudioInfo: 'অডিও ট্র্যাক খোঁজা হচ্ছে…',
    singleAudioNote: 'একটি অডিও ট্র্যাক পাওয়া গেছে।',
    switchingAudio: 'অডিও বদলে {label} করা হচ্ছে…',
    switchingMode: '{mode} মোডে যাওয়া হচ্ছে…',
    nextEpisodeIn: 'পরবর্তী পর্ব {sec} সেকেন্ডে',
    playNext: 'পরবর্তী পর্ব',
    cancel: 'বাতিল',
    playerErrTitle: 'প্লেব্যাক সমস্যা',
    playerErrDesc: 'ব্রাউজার সরাসরি এই ফাইলটি চালাতে পারেনি। কম্প্যাট মোড, x264 ট্রান্সকোড অথবা VLC চেষ্টা করুন।',
    tryCompat: 'কম্প্যাট মোড চেষ্টা করুন',
    tryTranscode: 'x264 ট্রান্সকোড চেষ্টা করুন',
    fileNotFound: 'ফাইলটি Circle FTP-তে পাওয়া যায়নি (404)।',

    settingsTitle: 'সেটিংস',
    settingLang: 'ভাষা',
    settingPlayback: 'প্লেব্যাক মোড',
    settingPlaybackAuto: 'অটো (প্রস্তাবিত)',
    settingPlaybackDirect: 'সবসময় ডাইরেক্ট',
    settingPlaybackCompat: 'সবসময় কম্প্যাট',
    settingPlaybackHelp: 'অটো মোড MP4-এর জন্য ডাইরেক্ট এবং MKV বা মাল্টি-অডিও ফাইলের জন্য কম্প্যাট মোড ব্যবহার করে।',
    settingPrefAudio: 'পছন্দের অডিও ভাষা',
    audioAny: 'ডিফল্ট',
    audioHin: 'হিন্দি',
    audioEng: 'ইংলিশ',
    audioBen: 'বাংলা',
    settingAutoplay: 'পরবর্তী পর্ব স্বয়ংক্রিয়ভাবে চালান',
    on: 'চালু',
    off: 'বন্ধ',
    settingData: 'লোকাল ডেটা',
    settingShortcuts: 'শর্টকাট: Space/K প্লে · ←/→ ±১০সে · ↑/↓ ভলিউম · M মিউট · F ফুলস্ক্রিন · / সার্চ',
    close: 'সম্পন্ন',

    offlineTitle: 'Circle FTP-এর সাথে সংযোগ পাওয়া যাচ্ছে না',
    offlineDesc: 'আপনার নেটওয়ার্ক থেকে new.circleftp.net:5000 অ্যাক্সেস করা যাচ্ছে কি না এবং CirkleFlix সার্ভার চালু আছে কি না যাচাই করুন।',
    retry: 'আবার চেষ্টা করুন',
  },
};

const LANG_KEY = 'cirkleflix_lang';
let currentLang = localStorage.getItem(LANG_KEY) === 'bn' ? 'bn' : 'en';
const listeners = new Set();

export function getLang() {
  return currentLang;
}

export function setLang(lang) {
  const next = lang === 'bn' ? 'bn' : 'en';
  if (next === currentLang) return;
  currentLang = next;
  localStorage.setItem(LANG_KEY, next);
  document.documentElement.lang = next;
  listeners.forEach((fn) => fn(next));
}

export function toggleLang() {
  setLang(currentLang === 'en' ? 'bn' : 'en');
}

export function onLangChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function t(key, params) {
  const dict = STRINGS[currentLang] || STRINGS.en;
  let str = dict[key] ?? STRINGS.en[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replaceAll(`{${k}}`, String(v));
    }
  }
  return str;
}

// Apply initial html[lang]
document.documentElement.lang = currentLang;
