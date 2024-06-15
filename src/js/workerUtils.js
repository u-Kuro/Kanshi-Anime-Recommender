import { get } from "svelte/store";
import { cacheRequest } from "./caching.js";
import { downloadLink, isJsonObject, jsonIsEmpty, removeLocalStorage, setLocalStorage, showToast, } from "../js/others/helper.js"
import {
    dataStatus,
    updateRecommendationList,
    username,
    hiddenEntries,
    runUpdate,
    animeIdxRemoved,
    loadAnime,
    initData,
    userRequestIsRunning,
    progress,
    android,
    extraInfo,
    currentExtraInfo,
    isLoadingAnime,
    isProcessingList,
    loadingDataStatus,
    isBackgroundUpdateKey,
    tagInfo,
    earlisetReleaseDate,
    mostRecentAiringDateTimeout,
    loadedAnimeLists,
    loadNewAnime,
    selectedCategory,
    searchedWord,
    categories,
    algorithmFilters,
    animeCautions,
    showLoadingAnime,
    resetTypedUsername,
    resetProgress,
    appID
} from "./globalValues.js";

const hasOwnProp = Object.prototype.hasOwnProperty
let windowHREF = window?.location?.href
let terminateDelay = 1000;
let dataStatusPrio = false
let isExporting = false;
let isImporting = false;
let isGettingNewEntries = false;
let isRequestingAnimeEntries = false

let idCounter = 0
function getUniqueId() {
    if (idCounter < Number.MAX_SAFE_INTEGER) {
        return ++idCounter
    } else {
        idCounter = 0
        return idCounter
    }
}

earlisetReleaseDate.subscribe((val) => {
    if (typeof val === "number" && !isNaN(val)) {
        clearTimeout(get(mostRecentAiringDateTimeout));
        const timeBeforeEarliestReleaseDate = (val * 1000) - new Date().getTime()
        mostRecentAiringDateTimeout.set(setTimeout(() => {
            earlisetReleaseDate.set(undefined)
            animeLoaderWorker?.postMessage?.({
                getEarlisetReleaseDate: true,
            });
        }, Math.min(timeBeforeEarliestReleaseDate, 2000000000)));
    }
})

let animeLoaderWorker, animeLoaderWorkerPromise, animeLoaderPromises = {};
function getAnimeLoaderWorker() {
    if (animeLoaderWorker) return animeLoaderWorker
    if (animeLoaderWorkerPromise) return animeLoaderWorkerPromise
    animeLoaderWorkerPromise = new Promise(async (resolve) => {
        resolve(new Worker(await cacheRequest("./webapi/worker/animeLoader.js", 19322, "Checking existing List")))
        animeLoaderWorkerPromise = null
    })
    return animeLoaderWorkerPromise
}
const animeLoader = (_data = {}) => {
    return new Promise(async (resolve, reject) => {

        let postId = getUniqueId()
        _data.postId = postId
        animeLoaderPromises[postId] = { resolve, reject }

        try {
            animeLoaderWorker = animeLoaderWorker || await getAnimeLoaderWorker()
        } catch (ex) {
            showLoadingAnime.set(false)

            alertError()
            return reject(ex)
        }

        animeLoaderWorker.postMessage(_data)

        if (animeLoaderWorker.onmessage) return
        animeLoaderWorker.onmessage = async ({ data }) => {
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
                let anime = data?.anime
                let airingAt = data?.airingAt
                let currentEarliestDate = get(earlisetReleaseDate)
                if (airingAt && (airingAt < currentEarliestDate || currentEarliestDate == null)) {
                    earlisetReleaseDate.set(airingAt)
                }
                let isLast = data?.isLast
                if (anime || isLast) {
                    get(loadNewAnime)?.[data?.selectedCategory]?.({
                        idx: data?.idx,
                        anime,
                        isLast
                    })
                }
            } else if (hasOwnProp.call(data, "updateList")) {

                if (data?.categories) {
                    categories.set(data?.categories);
                }

                const selectThisCategory = data?.selectedCategory
                const updatedCategoryKey = data?.updatedCategoryKey
                const categoryKey = selectThisCategory ?? updatedCategoryKey

                if (categoryKey) {
                    const category = data?.category;
                    let isNew
                    loadedAnimeLists.update((val) => {
                        if (!val[categoryKey]) {
                            val[categoryKey] = {}
                            isNew = true
                        }
                        val[categoryKey].animeFilters = category?.animeFilters;
                        val[categoryKey].sortBy = category?.sortBy;
                        return val
                    })

                    if (isNew) {
                        animeLoaderWorker.postMessage({
                            loadMore: true,
                            selectedCategory: categoryKey,
                            searchedWord: get(searchedWord),
                            reload: true,
                        })
                    }

                    if (selectThisCategory != null) {
                        animeManager({ selectCategory: selectThisCategory })
                    } else if (get(selectedCategory) !== updatedCategoryKey) {
                        delete data?.reloadList
                    }
                }
                animeLoaderPromises[data?.postId]?.resolve?.()
            } else if (hasOwnProp.call(data, "getEarlisetReleaseDate")) {
                let currentEarliestDate = get(earlisetReleaseDate)
                let airingAt = data.earliestReleaseDate
                if (airingAt && (airingAt < currentEarliestDate || currentEarliestDate == null)) {
                    earlisetReleaseDate.set(data.earliestReleaseDate);
                }
            } else if (hasOwnProp?.call?.(data, "error")) {
                showLoadingAnime.set(false)

                dataStatus.set(null)
                progress.set(100)

                alertError()
                animeLoaderPromises[data?.postId]?.reject?.()
                return
            } else if (hasOwnProp?.call?.(data, "loadAll")) {
                categories.set(data?.categories || get(categories));
                hiddenEntries.set(data?.hiddenEntries || get(hiddenEntries))
                animeCautions.set(data?.animeCautions || get(animeCautions))
                let categoryKey = data?.selectedCategory;
                if (categoryKey) {
                    let category = data?.category
                    loadedAnimeLists.update((val) => {
                        if (!val[categoryKey]) {
                            val[categoryKey] = {}
                        }
                        val[categoryKey].animeFilters = category?.animeFilters || val[categoryKey].animeFilters;
                        val[categoryKey].sortBy = category?.sortBy || val[categoryKey].sortBy;
                        return val
                    })
                    if (typeof get(selectedCategory) !== "string") {
                        selectedCategory.set(categoryKey)
                    }
                }
                animeLoaderPromises[data?.postId]?.resolve?.(data)
            }

            if (hasOwnProp?.call?.(data, "reloadList")) {
                animeLoaderWorker.postMessage({
                    reload: true,
                    loadMore: true,
                    selectedCategory: get(selectedCategory),
                    searchedWord: get(searchedWord),
                });
                animeLoaderPromises[data?.postId]?.resolve?.()
            }
        };
        animeLoaderWorker.onerror = (error) => {
            showLoadingAnime.set(false)

            dataStatus.set(null)
            progress.set(100)

            alertError()
            animeLoaderPromises?.[postId]?.reject?.()

            console.error(error);
        };
    })
}

