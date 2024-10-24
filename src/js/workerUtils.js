import { get } from "svelte/store";
import { cacheRequest } from "./caching.js";
import { downloadLink, getUniqueId, isConnected, isJsonObject, jsonIsEmpty, removeLocalStorage, setLocalStorage, showToast, } from "../js/others/helper.js"
import {
    dataStatus,
    updateRecommendationList,
    username,
    hiddenEntries,
    runUpdate,
    updateList,
    initData,
    userRequestIsRunning,
    progress,
    android,
    extraInfo,
    currentExtraInfo,
    isLoadingMedia,
    isProcessingList,
    loadingDataStatus,
    isBackgroundUpdateKey,
    earlisetReleaseDate,
    loadedMediaLists,
    loadNewMedia,
    selectedCategory,
    searchedWord,
    categories,
    algorithmFilters,
    mediaCautions,
    resetTypedUsername,
    resetProgress,
    appID,
    loadingCategory,
    currentMediaFilters,
    currentMediaSortBy,
    currentAlgorithmFilters,
    currentMediaCautions,
    isImporting,
    isExporting,
    listUpdateAvailable,
    popupVisible,
    toast,
    initList,
    showRateLimit,
    orderedFilters,
    tagInfo,
    listReloadAvailable,
} from "./globalValues.js";

const hasOwnProp = Object.prototype.hasOwnProperty
let terminateDelay = 1000;
let dataStatusPrio = false
let isGettingNewEntries = false;
let isRequestingMediaEntries = false
let wasRequestingMediaEntries = false

let mostRecentAiringDateTimeout
earlisetReleaseDate.subscribe((val) => {
    if (typeof val === "number" && !isNaN(val)) {
        clearTimeout(mostRecentAiringDateTimeout);
        const timeBeforeEarliestReleaseDate = (val * 1000) - new Date().getTime()
        mostRecentAiringDateTimeout = setTimeout(() => {
            earlisetReleaseDate.set(undefined)
            mediaLoaderWorker?.postMessage?.({
                getEarlisetReleaseDate: true,
            });
        }, Math.min(timeBeforeEarliestReleaseDate, 2000000000));
    }
})

let initMediaLoaderWorker
const initMediaLoader = async () => {
    try {
        if (initMediaLoaderWorker === false) return;
        initMediaLoaderWorker = new Worker(await cacheRequest("./webapi/worker/initalMediaLoader.js", 916291, "Checking Initial List"))
        initMediaLoaderWorker.onmessage = async ({ data }) => {
            if (hasOwnProp.call(data, "media")) {
                const media = data.media
                const isLast = data.isLast
                if (media || isLast) {
                    const categoryKey = data.selectedCategory
                    get(loadNewMedia)?.[categoryKey]?.({
                        idx: data.idx,
                        media,
                        isLast,
                        isInit: true,
                    })
                    if (!isLast) {
                        initMediaLoaderWorker.postMessage({
                            loadNext: true,
                            selectedCategory: categoryKey,
                        })
                    }
                }
            } else if (hasOwnProp.call(data, "categories")) {
                categories.set(data.categories);
                selectedCategory.set(data.selectedCategory);
                loadedMediaLists.update((val) => {
                    for (const categoryKey in data.categories) {
                        if (!val[categoryKey]) {
                            val[categoryKey] = {}
                        }
                        initMediaLoaderWorker.postMessage({
                            loadNext: true,
                            selectedCategory: categoryKey,
                        })
                    }
                    return val
                })
            } else {
                initMediaLoaderWorker?.terminate?.()
                console.error("Something went unexpected");
            }
        }
        initMediaLoaderWorker.postMessage(false)
    } catch (ex) {
        initMediaLoaderWorker?.terminate?.()
        console.error(ex);
    }
}

let mediaLoaderWorker, mediaLoaderWorkerPromise, mediaLoaderPromises = {};
function getMediaLoaderWorker() {
    mediaLoaderWorkerPromise = new Promise(async (resolve) => {
        resolve(new Worker(await cacheRequest("./webapi/worker/mediaLoader.js", 22844, "Checking Existing List")))
        mediaLoaderWorkerPromise = null
    })
    return mediaLoaderWorkerPromise
}
const mediaLoader = (_data = {}) => {
    if (get(initList) !== false && !_data?.initList) {
        return
    }
    return new Promise(async (resolve, reject) => {
        let postId = getUniqueId()
        _data.postId = postId
        mediaLoaderPromises[postId] = { resolve, reject }

        try {
            mediaLoaderWorker = mediaLoaderWorker || mediaLoaderWorkerPromise || await getMediaLoaderWorker()
        } catch (ex) {
            alertError()

            mediaLoaderWorker?.terminate?.()
            mediaLoaderWorker = null

            console.error(ex)

            return reject(ex)
        }

        mediaLoaderWorker.postMessage(_data)

        if (mediaLoaderWorker.onmessage) return
        mediaLoaderWorker.onmessage = async ({ data }) => {
            if (hasOwnProp.call(data, "progress")) {
                if (data?.progress >= 0 && data?.progress <= 100) {
                    progress.set(data.progress);
                }
                return
            } else if (hasOwnProp.call(data, "status")) {
                dataStatus.set(data.status);
                return
            }

            if (hasOwnProp.call(data, "loadMore")) {
                const airingAt = data?.airingAt
                const currentEarliestDate = get(earlisetReleaseDate)
                if (airingAt && (airingAt < currentEarliestDate || currentEarliestDate == null)) {
                    earlisetReleaseDate.set(airingAt)
                }
                get(loadNewMedia)[data.selectedCategory]?.(data)
            } else if (hasOwnProp.call(data, "categorySelected")) {

                const categorySelected = data?.categorySelected

                if (categorySelected) {
                    const category = data?.category
                    loadedMediaLists.update((val) => {
                        if (!val[categorySelected]) {
                            val[categorySelected] = {}
                        }
                        if (
                            val[categorySelected].mediaFilters == null
                            && category?.mediaFilters != null
                        ) {
                            val[categorySelected].mediaFilters = category.mediaFilters;
                            currentMediaFilters.update((e) => {
                                e[categorySelected] = val[categorySelected].mediaFilters
                                return e
                            })
                        }

                        if (
                            val[categorySelected].sortBy == null
                            && category?.sortBy != null
                        ) {
                            val[categorySelected].sortBy = category.sortBy;
                            currentMediaSortBy.update((e) => {
                                e[categorySelected] = val[categorySelected].sortBy
                                return e
                            })
                        }
                        return val
                    })
                }
                mediaLoaderPromises[data?.postId]?.resolve?.()
                delete mediaLoaderPromises[data?.postId]
            } else if (hasOwnProp.call(data, "updatedCategories")) {
                if (data.categories) {
                    categories.set(data.categories);
                }

                const categoriesToUpdate = data.updatedCategories
                
                loadedMediaLists.update((val) => {
                    for (const categoryKey in categoriesToUpdate) {
                        if (!val[categoryKey]) {
                            val[categoryKey] = {}
                        }
                        const category = categoriesToUpdate[categoryKey]
                        val[categoryKey].mediaFilters = category?.mediaFilters;
                        currentMediaFilters.update((e) => {
                            e[categoryKey] = val[categoryKey].mediaFilters
                            return e
                        })
                        val[categoryKey].sortBy = category?.sortBy;
                        currentMediaSortBy.update((e) => {
                            e[categoryKey] = val[categoryKey].sortBy
                            return e
                        })
                    }
                    return val
                })

            } else if (hasOwnProp?.call?.(data, "loadAll")) {
                if (initMediaLoaderWorker !== false && data?.shouldReloadList !== true) {
                    initMediaLoaderWorker?.terminate?.()
                    initMediaLoaderWorker = false
                }
                categories.set(data?.categories || get(categories));
                hiddenEntries.set(data?.hiddenEntries || get(hiddenEntries))
                mediaCautions.set(data?.mediaCautions || get(mediaCautions))
                currentMediaCautions.set(data?.mediaCautions)

                const categoryKey = data?.selectedCategory;
                if (categoryKey) {
                    const category = data?.category
                    loadedMediaLists.update((val) => {
                        if (!val[categoryKey]) {
                            val[categoryKey] = {}
                        }
                        val[categoryKey].mediaFilters = category?.mediaFilters || val[categoryKey].mediaFilters;
                        currentMediaFilters.update((e) => {
                            e[categoryKey] = val[categoryKey].mediaFilters
                            return e
                        })
                        val[categoryKey].sortBy = category?.sortBy || val[categoryKey].sortBy;
                        currentMediaSortBy.update((e) => {
                            e[categoryKey] = val[categoryKey].sortBy
                            return e
                        })
                        return val
                    })
                }

                const currentSelectedCategory = get(selectedCategory)
                const passedCategory = data?.selectedCategory
                const currentCategories = get(categories)

                if (
                    currentCategories?.[currentSelectedCategory] == null
                    && currentCategories?.[passedCategory] != null
                ) {
                    selectedCategory.set(passedCategory)
                }

                mediaLoaderPromises[data?.postId]?.resolve?.(data)
                delete mediaLoaderPromises[data?.postId]
            } else if (hasOwnProp.call(data, "getEarlisetReleaseDate")) {
                let currentEarliestDate = get(earlisetReleaseDate)
                let airingAt = data.earliestReleaseDate
                if (airingAt && (airingAt < currentEarliestDate || currentEarliestDate == null)) {
                    earlisetReleaseDate.set(data.earliestReleaseDate);
                }
            } else if (hasOwnProp?.call?.(data, "error")) {
                dataStatus.set(null)
                progress.set(100)

                alertError()

                mediaLoaderWorker?.terminate?.()
                mediaLoaderWorker = null

                console.error(data.error)

                mediaLoaderPromises[data?.postId]?.reject?.()
                delete mediaLoaderPromises[data?.postId]
            }

            if (data?.updateDate >= get(loadingCategory)[""]) {
                loadingCategory.update((e) => {
                    delete e[""]
                    return e
                })
            }

            const currentCategory = get(selectedCategory)
            const hasAvailableListReload = !get(popupVisible) && get(listReloadAvailable)
            if (hasOwnProp?.call?.(data, "reloadList") || hasAvailableListReload) {
                if (jsonIsEmpty(get(loadedMediaLists))) {
                    if (mediaLoaderWorker) {
                        mediaLoaderWorker.postMessage({
                            loadAll: true,
                            selectedCategory: currentCategory
                        })
                    } else {
                        mediaLoader({
                            loadAll: true,
                            selectedCategory: currentCategory
                        })
                    }
                }
                mediaLoaderWorker.postMessage({
                    reload: true,
                    loadMore: true,
                    selectedCategory: currentCategory,
                    searchedWord: get(searchedWord),
                });
                if (hasAvailableListReload) {
                    listReloadAvailable.set(false)
                }
                mediaLoaderPromises[data?.postId]?.resolve?.()
                delete mediaLoaderPromises[data?.postId]
            }
        };
        mediaLoaderWorker.onerror = (error) => {
            dataStatus.set(null)
            progress.set(100)

            alertError()

            mediaLoaderWorker?.terminate?.()
            mediaLoaderWorker = null

            console.error(error);

            mediaLoaderPromises?.[postId]?.reject?.(error)
            delete mediaLoaderPromises[postId]
        };
    })
}

