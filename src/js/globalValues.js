import { writable } from "svelte/store";

const android = writable(null)
const androidInApp = writable(true)
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
const searchedAnimeKeyword = writable("")
// const toast = writable(null)
const confirmPromise = writable(null)
const menuVisible = writable(false)
const animeOptionVisible = writable(false)
const openedAnimeOptionIdx = writable(null)
const popupVisible = writable(false)
const openedAnimePopupIdx = writable(null)
const shouldGoBack = writable(true)
const isScrolling = writable(null)
const scrollingTimeout = writable(null)
const asyncShowHideFilters = writable(null)
// Reactive Functions
const runUpdate = writable(null)
const runExport = writable(null)
const updateRecommendationList = writable(null)
const updateFilters = writable(null)
const loadAnime = writable(null)
const runIsScrolling = writable(null)

export {
    android,
    androidInApp,
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
    searchedAnimeKeyword,
    // toast,
    confirmPromise,
    menuVisible,
    animeOptionVisible,
    openedAnimeOptionIdx,
    popupVisible,
    openedAnimePopupIdx,
    shouldGoBack,
    isScrolling,
    scrollingTimeout,
    asyncShowHideFilters,
    // Reactive Functions
    runUpdate,
    runExport,
    updateRecommendationList,
    updateFilters,
    loadAnime,
    runIsScrolling
}