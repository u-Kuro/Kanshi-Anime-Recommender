import { getLSData } from "./database.js";
import { get, readable, writable } from "svelte/store";
import { isAndroid, isWebCrawler, isMobile } from "./utils/deviceUtils.js";

const android = readable(isAndroid())
const mobile = readable(isMobile())
const webCrawler = readable(get(android) ? false : isWebCrawler())
const uniqueKey = readable("Kanshi.Media.Recommendations.Anilist.W~uPtWCq=vG$TR:Zl^#t<vdS]I~N70")
const isBackgroundUpdateKey = readable(get(uniqueKey) + ".isBackgroundUpdate")
const visitedKey = readable(get(uniqueKey) + ".visited")
const evictedKey = readable(get(uniqueKey) + ".evicted")

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

const isFullScreen = window.document?.fullscreenElement
const trueWindowHeight = writable(isFullScreen ? null : currentWindowHeight)
// const trueWindowWidth = writable(isFullScreen ? null : currentWindowWidth)

const documentScrollTop = writable(window.document?.documentElement?.scrollTop || 0)

const isImporting = writable(false)
const isExporting = writable(false)
const isReloading = writable(false)

const username = writable(getLSData("username") || "")
const resetTypedUsername = writable(null)
const loadedMediaLists = writable({})
const aniLoaderWorker = writable(null)
const loadNewMedia = writable({})
const searchedWord = writable("")
const categories = writable(null)
const categoriesKeys = writable(null)
const selectedCategory = writable(null)
const orderedMediaOptions = writable(null)
const nonOrderedMediaOptions = readable({
    "Media Filter": {
        bool: [
            "Hide My List",
            "Hide My Finished List",
            "Show My List",
            "Show All Sequels",
            "Show Next Sequel",
            "Show Anime Adapted",
            "Has Unseen Progress",
            "Hidden List",
        ],
        number: [
            {
                name: "Average Score",
                maxValue: Infinity,
                minValue: 0,
            },
            {
                name: "User Score",
                maxValue: Infinity,
                minValue: 0,
            },
            {
                name: "Year",
                max: Infinity,
                min: 0,
            },
            {
                name: "Popularity",
                maxValue: Infinity,
                minValue: 0,
            },
            {
                name: "Score",
                maxValue: Infinity,
                minValue: 0,
            },
            {
                name: "Weighted Score",
                max: Infinity,
                min: 0,
            },
        ]
    },
    "Algorithm Filter": {
        bool: [
            "Content Focused",
            "Inc. Average Score",
            "Inc. All Factors",
            "Exclude Year",
        ],
        number: [
            {
                name: "Min Tag Percentage",
                defaultValue: 0,
                maxValue: Infinity,
                minValue: 0,
            },
            {
                name: "Scoring System",
                maxValue: Infinity,
                minValue: 0,
            },
            {
                name: "Sample Size",
                maxValue: Infinity,
                minValue: 1,
            },
            {
                name: "Min Sample Size",
                maxValue: Infinity,
                minValue: 1,
            },
            {
                name: "Min Average Score",
                minValue: 1,
            },
            {
                name: "Min Anime Popularity",
                maxValue: Infinity,
                minValue: 1,
            },
            {
                name: "Min Manga Popularity",
                maxValue: Infinity,
                minValue: 1,
            },
            {
                name: "Min Novel Popularity",
                maxValue: Infinity,
                minValue: 1,
            }
        ]
    }
})
const mediaOptionsConfig = readable({
    readOnly: {
        "Flexible Inclusion": 1,
        "Shown Metric": 1
    },
    selection: {
        "Media Filter": [
            "Genre",
            "Tag",
            "Season",
            "Release Status",
            "User Status",
            "Format",
            "Country Of Origin",
            "Shown Metric",
            "Shown List",
            "Flexible Inclusion",
            "Year",
            "Studio",
        ],
        "Content Caution": [
            "Genre",
            "Tag",
        ],
        "Algorithm Filter": [
            "Genre",
            "Tag",
            "Tag Category",
        ]
    }
})
const mediaCautions = writable(null)
const algorithmFilters = writable(null)
const selectedMediaGridEl = writable(null)
const hiddenMediaEntries = writable(null)

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
const autoUpdate = writable(getLSData("autoUpdate") ?? true)
const autoUpdateInterval = writable(null)
const runnedAutoUpdateAt = writable(null)

const exportPathIsAvailable = writable(getLSData("exportPathIsAvailable") ?? null)
const autoExport = writable(getLSData("autoExport") ?? null)
const autoExportInterval = writable(null)
const runnedAutoExportAt = writable(null)

const ytPlayers = writable([])
const autoPlay = writable(getLSData("autoPlay") ?? null)

const initData = writable(true)
const initList = writable(null)
const gridFullView = writable(getLSData("gridFullView") ?? null)
const showStatus = writable(getLSData("showStatus") ?? true)
const showRateLimit = writable(getLSData("showRateLimit") ?? true)
const extraInfo = writable(null)
const currentExtraInfo = writable(null)
const earlisetReleaseDate = writable(null)
const shownAllInList = writable({})
const shouldLoadAllList = writable(false)
const confirmPromise = writable(null)
const menuVisible = writable(false)
const mediaOptionVisible = writable(false)
const openedMediaOptionIdx = writable(null)
const popupVisible = writable(false)
const openedMediaPopupIdx = writable(null)
const listUpdateAvailable = writable(false)
const listReloadAvailable = writable(false)
const popupIsGoingBack = writable(false)
const showFilterOptions = writable(getLSData("showFilterOptions") ?? null)
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
    evictedKey,
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
    orderedMediaOptions,
    nonOrderedMediaOptions,
    mediaOptionsConfig,
    mediaCautions,
    algorithmFilters,
    selectedMediaGridEl,
    currentMediaFilters,
    currentMediaSortBy,
    currentMediaCautions,
    currentAlgorithmFilters,
    hiddenMediaEntries,
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
    shouldLoadAllList,
    confirmPromise,
    menuVisible,
    mediaOptionVisible,
    openedMediaOptionIdx,
    popupVisible,
    openedMediaPopupIdx,
    listUpdateAvailable,
    listReloadAvailable,
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