let mediaManagerWorker, 
    mediaManagerWorkerTimeout,
    mediaManagerWorkerPostId,
    updateRecommendedMediaList,
    passedMediaCautions,
    mediaFilters = {},
    entriesToHide = {},
    entriesToShow = {},
    categoriesToEdit = []
const mediaManager = (_data = {}) => {
    if (get(initList) !== false && !_data?.initList) {
        return
    }
    return new Promise((resolve, reject) => {

        clearTimeout(mediaManagerWorkerTimeout);
        mediaManagerWorker?.terminate?.()

        if (get(isImporting)) {
            if (!_data?.isImporting) {
                return reject("Process is interrupted, currently importing")
            }
        }

        mediaManagerWorkerPostId = getUniqueId()

        if (hasOwnProp.call(_data, "updateMediaFilter")) {
            const category = _data.selectedCategory
            if (category && (_data.mediaFilters || _data.sortBy)) {
                if (!mediaFilters[category]) {
                    mediaFilters[category] = {}
                }
                if (_data.mediaFilters) {
                    mediaFilters[category].mediaFilters = _data.mediaFilters
                }
                if (_data.sortBy) {
                    mediaFilters[category].sortBy = _data.sortBy
                }
                loadingCategory.update((e) => {
                    e[category] = new Date()
                    return e
                })
            }
        } else if (hasOwnProp.call(_data, "removeId")) {
            const removeId = _data.removeId
            entriesToHide[removeId] = true
            delete entriesToShow[removeId]

            loadingCategory.update((e) => {
                e[""] = new Date()
                return e
            })

            if (get(popupVisible) && get(loadedMediaLists)?.[get(selectedCategory)]?.mediaList?.length) {
                listUpdateAvailable.set(true)
                return
            }
        } else if (hasOwnProp.call(_data, "showId")) {
            const showId = _data.showId
            if (showId === "all") {
                entriesToShow = { all: true }
                entriesToHide = {}
            } else {
                entriesToShow[showId] = true
                delete entriesToHide[showId]
            }

            loadingCategory.update((e) => {
                e[""] = new Date()
                return e
            })

            if (get(popupVisible) && get(loadedMediaLists)?.[get(selectedCategory)]?.mediaList?.length) {
                listUpdateAvailable.set(true)
                return
            }
        } else if (hasOwnProp.call(_data, "addedCategoryKey")) {
            const categoryToAdd = _data.addedCategoryKey
            const categoryToAddFrom = _data.copiedCategoryKey
            categoriesToEdit.push({ 
                add: {
                    [categoryToAdd]: categoryToAddFrom
                } 
            })
        } else if (hasOwnProp.call(_data, "renamedCategoryKey")) {
            const newNameForCategory = _data.renamedCategoryKey
            const categoryToRename = _data.replacedCategoryKey
            categoriesToEdit.push({ 
                rename: {
                    [newNameForCategory]: categoryToRename
                } 
            })
        } else if (hasOwnProp.call(_data, "deletedCategoryKey")) {
            const categoryToDelete = _data.deletedCategoryKey
            categoriesToEdit.push({ 
                delete: categoryToDelete
            })
        } else {
            updateRecommendedMediaList = _data?.updateRecommendedMediaList || updateRecommendedMediaList
            if (_data?.mediaCautions instanceof Array) {
                passedMediaCautions = _data.mediaCautions
            }

            loadingCategory.update((e) => {
                e[""] = new Date()
                return e
            })
        }

        progress.set(0)
        cacheRequest("./webapi/worker/mediaManager.js", 54229, "Updating Categories and List")
            .then(url => {
                clearTimeout(mediaManagerWorkerTimeout);
                mediaManagerWorker?.terminate?.()
                isLoadingMedia.set(true)
                mediaManagerWorker = new Worker(url);
                mediaManagerWorker.postMessage({
                    updateRecommendedMediaList,
                    mediaFilters,
                    mediaCautions: passedMediaCautions,
                    categoriesToEdit,
                    entriesToHide,
                    entriesToShow,
                    postId: mediaManagerWorkerPostId,
                    initList: _data?.initList
                });
                mediaManagerWorker.onmessage = ({ data }) => {
                    if (hasOwnProp.call(data, "progress")) {
                        if (data?.progress >= 0 && data?.progress <= 100) {
                            progress.set(data.progress);
                        }
                        return
                    } else if (hasOwnProp.call(data, "status")) {
                        dataStatusPrio = true
                        dataStatus.set(data.status);
                        return
                    }

                    if (hasOwnProp?.call?.(data, "error")) {
                        dataStatusPrio = false

                        listUpdateAvailable.set(true)
                        isLoadingMedia.set(false)
                        dataStatus.set(null);
                        progress.set(100)

                        alertError()

                        mediaManagerWorker?.terminate?.();
                        mediaManagerWorker = null

                        console.error(data.error);

                        reject(data.error)
                    } else {
                        if (!get(android) || window[get(isBackgroundUpdateKey)] !== true) {
                            if (data.postId === mediaManagerWorkerPostId) {
                                mediaManagerWorkerPostId = updateRecommendedMediaList = passedMediaCautions = undefined
                                mediaFilters = {}
                                entriesToHide = {}
                                entriesToShow = {}
                                categoriesToEdit = []
                            }

                            delete data.postId
                            
                            if (mediaLoaderWorker) {
                                mediaLoaderWorker.postMessage(data || {})
                            } else {
                                mediaLoader(data || {})
                            }
                        }
                        
                        dataStatusPrio = false

                        isLoadingMedia.set(false)
                        dataStatus.set(null)
                        progress.set(100)

                        mediaManagerWorkerTimeout = setTimeout(() => {
                            mediaManagerWorker?.terminate?.();
                        }, terminateDelay);

                        resolve()
                    }
                }
                mediaManagerWorker.onerror = (error) => {
                    dataStatusPrio = false
        
                    listUpdateAvailable.set(true)
                    isLoadingMedia.set(false)
                    dataStatus.set(null)
                    progress.set(100)
        
                    alertError()
        
                    mediaManagerWorker?.terminate?.();
                    mediaManagerWorker = null
                    
                    console.error(error);

                    reject(error)
                };
            })
            .catch((error) => {
                dataStatusPrio = false
    
                listUpdateAvailable.set(true)
                isLoadingMedia.set(false)
                dataStatus.set(null)
                progress.set(100)
    
                alertError()
    
                mediaManagerWorker?.terminate?.()
                mediaManagerWorker = null
    
                console.error(error);

                reject(error)
            })
    })
}