let animeManagerPromises = {}
let animeManagerWorker, animeManagerWorkerPromise, animeManagerWorkerTimeout, workerCount = 0;
function getAnimeManagerWorker() {
    if (animeManagerWorker) return animeManagerWorker
    if (animeManagerWorkerPromise) return animeManagerWorkerPromise
    animeManagerWorkerPromise = new Promise(async (resolve) => {
        resolve(new Worker(await cacheRequest("./webapi/worker/animeManager.js", 56571, "Updating the List")))
        animeManagerWorkerPromise = null
    })
    return animeManagerWorkerPromise
}
const animeManager = (_data = {}) => {
    return new Promise(async (resolve, reject) => {
        if (isImporting) {
            showLoadingAnime.set(false)
            return
        }

        clearTimeout(animeManagerWorkerTimeout)
        ++workerCount

        let postId = getUniqueId()
        _data.postId = postId
        animeManagerPromises[postId] = { resolve, reject }

        isLoadingAnime.set(true)

        try {
            animeManagerWorker = animeManagerWorker || await getAnimeManagerWorker()
        } catch (ex) {
            workerCount = 0
            dataStatusPrio = false

            isLoadingAnime.set(false)
            showLoadingAnime.set(false)

            alertError()
            return reject(ex)
        }

        progress.set(0)
        animeManagerWorker.postMessage(_data)

        if (animeManagerWorker.onmessage) return
        animeManagerWorker.onmessage = async ({ data }) => {
            if (hasOwnProp.call(data, "progress")) {
                if (data?.progress >= 0 && data?.progress <= 100) {
                    progress.set(data.progress);
                }
                return
            } else if (hasOwnProp.call(data, "status")) {
                dataStatusPrio = true
                dataStatus.set(data.status);
                return
            } else if (hasOwnProp?.call?.(data, "removedIdx")) {
                let removedIdx = data?.removedIdx
                let categoryName = data?.selectedCategory
                if (categoryName === get(selectedCategory) && removedIdx >= 0) {
                    animeIdxRemoved.set(null)
                    animeIdxRemoved.set(removedIdx)
                }
                return
            }

            let postId = data.postId
            --workerCount

            if (
                hasOwnProp.call(data, "updateUserList") ||
                hasOwnProp.call(data, "updateRecommendedAnimeList")
            ) {
                delete data?.postId
                if (animeLoaderWorker) {
                    animeLoaderWorker.postMessage(data || {})
                } else {
                    animeLoader(data || {})
                }
                animeManagerPromises?.[postId]?.resolve?.()
                showLoadingAnime.set(false)
            } else if (hasOwnProp?.call?.(data, "error")) {
                workerCount = 0
                dataStatusPrio = false

                isLoadingAnime.set(false)
                showLoadingAnime.set(false)

                dataStatus.set(null)
                progress.set(100)

                alertError()
                animeManagerPromises?.[postId]?.reject?.()
                animeManagerWorkerTimeout = setTimeout(() => {
                    animeManagerWorker?.terminate?.();
                    animeManagerWorker = null
                }, terminateDelay)
                return

            } else if (get(android) && get(isBackgroundUpdateKey) && window?.[get(isBackgroundUpdateKey)] === true) {
                animeManagerWorker?.terminate?.()
                animeManagerWorker = null
                animeManagerPromises?.[postId]?.resolve?.()
                resolve?.()
            } else {
                animeManagerPromises?.[postId]?.resolve?.()
            }

            if (workerCount <= 0) {
                dataStatusPrio = false
                animeManagerWorkerTimeout = setTimeout(() => {

                    dataStatus.set(null)
                    progress.set(100)

                    animeManagerWorker?.terminate?.();
                    animeManagerWorker = null

                    isLoadingAnime.set(false)
                    showLoadingAnime.set(false)
                }, terminateDelay)
            }
        };
        animeManagerWorker.onerror = (error) => {
            workerCount = 0
            dataStatusPrio = false

            isLoadingAnime.set(false)
            showLoadingAnime.set(false)

            dataStatus.set(null)
            progress.set(100)

            alertError()
            animeManagerPromises?.[postId]?.reject?.(error)
            console.error(error);
            animeManagerWorkerTimeout = setTimeout(() => {
                animeManagerWorker?.terminate?.();
                animeManagerWorker = null
            }, terminateDelay)
        };
    })
}

