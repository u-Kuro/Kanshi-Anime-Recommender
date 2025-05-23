import { get } from "svelte/store";
import { progressedFetch } from "./fetch.js";
import { isConnected } from "./utils/deviceUtils.js";
import { decompressBlobToJSON } from "./utils/conversionUtils.js";
import { getLocalServerURL } from "./utils/localHTTPServerUtils.js";
import { setIDBData, removeLSData, setLSData } from "./database.js";
import { downloadLink, getUniqueId, showToast } from "./utils/appUtils.js";
import { isJsonObject, isValidDateTime, jsonIsEmpty } from "./utils/dataUtils.js";
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
    evicted,
    androidBackground,
} from "./variables.js";

const hasOwnProp = Object.prototype.hasOwnProperty
let dataStatusPrio = false
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

const mediaLoader = ($data = {}) => {
    if (get(initList) !== false && !$data?.initList) {
        return
    }
    return new Promise(async (resolve, reject) => {
        let postId = getUniqueId()
        $data.postId = postId
        mediaLoaderPromises[postId] = { resolve, reject }

        try {
            mediaLoaderWorker = mediaLoaderWorker || new Worker(await progressedFetch("./web-worker/mediaLoader.js", 26678, "Checking Existing List"))
        } catch (ex) {
            mediaLoaderWorker?.terminate?.()
            mediaLoaderWorker = null

            alertError()

            console.error(ex)

            return reject(ex)
        }
        
        mediaLoaderWorker.postMessage($data)
        
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

            if (data instanceof Blob) {
                data = await decompressBlobToJSON(data)
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

            } else if (hasOwnProp.call(data, "updateMediaNotifications")) {
                if (data.mediaUpdatesBlob instanceof Blob) {
                    mediaLoaderPromises[data.postId]?.resolve?.(data.mediaUpdatesBlob)
                } else {
                    mediaLoaderPromises[data.postId]?.reject?.()
                }
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

            if (
                hasOwnProp?.call?.(data, "shouldUpdateMediaNotifications")
                && !get(androidBackground)
            ) {
                window.updateMediaNotifications()                
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
const mediaManager = ($data = {}) => {
    if (get(initList) !== false && !$data?.initList) {
        return
    }
    return new Promise((resolve, reject) => {
        if (get(isImporting)) {
            if (!$data?.isImporting) {
                return reject("Process is interrupted, currently importing")
            }
        }

        mediaManagerWorker?.terminate?.()

        mediaManagerWorkerPostId = getUniqueId()

        if (hasOwnProp.call($data, "updateMediaFilter")) {
            const category = $data.selectedCategory
            if (category && ($data.mediaFilters || $data.sortBy)) {
                if (!mediaFilters[category]) {
                    mediaFilters[category] = {}
                }
                if ($data.mediaFilters) {
                    mediaFilters[category].mediaFilters = $data.mediaFilters
                }
                if ($data.sortBy) {
                    mediaFilters[category].sortBy = $data.sortBy
                }
                loadingCategory.update((e) => {
                    e[category] = new Date().getTime()
                    return e
                })
            }
        } else if (hasOwnProp.call($data, "removeId")) {
            const removeId = $data.removeId
            entriesToHide[removeId] = true
            delete entriesToShow[removeId]

            loadingCategory.update((e) => {
                e[""] = new Date().getTime()
                return e
            })

            if (get(popupVisible) && get(loadedMediaLists)?.[get(selectedCategory)]?.mediaList?.length) {
                listUpdateAvailable.set(true)
                return
            }
        } else if (hasOwnProp.call($data, "showId")) {
            const showId = $data.showId
            if (showId === "all") {
                entriesToShow = { all: true }
                entriesToHide = {}
            } else {
                entriesToShow[showId] = true
                delete entriesToHide[showId]
            }

            loadingCategory.update((e) => {
                e[""] = new Date().getTime()
                return e
            })

            if (get(popupVisible) && get(loadedMediaLists)?.[get(selectedCategory)]?.mediaList?.length) {
                listUpdateAvailable.set(true)
                return
            }
        } else if (hasOwnProp.call($data, "addedCategoryKey")) {
            const categoryToAdd = $data.addedCategoryKey
            const categoryToAddFrom = $data.copiedCategoryKey
            categoriesToEdit.push({ 
                add: {
                    [categoryToAdd]: categoryToAddFrom
                } 
            })
        } else if (hasOwnProp.call($data, "renamedCategoryKey")) {
            const newNameForCategory = $data.renamedCategoryKey
            const categoryToRename = $data.replacedCategoryKey
            categoriesToEdit.push({ 
                rename: {
                    [newNameForCategory]: categoryToRename
                } 
            })
        } else if (hasOwnProp.call($data, "deletedCategoryKey")) {
            const categoryToDelete = $data.deletedCategoryKey
            categoriesToEdit.push({ 
                delete: categoryToDelete
            })
        } else {
            updateRecommendedMediaList = $data?.updateRecommendedMediaList || updateRecommendedMediaList
            if ($data?.mediaCautions instanceof Array) {
                passedMediaCautions = $data.mediaCautions
            }

            loadingCategory.update((e) => {
                e[""] = new Date().getTime()
                return e
            })
        }

        progress.set(0)
        progressedFetch("./web-worker/mediaManager.js", 55483, "Updating Categories and List")
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
                    initList: $data?.initList
                });
                mediaManagerWorker.onmessage = async ({ data }) => {
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
                    } else if (data instanceof Blob) {
                        data = await decompressBlobToJSON(data)
                        mediaManagerWorker?.terminate?.();

                        if (!get(androidBackground)) {
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
                    } else {
                        mediaManagerWorker?.terminate?.();
                        mediaManagerWorker = null

                        dataStatusPrio = false
            
                        listUpdateAvailable.set(true)
                        isLoadingMedia.set(false)
                        dataStatus.set(null)
                        progress.set(100)
            
                        alertError()

                        reject()
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

let getOrderedMediaOptionsWorker
const getOrderedMediaOptions = (getData = true) => {
    return new Promise(async (resolve, reject) => {
        try {
            getOrderedMediaOptionsWorker?.terminate?.()
            const url = await progressedFetch("./web-worker/getOrderedMediaOptions.js")
            getOrderedMediaOptionsWorker = new Worker(url)
            getOrderedMediaOptionsWorker.postMessage(getData)
            getOrderedMediaOptionsWorker.onmessage = async ({ data }) => {
                getOrderedMediaOptionsWorker?.terminate?.()
                if (hasOwnProp?.call?.(data, "error")) {
                    console.error(data.error)
                    reject()
                } else {
                    if (data instanceof Blob) {
                        data = await decompressBlobToJSON(data)
                        if (isJsonObject(data) && !jsonIsEmpty(data)) {
                            orderedMediaOptions.set(data)
                        }
                    }
                    resolve()
                }
            }
            getOrderedMediaOptionsWorker.onerror = () => {
                getOrderedMediaOptionsWorker?.terminate?.()
                reject()
            }
        } catch {
            getOrderedMediaOptionsWorker?.terminate?.()
            reject()
        }
    })
}

let scheduleMediaNotificationsWorker, mediaReleaseUpdateTimeout
window.setMediaReleaseUpdateTimeout = (nearestMediaReleaseAiringAt) => {
    if (typeof nearestMediaReleaseAiringAt === "number" && !isNaN(nearestMediaReleaseAiringAt)) {
        clearTimeout(mediaReleaseUpdateTimeout)
        let timeLeftBeforeMediaReleaseUpdate = (nearestMediaReleaseAiringAt * 1000) - new Date().getTime()
        mediaReleaseUpdateTimeout = setTimeout(() => {
            updateRecommendationList.update(e => !e)
        }, Math.min(timeLeftBeforeMediaReleaseUpdate, 2000000000))
    }
}
const scheduleMediaNotifications = () => {
    return new Promise(async (resolve, reject) => {
        try {
            scheduleMediaNotificationsWorker?.terminate?.()
            const url = await progressedFetch("./web-worker/scheduleMediaNotifications.js")
            scheduleMediaNotificationsWorker = new Worker(url)
            scheduleMediaNotificationsWorker.postMessage(get(android) ? "android" : "browser")
            scheduleMediaNotificationsWorker.onmessage = async ({ data }) => {
                if (hasOwnProp?.call?.(data, "error")) {
                    scheduleMediaNotificationsWorker?.terminate?.()
                    console.error(data.error)
                } else if (
                    hasOwnProp?.call?.(data, "nearestMediaReleaseAiringAt")
                    || hasOwnProp?.call?.(data, "mediaReleaseNotificationsBlob")
                ) {
                    if (isValidDateTime(data.nearestMediaReleaseAiringAt * 1000)) {
                        setLSData("nearestMediaReleaseAiringAt", data.nearestMediaReleaseAiringAt)
                        .catch(() => removeLSData("nearestMediaReleaseAiringAt"))
                        .finally(() => setIDBData("nearestMediaReleaseAiringAt", data.nearestMediaReleaseAiringAt));
                        window.setMediaReleaseUpdateTimeout?.(data.nearestMediaReleaseAiringAt)
                    }
                    if (get(android) && data.mediaReleaseNotificationsBlob instanceof Blob) {
                        try {
                            await fetch(`${await getLocalServerURL()}/schedule-media-notifications`, {
                                method: "PUT",
                                headers: {
                                    "Content-Type": "application/octet-stream",
                                    "Content-Encoding": "gzip"
                                },
                                cache: "no-store",
                                body: data.mediaReleaseNotificationsBlob
                            })
                        } catch (e) {
                            console.error(e)
                        }
                    }
                    scheduleMediaNotificationsWorker?.terminate?.()
                    resolve()
                } else {
                    scheduleMediaNotificationsWorker?.terminate?.()
                    reject()
                }
            }
            scheduleMediaNotificationsWorker.onerror = () => {
                scheduleMediaNotificationsWorker?.terminate?.()
                reject()
            }
        } catch (e) {
            console.error(e)
            scheduleMediaNotificationsWorker?.terminate?.()
            reject()
        }
    })
}

let processRecommendedMediaEntriesWorker,
    passedAlgorithmFilter,
    passedAlgorithmFilterId,
    processSubsequentWorkersTimeout
const processRecommendedMediaEntries = ($data = {}) => {
    if (get(initList) !== false && !$data?.initList) {
        return
    }
    return new Promise((resolve, reject) => {
        if (get(isImporting)) {
            if (!$data?.isImporting) {
                return reject("Process is interrupted, currently importing")
            }
        }

        processRecommendedMediaEntriesWorker?.terminate?.()

        if ($data?.algorithmFilters) {
            passedAlgorithmFilter = $data.algorithmFilters
            $data.passedAlgorithmFilterId = passedAlgorithmFilterId = getUniqueId()
        } else if (passedAlgorithmFilter) {
            $data.algorithmFilters = passedAlgorithmFilter
            $data.algorithmFiltersId = passedAlgorithmFilterId
        }
        
        progress.set(0)
        progressedFetch("./web-worker/processRecommendedMediaEntries.js", 41859, "Updating Recommendation List")
            .then(url => {
                isProcessingList.set(true)
                clearTimeout(processSubsequentWorkersTimeout)
                getOrderedMediaOptionsWorker?.terminate?.()
                scheduleMediaNotificationsWorker?.terminate?.()
                processRecommendedMediaEntriesWorker?.terminate?.();
                processRecommendedMediaEntriesWorker = new Worker(url);
                processRecommendedMediaEntriesWorker.postMessage($data);
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
                        if (passedAlgorithmFilterId === data?.passedAlgorithmFilterId && passedAlgorithmFilterId != null) {
                            passedAlgorithmFilterId = passedAlgorithmFilter = undefined
                        }
                        if (!get(androidBackground)) {
                            processSubsequentWorkersTimeout = setTimeout(async () => {
                                await getOrderedMediaOptions()
                                scheduleMediaNotifications()
                            })
                        }
                        dataStatusPrio = false
                        isProcessingList.set(false)
                        dataStatus.set(null)
                        progress.set(100)
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
    if (get(android) && !get(evicted)) {
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
const requestMediaEntries = ($data = {}) => {
    if (get(initList) !== false && !$data?.initList) {
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
            if (get(isExporting) || get(isImporting)) {
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
                            $data.server = server
                        }
                    } catch {}
                }
                requestMediaEntriesWorker.postMessage($data)
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
                        if (get(android) && !get(evicted)) {
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
                                    if (get(androidBackground)) {
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
                    notifyUpdatedMediaNotification()
                    dataStatus.set(null)
                    progress.set(100)
                    console.error(error)
                    reject(error)
                }
            }).catch((error) => {
                requestMediaEntriesWorker?.terminate?.();
                wasRequestingMediaEntries = isRequestingMediaEntries = false
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
const requestUserEntries = ($data = {}) => {
    if (get(initList) !== false && !$data?.initList) {
        return
    }
    return new Promise((resolve, reject) => {
        if ($data?.username) {
            requestUserEntriesWorker?.terminate?.()
            isRequestingNewUser = true
        } else if (isRequestingNewUser) {
            return
        } else if ($data?.reload) {
            requestUserEntriesWorker?.terminate?.()
            isReloadingUserEntries = true
        } else if (isReloadingUserEntries) {
            return
        } else {
            requestUserEntriesWorker?.terminate?.()
        }
        
        if (!get(initData)) {
            if (get(isExporting) || get(isImporting)) {
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
                            $data.server = server
                        }
                    } catch {}
                }
                requestUserEntriesWorker.postMessage($data)
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
                        if (get(android)) { window.KanshiBackgroundshouldProcessRecommendedEntries = true }
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

let exportUserDataWorker;
const exportUserData = ($data) => {
    if (get(initList) !== false && !$data?.initList) {
        return
    }
    return new Promise((resolve, reject) => {
        if (get(isExporting) && $data?.visibilityChange) {
            resolve()
            return
        }
        try {
            if (get(android) && $data?.isManual && JSBridge.backUpIsAvailable() === false) {
                if (get(androidBackground)) {
                    reject()
                }
                return
            }
        } catch {}
        exportUserDataWorker?.terminate?.()
        if (!get(initData)) {
            if (get(isImporting)) return
            isExporting.set(true)
            stopConflictingWorkers({ isExporting: true })
        }
        progress.set(0)
        resetProgress.update((e) => !e);
        progressedFetch("./web-worker/exportUserData.js")
            .then(url => {
                exportUserDataWorker?.terminate?.()
                exportUserDataWorker = new Worker(url)
                exportUserDataWorker.postMessage(get(android) ? "android" : "browser")
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
                        rerunImportantWork($data?.isManual)
                        reject(data.error)
                    } else if (data?.blob instanceof Blob && get(android)) {
                        dataStatusPrio = false
                        isExporting.set(false)
                        try {
                            if (JSBridge.backUpIsAvailable()) {
                                await fetch(
                                    `${await getLocalServerURL()}/backup-user-data`, {
                                    method: "PUT",
                                    headers: {
                                        "Content-Type": "application/octet-stream",
                                        "Content-Encoding": "gzip",
                                        "filename": `Kanshi.${data.username?.toLowerCase?.() || "backup"}.gzip`
                                    },
                                    cache: "no-store",
                                    body: data.blob
                                });
                                if ($data?.isManual) showToast("Data has been exported")
                            }
                        } catch {
                            if ($data?.isManual) {
                                (async () => {
                                    if (await window.confirmPromise?.({
                                        title: "Back up failed",
                                        text: "Do you want to try again?",
                                    })) {
                                        exportUserData({ isManual: true });
                                    }
                                })();
                                reject()
                            }
                        }
                        exportUserDataWorker?.terminate?.();
                        dataStatus.set(null)
                        progress.set(100)
                        rerunImportantWork($data?.isManual)
                        resolve()
                    } else if (typeof data?.url === "string" && data?.url !== "") {
                        downloadLink(data.url, `Kanshi.${data.username?.toLowerCase?.() || "backup"}.gzip`)
                        exportUserDataWorker?.terminate?.();
                        dataStatusPrio = false
                        dataStatus.set(null)
                        progress.set(100)
                        isExporting.set(false)
                        rerunImportantWork($data?.isManual)
                        resolve()
                    } else {
                        exportUserDataWorker?.terminate?.();
                        dataStatusPrio = false
                        window.confirmPromise?.({
                            isAlert: true,
                            title: "Back up failed",
                            text: "Something went wrong while processing your backup (B2).",
                        })
                        dataStatus.set(null)
                        progress.set(100)
                        isExporting.set(false)
                        rerunImportantWork($data?.isManual)
                        reject()
                    }
                }
                exportUserDataWorker.onerror = (error) => {
                    exportUserDataWorker?.terminate?.();
                    dataStatusPrio = false
                    dataStatus.set(null)
                    progress.set(100)
                    isExporting.set(false)
                    window.confirmPromise?.({
                        isAlert: true,
                        title: "Back up failed",
                        text: typeof error === "string" && error ? error : "Something went wrong while processing your backup (B3).",
                    })
                    rerunImportantWork($data?.isManual)
                    console.error(error)
                    reject(error)
                }
            }).catch((error) => {
                exportUserDataWorker?.terminate?.();
                dataStatusPrio = false
                dataStatus.set(null)
                progress.set(100)
                isExporting.set(false)
                alertError()
                rerunImportantWork($data?.isManual)
                console.error(error)
                reject(error)
            })
    })
}

let importUserDataWorker;
const importUserData = ($data) => {
    if (get(initList) !== false) return
    return new Promise((resolve, reject) => {
        importUserDataWorker?.terminate?.()
        if (!get(initData)) {
            if (get(isExporting)) return
            isImporting.set(true)
            mediaManagerWorker?.terminate?.()
            mediaManagerWorker = null
            stopConflictingWorkers({ isImporting: true })
        }
        progress.set(0)
        resetProgress.update((e) => !e);
        progressedFetch("./web-worker/importUserData.js")
            .then(url => {
                importUserDataWorker?.terminate?.()
                importUserDataWorker = new Worker(url)
                removeLSData("username");
                importUserDataWorker.postMessage($data)
                importUserDataWorker.onmessage = async ({ data }) => {
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

                    if (data instanceof Blob) {
                        data = await decompressBlobToJSON(data)
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
                            entriesToHide = {}
                            entriesToShow = {}
                            hiddenMediaEntries.set(data?.hiddenMediaEntries)
                        }
                    } else if (hasOwnProp?.call?.(data, "mediaCautions")) {
                        if (data?.mediaCautions instanceof Array) {
                            passedMediaCautions = undefined
                            mediaCautions.set(data?.mediaCautions)
                            currentMediaCautions.set(data?.mediaCautions)
                        }
                    } else if (hasOwnProp?.call?.(data, "algorithmFilters")) {
                        if (data?.algorithmFilters instanceof Array) {
                            passedAlgorithmFilterId = passedAlgorithmFilter = undefined
                            algorithmFilters.set(data?.algorithmFilters)
                            currentAlgorithmFilters.set(data?.algorithmFilters)
                        }
                    } else if (hasOwnProp?.call?.(data, "tagInfo")) {
                        if (isJsonObject(data?.tagInfo)) {
                            tagInfo.set(data?.tagInfo)
                        }
                    } else if (hasOwnProp?.call?.(data, "hasNewCategories")) {
                        mediaFilters = {}
                        categoriesToEdit = []
                    } else {
                        importUserDataWorker?.terminate?.();
                        evicted.set(false)
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
const retrieveInitialData = () => {
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

let updateTagInfoWorker
const updateTagInfo = (getData = true) => {
    return new Promise(async (resolve, reject) => {
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
            updateTagInfoWorker.postMessage({ server, getData })
            updateTagInfoWorker.onmessage = async ({ data }) => {
                if (hasOwnProp.call(data, "getConnectionState")) {
                    (async () => {
                        updateTagInfoWorker?.postMessage?.({ connected: await isConnected() })
                    })();
                    return
                }
                
                updateTagInfoWorker?.terminate?.()
                if (hasOwnProp?.call?.(data, "error")) {
                    console.error(data.error)
                    reject()
                } else {
                    if (data instanceof Blob) {
                        data = await decompressBlobToJSON(data)
                        if (isJsonObject(data) && !jsonIsEmpty(data)) {
                            tagInfo.set(data)
                        }
                    }
                    resolve()
                }
            }
            updateTagInfoWorker.onerror = () => {
                updateTagInfoWorker?.terminate?.()
                reject()
            }
        } catch {
            updateTagInfoWorker?.terminate?.()
            reject()
        }
    })
}

function stopConflictingWorkers(blocker) {
    dataStatusPrio = false
    progress.set(0)
    requestMediaEntriesWorker?.terminate?.()
    notifyUpdatedMediaNotification()
    isRequestingMediaEntries = false
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

window.updateMediaNotifications = async (initList = false) => {
    if (!get(android)) return
    await fetch(
        `${await getLocalServerURL()}/update-media-notifications`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/octet-stream",
            "Content-Encoding": "gzip"
        },
        body: await mediaLoader({
            updateMediaNotifications: true,
            initList,
            mediaIdsBlob: await (
                await fetch(
                    `${await getLocalServerURL()}/get-current-media-notification-ids`, {
                    cache: "no-store",
                })
            ).blob()
        })
    })
}

export {
    retrieveInitialData,
    updateTagInfo,
    requestMediaEntries,
    requestUserEntries,
    exportUserData,
    importUserData,
    processRecommendedMediaEntries,
    getOrderedMediaOptions,
    scheduleMediaNotifications,
    mediaManager,
    mediaLoader,
}