let processRecommendedMediaListTerminateTimeout;
let processRecommendedMediaListWorker;
let mediaReleaseUpdateTimeout
window.setMediaReleaseUpdateTimeout = (neareastMediaReleaseAiringAt) => {
    if (typeof neareastMediaReleaseAiringAt === 'number' && !isNaN(neareastMediaReleaseAiringAt)) {
        clearTimeout(mediaReleaseUpdateTimeout)
        let timeLeftBeforeMediaReleaseUpdate = (neareastMediaReleaseAiringAt * 1000) - new Date().getTime()
        mediaReleaseUpdateTimeout = setTimeout(() => {
            updateRecommendationList.update(e => !e)
        }, Math.min(timeLeftBeforeMediaReleaseUpdate, 2000000000))
    }
}

let passedAlgorithmFilter, passedAlgorithmFilterId
const processRecommendedMediaList = (_data = {}) => {
    if (get(initList) !== false && !_data?.initList) {
        return
    }
    return new Promise((resolve, reject) => {
        if (get(isImporting)) {
            if (!_data?.isImporting) {
                return reject("Process is interrupted, currently importing")
            }
        }

        if (_data?.algorithmFilters) {
            passedAlgorithmFilter = _data.algorithmFilters
            _data.passedAlgorithmFilterId = passedAlgorithmFilterId = getUniqueId()
        } else if (passedAlgorithmFilter) {
            _data.algorithmFilters = passedAlgorithmFilter
            _data.algorithmFiltersId = passedAlgorithmFilterId
        }
        
        clearTimeout(processRecommendedMediaListTerminateTimeout);
        processRecommendedMediaListWorker?.terminate?.();
        progress.set(0)
        cacheRequest("./webapi/worker/processRecommendedMediaList.js", 44130, "Updating Recommendation List")
            .then(url => {
                const lastProcessRecommendationAiringAt = parseInt((new Date().getTime() / 1000))
                let neareastMediaReleaseAiringAt
                clearTimeout(processRecommendedMediaListTerminateTimeout);
                processRecommendedMediaListWorker?.terminate?.();
                isProcessingList.set(true)
                processRecommendedMediaListWorker = new Worker(url);
                processRecommendedMediaListWorker.postMessage(_data);
                processRecommendedMediaListWorker.onmessage = ({ data }) => {
                    if (hasOwnProp?.call?.(data, "progress")) {
                        if (data?.progress >= 0 && data?.progress <= 100) {
                            progress.set(data.progress)
                        }
                        return
                    } else if (hasOwnProp?.call?.(data, "status")) {
                        dataStatusPrio = true
                        dataStatus.set(data.status);
                        return
                    }
                    if (hasOwnProp?.call?.(data, "error")) {
                        dataStatusPrio = false
                        isProcessingList.set(false)
                        dataStatus.set(null);
                        progress.set(100)
                        alertError()
                        processRecommendedMediaListWorker?.terminate?.();
                        console.error(data.error)
                        reject(data.error);
                    } else if (hasOwnProp?.call?.(data, "mediaReleaseNotification")) {
                        if (get(android)) {
                            try {
                                let aniReleaseNotif = data?.mediaReleaseNotification
                                if (
                                    typeof aniReleaseNotif?.releaseEpisode === "number" && !isNaN(aniReleaseNotif.releaseEpisode) && isFinite(aniReleaseNotif.releaseEpisode)
                                    && typeof aniReleaseNotif.releaseDateMillis === "number" && !isNaN(aniReleaseNotif.releaseDateMillis) && isFinite(aniReleaseNotif.releaseDateMillis)
                                    && typeof aniReleaseNotif.maxEpisode === "number" && !isNaN(aniReleaseNotif.maxEpisode) && isFinite(aniReleaseNotif.maxEpisode)
                                    && typeof aniReleaseNotif.title === "string"
                                    && typeof aniReleaseNotif.id === "number" && !isNaN(aniReleaseNotif.id) && isFinite(aniReleaseNotif.id)
                                    && typeof aniReleaseNotif.userStatus === "string"
                                    && typeof aniReleaseNotif.imageURL === "string"
                                    && typeof aniReleaseNotif.mediaUrl === "string"
                                    && typeof aniReleaseNotif.episodeProgress === "number" && !isNaN(aniReleaseNotif.episodeProgress) && isFinite(aniReleaseNotif.episodeProgress)
                                ) {
                                    JSBridge.addMediaReleaseNotification(
                                        Math.floor(aniReleaseNotif.id),
                                        aniReleaseNotif.title,
                                        Math.floor(aniReleaseNotif.releaseEpisode),
                                        Math.floor(aniReleaseNotif.maxEpisode),
                                        Math.floor(aniReleaseNotif.releaseDateMillis),
                                        aniReleaseNotif.imageURL,
                                        aniReleaseNotif.mediaUrl,
                                        aniReleaseNotif.userStatus,
                                        Math.floor(aniReleaseNotif.episodeProgress)
                                    )
                                }
                            } catch (ex) { console.error(ex) }
                        }
                    } else if (hasOwnProp?.call?.(data, "mediaReleaseAiringAt")) {
                        const mediaReleaseAiringAt = data?.mediaReleaseAiringAt
                        if (mediaReleaseAiringAt > lastProcessRecommendationAiringAt && typeof mediaReleaseAiringAt === "number" && !isNaN(mediaReleaseAiringAt)) {
                            if (
                                neareastMediaReleaseAiringAt > mediaReleaseAiringAt || neareastMediaReleaseAiringAt == null
                            ) {
                                neareastMediaReleaseAiringAt = mediaReleaseAiringAt
                            }
                        }
                    } else if (
                        hasOwnProp?.call?.(data, "averageScoreMode")
                        || hasOwnProp?.call?.(data, "animePopularityMode")
                        || hasOwnProp?.call?.(data, "mangaPopularityMode")
                        || hasOwnProp?.call?.(data, "novelPopularityMode")
                    ) {
                        window.updateMeanNumberInfos?.(data?.averageScoreMode, data?.animePopularityMode, data?.mangaPopularityMode, data?.novelPopularityMode)
                    } else if (hasOwnProp?.call?.(data, "recListMAPE")) {
                        window.updateRecListMAPE?.(data?.recListMAPE)
                    } else {
                        setLocalStorage("neareastMediaReleaseAiringAt", neareastMediaReleaseAiringAt)
                        .catch(() => removeLocalStorage("neareastMediaReleaseAiringAt"))
                        .finally(() => saveIDBdata(neareastMediaReleaseAiringAt, "neareastMediaReleaseAiringAt"));
                        if (window.shouldUpdateNotifications === true && get(android)) {
                            window.shouldUpdateNotifications = false
                            if (typeof (get(username)) === "string") {
                                try {
                                    JSBridge.callUpdateNotifications()
                                } catch (ex) { console.error(ex) }
                            }
                        }
                        if (passedAlgorithmFilterId === data?.passedAlgorithmFilterId && passedAlgorithmFilterId != null) {
                            passedAlgorithmFilterId = passedAlgorithmFilter = undefined
                        }
                        if (data?.hasNewFilterOption) {
                            getOrderedFilters()
                        }
                        dataStatusPrio = false
                        processRecommendedMediaListTerminateTimeout = setTimeout(() => {
                            processRecommendedMediaListWorker?.terminate?.();
                        }, terminateDelay);
                        isProcessingList.set(false)
                        dataStatus.set(null)
                        progress.set(100)
                        if (neareastMediaReleaseAiringAt) {
                            window.setMediaReleaseUpdateTimeout?.(neareastMediaReleaseAiringAt)
                        }
                        resolve()
                        if (get(isImporting)) {
                            mediaLoader({ loadAll: true, selectedCategory: get(selectedCategory) })
                        }
                    }
                };
                processRecommendedMediaListWorker.onerror = (error) => {
                    dataStatusPrio = false
                    isProcessingList.set(false)
                    dataStatus.set(null)
                    progress.set(100)
                    processRecommendedMediaListWorker?.terminate?.();
                    console.error(error)
                    reject(error);
                };
            }).catch((error) => {
                dataStatusPrio = false
                isProcessingList.set(false)
                dataStatus.set(null)
                progress.set(100)
                alertError()
                processRecommendedMediaListWorker?.terminate?.();
                console.error(error)
                reject(error)
            })
    });
};
let requestMediaEntriesTerminateTimeout, requestMediaEntriesWorker;
function notifyMediaListIsProcessing(minimizeTransaction) {
    requestMediaEntriesWorker?.postMessage?.({ minimizeTransaction })
}
isLoadingMedia.subscribe((val) => {
    notifyMediaListIsProcessing(val)
})
isProcessingList.subscribe((val) => {
    if (val === true) {
        notifyMediaListIsProcessing(val)
    }
})

