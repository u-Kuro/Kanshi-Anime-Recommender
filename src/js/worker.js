import { get } from "svelte/store";
import { progressedFetch } from "./fetch.js";
import { isConnected } from "./utils/deviceUtils.js";
import { isJsonObject, jsonIsEmpty } from "./utils/dataUtils.js";
import { setIDBData, removeLSData, setLSData } from "./database.js";
import { downloadLink, getUniqueId, showToast } from "./utils/appUtils.js";
import {
    dataStatus,
    updateRecommendationList,
    username,
    hiddenMediaEntries,
    runUpdate,
    updateList,
    initData,
    userRequestIsRunning,
    progress,
    android,
    isLoadingMedia,
    isProcessingList,
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
    orderedMediaOptions,
    tagInfo,
    listReloadAvailable,
    evictedKey,
} from "./variables.js";

const hasOwnProp = Object.prototype.hasOwnProperty
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

let mediaLoaderWorker, mediaLoaderPromises = {};

const mediaLoader = (_data = {}) => {
    if (get(initList) !== false && !_data?.initList) {
        return
    }
    return new Promise(async (resolve, reject) => {
        let postId = getUniqueId()
        _data.postId = postId
        mediaLoaderPromises[postId] = { resolve, reject }
        try {
            mediaLoaderWorker = mediaLoaderWorker || new Worker(await progressedFetch("./web-worker/mediaLoader.js", 25777, "Checking Existing List"))
        } catch (ex) {
            mediaLoaderWorker?.terminate?.()
            mediaLoaderWorker = null

            alertError()

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
                mediaLoaderPromises[data.postId]?.resolve?.()
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
                categories.set(data?.categories || get(categories));
                hiddenMediaEntries.set(data?.hiddenMediaEntries || get(hiddenMediaEntries))
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

                mediaLoaderPromises[data.postId]?.resolve?.(data)
            } else if (hasOwnProp.call(data, "updateNotifications")) {
                mediaLoaderPromises[data.postId]?.resolve?.(data.mediaUpdates)
            } else if (hasOwnProp.call(data, "getEarlisetReleaseDate")) {
                let currentEarliestDate = get(earlisetReleaseDate)
                let airingAt = data.earliestReleaseDate
                if (airingAt && (airingAt < currentEarliestDate || currentEarliestDate == null)) {
                    earlisetReleaseDate.set(data.earliestReleaseDate);
                }
            } else if (hasOwnProp?.call?.(data, "error")) {
                mediaLoaderWorker?.terminate?.()
                mediaLoaderWorker = null

                dataStatus.set(null)
                progress.set(100)

                alertError()

                console.error(data.error)

                mediaLoaderPromises[data?.postId]?.reject?.()
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
            }

            delete mediaLoaderPromises[data?.postId]
        };
        mediaLoaderWorker.onerror = (error) => {
            mediaLoaderWorker?.terminate?.()
            mediaLoaderWorker = null

            dataStatus.set(null)
            progress.set(100)

            alertError()

            console.error(error);
        };
    })
}

let mediaManagerWorker,
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
        progressedFetch("./web-worker/mediaManager.js", 54808, "Updating Categories and List")
            .then(url => {
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
                        mediaManagerWorker?.terminate?.();
                        mediaManagerWorker = null

                        dataStatusPrio = false

                        listUpdateAvailable.set(true)
                        isLoadingMedia.set(false)
                        dataStatus.set(null);
                        progress.set(100)

                        alertError()

                        console.error(data.error);

                        reject(data.error)
                    } else {
                        mediaManagerWorker?.terminate?.();

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

                        resolve()
                    }
                }
                mediaManagerWorker.onerror = (error) => {
                    mediaManagerWorker?.terminate?.();
                    mediaManagerWorker = null

                    dataStatusPrio = false
        
                    listUpdateAvailable.set(true)
                    isLoadingMedia.set(false)
                    dataStatus.set(null)
                    progress.set(100)
        
                    alertError()
                    
                    console.error(error);

                    reject(error)
                };
            })
            .catch((error) => {
                mediaManagerWorker?.terminate?.()
                mediaManagerWorker = null

                dataStatusPrio = false
    
                listUpdateAvailable.set(true)
                isLoadingMedia.set(false)
                dataStatus.set(null)
                progress.set(100)
    
                alertError()
    
                console.error(error);

                reject(error)
            })
    })
}