let processRecommendedAnimeListTerminateTimeout;
let processRecommendedAnimeListWorker;
let animeCompletionUpdateTimeout
window.setAnimeCompletionUpdateTimeout = (neareastAnimeCompletionAiringAt) => {
    if (typeof neareastAnimeCompletionAiringAt === 'number' && !isNaN(neareastAnimeCompletionAiringAt)) {
        clearTimeout(animeCompletionUpdateTimeout)
        let timeLeftBeforeAnimeCompletionUpdate = (neareastAnimeCompletionAiringAt * 1000) - new Date().getTime()
        animeCompletionUpdateTimeout = setTimeout(() => {
            // Only run if data initialization is done
            // "updateRecommendationList" function call has a checker for it before processing
            updateRecommendationList.update(e => !e)
        }, Math.min(timeLeftBeforeAnimeCompletionUpdate, 2000000000))
    }
}

let passedAlgorithmFilter
const processRecommendedAnimeList = (_data = {}) => {
    return new Promise((resolve, reject) => {
        if (isImporting) {
            if (!_data?.isImporting) {
                showLoadingAnime.set(false)
                return
            }
        }
        if (processRecommendedAnimeListTerminateTimeout) clearTimeout(processRecommendedAnimeListTerminateTimeout);
        processRecommendedAnimeListWorker?.terminate?.();
        processRecommendedAnimeListWorker = null

        progress.set(0)
        cacheRequest("./webapi/worker/processRecommendedAnimeList.js", 40528, "Updating Recommendation List")
            .then(url => {
                const lastProcessRecommendationAiringAt = parseInt((new Date().getTime() / 1000))
                let neareastAnimeCompletionAiringAt
                if (processRecommendedAnimeListTerminateTimeout) clearTimeout(processRecommendedAnimeListTerminateTimeout);
                processRecommendedAnimeListWorker?.terminate?.();
                processRecommendedAnimeListWorker = null
                if (_data?.algorithmFilters) {
                    passedAlgorithmFilter = _data?.algorithmFilters
                } else if (passedAlgorithmFilter) {
                    _data.algorithmFilters = passedAlgorithmFilter
                }
                isProcessingList.set(true)
                processRecommendedAnimeListWorker = new Worker(url);
                processRecommendedAnimeListWorker.postMessage(_data);
                processRecommendedAnimeListWorker.onmessage = ({ data }) => {
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
                        showLoadingAnime.set(false)
                        dataStatus.set(null);
                        progress.set(100)
                        alertError()
                        reject();
                    } else if (hasOwnProp?.call?.(data, "animeReleaseNotification")) {
                        if (get(android)) {
                            try {
                                let aniReleaseNotif = data?.animeReleaseNotification
                                if (
                                    typeof aniReleaseNotif?.releaseEpisodes === "number"
                                    && typeof aniReleaseNotif?.releaseDateMillis === "number"
                                    && typeof aniReleaseNotif?.maxEpisode === "number"
                                    && typeof aniReleaseNotif?.title === "string"
                                    && typeof aniReleaseNotif?.id === "number"
                                    && typeof aniReleaseNotif?.userStatus === "string"
                                    && typeof aniReleaseNotif?.imageURL === "string"
                                    && typeof aniReleaseNotif?.animeUrl === "string"
                                    && typeof aniReleaseNotif?.episodeProgress === "number"
                                ) {
                                    JSBridge?.addAnimeReleaseNotification?.(
                                        aniReleaseNotif.id,
                                        aniReleaseNotif.title,
                                        aniReleaseNotif.releaseEpisodes,
                                        aniReleaseNotif.maxEpisode,
                                        aniReleaseNotif.releaseDateMillis,
                                        aniReleaseNotif.imageURL,
                                        aniReleaseNotif.animeUrl,
                                        aniReleaseNotif.userStatus,
                                        aniReleaseNotif?.episodeProgress
                                    )
                                }
                            } catch { }
                        }
                    } else if (hasOwnProp?.call?.(data, "animeCompletionAiringAt")) {
                        const animeCompletionAiringAt = data?.animeCompletionAiringAt
                        if (animeCompletionAiringAt > lastProcessRecommendationAiringAt && typeof animeCompletionAiringAt === "number" && !isNaN(animeCompletionAiringAt)) {
                            if (
                                neareastAnimeCompletionAiringAt > animeCompletionAiringAt || neareastAnimeCompletionAiringAt == null
                            ) {
                                neareastAnimeCompletionAiringAt = animeCompletionAiringAt
                            }
                        }
                    } else if (hasOwnProp?.call?.(data, "popularityMode") || hasOwnProp?.call?.(data, "averageScoreMode")) {
                        window?.updateMeanNumberInfos?.(data?.averageScoreMode, data?.popularityMode)
                    } else if (hasOwnProp?.call?.(data, "recListMAE")) {
                        window?.updateRecListMAE?.(data?.recListMAE)
                    } else {
                        setLocalStorage("neareastAnimeCompletionAiringAt", neareastAnimeCompletionAiringAt)
                            .catch(() => removeLocalStorage("neareastAnimeCompletionAiringAt"))
                            .finally(() => saveIDBdata(neareastAnimeCompletionAiringAt, "neareastAnimeCompletionAiringAt"));
                        if (window?.shouldUpdateNotifications === true && get(android)) {
                            window.shouldUpdateNotifications = false
                            if (typeof (get(username)) === "string") {
                                try {
                                    JSBridge?.callUpdateNotifications?.()
                                } catch { }
                            }
                        }
                        if (data?.hasPassedFilters === true) {
                            passedAlgorithmFilter = undefined
                        }
                        dataStatusPrio = false
                        processRecommendedAnimeListTerminateTimeout = setTimeout(() => {
                            processRecommendedAnimeListWorker?.terminate?.();
                        }, terminateDelay);
                        isProcessingList.set(false)
                        dataStatus.set(null)
                        progress.set(100)
                        if (neareastAnimeCompletionAiringAt) {
                            window?.setAnimeCompletionUpdateTimeout?.(neareastAnimeCompletionAiringAt)
                        }
                        resolve()
                        if (isImporting) {
                            animeLoader({ loadInit: true })
                        }
                        passedAlgorithmFilter = null
                    }
                };
                processRecommendedAnimeListWorker.onerror = (error) => {
                    dataStatusPrio = false
                    isProcessingList.set(false)
                    showLoadingAnime.set(false)
                    dataStatus.set(null)
                    progress.set(100)
                    reject(error);
                };
            }).catch((error) => {
                dataStatusPrio = false
                isProcessingList.set(false)
                showLoadingAnime.set(false)
                dataStatus.set(null)
                progress.set(100)
                alertError()
                reject(error)
            })
    });
};
let requestAnimeEntriesTerminateTimeout, requestAnimeEntriesWorker;
function notifyAnimeListIsProcessing(minimizeTransaction) {
    requestAnimeEntriesWorker?.postMessage?.({ minimizeTransaction })
}
isLoadingAnime.subscribe((val) => {
    notifyAnimeListIsProcessing(val)
})
isProcessingList.subscribe((val) => {
    if (val === true) {
        notifyAnimeListIsProcessing(val)
    }
})