let newAddedMediaCount, newUpdatedMediaCount
function notifyUpdatedMediaNotification() {
    if (get(android) && window[".androidDataIsEvicted"] !== true) {
        try {
            if (
                typeof newAddedMediaCount === "number" && !isNaN(newAddedMediaCount) && isFinite(newAddedMediaCount)
                && typeof newUpdatedMediaCount === "number" && !isNaN(newUpdatedMediaCount) && isFinite(newUpdatedMediaCount)
                && (
                    newAddedMediaCount > 0 ||
                    newUpdatedMediaCount > 0
                )
            ) {
                updateRecommendationList.update(e => !e)
                JSBridge.showNewUpdatedMediaNotification(
                    Math.floor(newAddedMediaCount), 
                    Math.floor(newUpdatedMediaCount)
                )
                newAddedMediaCount = newUpdatedMediaCount = undefined
            }
        } catch (ex) {
            newAddedMediaCount = newUpdatedMediaCount = undefined
            console.error(ex)
        }
    }
}
window.notifyUpdatedMediaNotification = notifyUpdatedMediaNotification
const requestMediaEntries = (_data = {}) => {
    if (get(initList) !== false && !_data?.initList) {
        return
    }
    return new Promise((resolve, reject) => {
        if (isRequestingMediaEntries) {
            resolve()
            return
        }
        clearTimeout(requestMediaEntriesTerminateTimeout)
        requestMediaEntriesWorker?.terminate?.()
        notifyUpdatedMediaNotification()
        if (!get(initData)) {
            if (isGettingNewEntries
                || get(isExporting)
                || get(isImporting)
            ) {
                resolve()
                return
            }
        }
        progress.set(0)
        cacheRequest("./webapi/worker/requestMediaEntries.js")
            .then(url => {
                clearTimeout(requestMediaEntriesTerminateTimeout)
                requestMediaEntriesWorker?.terminate?.()
                notifyUpdatedMediaNotification()
                requestMediaEntriesWorker = new Worker(url)
                if (!get(android) && window.location != null) {
                    try {
                        const server = new URL(window.location).toString()
                        if (typeof server === "string" && server !== "") {
                            _data.server = server
                        }
                    } catch {}
                }
                requestMediaEntriesWorker.postMessage(_data)
                wasRequestingMediaEntries = isRequestingMediaEntries = true
                requestMediaEntriesWorker.onmessage = ({ data }) => {
                    if (hasOwnProp?.call?.(data, "progress")) {
                        if (!dataStatusPrio && data?.progress >= 0 && data?.progress <= 100) {
                            progress.set(data.progress)
                        }
                        return
                    } else if (hasOwnProp?.call?.(data, "status")) {
                        if (!dataStatusPrio) {
                            if (get(showRateLimit) || !data.status?.includes?.("Rate Limit:")) {
                                dataStatus.set(data.status)
                            }
                        }
                        return
                    } else if (hasOwnProp.call(data, "getConnectionState")) {
                        (async () => {
                            requestMediaEntriesWorker?.postMessage?.({ connected: await isConnected() })
                        })();
                        return
                    }
                    
                    if (hasOwnProp?.call?.(data, "error")) {
                        wasRequestingMediaEntries = isRequestingMediaEntries = false

                        requestMediaEntriesWorker?.terminate?.();
                        notifyUpdatedMediaNotification()

                        dataStatus.set(null)
                        progress.set(100)

                        console.error(data.error)
                        reject(data.error)
                    } else if (hasOwnProp?.call?.(data, "updateRecommendationList")) {
                        if (get(android)) {
                            window.KanshiBackgroundShouldProcessRecommendation = true
                        }
                        updateRecommendationList.update(e => !e)
                    } else if (hasOwnProp?.call?.(data, "errorDuringInit")) {
                        wasRequestingMediaEntries = isRequestingMediaEntries = false
                        requestMediaEntriesWorker?.terminate?.();
                        notifyUpdatedMediaNotification()
                        dataStatus.set(null)
                        progress.set(100)
                        resolve(data)
                    } else if (hasOwnProp?.call?.(data, "notifyAddedEntries")) {
                        if (get(android) && window[".androidDataIsEvicted"] !== true) {
                            try {
                                let addedMediaCount = data?.notifyAddedEntries
                                if (typeof addedMediaCount !== "number" || isNaN(addedMediaCount) || !isFinite(addedMediaCount) || addedMediaCount < 0) {
                                    addedMediaCount = 0
                                }
                                let updatedMediaCount = data?.notifyEditedEntries
                                if (typeof updatedMediaCount !== "number" || isNaN(updatedMediaCount) || !isFinite(updatedMediaCount) || updatedMediaCount < 0) {
                                    updatedMediaCount = 0
                                }
                                if (
                                    typeof addedMediaCount === "number" && !isNaN(addedMediaCount) && isFinite(addedMediaCount)
                                    && typeof updatedMediaCount === "number" && !isNaN(updatedMediaCount) && isFinite(updatedMediaCount)
                                    && (
                                        addedMediaCount > 0 ||
                                        updatedMediaCount > 0
                                    )
                                ) {
                                    if (window[get(isBackgroundUpdateKey)] === true) {
                                        JSBridge.showNewUpdatedMediaNotification(
                                            Math.floor(addedMediaCount), 
                                            Math.floor(updatedMediaCount)
                                        )
                                    } else {
                                        newAddedMediaCount = addedMediaCount
                                        newUpdatedMediaCount = updatedMediaCount
                                    }
                                }
                            } catch (ex) { console.error(ex) }
                        }
                    } else {
                        if (data?.noEntriesFound) {
                            console.error("No entries found");
                            alertError()
                        } else if (data?.getEntries === true) {
                            isGettingNewEntries = true
                            stopConflictingWorkers({ isGettingNewEntries: true })
                            getMediaEntries()
                                .finally(() => {
                                    isGettingNewEntries = false
                                    rerunImportantWork()
                                })
                        }
                        wasRequestingMediaEntries = isRequestingMediaEntries = false
                        requestMediaEntriesTerminateTimeout = setTimeout(() => {
                            requestMediaEntriesWorker?.terminate?.();
                        }, terminateDelay)
                        notifyUpdatedMediaNotification()
                        dataStatus.set(null)
                        progress.set(100)
                        resolve(data)
                    }
                }
                requestMediaEntriesWorker.onerror = (error) => {
                    wasRequestingMediaEntries = isRequestingMediaEntries = false
                    isGettingNewEntries = false
                    requestMediaEntriesWorker?.terminate?.();
                    notifyUpdatedMediaNotification()
                    dataStatus.set(null)
                    progress.set(100)
                    console.error(error)
                    reject(error)
                }
            }).catch((error) => {
                wasRequestingMediaEntries = isRequestingMediaEntries = false
                isGettingNewEntries = false
                requestMediaEntriesWorker?.terminate?.();
                notifyUpdatedMediaNotification()
                dataStatus.set(null)
                progress.set(100)
                alertError()
                console.error(error)
                reject(error)
            })
    })
}
let isRequestingNewUser, isReloadingUserEntries
let requestUserEntriesTerminateTimeout, requestUserEntriesWorker;
const requestUserEntries = (_data = {}) => {
    if (get(initList) !== false && !_data?.initList) {
        return
    }
    return new Promise((resolve, reject) => {
        if (_data?.username) {
            clearTimeout(requestUserEntriesTerminateTimeout)
            requestUserEntriesWorker?.terminate?.()
            isRequestingNewUser = true
        } else if (isRequestingNewUser) {
            return
        } else if (_data?.reload) {
            clearTimeout(requestUserEntriesTerminateTimeout)
            requestUserEntriesWorker?.terminate?.()
            isReloadingUserEntries = true
        } else if (isReloadingUserEntries) {
            return
        } else {
            clearTimeout(requestUserEntriesTerminateTimeout)
            requestUserEntriesWorker?.terminate?.()
        }
        
        if (!get(initData)) {
            if (get(isExporting)
                || get(isImporting)
                || isGettingNewEntries
            ) {
                isRequestingNewUser = isReloadingUserEntries = false
                userRequestIsRunning.set(false)
                return reject()
            }
        }
        userRequestIsRunning.set(true)
        progress.set(0)
        cacheRequest("./webapi/worker/requestUserEntries.js")
            .then(url => {
                clearTimeout(requestUserEntriesTerminateTimeout)
                requestUserEntriesWorker?.terminate?.()
                requestUserEntriesWorker = new Worker(url)
                userRequestIsRunning.set(true)
                if (!get(android) && window.location != null) {
                    try {
                        const server = new URL(window.location).toString()
                        if (typeof server === "string" && server !== "") {
                            _data.server = server
                        }
                    } catch {}
                }
                requestUserEntriesWorker.postMessage(_data)
                requestUserEntriesWorker.onmessage = ({ data }) => {
                    if (hasOwnProp?.call?.(data, "progress")) {
                        if ((!dataStatusPrio || isRequestingNewUser || isReloadingUserEntries)
                            && data?.progress >= 0 && data?.progress <= 100
                        ) {
                            progress.set(data.progress)
                        }
                        return
                    } else if (hasOwnProp?.call?.(data, "status")) {
                        if (isRequestingNewUser || isReloadingUserEntries) {
                            if (get(showRateLimit) || !data.status?.includes?.("Rate Limit:")) {
                                dataStatusPrio = true
                                dataStatus.set(data.status)
                            }
                        } else if (!dataStatusPrio) {
                            if (get(showRateLimit) || !data.status?.includes?.("Rate Limit:")) {
                                dataStatus.set(data.status)
                            }
                        }
                        return
                    } else if (hasOwnProp.call(data, "getConnectionState")) {
                        (async () => {
                            requestUserEntriesWorker?.postMessage?.({ connected: await isConnected() })
                        })();
                        return
                    }

                    if (hasOwnProp?.call?.(data, "error")) {
                        if (isRequestingNewUser || isReloadingUserEntries) {
                            dataStatusPrio = false
                            window.confirmPromise?.({
                                isAlert: true,
                                title: "Failed to Request User Data",
                                text: typeof data.error === "string" && data.error ? data.error : "Request for user data has failed, please try again.",
                            })
                            isRequestingNewUser = isReloadingUserEntries = false
                        }
                        userRequestIsRunning.set(false)
                        updateList.update((e) => !e)
                        requestUserEntriesWorker?.terminate?.();
                        dataStatus.set(null)
                        progress.set(100)
                        resetTypedUsername.update(e => !e)
                        console.error(data.error)
                        reject(data.error)
                    } else if (hasOwnProp?.call?.(data, "updateRecommendationList")) {
                        if (get(android)) {
                            window.KanshiBackgroundShouldProcessRecommendation = window.shouldUpdateNotifications = true
                        }
                        updateRecommendationList.update(e => !e)
                    } else {
                        if (isRequestingNewUser || isReloadingUserEntries) {
                            dataStatusPrio = false
                            isRequestingNewUser = isReloadingUserEntries = false
                        }
                        userRequestIsRunning.set(false)
                        requestUserEntriesTerminateTimeout = setTimeout(() => {
                            requestUserEntriesWorker?.terminate?.();
                        }, terminateDelay)
                        dataStatus.set(null)
                        progress.set(100)
                        resolve(data)
                    }
                }
                requestUserEntriesWorker.onerror = (error) => {
                    if (isRequestingNewUser || isReloadingUserEntries) {
                        dataStatusPrio = false
                        window.confirmPromise?.({
                            isAlert: true,
                            title: "Failed to Request User Data",
                            text: "Request for user data has failed, please try again.",
                        })
                        isRequestingNewUser = isReloadingUserEntries = false
                    }
                    userRequestIsRunning.set(false)
                    updateList.update((e) => !e)
                    requestUserEntriesWorker?.terminate?.();
                    dataStatus.set(null)
                    progress.set(100)
                    resetTypedUsername.update(e => !e)
                    console.error(error)
                    reject(error)
                }
            }).catch((error) => {
                if (isRequestingNewUser || isReloadingUserEntries) {
                    dataStatusPrio = false
                    window.confirmPromise?.({
                        isAlert: true,
                        title: "Failed to Request User Data",
                        text: "Request for user data has failed, please try again.",
                    })
                    isRequestingNewUser = isReloadingUserEntries = false
                }
                userRequestIsRunning.set(false)
                dataStatus.set(null)
                progress.set(100)
                updateList.update((e) => !e)
                requestUserEntriesWorker?.terminate?.();
                alertError()
                resetTypedUsername.update(e => !e)
                console.error(error)
                reject(error)
            })
    })
}