let processRecommendedMediaEntriesWorker;
let mediaReleaseUpdateTimeout
window.setMediaReleaseUpdateTimeout = (nearestMediaReleaseAiringAt) => {
    if (typeof nearestMediaReleaseAiringAt === "number" && !isNaN(nearestMediaReleaseAiringAt)) {
        clearTimeout(mediaReleaseUpdateTimeout)
        let timeLeftBeforeMediaReleaseUpdate = (nearestMediaReleaseAiringAt * 1000) - new Date().getTime()
        mediaReleaseUpdateTimeout = setTimeout(() => {
            updateRecommendationList.update(e => !e)
        }, Math.min(timeLeftBeforeMediaReleaseUpdate, 2000000000))
    }
}

let passedAlgorithmFilter, passedAlgorithmFilterId
const processRecommendedMediaEntries = (_data = {}) => {
    if (get(initList) !== false && !_data?.initList) {
        return
    }
    return new Promise((resolve, reject) => {
        if (get(isImporting)) {
            if (!_data?.isImporting) {
                return reject("Process is interrupted, currently importing")
            }
        }

        processRecommendedMediaEntriesWorker?.terminate?.();

        if (_data?.algorithmFilters) {
            passedAlgorithmFilter = _data.algorithmFilters
            _data.passedAlgorithmFilterId = passedAlgorithmFilterId = getUniqueId()
        } else if (passedAlgorithmFilter) {
            _data.algorithmFilters = passedAlgorithmFilter
            _data.algorithmFiltersId = passedAlgorithmFilterId
        }
        
        progress.set(0)
        progressedFetch("./web-worker/processRecommendedMediaEntries.js", 44122, "Updating Recommendation List")
            .then(url => {
                processRecommendedMediaEntriesWorker?.terminate?.();
                const lastProcessRecommendationAiringAt = parseInt((new Date().getTime() / 1000))
                let nearestMediaReleaseAiringAt
                isProcessingList.set(true)
                processRecommendedMediaEntriesWorker = new Worker(url);
                processRecommendedMediaEntriesWorker.postMessage(_data);
                processRecommendedMediaEntriesWorker.onmessage = ({ data }) => {
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
                        processRecommendedMediaEntriesWorker?.terminate?.();
                        dataStatusPrio = false
                        isProcessingList.set(false)
                        dataStatus.set(null);
                        progress.set(100)
                        alertError()
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
                                nearestMediaReleaseAiringAt > mediaReleaseAiringAt || nearestMediaReleaseAiringAt == null
                            ) {
                                nearestMediaReleaseAiringAt = mediaReleaseAiringAt
                            }
                        }
                    } else if (
                        hasOwnProp?.call?.(data, "averageScoreMode")
                        || hasOwnProp?.call?.(data, "animePopularityMode")
                        || hasOwnProp?.call?.(data, "mangaPopularityMode")
                        || hasOwnProp?.call?.(data, "novelPopularityMode")
                    ) {
                        window.updateMeanNumberInfos?.(data?.averageScoreMode, data?.animePopularityMode, data?.mangaPopularityMode, data?.novelPopularityMode)
                    } else if (hasOwnProp?.call?.(data, "recommendationError")) {
                        window.updateRecommendationError?.(data?.recommendationError)
                    } else {
                        processRecommendedMediaEntriesWorker?.terminate?.();
                        setLSData("nearestMediaReleaseAiringAt", nearestMediaReleaseAiringAt)
                        .catch(() => removeLSData("nearestMediaReleaseAiringAt"))
                        .finally(() => setIDBData("nearestMediaReleaseAiringAt", nearestMediaReleaseAiringAt));
                        if (window.shouldUpdateNotifications === true && get(android)) {
                            window.shouldUpdateNotifications = false
                            try {
                                JSBridge.callUpdateNotifications()
                            } catch (ex) { console.error(ex) }
                        }
                        if (passedAlgorithmFilterId === data?.passedAlgorithmFilterId && passedAlgorithmFilterId != null) {
                            passedAlgorithmFilterId = passedAlgorithmFilter = undefined
                        }
                        if (data?.hasNewFilterOption) {
                            getOrderedFilters()
                        }
                        dataStatusPrio = false
                        isProcessingList.set(false)
                        dataStatus.set(null)
                        progress.set(100)
                        if (nearestMediaReleaseAiringAt) {
                            window.setMediaReleaseUpdateTimeout?.(nearestMediaReleaseAiringAt)
                        }
                        resolve()
                        if (get(isImporting)) {
                            mediaLoader({ loadAll: true, selectedCategory: get(selectedCategory) })
                        }
                    }
                };
                processRecommendedMediaEntriesWorker.onerror = (error) => {
                    processRecommendedMediaEntriesWorker?.terminate?.();
                    dataStatusPrio = false
                    isProcessingList.set(false)
                    dataStatus.set(null)
                    progress.set(100)
                    console.error(error)
                    reject(error);
                };
            }).catch((error) => {
                processRecommendedMediaEntriesWorker?.terminate?.();
                dataStatusPrio = false
                isProcessingList.set(false)
                dataStatus.set(null)
                progress.set(100)
                alertError()
                console.error(error)
                reject(error)
            })
    });
};
let requestMediaEntriesWorker;
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
    if (get(android) && window[get(evictedKey)] !== true) {
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
        progressedFetch("./web-worker/requestMediaEntries.js")
            .then(url => {
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
                        requestMediaEntriesWorker?.terminate?.();

                        wasRequestingMediaEntries = isRequestingMediaEntries = false

                        notifyUpdatedMediaNotification()

                        dataStatus.set(null)
                        progress.set(100)

                        console.error(data.error)
                        reject(data.error)
                    } else if (hasOwnProp?.call?.(data, "updateRecommendationList")) {
                        if (get(android)) {
                            window.KanshiBackgroundshouldProcessRecommendedEntries = true
                        }
                        updateRecommendationList.update(e => !e)
                    } else if (hasOwnProp?.call?.(data, "errorDuringInit")) {
                        requestMediaEntriesWorker?.terminate?.();
                        wasRequestingMediaEntries = isRequestingMediaEntries = false
                        notifyUpdatedMediaNotification()
                        dataStatus.set(null)
                        progress.set(100)
                        resolve(data)
                    } else if (hasOwnProp?.call?.(data, "notifyAddedEntries")) {
                        if (get(android) && window[get(evictedKey)] !== true) {
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
                        requestMediaEntriesWorker?.terminate?.();
                        if (data?.noEntriesFound) {
                            console.error("No entries found");
                            alertError()
                        } else if (data?.getEntries === true) {
                            isGettingNewEntries = true
                            stopConflictingWorkers({ isGettingNewEntries: true })
                            retrieveInitialData()
                                .finally(() => {
                                    isGettingNewEntries = false
                                    rerunImportantWork()
                                })
                        }
                        wasRequestingMediaEntries = isRequestingMediaEntries = false
                        notifyUpdatedMediaNotification()
                        dataStatus.set(null)
                        progress.set(100)
                        resolve(data)
                    }
                }
                requestMediaEntriesWorker.onerror = (error) => {
                    requestMediaEntriesWorker?.terminate?.();
                    wasRequestingMediaEntries = isRequestingMediaEntries = false
                    isGettingNewEntries = false
                    notifyUpdatedMediaNotification()
                    dataStatus.set(null)
                    progress.set(100)
                    console.error(error)
                    reject(error)
                }
            }).catch((error) => {
                requestMediaEntriesWorker?.terminate?.();
                wasRequestingMediaEntries = isRequestingMediaEntries = false
                isGettingNewEntries = false
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
let requestUserEntriesWorker;
const requestUserEntries = (_data = {}) => {
    if (get(initList) !== false && !_data?.initList) {
        return
    }
    return new Promise((resolve, reject) => {
        if (_data?.username) {
            requestUserEntriesWorker?.terminate?.()
            isRequestingNewUser = true
        } else if (isRequestingNewUser) {
            return
        } else if (_data?.reload) {
            requestUserEntriesWorker?.terminate?.()
            isReloadingUserEntries = true
        } else if (isReloadingUserEntries) {
            return
        } else {
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
        progressedFetch("./web-worker/requestUserEntries.js")
            .then(url => {
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
                        requestUserEntriesWorker?.terminate?.();
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
                        dataStatus.set(null)
                        progress.set(100)
                        resetTypedUsername.update(e => !e)
                        console.error(data.error)
                        reject(data.error)
                    } else if (hasOwnProp?.call?.(data, "updateRecommendationList")) {
                        if (get(android)) {
                            window.KanshiBackgroundshouldProcessRecommendedEntries = window.shouldUpdateNotifications = true
                        }
                        updateRecommendationList.update(e => !e)
                    } else {
                        requestUserEntriesWorker?.terminate?.();
                        if (isRequestingNewUser || isReloadingUserEntries) {
                            dataStatusPrio = false
                            isRequestingNewUser = isReloadingUserEntries = false
                        }
                        userRequestIsRunning.set(false)
                        dataStatus.set(null)
                        progress.set(100)
                        resolve(data)
                    }
                }
                requestUserEntriesWorker.onerror = (error) => {
                    requestUserEntriesWorker?.terminate?.();
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
                    dataStatus.set(null)
                    progress.set(100)
                    resetTypedUsername.update(e => !e)
                    console.error(error)
                    reject(error)
                }
            }).catch((error) => {
                requestUserEntriesWorker?.terminate?.();
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
        progressedFetch("./web-worker/exportUserData.js")
            .then(url => {
                exportUserDataWorker?.terminate?.()
                waitForExportApproval?.reject?.()
                waitForExportApproval = null
                exportUserDataWorker = new Worker(url)
                if (get(android)) {
                    exportUserDataWorker.postMessage("android")
                } else {
                    exportUserDataWorker.postMessage("browser")
                }
                let textDecoder = new TextDecoder()
                exportUserDataWorker.onmessage = async ({ data }) => {
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
                        exportUserDataWorker?.terminate?.();
                        dataStatusPrio = false
                        dataStatus.set(null)
                        progress.set(100)
                        isExporting.set(false)
                        waitForExportApproval?.reject?.(data.error)
                        waitForExportApproval = null
                        if (data.missingData) {
                            window.confirmPromise?.({
                                isAlert: true,
                                title: "Back up failed",
                                text: `Data may be incomplete or corrupted. If this always occurs during export, please restore from a backup file or clear the ${get(android) ? "application" : "website"} data.`,
                            })
                        } else {
                            console.error(data.error)
                            window.confirmPromise?.({
                                isAlert: true,
                                title: "Back up failed",
                                text: typeof data.error === "string" && data.error !== "Something went wrong" && data.error
                                ? data.error : "Something went wrong while processing your backup (B1)."
                            })
                        }
                        rerunImportantWork(_data?.isManual)
                        reject(data.error)
                    } else if (get(android)) {
                        try {
                            const { state, chunk, loaded } = data || {}
                            // Show Backup Progress
                            if (loaded > 0 && loaded < 100) {
                                progress.set(loaded)
                                dataStatus.set(`${loaded.toFixed(2)}% Exporting User Data`)
                            }
                            // 0 - start | 1 - ongoing | 2 - done
                            if (state === 0) {
                                textDecoder.decode()
                                textDecoder = new TextDecoder()
                                JSBridge.exportUserData(null, 0)
                            } else if (state === 1 && chunk instanceof Uint8Array) {
                                JSBridge.exportUserData(textDecoder.decode(chunk, { stream: true }), 1)
                            } else if (state === 2) {
                                exportUserDataWorker?.terminate?.();
                                JSBridge.exportUserData(textDecoder.decode(), 1)
                                JSBridge.exportUserData(`Kanshi.${data.username?.toLowerCase?.() || "backup"}.gzip`, 2)
                                dataStatusPrio = false
                                isExporting.set(false)
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
                                exportUserDataWorker?.terminate?.();
                                dataStatusPrio = false
                                isExporting.set(false)
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
                            exportUserDataWorker?.terminate?.();
                            dataStatusPrio = false
                            isExporting.set(false)
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
                        downloadLink(data.url, `Kanshi.${data.username?.toLowerCase?.() || "backup"}.gzip`)
                        exportUserDataWorker?.terminate?.();
                        dataStatusPrio = false
                        dataStatus.set(null)
                        progress.set(100)
                        isExporting.set(false)
                        rerunImportantWork(_data?.isManual)
                        resolve()
                    } else {
                        exportUserDataWorker?.terminate?.();
                        dataStatusPrio = false
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
                    exportUserDataWorker?.terminate?.();
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
                    rerunImportantWork(_data?.isManual)
                    console.error(error)
                    reject(error)
                }
            }).catch((error) => {
                exportUserDataWorker?.terminate?.();
                dataStatusPrio = false
                dataStatus.set(null)
                progress.set(100)
                isExporting.set(false)
                waitForExportApproval?.reject?.(error)
                waitForExportApproval = null
                alertError()
                rerunImportantWork(_data?.isManual)
                console.error(error)
                reject(error)
            })
    })
}

let importUserDataWorker;
const importUserData = (_data) => {
    if (get(initList) !== false) return
    return new Promise((resolve, reject) => {
        importUserDataWorker?.terminate?.()
        if (!get(initData)) {
            if (get(isExporting) || isGettingNewEntries) return
            mediaManagerWorker?.terminate?.()
            isImporting.set(true)
            mediaManagerWorker = null
            passedAlgorithmFilterId = passedAlgorithmFilter = undefined
            stopConflictingWorkers({ isImporting: true })
        }
        progress.set(0)
        resetProgress.update((e) => !e);
        progressedFetch("./web-worker/importUserData.js")
            .then(url => {
                importUserDataWorker?.terminate?.()
                importUserDataWorker = new Worker(url)
                removeLSData("username");
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
                        importUserDataWorker?.terminate?.();
                        dataStatusPrio = false
                        isImporting.set(false)
                        mediaManager({ updateRecommendedMediaList: true });
                        window.confirmPromise?.({
                            isAlert: true,
                            title: "Import failed",
                            text: "File was not imported, please ensure that file is in a supported format (e.g., .gzip).",
                        })
                        dataStatus.set(null)
                        progress.set(100)
                        rerunImportantWork()
                        console.error(data.error)
                        reject(data.error || "Something went wrong")
                    } else if (hasOwnProp?.call?.(data, "username")) {
                        if (typeof data?.username === "string") {
                            setLSData("username", data.username)
                            .catch(() => removeLSData("username"));
                            username.set(data.username)
                        }
                    } else if (hasOwnProp?.call?.(data, "hiddenMediaEntries")) {
                        if (isJsonObject(data?.hiddenMediaEntries)) {
                            hiddenMediaEntries.set(data?.hiddenMediaEntries)
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
                    } else if (hasOwnProp?.call?.(data, "tagInfo")) {
                        if (isJsonObject(data?.tagInfo)) {
                            tagInfo.set(data?.tagInfo)
                        }
                    } else {
                        importUserDataWorker?.terminate?.();
                        window[get(evictedKey)] = false
                        if (get(android)) {
                            window.shouldUpdateNotifications = true
                        }
                        dataStatusPrio = false
                        processRecommendedMediaEntries({ isImporting: true })
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
                        resolve(data)
                    }
                }
                importUserDataWorker.onerror = (error) => {
                    importUserDataWorker?.terminate?.();
                    dataStatusPrio = false
                    isImporting.set(false)
                    window.confirmPromise?.({
                        isAlert: true,
                        title: "Import failed",
                        text: "File was not imported, please ensure that file is in a supported format (e.g., .gzip).",
                    })
                    updateList.update((e) => !e)
                    dataStatus.set(null)
                    progress.set(100)
                    rerunImportantWork()
                    console.error(error)
                    reject(error || "Something went wrong")
                }
            }).catch((error) => {
                importUserDataWorker?.terminate?.();
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
                rerunImportantWork()
                console.error(error)
                reject(error)
            })
    })
}

// One Time Use
const retrieveInitialData = (_data) => {
    return new Promise((resolve, reject) => {
        progress.set(0)
        progressedFetch("./web-worker/retrieveInitialData.js", 3264, "Checking Anime, Manga, and Novel Entries")
            .then(async workerUrl => {
                const worker = new Worker(workerUrl)
                worker.postMessage({ initialDataBlob: await progressedFetch("./data/initial-data.gzip", 28017313, "Getting Anime, Manga, and Novel Entries", true) })
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
                    worker?.terminate?.();
                    dataStatus.set(null)
                    progress.set(100)
                    dataStatusPrio = false
                    updateRecommendationList.update(e => !e)
                    if (hasOwnProp?.call?.(data, "error")) {
                        console.error(data.error)
                        reject(data.error)
                    } else {
                        resolve(data)
                    }
                }
                worker.onerror = (error) => {
                    worker?.terminate?.();
                    dataStatusPrio = false
                    dataStatus.set(null)
                    progress.set(100)
                    alertError()
                    updateRecommendationList.update(e => !e)
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

let getOrderedFiltersWorker
const getOrderedFilters = async () => {
    try {
        getOrderedFiltersWorker?.terminate?.()
        const url = await progressedFetch("./web-worker/getOrderedFilters.js")
        getOrderedFiltersWorker = new Worker(url)
        getOrderedFiltersWorker.postMessage(0)
        getOrderedFiltersWorker.onmessage = ({ data }) => {
            getOrderedFiltersWorker?.terminate?.()
            if (hasOwnProp?.call?.(data, "error")) {
                console.error(data.error)
            } else if (hasOwnProp?.call?.(data, "orderedMediaOptions") && isJsonObject(data.orderedMediaOptions) && !jsonIsEmpty(data.orderedMediaOptions)) {
                orderedMediaOptions.set(data.orderedMediaOptions)
            }
        }
        getOrderedFiltersWorker.onerror = () => {
            getOrderedFiltersWorker?.terminate?.()
        }
    } catch {
        getOrderedFiltersWorker?.terminate?.()
    }
}

let updateTagInfoWorker
const updateTagInfo = (_data = {}) => {
    if (get(initList) !== false && !_data?.initList) {
        return
    }
    return new Promise(async (resolve) => {
        try {
            updateTagInfoWorker?.terminate?.()
            const url = await progressedFetch("./web-worker/updateTagInfo.js")
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
            updateTagInfoWorker.postMessage({ server, getTagInfo: _data.getTagInfo ?? true })
            updateTagInfoWorker.onmessage = ({ data }) => {
                if (hasOwnProp.call(data, "getConnectionState")) {
                    (async () => {
                        updateTagInfoWorker?.postMessage?.({ connected: await isConnected() })
                    })();
                    return
                }
                updateTagInfoWorker?.terminate?.()
                if (hasOwnProp.call(data, "tagInfo") && isJsonObject(data.tagInfo) && !jsonIsEmpty(data.tagInfo)) {
                    tagInfo.set(data.tagInfo)
                }
                resolve()
            }
            updateTagInfoWorker.onerror = () => {
                updateTagInfoWorker?.terminate?.()
                resolve()
            }
        } catch {
            updateTagInfoWorker?.terminate?.()
            resolve()
        }
    })
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
    processRecommendedMediaEntriesWorker?.terminate?.()
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

window.updateNotifications = async (mediaIds = []) => {
    if (!get(android)) return
    try {
        const mediaUpdates = await mediaLoader({ updateNotifications: true, mediaIds })
        for (let mediaId in mediaUpdates) {
            const media = mediaUpdates[mediaId]
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

}

export {
    retrieveInitialData,
    updateTagInfo,
    requestMediaEntries,
    requestUserEntries,
    exportUserData,
    importUserData,
    processRecommendedMediaEntries,
    mediaManager,
    mediaLoader,
}