let newAddedAnimeCount, newUpdatedAnimeCount
function notifyUpdatedAnimeNotification() {
    if (get(android) && window?.[".androidDataIsEvicted"] !== true) {
        if (typeof newAddedAnimeCount === "number"
            && !isNaN(newAddedAnimeCount)
            && typeof newUpdatedAnimeCount === "number"
            && !isNaN(newUpdatedAnimeCount)
            && (
                newAddedAnimeCount > 0 ||
                newUpdatedAnimeCount > 0
            )
        ) {
            try {
                JSBridge?.showNewUpdatedAnimeNotification?.(newAddedAnimeCount, newUpdatedAnimeCount)
            } catch { }
            newAddedAnimeCount = newUpdatedAnimeCount = undefined
        }
    }
}
window.notifyUpdatedAnimeNotification = notifyUpdatedAnimeNotification
const requestAnimeEntries = (_data = {}) => {
    return new Promise((resolve, reject) => {
        if (isRequestingAnimeEntries) {
            resolve()
            return
        }
        if (requestAnimeEntriesTerminateTimeout) clearTimeout(requestAnimeEntriesTerminateTimeout)
        requestAnimeEntriesWorker?.terminate?.()
        requestAnimeEntriesWorker = null
        notifyUpdatedAnimeNotification()
        if (!get(initData)) {
            if (isGettingNewEntries
                || isExporting
                || isImporting
            ) {
                resolve()
                return
            }
        }
        progress.set(0)
        cacheRequest("./webapi/worker/requestAnimeEntries.js")
            .then(url => {
                if (requestAnimeEntriesTerminateTimeout) clearTimeout(requestAnimeEntriesTerminateTimeout)
                requestAnimeEntriesWorker?.terminate?.()
                requestAnimeEntriesWorker = null
                notifyUpdatedAnimeNotification()
                requestAnimeEntriesWorker = new Worker(url)
                _data.windowHREF = windowHREF || window?.location?.href
                requestAnimeEntriesWorker.postMessage(_data)
                isRequestingAnimeEntries = true
                requestAnimeEntriesWorker.onmessage = ({ data }) => {
                    if (hasOwnProp?.call?.(data, "progress")) {
                        if (!dataStatusPrio && data?.progress >= 0 && data?.progress <= 100) {
                            progress.set(data.progress)
                        }
                        return
                    } else if (hasOwnProp?.call?.(data, "status")) {
                        if (!dataStatusPrio) {
                            dataStatus.set(data.status)
                        }
                        return
                    }
                    if (hasOwnProp?.call?.(data, "error")) {
                        if (!window.alreadyShownNoNetworkAlert || data?.showToUser) {
                            window.alreadyShownNoNetworkAlert = true
                            window.confirmPromise?.({
                                isAlert: true,
                                text: "Failed retrieval, " + (data?.error?.toLowerCase?.() || "please try again") + ".",
                            })
                        }
                        isRequestingAnimeEntries = false
                        requestAnimeEntriesTerminateTimeout = setTimeout(() => {
                            requestAnimeEntriesWorker?.terminate?.();
                        }, terminateDelay)
                        notifyUpdatedAnimeNotification()
                        dataStatus.set(null)
                        progress.set(100)
                        reject(data)
                    } else if (hasOwnProp?.call?.(data, "updateRecommendationList")) {
                        if (get(android)) {
                            window.KanshiBackgroundShouldProcessRecommendation = true
                        }
                        updateRecommendationList.update(e => !e)
                    } else if (hasOwnProp?.call?.(data, "errorDuringInit")) {
                        isRequestingAnimeEntries = false
                        requestAnimeEntriesTerminateTimeout = setTimeout(() => {
                            requestAnimeEntriesWorker?.terminate?.();
                        }, terminateDelay)
                        notifyUpdatedAnimeNotification()
                        dataStatus.set(null)
                        progress.set(100)
                        resolve(data)
                    } else if (hasOwnProp?.call?.(data, "notifyAddedEntries")) {
                        if (get(android) && window?.[".androidDataIsEvicted"] !== true) {
                            try {
                                let addedAnimeCount = data?.notifyAddedEntries
                                if (typeof addedAnimeCount !== "number" || isNaN(addedAnimeCount) || addedAnimeCount < 0) {
                                    addedAnimeCount = 0
                                }
                                let updatedAnimeCount = data?.notifyEditedEntries
                                if (typeof updatedAnimeCount !== "number" || isNaN(updatedAnimeCount) || updatedAnimeCount < 0) {
                                    updatedAnimeCount = 0
                                }
                                if (typeof addedAnimeCount === "number"
                                    && !isNaN(addedAnimeCount)
                                    && typeof updatedAnimeCount === "number"
                                    && !isNaN(updatedAnimeCount)
                                    && (
                                        addedAnimeCount > 0 ||
                                        updatedAnimeCount > 0
                                    )
                                ) {
                                    newAddedAnimeCount = addedAnimeCount
                                    newUpdatedAnimeCount = updatedAnimeCount
                                }
                            } catch (e) { }
                        }
                    } else {
                        if (data?.noEntriesFound) {
                            alertError()
                        } else if (data?.getEntries === true) {
                            isGettingNewEntries = true
                            stopConflictingWorkers({ isGettingNewEntries: true })
                            getAnimeEntries()
                                .then(() => {
                                    isGettingNewEntries = false
                                    runUpdate.update(e => !e)
                                })
                                .catch(() => {
                                    isGettingNewEntries = false
                                    runUpdate.update(e => !e)
                                }).finally(() => {
                                    isGettingNewEntries = false
                                    updateRecommendationList.update(e => !e)
                                })
                        } else {
                            window.alreadyShownNoNetworkAlert = false
                        }
                        isRequestingAnimeEntries = false
                        requestAnimeEntriesTerminateTimeout = setTimeout(() => {
                            requestAnimeEntriesWorker?.terminate?.();
                        }, terminateDelay)
                        notifyUpdatedAnimeNotification()
                        dataStatus.set(null)
                        progress.set(100)
                        resolve(data)
                    }
                }
                requestAnimeEntriesWorker.onerror = (error) => {
                    isRequestingAnimeEntries = false
                    isGettingNewEntries = false
                    notifyUpdatedAnimeNotification()
                    dataStatus.set(null)
                    progress.set(100)
                    reject(error)
                }
            }).catch((error) => {
                isRequestingAnimeEntries = false
                isGettingNewEntries = false
                notifyUpdatedAnimeNotification()
                dataStatus.set(null)
                progress.set(100)
                alertError()
                reject(error)
            })
    })
}
let isRequestingNewUser
let requestUserEntriesTerminateTimeout, requestUserEntriesWorker;
const requestUserEntries = (_data = {}) => {
    return new Promise((resolve, reject) => {
        if (_data?.username) {
            isRequestingNewUser = true
        } else if (isRequestingNewUser) {
            return
        }
        if (requestUserEntriesTerminateTimeout) clearTimeout(requestUserEntriesTerminateTimeout)
        requestUserEntriesWorker?.terminate?.()
        requestUserEntriesWorker = null
        if (!get(initData)) {
            if (isExporting
                || isImporting
                || isGettingNewEntries
            ) {
                isRequestingNewUser = false
                userRequestIsRunning.set(false)
                reject()
                return
            }
        }
        userRequestIsRunning.set(true)
        progress.set(0)
        cacheRequest("./webapi/worker/requestUserEntries.js")
            .then(url => {
                if (requestUserEntriesTerminateTimeout) clearTimeout(requestUserEntriesTerminateTimeout)
                requestUserEntriesWorker?.terminate?.()
                requestUserEntriesWorker = null
                requestUserEntriesWorker = new Worker(url)
                userRequestIsRunning.set(true)
                _data.windowHREF = windowHREF || window?.location?.href
                requestUserEntriesWorker.postMessage(_data)
                requestUserEntriesWorker.onmessage = ({ data }) => {
                    if (hasOwnProp?.call?.(data, "progress")) {
                        if (!dataStatusPrio && data?.progress >= 0 && data?.progress <= 100) {
                            progress.set(data.progress)
                        }
                        return
                    } else if (hasOwnProp?.call?.(data, "status")) {
                        if (!dataStatusPrio) {
                            dataStatus.set(data.status)
                        }
                        return
                    }

                    if (hasOwnProp?.call?.(data, "error")) {
                        isRequestingNewUser = false
                        if (!window.alreadyShownNoNetworkAlert) {
                            window.alreadyShownNoNetworkAlert = true
                            window.confirmPromise?.({
                                isAlert: true,
                                text: "Failed retrieval, " + (data?.error?.toLowerCase?.() || "please try again") + ".",
                            })
                        }
                        userRequestIsRunning.set(false)
                        loadAnime.update((e) => !e)
                        requestUserEntriesTerminateTimeout = setTimeout(() => {
                            requestUserEntriesWorker?.terminate?.();
                        }, terminateDelay)
                        dataStatus.set(null)
                        progress.set(100)
                        resetTypedUsername.update(e => !e)
                        reject(data)
                    } else if (hasOwnProp?.call?.(data, "updateRecommendationList")) {
                        if (get(android)) {
                            window.KanshiBackgroundShouldProcessRecommendation = window.shouldUpdateNotifications = true
                        }
                        updateRecommendationList.update(e => !e)
                    } else {
                        isRequestingNewUser = false
                        window.alreadyShownNoNetworkAlert = false
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
                    isRequestingNewUser = false
                    userRequestIsRunning.set(false)
                    loadAnime.update((e) => !e)
                    requestUserEntriesTerminateTimeout = setTimeout(() => {
                        requestUserEntriesWorker?.terminate?.();
                    }, terminateDelay)
                    dataStatus.set(null)
                    progress.set(100)
                    resetTypedUsername.update(e => !e)
                    reject(error)
                }
            }).catch((error) => {
                isRequestingNewUser = false
                userRequestIsRunning.set(false)
                dataStatus.set(null)
                progress.set(100)
                loadAnime.update((e) => !e)
                alertError()
                resetTypedUsername.update(e => !e)
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
    return new Promise((resolve, reject) => {
        exportUserDataWorker?.terminate?.()
        exportUserDataWorker = null
        if (!get(initData)) {
            if (isImporting || isGettingNewEntries) return
            isExporting = true
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
                exportUserDataWorker = null
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
                        isExporting = false
                        waitForExportApproval?.reject?.()
                        waitForExportApproval = null
                        if (data?.missingData) {
                            window.confirmPromise?.({
                                isAlert: true,
                                title: "Export failed",
                                text: "Data was not exported, incomplete data.",
                            })
                        } else {
                            window.confirmPromise?.({
                                isAlert: true,
                                title: "Export failed",
                                text: "Data was not exported, something went wrong.",
                            })
                        }
                        updateRecommendationList.update(e => !e)
                        reject()
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
                                isExporting = false
                                exportUserDataWorker?.terminate?.();
                                new Promise((resolve, reject) => {
                                    waitForExportApproval = { resolve, reject }
                                }).catch(() => {
                                    waitForExportApproval?.reject?.()
                                }).finally(() => {
                                    waitForExportApproval = null
                                    dataStatus.set(null)
                                    progress.set(100)
                                    showToast("Data has been Exported")
                                    updateRecommendationList.update(e => !e)
                                    resolve()
                                })
                            } else {
                                dataStatusPrio = false
                                isExporting = false
                                exportUserDataWorker?.terminate?.();
                                waitForExportApproval?.reject?.()
                                waitForExportApproval = null
                                window.confirmPromise?.({
                                    isAlert: true,
                                    title: "Export failed",
                                    text: "Data was not exported, please try again.",
                                })
                                dataStatus.set(null)
                                progress.set(100)
                                updateRecommendationList.update(e => !e)
                                reject()
                            }
                        } catch (e) {
                            dataStatusPrio = false
                            isExporting = false
                            exportUserDataWorker?.terminate?.();
                            waitForExportApproval?.reject?.()
                            waitForExportApproval = null
                            window.confirmPromise?.({
                                isAlert: true,
                                title: "Export failed",
                                text: "Data was not exported, please try again.",
                            })
                            dataStatus.set(null)
                            progress.set(100)
                            updateRecommendationList.update(e => !e)
                            reject()
                        }
                    } else if (typeof data?.url === "string" && data?.url !== "") {
                        dataStatusPrio = false
                        dataStatus.set(null)
                        progress.set(100)
                        downloadLink(data.url, `Kanshi.${data?.username?.toLowerCase?.() || "backup"}.json`)
                        isExporting = false
                        updateRecommendationList.update(e => !e)
                        resolve()
                        // dont terminate, can't oversee blob link lifetime
                    } else {
                        dataStatusPrio = false
                        exportUserDataWorker?.terminate?.();
                        window.confirmPromise?.({
                            isAlert: true,
                            title: "Export failed",
                            text: "Data was not exported, please try again.",
                        })
                        dataStatus.set(null)
                        progress.set(100)
                        isExporting = false
                        updateRecommendationList.update(e => !e)
                        reject()
                    }
                }
                exportUserDataWorker.onerror = (error) => {
                    dataStatusPrio = false
                    dataStatus.set(null)
                    progress.set(100)
                    isExporting = false
                    waitForExportApproval?.reject?.()
                    waitForExportApproval = null
                    window.confirmPromise?.({
                        isAlert: true,
                        title: "Export failed",
                        text: "Data was not exported, please try again.",
                    })
                    updateRecommendationList.update(e => !e)
                    reject(error)
                }
            }).catch((error) => {
                dataStatusPrio = false
                dataStatus.set(null)
                progress.set(100)
                isExporting = false
                waitForExportApproval?.reject?.()
                waitForExportApproval = null
                alertError()
                updateRecommendationList.update(e => !e)
                reject(error)
            })
    })
}