let exportUserDataWorker, waitForExportApproval;
window.isExported = (success = true) => {
    if (success) {
        waitForExportApproval?.resolve?.()
    } else {
        waitForExportApproval?.reject?.()
    }
}
const exportUserData = (_data) => {
    if (get(initList) !== false && !_data?.initList) {
        return
    }
    return new Promise((resolve, reject) => {
        if (get(isExporting) && _data?.visibilityChange) {
            resolve()
            return
        }
        exportUserDataWorker?.terminate?.()
        if (!get(initData)) {
            if (get(isImporting) || isGettingNewEntries) return
            isExporting.set(true)
            stopConflictingWorkers({ isExporting: true })
        }
        waitForExportApproval?.reject?.()
        waitForExportApproval = null
        progress.set(0)
        resetProgress.update((e) => !e);
        cacheRequest("./webapi/worker/exportUserData.js")
            .then(url => {
                waitForExportApproval?.reject?.()
                waitForExportApproval = null
                exportUserDataWorker?.terminate?.()
                exportUserDataWorker = new Worker(url)
                if (get(android)) {
                    exportUserDataWorker.postMessage('android')
                } else {
                    exportUserDataWorker.postMessage('browser')
                }
                exportUserDataWorker.onmessage = ({ data }) => {
                    if (hasOwnProp?.call?.(data, "progress")) {
                        if (data?.progress >= 0 && data?.progress <= 100) {
                            progress.set(data.progress)
                        }
                        return
                    } else if (hasOwnProp?.call?.(data, "status")) {
                        dataStatusPrio = true
                        dataStatus.set(data.status)
                        return
                    }
                    if (hasOwnProp?.call?.(data, "missingData") || hasOwnProp?.call?.(data, "error")) {
                        dataStatusPrio = false
                        dataStatus.set(null)
                        progress.set(100)
                        isExporting.set(false)
                        waitForExportApproval?.reject?.(data?.error)
                        waitForExportApproval = null
                        if (data?.missingData) {
                            window.confirmPromise?.({
                                isAlert: true,
                                title: "Back up failed",
                                text: `Data may be incomplete or corrupted. If this always occurs during export, please restore from a backup file or clear the ${get(android) ? "application" : "website"} data.`,
                            })
                        } else {
                            console.error(data?.error)
                            window.confirmPromise?.({
                                isAlert: true,
                                title: "Back up failed",
                                text: typeof data?.error === "string" && data.error !== "Something went wrong" && data.error
                                ? data.error : "Something went wrong while processing your backup (B1)."
                            })
                        }
                        exportUserDataWorker?.terminate?.();
                        rerunImportantWork(_data?.isManual)
                        reject(data?.error)
                    } else if (get(android)) {
                        try {
                            let chunk = data?.chunk || ""
                            let state = data.state
                            // 0 - start | 1 - ongoing | 2 - done
                            if (state === 0) {
                                JSBridge.exportJSON('', 0, '')
                            } else if (state === 1 && typeof chunk === "string") {
                                JSBridge.exportJSON(chunk, 1, '')
                            } else if (state === 2 && typeof chunk === "string") {
                                JSBridge.exportJSON(chunk, 2, `Kanshi.${data?.username?.toLowerCase?.() || "backup"}.json`)
                                dataStatusPrio = false
                                isExporting.set(false)
                                exportUserDataWorker?.terminate?.();
                                new Promise((resolve, reject) => {
                                    waitForExportApproval = { resolve, reject }
                                }).then(() => {
                                    if (_data?.isManual) {
                                        showToast("Data has been exported")
                                    }
                                }).catch((error) => {
                                    if (_data?.isManual) {
                                        (async () => {
                                            if (await window.confirmPromise?.({
                                                title: "Back up failed",
                                                text: "Do you want to try again?",
                                            })) {
                                                exportUserData({ isManual: true });
                                            }
                                        })();
                                    }
                                    reject(error)
                                }).finally(() => {
                                    waitForExportApproval = null
                                    dataStatus.set(null)
                                    progress.set(100)
                                    rerunImportantWork(_data?.isManual)
                                    resolve()
                                })
                            } else {
                                dataStatusPrio = false
                                isExporting.set(false)
                                exportUserDataWorker?.terminate?.();
                                waitForExportApproval?.reject?.()
                                waitForExportApproval = null
                                window.confirmPromise?.({
                                    isAlert: true,
                                    title: "Back up failed",
                                    text: "Something went wrong while processing your backup (B2).",
                                })
                                dataStatus.set(null)
                                progress.set(100)
                                rerunImportantWork(_data?.isManual)
                                reject()
                            }
                        } catch (ex) {
                            dataStatusPrio = false
                            isExporting.set(false)
                            exportUserDataWorker?.terminate?.();
                            waitForExportApproval?.reject?.(ex)
                            waitForExportApproval = null
                            window.confirmPromise?.({
                                isAlert: true,
                                title: "Back up failed",
                                text: typeof ex === "string" && ex ? ex : "Something went wrong while processing your backup (B3).",
                            })
                            dataStatus.set(null)
                            progress.set(100)
                            rerunImportantWork(_data?.isManual)
                            console.error(ex)
                            reject(ex)
                        }
                    } else if (typeof data?.url === "string" && data?.url !== "") {
                        dataStatusPrio = false
                        dataStatus.set(null)
                        progress.set(100)
                        downloadLink(data.url, `Kanshi.${data?.username?.toLowerCase?.() || "backup"}.json`)
                        isExporting.set(false)
                        rerunImportantWork(_data?.isManual)
                        resolve()
                        // dont terminate, can't oversee blob link lifetime
                    } else {
                        dataStatusPrio = false
                        exportUserDataWorker?.terminate?.();
                        window.confirmPromise?.({
                            isAlert: true,
                            title: "Back up failed",
                            text: "Something went wrong while processing your backup (B4).",
                        })
                        dataStatus.set(null)
                        progress.set(100)
                        isExporting.set(false)
                        rerunImportantWork(_data?.isManual)
                        reject()
                    }
                }
                exportUserDataWorker.onerror = (error) => {
                    dataStatusPrio = false
                    dataStatus.set(null)
                    progress.set(100)
                    isExporting.set(false)
                    waitForExportApproval?.reject?.(error)
                    waitForExportApproval = null
                    window.confirmPromise?.({
                        isAlert: true,
                        title: "Back up failed",
                        text: typeof error === "string" && error ? error : "Something went wrong while processing your backup (B5).",
                    })
                    exportUserDataWorker?.terminate?.();
                    rerunImportantWork(_data?.isManual)
                    console.error(error)
                    reject(error)
                }
            }).catch((error) => {
                dataStatusPrio = false
                dataStatus.set(null)
                progress.set(100)
                isExporting.set(false)
                waitForExportApproval?.reject?.(error)
                waitForExportApproval = null
                alertError()
                exportUserDataWorker?.terminate?.();
                rerunImportantWork(_data?.isManual)
                console.error(error)
                reject(error)
            })
    })
}

