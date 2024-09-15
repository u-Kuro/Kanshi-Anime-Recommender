import { get, readable, writable } from "svelte/store";
import { getLocalStorage, isAndroid, isWebCrawler, isMobile } from "../js/others/helper.js"

const $android = isAndroid()
const android = readable($android)
const mobile = readable(isMobile())
const webCrawler = readable($android ? false : isWebCrawler())
const uniqueKey = readable("Kanshi.Media.Recommendations.Anilist.W~uPtWCq=vG$TR:Zl^#t<vdS]I~N70")
const isBackgroundUpdateKey = readable(get(uniqueKey) + ".isBackgroundUpdate")
const visitedKey = readable(get(uniqueKey) + ".visited")

const appID = writable(null)
const inApp = writable(true)
const progress = writable(0)
const resetProgress = writable(0)

// const location = window.location.toString()
// let $anilistClientId, $anilistRedirectUri
// if (get(android)) {
//     $anilistClientId = "13584"
//     $anilistRedirectUri = "intent://kanshi.media.recommendations.anilist/.W~uPtWCq=vG$TR:Zl%5E#t%3CvdS]I~N70"
// } else if (location.startsWith("https://u-kuro.github.io/Kanshi.Anime-Recommendation")) {
//     $anilistClientId = "13583"
//     $anilistRedirectUri = "https://u-kuro.github.io/Kanshi.Anime-Recommendation"
// } else if (location.startsWith("http://localhost:8080")) {
//     $anilistClientId = "12476"
//     $anilistRedirectUri = "http://localhost:8080"
// } else {
//     $anilistClientId = "13582"
//     $anilistRedirectUri = "https://kanshi.vercel.app"
// }
// const anilistClientId = readable($anilistClientId)
// const anilistRedirectUri = readable($anilistRedirectUri)

const hasWheel = writable(false)

const currentWindowHeight = Math.max(
    window.visualViewport?.height || 0,
    window.innerHeight || 0
)
const currentWindowWidth = Math.max(
    window.document?.documentElement?.getBoundingClientRect?.()?.width || 0,
    window.visualViewport?.width || 0,
    window.innerWidth || 0,
)
const windowHeight = writable(currentWindowHeight)
const windowWidth = writable(currentWindowWidth)

const isFullScreen = window.document?.fullScreen || window.document?.mozFullScreen || window.document?.webkitIsFullScreen || window.document?.msFullscreenElement
const trueWindowHeight = writable(isFullScreen ? null : currentWindowHeight)
// const trueWindowWidth = writable(isFullScreen ? null : currentWindowWidth)

const documentScrollTop = writable(window.document?.documentElement?.scrollTop || 0)

const isImporting = writable(false)
const isExporting = writable(false)
const isReloading = writable(false)

const username = writable(getLocalStorage('username') || '')
const resetTypedUsername = writable(null)
const loadedMediaLists = writable({})
const aniLoaderWorker = writable(null)
const loadNewMedia = writable({})
const searchedWord = writable("")
const categories = writable(null)
const categoriesKeys = writable(null)
const selectedCategory = writable(null)
const orderedFilters = writable(null)
const nonOrderedFilters = writable(null)
const filterConfig = writable(null)
const mediaCautions = writable(null)
const algorithmFilters = writable(null)
const selectedMediaGridEl = writable(null)
const hiddenEntries = writable(null)

const currentMediaFilters = writable({})
const currentMediaSortBy = writable({})
const currentMediaCautions = writable(null)
const currentAlgorithmFilters = writable(null)

const tagInfo = writable({})
const dataStatus = writable(null)
const loadingDataStatus = writable(null)

const loadingCategory = writable({})
const isLoadingMedia = writable(false)
const isProcessingList = writable(false)
const userRequestIsRunning = writable(null)
const autoUpdate = writable(getLocalStorage('autoUpdate') ?? true)
const autoUpdateInterval = writable(null)
const runnedAutoUpdateAt = writable(null)

const exportPathIsAvailable = writable(getLocalStorage('exportPathIsAvailable') ?? null)
const autoExport = writable(getLocalStorage('autoExport') ?? null)
const autoExportInterval = writable(null)
const runnedAutoExportAt = writable(null)

const ytPlayers = writable([])
const autoPlay = writable(getLocalStorage('autoPlay') ?? null)

const initData = writable(true)
const initList = writable(null)
const gridFullView = writable(getLocalStorage('gridFullView') ?? null)
const showStatus = writable(getLocalStorage('showStatus') ?? true)
const showRateLimit = writable(getLocalStorage('showRateLimit') ?? true)
const extraInfo = writable(null)
const currentExtraInfo = writable(null)
const earlisetReleaseDate = writable(null)
const shownAllInList = writable({})
const confirmPromise = writable(null)
const menuVisible = writable(false)
const mediaOptionVisible = writable(false)
const openedMediaOptionIdx = writable(null)
const popupVisible = writable(false)
const openedMediaPopupIdx = writable(null)
const listUpdateAvailable = writable(false)
const popupIsGoingBack = writable(false)
const showFilterOptions = writable(getLocalStorage('showFilterOptions') ?? null)
const dropdownIsVisible = writable(null)
const confirmIsVisible = writable(null)
const keepAppRunningInBackground = writable(null)
const toast = writable(null)
// Reactive Functions
const runUpdate = writable(null)
const shouldUpdateRecommendationList = writable(null)
const shouldUpdateList = writable(null)
const updateRecommendationList = writable(null)
const updateList = writable(null)
const cancelTextCopy = writable(null)

export {
    appID,
    android,
    mobile,
    webCrawler,
    uniqueKey,
    isBackgroundUpdateKey,
    visitedKey,
    inApp,
    hasWheel,
    windowHeight,
    windowWidth,
    trueWindowHeight,
    // trueWindowWidth,
    documentScrollTop,
    progress,
    resetProgress,
    // anilistClientId,
    // anilistRedirectUri,
    isImporting,
    isExporting,
    isReloading,
    username,
    resetTypedUsername,
    loadedMediaLists,
    aniLoaderWorker,
    loadNewMedia,
    searchedWord,
    categories,
    categoriesKeys,
    selectedCategory,
    orderedFilters,
    nonOrderedFilters,
    filterConfig,
    mediaCautions,
    algorithmFilters,
    selectedMediaGridEl,
    currentMediaFilters,
    currentMediaSortBy,
    currentMediaCautions,
    currentAlgorithmFilters,
    hiddenEntries,
    tagInfo,
    dataStatus,
    loadingDataStatus,
    userRequestIsRunning,
    loadingCategory,
    isLoadingMedia,
    isProcessingList,
    autoUpdate,
    autoUpdateInterval,
    runnedAutoUpdateAt,
    exportPathIsAvailable,
    autoExport,
    autoExportInterval,
    runnedAutoExportAt,
    ytPlayers,
    autoPlay,
    initData,
    initList,
    gridFullView,
    showStatus,
    showRateLimit,
    extraInfo,
    currentExtraInfo,
    earlisetReleaseDate,
    shownAllInList,
    confirmPromise,
    menuVisible,
    mediaOptionVisible,
    openedMediaOptionIdx,
    popupVisible,
    openedMediaPopupIdx,
    listUpdateAvailable,
    popupIsGoingBack,
    showFilterOptions,
    dropdownIsVisible,
    confirmIsVisible,
    keepAppRunningInBackground,
    toast,
    // Reactive Functions
    runUpdate,
    shouldUpdateList,
    shouldUpdateRecommendationList,
    updateRecommendationList,
    updateList,
    cancelTextCopy
}