let importUserDataTerminateTimeout, importUserDataWorker;
const importUserData = (_data) => {
    return new Promise((resolve, reject) => {
        if (importUserDataTerminateTimeout) clearTimeout(importUserDataTerminateTimeout)
        importUserDataWorker?.terminate?.()
        importUserDataWorker = null
        if (!get(initData)) {
            if (isExporting || isGettingNewEntries) return
            isImporting = true
            animeManagerWorker?.terminate?.()
            animeManagerWorker = null
            showLoadingAnime.set(false)
            stopConflictingWorkers({ isImporting: true })
        }
        progress.set(0)
        resetProgress.update((e) => !e);
        cacheRequest("./webapi/worker/importUserData.js")
            .then(url => {
                if (importUserDataTerminateTimeout) clearTimeout(importUserDataTerminateTimeout)
                importUserDataWorker?.terminate?.()
                importUserDataWorker = null
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
                        isImporting = false
                        animeManager({ updateRecommendedAnimeList: true });
                        window.confirmPromise?.({
                            isAlert: true,
                            title: "Import failed",
                            text: "File was not imported, please ensure that file is in a supported format (e.g., .json).",
                        })
                        dataStatus.set(null)
                        progress.set(100)
                        updateRecommendationList.update(e => !e)
                        reject(data?.error || "Something went wrong")
                    } else if (hasOwnProp?.call?.(data, "importedUsername")) {
                        if (typeof data?.importedUsername === "string") {
                            setLocalStorage("username", data.importedUsername).catch(() => {
                                removeLocalStorage("username");
                            });
                            username.set(data.importedUsername)
                        }
                    } else if (hasOwnProp?.call?.(data, "importedHiddenEntries")) {
                        if (isJsonObject(data?.importedHiddenEntries)) {
                            hiddenEntries.set(data?.importedHiddenEntries)
                        }
                    } else if (hasOwnProp?.call?.(data, "animeCautions")) {
                        if (data?.animeCautions instanceof Array && data?.animeCautions?.length > 0) {
                            animeCautions.set(data?.animeCautions)
                        }
                    } else if (hasOwnProp?.call?.(data, "algorithmFilters")) {
                        if (data?.algorithmFilters instanceof Array && data?.algorithmFilters?.length > 0) {
                            algorithmFilters.set(data?.algorithmFilters)
                        }
                    } else {
                        window[".androidDataIsEvicted"] = false
                        if (get(android)) {
                            window.shouldUpdateNotifications = true
                        }
                        dataStatusPrio = false
                        processRecommendedAnimeList({ isImporting: true })
                            .finally(() => {
                                animeLoader({ loadInit: true })
                                    .finally(() => {
                                        isImporting = false
                                        dataStatus.set(null)
                                        progress.set(100)
                                        if (get(android)) {
                                            showToast("Data has been Imported")
                                        }
                                        runUpdate.update(e => !e)
                                    })
                            })
                        importUserDataTerminateTimeout = setTimeout(() => {
                            importUserDataWorker?.terminate?.();
                        }, terminateDelay)
                        resolve(data)
                    }
                }
                importUserDataWorker.onerror = (error) => {
                    dataStatusPrio = false
                    isImporting = false
                    window.confirmPromise?.({
                        isAlert: true,
                        title: "Import failed",
                        text: "File was not imported, please ensure that file is in a supported format (e.g., .json).",
                    })
                    loadAnime.update((e) => !e)
                    dataStatus.set(null)
                    progress.set(100)
                    updateRecommendationList.update(e => !e)
                    reject(error || "Something went wrong")
                }
            }).catch((error) => {
                dataStatusPrio = false
                isImporting = false
                loadAnime.update((e) => !e)
                dataStatus.set(null)
                progress.set(100)
                alertError()
                updateRecommendationList.update(e => !e)
                reject(error)
            })
    })
}