let importUserDataTerminateTimeout, importUserDataWorker;
const importUserData = (_data) => {
    if (get(initList) !== false) return
    return new Promise((resolve, reject) => {
        clearTimeout(importUserDataTerminateTimeout)
        importUserDataWorker?.terminate?.()
        if (!get(initData)) {
            if (get(isExporting) || isGettingNewEntries) return
            isImporting.set(true)
            mediaManagerWorker?.terminate?.()
            mediaManagerWorker = null
            passedAlgorithmFilterId = passedAlgorithmFilter = undefined
            stopConflictingWorkers({ isImporting: true })
        }
        progress.set(0)
        resetProgress.update((e) => !e);
        cacheRequest("./webapi/worker/importUserData.js")
            .then(url => {
                clearTimeout(importUserDataTerminateTimeout)
                importUserDataWorker?.terminate?.()
                importUserDataWorker = new Worker(url)
                removeLocalStorage("username");
                importUserDataWorker.postMessage(_data)
                importUserDataWorker.onmessage = ({ data }) => {
                    if (hasOwnProp?.call?.(data, "progress")) {
                        if (data?.progress >= 0 && data?.progress <= 100) {
                            progress.set(data.progress)
                        }
                        return
                    } else if (hasOwnProp?.call?.(data, "status")) {
                        dataStatusPrio = true
                        dataStatus.set(data.status)
                        return
                    }
                    if (hasOwnProp?.call?.(data, "error")) {
                        dataStatusPrio = false
                        isImporting.set(false)
                        mediaManager({ updateRecommendedMediaList: true });
                        window.confirmPromise?.({
                            isAlert: true,
                            title: "Import failed",
                            text: "File was not imported, please ensure that file is in a supported format (e.g., .json).",
                        })
                        dataStatus.set(null)
                        progress.set(100)
                        importUserDataWorker?.terminate?.();
                        rerunImportantWork()
                        console.error(data.error)
                        reject(data.error || "Something went wrong")
                    } else if (hasOwnProp?.call?.(data, "importedUsername")) {
                        if (typeof data?.importedUsername === "string") {
                            setLocalStorage("username", data.importedUsername)
                            .catch(() => removeLocalStorage("username"));
                            username.set(data.importedUsername)
                        }
                    } else if (hasOwnProp?.call?.(data, "importedHiddenEntries")) {
                        if (isJsonObject(data?.importedHiddenEntries)) {
                            hiddenEntries.set(data?.importedHiddenEntries)
                        }
                    } else if (hasOwnProp?.call?.(data, "mediaCautions")) {
                        if (data?.mediaCautions instanceof Array) {
                            mediaCautions.set(data?.mediaCautions)
                            currentMediaCautions.set(data?.mediaCautions)
                        }
                    } else if (hasOwnProp?.call?.(data, "algorithmFilters")) {
                        if (data?.algorithmFilters instanceof Array) {
                            algorithmFilters.set(data?.algorithmFilters)
                            currentAlgorithmFilters.set(data?.algorithmFilters)
                        }
                    } else {
                        window[".androidDataIsEvicted"] = false
                        if (get(android)) {
                            window.shouldUpdateNotifications = true
                        }
                        dataStatusPrio = false
                        processRecommendedMediaList({ isImporting: true })
                            .finally(() => {
                                mediaManager({ 
                                    updateRecommendedMediaList: true,
                                    isImporting: true,
                                })
                                .finally(() => {
                                    mediaLoader({ loadAll: true, selectedCategory: get(selectedCategory) })
                                        .finally(() => {
                                            isImporting.set(false)
                                            dataStatus.set(null)
                                            progress.set(100)
                                            if (get(android)) {
                                                showToast("File has been imported")
                                            } else {
                                                toast.set("File has been imported")
                                            }
                                            runUpdate.update(e => !e)
                                        })
                                });
                            })
                        importUserDataTerminateTimeout = setTimeout(() => {
                            importUserDataWorker?.terminate?.();
                        }, terminateDelay)
                        resolve(data)
                    }
                }
                importUserDataWorker.onerror = (error) => {
                    dataStatusPrio = false
                    isImporting.set(false)
                    window.confirmPromise?.({
                        isAlert: true,
                        title: "Import failed",
                        text: "File was not imported, please ensure that file is in a supported format (e.g., .json).",
                    })
                    updateList.update((e) => !e)
                    dataStatus.set(null)
                    progress.set(100)
                    importUserDataWorker?.terminate?.();
                    rerunImportantWork()
                    console.error(error)
                    reject(error || "Something went wrong")
                }
            }).catch((error) => {
                dataStatusPrio = false
                isImporting.set(false)
                window.confirmPromise?.({
                    isAlert: true,
                    title: "Import failed",
                    text: "File was not imported, please try again.",
                })
                updateList.update((e) => !e)
                dataStatus.set(null)
                progress.set(100)
                alertError()
                importUserDataWorker?.terminate?.();
                rerunImportantWork()
                console.error(error)
                reject(error)
            })
    })
}

