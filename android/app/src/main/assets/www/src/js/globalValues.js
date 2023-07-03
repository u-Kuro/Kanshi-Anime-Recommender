import { writable } from "svelte/store";

const appID = writable(21)
const android = writable(null)
const inApp = writable(true)
const lastAnimeUpdate = writable(null)

const username = writable(null)
const lastUserAnimeUpdate = writable(null)
const hiddenEntries = writable(null)

const filterOptions = writable(null)
const activeTagFilters = writable(null)
const finalAnimeList = writable(null)
const animeLoaderWorker = writable(null)
const dataStatus = writable(null)

const autoUpdate = writable(null)
const autoUpdateInterval = writable(null)
const lastRunnedAutoUpdateDate = writable(null)

const exportPathIsAvailable = writable(null)
const autoExport = writable(null)
const autoExportInterval = writable(null)
const lastRunnedAutoExportDate = writable(null)

const ytPlayers = writable([])
const autoPlay = writable(null)

const initData = writable(true)
const animeObserver = writable(null)
const animeIdxRemoved = writable(null)
const shownAllInList = writable(false)
const searchedAnimeKeyword = writable("")
const confirmPromise = writable(null)
const menuVisible = writable(false)
const animeOptionVisible = writable(false)
const openedAnimeOptionIdx = writable(null)
const popupVisible = writable(false)
const openedAnimePopupIdx = writable(null)
const shouldGoBack = writable(true)
const listUpdateAvailable = writable(false)
const isScrolling = writable(null)
const scrollingTimeout = writable(null)
const asyncAnimeReloaded = writable(null)
// Reactive Functions
const runUpdate = writable(null)
const runExport = writable(null)
const importantUpdate = writable(null)
const importantLoad = writable(null)
const updateRecommendationList = writable(null)
const updateFilters = writable(null)
const loadAnime = writable(null)
const runIsScrolling = writable(null)

export {
    appID,
    android,
    inApp,
    lastAnimeUpdate,
    username,
    lastUserAnimeUpdate,
    hiddenEntries,
    filterOptions,
    activeTagFilters,
    finalAnimeList,
    animeLoaderWorker,
    dataStatus,
    autoUpdate,
    autoUpdateInterval,
    lastRunnedAutoUpdateDate,
    exportPathIsAvailable,
    autoExport,
    autoExportInterval,
    lastRunnedAutoExportDate,
    ytPlayers,
    autoPlay,
    initData,
    animeObserver,
    shownAllInList,
    searchedAnimeKeyword,
    animeIdxRemoved,
    confirmPromise,
    menuVisible,
    animeOptionVisible,
    openedAnimeOptionIdx,
    popupVisible,
    openedAnimePopupIdx,
    shouldGoBack,
    listUpdateAvailable,
    isScrolling,
    scrollingTimeout,
    asyncAnimeReloaded,
    // Reactive Functions
    runUpdate,
    runExport,
    importantLoad,
    importantUpdate,
    updateRecommendationList,
    updateFilters,
    loadAnime,
    runIsScrolling
}