let gotAround, nextInfoCheck = -1, getExtraInfoTimeout, getExtraInfoWorker
const waitForExtraInfo = () => {
    clearTimeout(getExtraInfoTimeout)
    getExtraInfoTimeout = setTimeout(() => {
        if (get(isLoadingAnime) || get(isProcessingList)) {
            return waitForExtraInfo()
        } else {
            return getExtraInfo()
        }
    }, 1000 * 30)
}
const getExtraInfo = () => {
    return new Promise((resolve, reject) => {
        if (get(initData)) return
        loadingDataStatus.set(true)
        clearTimeout(getExtraInfoTimeout)
        getExtraInfoWorker?.terminate?.()
        getExtraInfoWorker = null
        cacheRequest("./webapi/worker/getExtraInfo.js")
            .then(url => {
                clearTimeout(getExtraInfoTimeout)
                getExtraInfoWorker?.terminate?.()
                getExtraInfoWorker = null
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
                    reject(error)
                }
            }).catch((error) => {
                alertError()
                reject(error)
            })
    })
}

// IndexedDB
const getIDBdata = (name) => {
    return new Promise((resolve, reject) => {
        cacheRequest("./webapi/worker/getIDBdata.js", 2876, "Retrieving Some Data")
            .then(url => {
                let worker = new Worker(url)
                worker.postMessage({ name })
                worker.onmessage = ({ data }) => {
                    worker?.terminate?.()
                    if (hasOwnProp?.call?.(data || {}, "Failed to retrieve the data")) {
                        reject(data?.["Failed to retrieve the data"] || "Failed to retrieve the data")
                    } else {
                        resolve(data)
                    }
                }
                worker.onerror = (error) => {
                    worker?.terminate?.()
                    alertError()
                    reject(error)
                }
            }).catch((error) => {
                alertError()
                reject(error)
            })
    })
}
window.updateNotifications = async (aniIdsNotificationToBeUpdated = []) => {
    if (!get(android)) return
    new Promise((resolve, reject) => {
        cacheRequest("./webapi/worker/getIDBdata.js", 2876, "Retrieving Some Data")
            .then(url => {
                let worker = new Worker(url)
                worker.postMessage({ name: "aniIdsNotificationToBeUpdated", aniIdsNotificationToBeUpdated })
                worker.onmessage = ({ data }) => {
                    worker?.terminate?.()
                    if (hasOwnProp?.call?.(data || {}, "Failed to retrieve the data")) {
                        reject(data?.["Failed to retrieve the data"] || "Failed to retrieve the data")
                    } else {
                        resolve(data)
                    }
                }
                worker.onerror = (error) => {
                    reject(error)
                }
            }).catch((error) => {
                alertError()
                reject(error)
            })
    }).then((updatedAniIdsNotification = {}) => {
        try {
            for (let animeId in updatedAniIdsNotification) {
                let anime = updatedAniIdsNotification[animeId]
                animeId = parseInt(animeId)
                if (typeof animeId === "number"
                    && typeof anime?.title === "string"
                    && typeof anime?.maxEpisode === "number"
                    && typeof anime?.animeUrl === "string"
                    && typeof anime?.userStatus === "string"
                    && typeof anime?.episodeProgress === "number"
                ) {
                    JSBridge?.updateNotifications?.(
                        animeId,
                        anime?.title,
                        anime?.maxEpisode,
                        anime?.animeUrl,
                        anime?.userStatus,
                        anime?.episodeProgress
                    )
                }
            }
        } catch (ex) { }
    })
}