let gotAround, nextInfoCheck = -1, getExtraInfoTimeout, getExtraInfoWorker
const waitForExtraInfo = () => {
    clearTimeout(getExtraInfoTimeout)
    getExtraInfoTimeout = setTimeout(() => {
        if (get(isLoadingMedia) || get(isProcessingList)) {
            return waitForExtraInfo()
        } else {
            return getExtraInfo()
        }
    }, 1000 * 30)
}
const getExtraInfo = () => {
    if (get(initList) !== false) return
    return new Promise((resolve, reject) => {
        loadingDataStatus.set(true)
        clearTimeout(getExtraInfoTimeout)
        getExtraInfoWorker?.terminate?.()
        cacheRequest("./webapi/worker/getExtraInfo.js")
            .then(url => {
                clearTimeout(getExtraInfoTimeout)
                getExtraInfoWorker?.terminate?.()
                let thisExtraInfo, extraInfoIndex
                if (!gotAround) {
                    extraInfoIndex = parseInt(get(currentExtraInfo))
                    if (isNaN(extraInfoIndex)) {
                        extraInfoIndex = 0
                    } else if (extraInfoIndex < 4) {
                        ++extraInfoIndex
                    } else {
                        ++extraInfoIndex
                        gotAround = true
                    }
                    currentExtraInfo.set(extraInfoIndex)
                } else {
                    if (typeof nextInfoCheck === "number" && nextInfoCheck < 5) {
                        ++nextInfoCheck
                    } else {
                        nextInfoCheck = 0
                    }
                    extraInfoIndex = nextInfoCheck
                    thisExtraInfo = get(extraInfo) || {}
                    if (thisExtraInfo?.[extraInfoIndex]) {
                        currentExtraInfo.set(extraInfoIndex)
                    }
                }
                getExtraInfoWorker = new Worker(url)
                getExtraInfoWorker.postMessage({ number: extraInfoIndex })
                getExtraInfoWorker.onmessage = ({ data }) => {
                    clearTimeout(getExtraInfoTimeout)
                    if (typeof data?.message === "string" && data?.key != null) {
                        thisExtraInfo = thisExtraInfo || get(extraInfo) || {}
                        thisExtraInfo[data.key] = data?.message
                        extraInfo.set(thisExtraInfo)
                        currentExtraInfo.set(data.key)
                        loadingDataStatus.set(false)
                        dataStatus.set(null)
                        waitForExtraInfo()
                        getExtraInfoWorker?.terminate?.()
                        resolve()
                    } else {
                        getExtraInfoWorker?.terminate?.()
                        if (!gotAround) {
                            getExtraInfo()
                        } else {
                            loadingDataStatus.set(false)
                            waitForExtraInfo()
                        }
                    }
                }
                getExtraInfoWorker.onerror = (error) => {
                    getExtraInfoWorker?.terminate?.()
                    console.error(error)
                    reject(error)
                }
            }).catch((error) => {
                alertError()
                getExtraInfoWorker?.terminate?.()
                console.error(error)
                reject(error)
            })
    })
}

// IndexedDB
const getIDBdata = (name) => {
    return new Promise((resolve, reject) => {
        cacheRequest("./webapi/worker/getIDBdata.js", 3022, "Retrieving Some Data")
            .then(url => {
                let worker = new Worker(url)
                worker.postMessage({ name })
                worker.onmessage = ({ data }) => {
                    worker?.terminate?.()
                    if (hasOwnProp?.call?.(data || {}, "Failed to retrieve the data")) {
                        console.error(data?.["Failed to retrieve the data"])
                        reject(data?.["Failed to retrieve the data"] || "Failed to retrieve the data")
                    } else {
                        resolve(data)
                    }
                }
                worker.onerror = (error) => {
                    worker?.terminate?.()
                    alertError()
                    console.error(error)
                    reject(error)
                }
            }).catch((error) => {
                alertError()
                console.error(error)
                reject(error)
            })
    })
}
window.updateNotifications = async (aniIdsNotificationToBeUpdated = []) => {
    if (!get(android)) return
    new Promise((resolve, reject) => {
        cacheRequest("./webapi/worker/getIDBdata.js", 3022, "Retrieving Some Data")
            .then(url => {
                let worker = new Worker(url)
                worker.postMessage({ name: "aniIdsNotificationToBeUpdated", aniIdsNotificationToBeUpdated })
                worker.onmessage = ({ data }) => {
                    worker?.terminate?.()
                    if (hasOwnProp?.call?.(data || {}, "Failed to retrieve the data")) {
                        console.error(data?.["Failed to retrieve the data"])
                        reject(data?.["Failed to retrieve the data"] || "Failed to retrieve the data")
                    } else {
                        resolve(data)
                    }
                }
                worker.onerror = (error) => {
                    worker?.terminate?.()
                    console.error(error)
                    reject(error)
                }
            }).catch((error) => {
                alertError()
                console.error(error)
                reject(error)
            })
    }).then((updatedAniIdsNotification = {}) => {
        try {
            for (let mediaId in updatedAniIdsNotification) {
                let media = updatedAniIdsNotification[mediaId]
                mediaId = parseInt(mediaId)
                if (typeof mediaId === "number" && !isNaN(mediaId) && isFinite(mediaId)
                    && typeof media?.title === "string"
                    && typeof media.maxEpisode === "number" && !isNaN(media.maxEpisode) && isFinite(media.maxEpisode)
                    && typeof media.mediaUrl === "string"
                    && typeof media.userStatus === "string"
                    && typeof media.episodeProgress === "number" && !isNaN(media.episodeProgress) && isFinite(media.episodeProgress)
                ) {
                    JSBridge.updateNotifications(
                        Math.floor(mediaId),
                        media.title,
                        Math.floor(media?.maxEpisode),
                        media.mediaUrl,
                        media.userStatus,
                        Math.floor(media.episodeProgress)
                    )
                }
            }
        } catch (ex) { console.error(ex) }
    })
}

const saveIDBdata = (_data, name, isImportant = false) => {
    return new Promise((resolve, reject) => {
        if (!get(android) || isImportant || window[get(isBackgroundUpdateKey)] !== true) {
            cacheRequest("./webapi/worker/saveIDBdata.js")
                .then(url => {
                    let worker = new Worker(url)
                    worker.onmessage = ({ data }) => {
                        if (hasOwnProp?.call?.(data, "status")) {
                            dataStatus.set(data.status)
                            return
                        }
                        setTimeout(() => {
                            worker?.terminate?.();
                        }, terminateDelay)
                        if (hasOwnProp?.call?.(data, "error")) {
                            console.error(data.error)
                            reject(data.error)
                        } else {
                            resolve()
                        }
                    }
                    worker.onerror = (error) => {
                        setTimeout(() => {
                            worker?.terminate?.();
                        }, terminateDelay)
                        console.error(error)
                        reject(error)
                    }
                    worker.postMessage({ data: _data, name: name })
                }).catch((error) => {
                    alertError()
                    console.error(error)
                    reject(error)
                })
        }
    })
}

