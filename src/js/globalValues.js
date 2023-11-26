import { writable } from "svelte/store";
import { getLocalStorage } from "../js/others/helper.js"

const appID = writable(null)
const android = writable(null)
const inApp = writable(true)
const progress = writable(0)
// const anilistAccessToken = writable(null)
const hasWheel = writable(false)
const lastAnimeUpdate = writable(null)

const username = writable(getLocalStorage('username') || null)
const lastUserAnimeUpdate = writable(null)
const hiddenEntries = writable(null)

const filterOptions = writable(null)
const selectedCustomFilter = writable(null)
const activeTagFilters = writable(null)
const customFilters = writable(null)
const loadingFilterOptions = writable(false)
const finalAnimeList = writable(null)
const animeLoaderWorker = writable(null)
const dataStatus = writable(null)

const isImporting = writable(false)
const userRequestIsRunning = writable(null)
const autoUpdate = writable(getLocalStorage('autoUpdate') || null)
const autoUpdateInterval = writable(null)
const lastRunnedAutoUpdateDate = writable(null)

const exportPathIsAvailable = writable(getLocalStorage('exportPathIsAvailable') || null)
const autoExport = writable(getLocalStorage('autoExport') || null)
const autoExportInterval = writable(null)
const lastRunnedAutoExportDate = writable(null)

const ytPlayers = writable([])
const autoPlay = writable(getLocalStorage('autoPlay') || null)

const initData = writable(true)
const gridFullView = writable(getLocalStorage('gridFullView') || null)

const extraInfo = writable(null)
const mostRecentAiringDateTimeout = writable(null)
const earlisetReleaseDate = writable(null)
const checkAnimeLoaderStatus = writable(false)
const animeObserver = writable(null)
const animeIdxRemoved = writable(null)
const shownAllInList = writable(false)
const searchedAnimeKeyword = writable("")
const numberOfNextLoadedGrid = writable(null)
const confirmPromise = writable(null)
const menuVisible = writable(false)
const animeOptionVisible = writable(false)
const openedAnimeOptionIdx = writable(null)
const popupVisible = writable(false)
const openedAnimePopupIdx = writable(null)
const shouldGoBack = writable(true)
const listUpdateAvailable = writable(false)
const listIsUpdating = writable(false)
const popupIsGoingBack = writable(false)
const isScrolling = writable(null)
const scrollingTimeout = writable(null)
const asyncAnimeReloaded = writable(null)
const isFullViewed = writable(null)
const showFilterOptions = writable(getLocalStorage("showFilterOptions") || null)
const dropdownIsVisible = writable(null)
const confirmIsVisible = writable(null)
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
    hasWheel,
    progress,
    // anilistAccessToken,
    lastAnimeUpdate,
    username,
    lastUserAnimeUpdate,
    hiddenEntries,
    filterOptions,
    selectedCustomFilter,
    activeTagFilters,
    customFilters,
    loadingFilterOptions,
    finalAnimeList,
    animeLoaderWorker,
    dataStatus,
    userRequestIsRunning,
    isImporting,
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
    gridFullView,
    extraInfo,
    mostRecentAiringDateTimeout,
    earlisetReleaseDate,
    checkAnimeLoaderStatus,
    animeObserver,
    shownAllInList,
    searchedAnimeKeyword,
    numberOfNextLoadedGrid,
    animeIdxRemoved,
    confirmPromise,
    menuVisible,
    animeOptionVisible,
    openedAnimeOptionIdx,
    popupVisible,
    openedAnimePopupIdx,
    shouldGoBack,
    listUpdateAvailable,
    listIsUpdating,
    popupIsGoingBack,
    isScrolling,
    scrollingTimeout,
    asyncAnimeReloaded,
    isFullViewed,
    showFilterOptions,
    dropdownIsVisible,
    confirmIsVisible,
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