const saveIDBdata = (_data, name, isImportant = false) => {
    return new Promise((resolve, reject) => {
        if (!get(android) || isImportant || !get(isBackgroundUpdateKey) || window?.[get(isBackgroundUpdateKey)] !== true) {
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
                            reject(data.error)
                        } else {
                            resolve()
                        }
                    }
                    worker.onerror = (error) => {
                        reject(error)
                    }
                    worker.postMessage({ data: _data, name: name })
                }).catch((error) => {
                    alertError()
                    reject(error)
                })
        }
    })
}

// One Time Use
const getAnimeEntries = (_data) => {
    return new Promise((resolve, reject) => {
        progress.set(0)
        cacheRequest("./webapi/worker/getEntries.js")
            .then(workerUrl => {
                let worker = new Worker(workerUrl)
                windowHREF = windowHREF || window?.location?.href
                worker.postMessage({ windowHREF, android: get(android), appID: get(appID) })
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
                        console.error(data?.error)
                        reject(data?.error)
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
                    reject(error)
                }
            }).catch((error) => {
                dataStatusPrio = false
                dataStatus.set(null)
                progress.set(100)
                alertError()
                updateRecommendationList.update(e => !e)
                reject(error)
            })
    })
}

let getFilterOptionsTerminateTimeout, getFilterOptionsWorker;
const getFilterOptions = (_data) => {
    return new Promise((resolve, reject) => {
        if (getFilterOptionsTerminateTimeout) clearTimeout(getFilterOptionsTerminateTimeout)
        getFilterOptionsWorker?.terminate?.()
        getFilterOptionsWorker = null
        cacheRequest("./webapi/worker/getFilterOptions.js", 60178, "Initializing Filters")
            .then(url => {
                if (getFilterOptionsTerminateTimeout) clearTimeout(getFilterOptionsTerminateTimeout)
                getFilterOptionsWorker?.terminate?.()
                getFilterOptionsWorker = null
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
                        reject(data.error)
                    } else if (hasOwnProp?.call?.(data, "tagInfo")) {
                        if (isJsonObject(data?.tagInfo) && !jsonIsEmpty(data?.tagInfo)) {
                            tagInfo.set(data.tagInfo)
                        }
                    } else {
                        dataStatusPrio = false
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
                    reject(error)
                }
            }).catch((error) => {
                dataStatusPrio = false
                dataStatus.set(null)
                alertError()
                reject(error)
            })
    })
}