// One Time Use
const getMediaEntries = (_data) => {
    return new Promise((resolve, reject) => {
        progress.set(0)
        cacheRequest("./webapi/worker/getEntries.js", 282309, "Checking Anime, Manga, and Novel Entries")
            .then(async workerUrl => {
                let worker = new Worker(workerUrl)
                if (get(android)) {
                    worker.postMessage({ entriesBlob: await cacheRequest("./webapi/worker/entries.json", 174425636, "Getting Anime, Manga, and Novel Entries", true) })
                } else {
                    let server
                    if (window.location != null) {
                        try {
                            const $server = new URL(window.location).toString()
                            if (typeof $server === "string" && server !== "") {
                                server = $server
                            }
                        } catch {}
                    }
                    worker.postMessage({ server, appID: get(appID) })
                }
                worker.onmessage = ({ data }) => {
                    if (hasOwnProp?.call?.(data, "progress")) {
                        if (data?.progress >= 0 && data?.progress <= 100) {
                            progress.set(data.progress)
                        }
                        return
                    } else if (hasOwnProp?.call?.(data, "status")) {
                        dataStatusPrio = true
                        dataStatus.set(data.status)
                        return
                    }
                    dataStatus.set(null)
                    progress.set(100)
                    dataStatusPrio = false
                    updateRecommendationList.update(e => !e)
                    setTimeout(() => {
                        worker?.terminate?.();
                    }, terminateDelay)
                    if (hasOwnProp?.call?.(data, "error")) {
                        console.error(data.error)
                        reject(data.error)
                    } else {
                        resolve(data)
                    }
                }
                worker.onerror = (error) => {
                    dataStatusPrio = false
                    dataStatus.set(null)
                    progress.set(100)
                    alertError()
                    updateRecommendationList.update(e => !e)
                    worker?.terminate?.();
                    console.error(error)
                    reject(error)
                }
            }).catch((error) => {
                dataStatusPrio = false
                dataStatus.set(null)
                progress.set(100)
                alertError()
                updateRecommendationList.update(e => !e)
                console.error(error)
                reject(error)
            })
    })
}

let getFilterOptionsTerminateTimeout, getFilterOptionsWorker;
const getFilterOptions = (_data) => {
    return new Promise((resolve, reject) => {
        clearTimeout(getFilterOptionsTerminateTimeout)
        getFilterOptionsWorker?.terminate?.()
        cacheRequest("./webapi/worker/getFilterOptions.js", 68663, "Initializing Filters")
            .then(url => {
                clearTimeout(getFilterOptionsTerminateTimeout)
                getFilterOptionsWorker?.terminate?.()
                getFilterOptionsWorker = new Worker(url)
                getFilterOptionsWorker.postMessage(_data)
                getFilterOptionsWorker.onmessage = ({ data }) => {
                    if (hasOwnProp?.call?.(data, "status")) {
                        dataStatusPrio = true
                        dataStatus.set(data.status)
                        return
                    }
                    if (hasOwnProp?.call?.(data, "error")) {
                        dataStatusPrio = false
                        dataStatus.set(null)
                        alertError()
                        getFilterOptionsWorker?.terminate?.()
                        console.error(data.error)
                        reject(data.error)
                    } else {
                        dataStatusPrio = false
                        dataStatus.set(null)
                        getFilterOptionsTerminateTimeout = setTimeout(() => {
                            getFilterOptionsWorker?.terminate?.();
                        }, terminateDelay)
                        resolve(data)
                    }
                }
                getFilterOptionsWorker.onerror = (error) => {
                    dataStatusPrio = false
                    dataStatus.set(null)
                    alertError()
                    getFilterOptionsWorker?.terminate?.()
                    console.error(error)
                    reject(error)
                }
            }).catch((error) => {
                dataStatusPrio = false
                dataStatus.set(null)
                alertError()
                getFilterOptionsWorker?.terminate?.()
                console.error(error)
                reject(error)
            })
    })
}

let getOrderedFiltersWorker
const getOrderedFilters = async () => {
    try {
        const url = await cacheRequest("./webapi/worker/getOrderedFilters.js")
        getOrderedFiltersWorker?.terminate?.()
        getOrderedFiltersWorker = new Worker(url)
        getOrderedFiltersWorker.postMessage(0)
        getOrderedFiltersWorker.onmessage = ({ data }) => {
            if (hasOwnProp?.call?.(data, "error")) {
                console.error(data.error)
            } else if (hasOwnProp?.call?.(data, "orderedFilters") && isJsonObject(data.orderedFilters) && !jsonIsEmpty(data.orderedFilters)) {
                orderedFilters.set(data.orderedFilters)
            }
            getOrderedFiltersWorker?.terminate?.()
        }
        getOrderedFiltersWorker.onerror = () => {
            getOrderedFiltersWorker?.terminate?.()
        }
    } catch {
        getOrderedFiltersWorker?.terminate?.()
    }
}

let updateTagInfoWorker
const updateTagInfo = async () => {
    try {
        const url = await cacheRequest("./webapi/worker/updateTagInfo.js")
        updateTagInfoWorker?.terminate?.()
        updateTagInfoWorker = new Worker(url)
        let server
        if (!get(android) && window.location != null) {
            try {
                const $server = new URL(window.location).toString()
                if (typeof $server === "string" && $server !== "") {
                    server = $server
                }
            } catch {}
        }
        updateTagInfoWorker.postMessage({ server })
        updateTagInfoWorker.onmessage = ({ data }) => {
            if (hasOwnProp.call(data, "getConnectionState")) {
                (async () => {
                    updateTagInfoWorker?.postMessage?.({ connected: await isConnected() })
                })();
                return
            }
            if (hasOwnProp.call(data, "tagInfo") && isJsonObject(data.tagInfo) && !jsonIsEmpty(data.tagInfo)) {
                tagInfo.set(data.tagInfo)
            }
            updateTagInfoWorker?.terminate?.()
        }
        updateTagInfoWorker.onerror = () => {
            updateTagInfoWorker?.terminate?.()
        }
    } catch {
        updateTagInfoWorker?.terminate?.()
    }
}

function stopConflictingWorkers(blocker) {
    dataStatusPrio = false
    progress.set(0)
    requestMediaEntriesWorker?.terminate?.()
    notifyUpdatedMediaNotification()
    isRequestingMediaEntries = false
    isGettingNewEntries = blocker?.isGettingNewEntries ?? false
    requestUserEntriesWorker?.terminate?.()
    resetTypedUsername.update(e => !e)
    if (isRequestingNewUser || isReloadingUserEntries) {
        window.confirmPromise?.({
            isAlert: true,
            title: "Request Interrupted",
            text: "Request for user data was suddenly terminated, please try again.",
        })
        isRequestingNewUser = isReloadingUserEntries = false
    }
    userRequestIsRunning.set(false)
    processRecommendedMediaListWorker?.terminate?.()
    isProcessingList.set(false)
    importUserDataWorker?.terminate?.()
    isImporting.set(blocker?.isImporting ?? false)
    exportUserDataWorker?.terminate?.()
    isExporting.set(blocker?.isExporting ?? false)
    dataStatus.set(null)
}

function rerunImportantWork(shouldRequestMedia) {
    updateRecommendationList.update((e)=>!e)
    if (wasRequestingMediaEntries || shouldRequestMedia !== true) {
        // Probably terminated
        runUpdate.update((e)=>!e)
    }
}

function alertError() {
    if (get(android)) {
        window.confirmPromise?.({
            isAlert: true,
            title: "Something went wrong",
            text: "App may not be working properly, restart the app or clear your cache, if it still fails you may want to reinstall the app.",
        })
    } else {
        window.confirmPromise?.({
            isAlert: true,
            title: "Something went wrong",
            text: "App may not be working properly, refresh the page or clear this website data, this also does not run in incognito.",
        })
    }
}

export {
    saveIDBdata,
    getIDBdata,
    getMediaEntries,
    getFilterOptions,
    updateTagInfo,
    requestMediaEntries,
    requestUserEntries,
    exportUserData,
    importUserData,
    processRecommendedMediaList,
    mediaManager,
    mediaLoader,
    initMediaLoader,
    getExtraInfo
}