function stopConflictingWorkers(blocker) {
    dataStatusPrio = false
    progress.set(0)
    requestAnimeEntriesWorker?.terminate?.()
    notifyUpdatedAnimeNotification()
    isRequestingAnimeEntries = false
    isGettingNewEntries = blocker?.isGettingNewEntries ?? false
    requestUserEntriesWorker?.terminate?.()
    isRequestingNewUser = false
    resetTypedUsername.update(e => !e)
    userRequestIsRunning.set(false)
    processRecommendedAnimeListWorker?.terminate?.()
    isProcessingList.set(false)
    showLoadingAnime.set(false)
    importUserDataWorker?.terminate?.()
    isImporting = blocker?.isImporting ?? false
    exportUserDataWorker?.terminate?.()
    isExporting = blocker?.isExporting ?? false
    getFilterOptionsWorker?.terminate?.()
    dataStatus.set(null)
}

function alertError() {
    if (get(android)) {
        window.confirmPromise?.({
            isAlert: true,
            title: "Something went wrong",
            text: "App may not be working properly, clear cache and make sure you're running the latest version.",
        })
    } else {
        window.confirmPromise?.({
            isAlert: true,
            title: "Something went wrong",
            text: "App may not be working properly, clear cache and make sure you're not running in incognito.",
        })
    }
}

export {
    saveIDBdata,
    getIDBdata,
    getAnimeEntries,
    getFilterOptions,
    requestAnimeEntries,
    requestUserEntries,
    exportUserData,
    importUserData,
    processRecommendedAnimeList,
    animeManager,
    animeLoader,
    getExtraInfo
}
