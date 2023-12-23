import {
    dataStatus,
    updateRecommendationList,
    username,
    activeTagFilters,
    selectedCustomFilter,
    filterOptions,
    lastRunnedAutoUpdateDate,
    lastRunnedAutoExportDate,
    hiddenEntries,
    runUpdate,
    importantUpdate,
    loadAnime,
    initData,
    userRequestIsRunning,
    isImporting,
    progress,
    android,
    listUpdateAvailable,
    searchedAnimeKeyword,
    loadingFilterOptions,
    extraInfo,
    currentExtraInfo,
    finalAnimeList,
    isLoadingAnime,
    isProcessingList,
    loadingDataStatus
} from "./globalValues";
import { get } from "svelte/store";
import { downloadLink, isJsonObject, removeLocalStorage, setLocalStorage } from "../js/others/helper.js"
import { cacheRequest } from "./caching";

let terminateDelay = 1000;
let dataStatusPrio = false
let isExporting = false;
let isCurrentlyImporting = false;
let isGettingNewEntries = false;

let passedFilterOptions, passedActiveTagFilters, passedSelectedCustomFilter

window.refreshAnimeList = () => {
    let $isAndroid = get(android)
    if ($isAndroid && get(username)) {
        try {
            JSBridge?.callUpdateNotifications?.();
        } catch (e) { }
    }
    document.querySelectorAll("script")?.forEach((script) => {
        if (
            script.src &&
            script.src !== "https://www.youtube.com/iframe_api?v=16"
        ) {
            script.src = script.src;
        }
    });
    document.querySelectorAll("img")?.forEach((image) => {
        if (!image.naturalHeight) {
            image.src = image.src;
        }
    });
    if (get(initData) || !navigator.onLine) {
        if ($isAndroid) {
            try {
                JSBridge?.listRefreshed?.();
            } catch (e) { }
        }
        return
    }
    window.isRefreshingList = true
    window.reloadYoutube?.();
    if (!get(userRequestIsRunning)) {
        requestUserEntries()
            .then(() => {
                requestAnimeEntries()
            })
    } else {
        requestAnimeEntries()
    }
}

// Reactinve Functions
let animeLoaderWorker;
const animeLoader = (_data = {}) => {
    return new Promise((resolve, reject) => {
        if (animeLoaderWorker) {
            animeLoaderWorker?.terminate?.()
            animeLoaderWorker = null
        }
        finalAnimeList.update((e) => e?.map?.((anime) => {
            anime.isLoading = true;
            return anime;
        }));
        dataStatusPrio = true
        progress.set(0)
        cacheRequest("./webapi/worker/animeLoader.js")
            .then(url => {
                if (animeLoaderWorker) {
                    animeLoaderWorker?.terminate?.()
                    animeLoaderWorker = null
                }
                if (_data?.filterOptions && _data?.activeTagFilters && _data?.selectedCustomFilter) {
                    passedFilterOptions = _data?.filterOptions
                    passedSelectedCustomFilter = _data?.selectedCustomFilter
                    passedActiveTagFilters = _data?.activeTagFilters
                } else if (passedFilterOptions && passedActiveTagFilters && passedSelectedCustomFilter) {
                    _data.filterOptions = passedFilterOptions
                    _data.selectedCustomFilter = passedSelectedCustomFilter
                    _data.activeTagFilters = passedActiveTagFilters
                }
                isLoadingAnime.set(true)
                animeLoaderWorker = new Worker(url)
                _data.reloadedFilterKeyword = get(searchedAnimeKeyword) || ""
                animeLoaderWorker.postMessage(_data)
                animeLoaderWorker.onmessage = ({ data }) => {
                    if (data?.hasOwnProperty("progress")) {
                        if (data?.progress >= 0 && data?.progress <= 100) {
                            progress.set(data.progress)
                        }
                    } else if (data?.hasOwnProperty("status")) {
                        dataStatusPrio = true
                        dataStatus.set(data.status)
                    } else if (data?.filterOptions && typeof data?.selectedCustomFilter === "string") {
                        setLocalStorage("selectedCustomFilter", data?.selectedCustomFilter).catch(() => {
                            removeLocalStorage("selectedCustomFilter")
                        })
                        filterOptions.set(data.filterOptions)
                        loadingFilterOptions.set(false)
                    } else if (typeof data?.changedCustomFilter === "string" && data?.changedCustomFilter) {
                        selectedCustomFilter.set(data.changedCustomFilter)
                    } else if (data?.isNew) {
                        if (data?.hasPassedFilters === true) {
                            passedFilterOptions = passedSelectedCustomFilter = passedActiveTagFilters = undefined
                        }
                        dataStatusPrio = false
                        if (!animeLoaderWorker) return
                        animeLoaderWorker.onmessage = null
                        isLoadingAnime.set(false)
                        listUpdateAvailable.set(false)
                        loadingFilterOptions.set(false)
                        progress.set(100)
                        data.animeLoaderWorker = animeLoaderWorker
                        resolve(data)
                    }
                }
                animeLoaderWorker.onerror = (error) => {
                    finalAnimeList.update((e) => e?.map?.((anime) => {
                        anime.isLoading = false;
                        return anime;
                    }))
                    isLoadingAnime.set(false)
                    progress.set(100)
                    reject(error)
                }
            })
            .catch((error) => {
                finalAnimeList.update((e) => e?.map?.((anime) => {
                    anime.isLoading = false;
                    return anime;
                }))
                isLoadingAnime.set(false)
                progress.set(100)
                alertError()
                reject(error)
            })
    }).finally(() => {
        if (get(android) && window?.isRefreshingList) {
            window.isRefreshingList = false;
            try {
                JSBridge?.listRefreshed?.();
            } catch (e) { }
        }
    })
}
let processRecommendedAnimeListTerminateTimeout;
let processRecommendedAnimeListWorker;
const processRecommendedAnimeList = (_data = {}) => {
    return new Promise((resolve, reject) => {
        if (processRecommendedAnimeListTerminateTimeout) clearTimeout(processRecommendedAnimeListTerminateTimeout);
        if (processRecommendedAnimeListWorker) {
            processRecommendedAnimeListWorker?.terminate?.();
            processRecommendedAnimeListWorker = null
        }
        dataStatusPrio = true
        progress.set(0)
        cacheRequest("./webapi/worker/processRecommendedAnimeList.js")
            .then(url => {
                if (processRecommendedAnimeListTerminateTimeout) clearTimeout(processRecommendedAnimeListTerminateTimeout);
                if (processRecommendedAnimeListWorker) {
                    processRecommendedAnimeListWorker?.terminate?.();
                    processRecommendedAnimeListWorker = null
                }
                if (_data?.filterOptions && _data?.activeTagFilters) {
                    passedFilterOptions = _data?.filterOptions
                    passedActiveTagFilters = _data?.activeTagFilters
                    _data.hasPassedFilters = true;
                } else if (passedFilterOptions && passedActiveTagFilters) {
                    _data.filterOptions = passedFilterOptions
                    _data.activeTagFilters = passedActiveTagFilters
                    _data.hasPassedFilters = true;
                }
                isProcessingList.set(true)
                processRecommendedAnimeListWorker = new Worker(url);
                processRecommendedAnimeListWorker.postMessage(_data);
                processRecommendedAnimeListWorker.onmessage = ({ data }) => {
                    if (data?.hasOwnProperty("progress")) {
                        if (data?.progress >= 0 && data?.progress <= 100) {
                            progress.set(data.progress)
                        }
                    } else if (data?.hasOwnProperty("status")) {
                        dataStatusPrio = true
                        dataStatus.set(data.status);
                    } else if (data?.animeReleaseNotification) {
                        if (get(android)) {
                            try {
                                let aniReleaseNotif = data?.animeReleaseNotification
                                if (
                                    typeof aniReleaseNotif?.releaseEpisodes === "number"
                                    && typeof aniReleaseNotif?.releaseDateMillis === "number"
                                    && typeof aniReleaseNotif?.maxEpisode === "number"
                                    && typeof aniReleaseNotif?.title === "string"
                                    && typeof aniReleaseNotif?.id === "number"
                                    && typeof aniReleaseNotif?.isMyAnime === "boolean"
                                    && typeof aniReleaseNotif?.imageURL === "string"
                                ) {
                                    JSBridge?.addAnimeReleaseNotification?.(
                                        aniReleaseNotif.id,
                                        aniReleaseNotif.title,
                                        aniReleaseNotif.releaseEpisodes,
                                        aniReleaseNotif.maxEpisode,
                                        aniReleaseNotif.releaseDateMillis,
                                        aniReleaseNotif?.imageURL,
                                        aniReleaseNotif.isMyAnime
                                    )
                                }
                            } catch (e) { }
                        }
                    } else {
                        if (window?.shouldUpdateNotifications === true && get(android)) {
                            window.shouldUpdateNotifications = false
                            if (get(username)) {
                                try {
                                    JSBridge?.callUpdateNotifications?.()
                                } catch (e) { }
                            }
                        }
                        if (data?.hasPassedFilters === true) {
                            passedFilterOptions = passedActiveTagFilters = undefined
                        }
                        dataStatusPrio = false
                        processRecommendedAnimeListTerminateTimeout = setTimeout(() => {
                            processRecommendedAnimeListWorker?.terminate?.();
                        }, terminateDelay);
                        isProcessingList.set(false)
                        progress.set(100)
                        resolve()
                    }
                };
                processRecommendedAnimeListWorker.onerror = (error) => {
                    isProcessingList.set(false)
                    progress.set(100)
                    reject(error);
                };
            }).catch((error) => {
                isProcessingList.set(false)
                progress.set(100)
                alertError()
                reject(error)
            })
    });
};
let requestAnimeEntriesTerminateTimeout, requestAnimeEntriesWorker;
function sendAnimeListProcess(minimizeTransaction) {
    if (requestAnimeEntriesWorker instanceof Worker) {
        requestAnimeEntriesWorker?.postMessage?.({ minimizeTransaction })
    }
}
isLoadingAnime.subscribe((val) => {
    sendAnimeListProcess(val)
})
isProcessingList.subscribe((val) => {
    if (val === true) {
        sendAnimeListProcess(val)
    }
})
const requestAnimeEntries = (_data) => {
    return new Promise((resolve, reject) => {
        if (requestAnimeEntriesTerminateTimeout) clearTimeout(requestAnimeEntriesTerminateTimeout)
        if (requestAnimeEntriesWorker) {
            requestAnimeEntriesWorker?.terminate?.()
            requestAnimeEntriesWorker = null
        }
        if (!get(initData)) {
            if (isGettingNewEntries
                || isCurrentlyImporting
                || isExporting
                || get(isImporting)
            ) resolve()
        }
        progress.set(0)
        cacheRequest("./webapi/worker/requestAnimeEntries.js")
            .then(url => {
                if (requestAnimeEntriesTerminateTimeout) clearTimeout(requestAnimeEntriesTerminateTimeout)
                if (requestAnimeEntriesWorker) {
                    requestAnimeEntriesWorker?.terminate?.()
                    requestAnimeEntriesWorker = null
                }
                requestAnimeEntriesWorker = new Worker(url)
                requestAnimeEntriesWorker.postMessage(_data)
                requestAnimeEntriesWorker.onmessage = ({ data }) => {
                    if (data?.hasOwnProperty("progress")) {
                        if (!dataStatusPrio && data?.progress >= 0 && data?.progress <= 100) {
                            progress.set(data.progress)
                        }
                    } else if (data?.hasOwnProperty("status")) {
                        if (!dataStatusPrio) {
                            dataStatus.set(data.status)
                        }
                    } else if (data?.updateRecommendationList !== undefined) {
                        updateRecommendationList.update(e => !e)
                    } else if (data?.lastRunnedAutoUpdateDate instanceof Date && !isNaN(data?.lastRunnedAutoUpdateDate)) {
                        lastRunnedAutoUpdateDate.set(data.lastRunnedAutoUpdateDate)
                    } else if (data?.errorDuringInit !== undefined) {
                        resolve(data)
                    } else {
                        if (data.getEntries) {
                            isGettingNewEntries = true
                            stopConflictingWorkers({ isGettingNewEntries: true })
                            getAnimeEntries()
                                .then(() => {
                                    isGettingNewEntries = false
                                    runUpdate.update(e => !e)
                                    updateRecommendationList.update(e => !e)
                                })
                                .catch(() => {
                                    isGettingNewEntries = false
                                    runUpdate.update(e => !e)
                                })
                        }
                        requestAnimeEntriesTerminateTimeout = setTimeout(() => {
                            requestAnimeEntriesWorker?.terminate?.();
                        }, terminateDelay)
                        progress.set(100)
                        resolve(data)
                    }
                }
                requestAnimeEntriesWorker.onerror = (error) => {
                    isGettingNewEntries = false
                    progress.set(100)
                    reject(error)
                }
            }).catch((error) => {
                isGettingNewEntries = false
                progress.set(100)
                alertError()
                reject(error)
            })
    })
}
let requestUserEntriesTerminateTimeout, requestUserEntriesWorker;
const requestUserEntries = (_data) => {
    return new Promise((resolve, reject) => {
        if (requestUserEntriesTerminateTimeout) clearTimeout(requestUserEntriesTerminateTimeout)
        if (requestUserEntriesWorker) {
            requestUserEntriesWorker?.terminate?.()
            requestUserEntriesWorker = null
        }
        if (!get(initData)) {
            if (isExporting
                || get(isImporting)
                || isCurrentlyImporting
                || isGettingNewEntries
            ) {
                userRequestIsRunning.set(false)
                reject()
            }
        }
        userRequestIsRunning.set(true)
        progress.set(0)
        cacheRequest("./webapi/worker/requestUserEntries.js")
            .then(url => {
                if (requestUserEntriesTerminateTimeout) clearTimeout(requestUserEntriesTerminateTimeout)
                if (requestUserEntriesWorker) {
                    requestUserEntriesWorker?.terminate?.()
                    requestUserEntriesWorker = null
                }
                requestUserEntriesWorker = new Worker(url)
                userRequestIsRunning.set(true)
                requestUserEntriesWorker.postMessage(_data)
                requestUserEntriesWorker.onmessage = ({ data }) => {
                    if (data?.hasOwnProperty("progress")) {
                        if (!dataStatusPrio && data?.progress >= 0 && data?.progress <= 100) {
                            progress.set(data.progress)
                        }
                    } else if (data?.hasOwnProperty("status")) {
                        if (!dataStatusPrio) {
                            dataStatus.set(data.status)
                            if (data.status === "User not found") {
                                userRequestIsRunning.set(false)
                                loadAnime.update((e) => !e)
                                window.confirmPromise({
                                    isAlert: true,
                                    text: "User was not found, please try again.",
                                })
                                requestUserEntriesTerminateTimeout = setTimeout(() => {
                                    requestUserEntriesWorker?.terminate?.();
                                }, terminateDelay)
                                progress.set(100)
                                reject(data)
                            }
                        }
                    } else if (data?.error) {
                        userRequestIsRunning.set(false)
                        loadAnime.update((e) => !e)
                        requestUserEntriesTerminateTimeout = setTimeout(() => {
                            requestUserEntriesWorker?.terminate?.();
                        }, terminateDelay)
                        progress.set(100)
                        reject(data)
                    } else if (data?.updateRecommendationList !== undefined) {
                        if (get(android)) {
                            window.shouldUpdateNotifications = true
                        }
                        updateRecommendationList.update(e => !e)
                    } else {
                        userRequestIsRunning.set(false)
                        requestUserEntriesTerminateTimeout = setTimeout(() => {
                            requestUserEntriesWorker?.terminate?.();
                        }, terminateDelay)
                        progress.set(100)
                        resolve(data)
                    }
                }
                requestUserEntriesWorker.onerror = (error) => {
                    userRequestIsRunning.set(false)
                    loadAnime.update((e) => !e)
                    requestUserEntriesTerminateTimeout = setTimeout(() => {
                        requestUserEntriesWorker?.terminate?.();
                    }, terminateDelay)
                    progress.set(100)
                    reject(error)
                }
            }).catch((error) => {
                userRequestIsRunning.set(false)
                progress.set(100)
                loadAnime.update((e) => !e)
                alertError()
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
        if (exportUserDataWorker) {
            exportUserDataWorker?.terminate?.()
            exportUserDataWorker = null
        }
        if (!get(initData)) {
            if (get(isImporting) || isCurrentlyImporting || isGettingNewEntries) return
            isExporting = true
            stopConflictingWorkers({ isExporting: true })
        }
        waitForExportApproval?.reject?.()
        waitForExportApproval = null
        progress.set(0)
        cacheRequest("./webapi/worker/exportUserData.js")
            .then(url => {
                waitForExportApproval?.reject?.()
                waitForExportApproval = null
                if (exportUserDataWorker) {
                    exportUserDataWorker?.terminate?.()
                    exportUserDataWorker = null
                }
                exportUserDataWorker = new Worker(url)
                if (get(android)) {
                    exportUserDataWorker.postMessage('android')
                } else {
                    exportUserDataWorker.postMessage('browser')
                }
                exportUserDataWorker.onmessage = ({ data }) => {
                    if (data?.hasOwnProperty("progress")) {
                        if (data?.progress >= 0 && data?.progress <= 100) {
                            progress.set(data.progress)
                        }
                    } else if (data?.hasOwnProperty("status")) {
                        dataStatusPrio = true
                        dataStatus.set(data.status)
                    } else if (get(android)) {
                        try {
                            dataStatusPrio = false
                            let chunk = data.chunk
                            let state = data.state
                            // 0 - start | 1 - ongoing | 2 - done
                            if (state === 0) {
                                JSBridge.exportJSON('', 0, '')
                            } else if (state === 1) {
                                JSBridge.exportJSON(chunk, 1, '')
                            } else if (state === 2) {
                                let username = data.username ?? null
                                JSBridge.exportJSON(chunk, 2, `Kanshi.${username?.toLowerCase() || "Backup"}.json`)
                                isExporting = false
                                exportUserDataWorker?.terminate?.();
                                new Promise((resolve, reject) => {
                                    waitForExportApproval = { resolve, reject }
                                }).catch(() => {
                                    waitForExportApproval?.reject?.()
                                }).finally(() => {
                                    waitForExportApproval = null
                                    progress.set(100)
                                    resolve(data)
                                })
                            }
                        } catch (e) {
                            isExporting = false
                            exportUserDataWorker?.terminate?.();
                            waitForExportApproval?.reject?.()
                            waitForExportApproval = null
                            progress.set(100)
                            resolve(data)
                        }
                    } else {
                        dataStatusPrio = false
                        let username = data.username ?? null
                        progress.set(100)
                        downloadLink(data.url, `Kanshi.${username?.toLowerCase() || "Backup"}.json`)
                        isExporting = false
                        resolve(data)
                        // dont terminate, can't oversee blob link lifetime
                    }
                }
                exportUserDataWorker.onerror = (error) => {
                    progress.set(100)
                    isExporting = false
                    waitForExportApproval?.reject?.()
                    waitForExportApproval = null
                    window.confirmPromise?.({
                        isAlert: true,
                        title: "Export failed",
                        text: "Data was not exported, please try again.",
                    })
                    reject(error)
                }
            }).catch((error) => {
                progress.set(100)
                isExporting = false
                waitForExportApproval?.reject?.()
                waitForExportApproval = null
                alertError()
                reject(error)
            })
    })
}
let importUserDataTerminateTimeout, importUserDataWorker;
const importUserData = (_data) => {
    return new Promise((resolve, reject) => {
        if (importUserDataTerminateTimeout) clearTimeout(importUserDataTerminateTimeout)
        if (importUserDataWorker) {
            importUserDataWorker?.terminate?.()
            importUserDataWorker = null
        }
        if (!get(initData)) {
            if (isExporting || isGettingNewEntries) return
            isCurrentlyImporting = true
            isImporting.set(true)
            stopConflictingWorkers({ isImporting: true })
        }
        progress.set(0)
        cacheRequest("./webapi/worker/importUserData.js")
            .then(url => {
                if (importUserDataTerminateTimeout) clearTimeout(importUserDataTerminateTimeout)
                if (importUserDataWorker) {
                    importUserDataWorker?.terminate?.()
                    importUserDataWorker = null
                }
                importUserDataWorker = new Worker(url)
                importUserDataWorker.postMessage(_data)
                importUserDataWorker.onmessage = ({ data }) => {
                    if (data?.hasOwnProperty("progress")) {
                        if (data?.progress >= 0 && data?.progress <= 100) {
                            progress.set(data.progress)
                        }
                    } else if (data?.error !== undefined) {
                        dataStatusPrio = false
                        isImporting.set(false)
                        isCurrentlyImporting = false
                        loadAnime.update((e) => !e)
                        window.confirmPromise?.({
                            isAlert: true,
                            title: "Import failed",
                            text: "File was not imported, please ensure that file is in a supported format (e.g., .json).",
                        })
                        progress.set(100)
                        reject(data?.error || "Something went wrong")
                    } else if (data?.hasOwnProperty("status")) {
                        dataStatusPrio = true
                        dataStatus.set(data.status)
                    } else if (typeof data?.importedUsername === "string") {
                        username.set(data.importedUsername)
                    } else if (isJsonObject(data?.importedHiddenEntries)) {
                        hiddenEntries.set(data?.importedHiddenEntries)
                    } else if (data?.importedlastRunnedAutoUpdateDate instanceof Date && !isNaN(data?.importedlastRunnedAutoUpdateDate)) {
                        lastRunnedAutoUpdateDate.set(data.importedlastRunnedAutoUpdateDate)
                    } else if (data?.importedlastRunnedAutoExportDate instanceof Date && !isNaN(data?.importedlastRunnedAutoExportDate)) {
                        lastRunnedAutoExportDate.set(data.importedlastRunnedAutoExportDate)
                    } else {
                        getFilterOptions()
                            .then((data) => {
                                selectedCustomFilter.set(data.selectedCustomFilter)
                                activeTagFilters.set(data.activeTagFilters)
                                filterOptions.set(data.filterOptions)
                                if (get(android)) {
                                    window.shouldUpdateNotifications = true
                                }
                                dataStatusPrio = false
                                isImporting.set(false)
                                isCurrentlyImporting = false
                                importantUpdate.update(e => !e)
                                runUpdate.update(e => !e)
                                importUserDataTerminateTimeout = setTimeout(() => {
                                    importUserDataWorker?.terminate?.();
                                }, terminateDelay)
                                progress.set(100)
                                resolve(data)
                            }).catch(() => {
                                dataStatusPrio = false
                                isImporting.set(false)
                                isCurrentlyImporting = false
                                progress.set(100)
                                importUserDataWorker?.terminate?.();
                            })
                    }
                }
                importUserDataWorker.onerror = (error) => {
                    dataStatusPrio = false
                    isImporting.set(false)
                    isCurrentlyImporting = false
                    window.confirmPromise?.({
                        isAlert: true,
                        title: "Import failed",
                        text: "File was not imported, please ensure that file is in a supported format (e.g., .json).",
                    })
                    loadAnime.update((e) => !e)
                    progress.set(100)
                    reject(error || "Something went wrong")
                }
            }).catch((error) => {
                dataStatusPrio = false
                isImporting.set(false)
                isCurrentlyImporting = false
                loadAnime.update((e) => !e)
                progress.set(100)
                alertError()
                reject(error)
            })
    })
}

let gotAround, gotAroundCont, nextInfoCheck = -1, getExtraInfoTimeout, getExtraInfoWorker
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
                        gotAroundCont = false
                        ++nextInfoCheck
                    } else {
                        gotAroundCont = true
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
            }).catch(() => {
                alertError()
                reject(error)
            })
    })
}

// IndexedDB
const getIDBdata = (name) => {
    return new Promise((resolve, reject) => {
        cacheRequest("./webapi/worker/getIDBdata.js")
            .then(url => {
                let worker = new Worker(url)
                worker.postMessage({ name })
                worker.onmessage = ({ data }) => {
                    if (data?.hasOwnProperty("status")) {
                        dataStatus.set(data.status)
                    } else {
                        worker?.terminate?.()
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
    })
}
window.updateNotifications = async (aniIdsNotificationToBeUpdated = []) => {
    if (!get(android)) return
    new Promise((resolve, reject) => {
        cacheRequest("./webapi/worker/getIDBdata.js")
            .then(url => {
                let worker = new Worker(url)
                worker.postMessage({ name: "aniIdsNotificationToBeUpdated", aniIdsNotificationToBeUpdated })
                worker.onmessage = ({ data }) => {
                    if (data?.hasOwnProperty("status")) {
                        dataStatus.set(data.status)
                    } else {
                        worker?.terminate?.()
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
    }).then((userAnimeAndNot = {}) => {
        try {
            for (let animeId in userAnimeAndNot) {
                let isMyAnime = userAnimeAndNot[animeId]
                animeId = parseInt(animeId)
                if (typeof animeId === "number" && !isNaN(animeId) && typeof isMyAnime === "boolean") {
                    JSBridge?.updateNotifications?.(animeId, isMyAnime)
                }
            }
        } catch (ex) { }
    })
}

const saveIDBdata = (_data, name) => {
    return new Promise((resolve, reject) => {
        cacheRequest("./webapi/worker/saveIDBdata.js")
            .then(url => {
                let worker = new Worker(url)
                worker.onmessage = ({ data }) => {
                    if (data?.hasOwnProperty("status")) {
                        dataStatus.set(data.status)
                    } else {
                        setTimeout(() => {
                            worker?.terminate?.();
                        }, terminateDelay)
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
    })
}

// One Time Use
let getAnimeEntriesTerminateTimeout, gettingAnimeEntriesInterval;
const getAnimeEntries = (_data) => {
    return new Promise((resolve, reject) => {
        gettingAnimeEntriesInterval = setInterval(() => {
            dataStatus.set("Getting Anime Entries")
        }, 300)
        progress.set(0)
        cacheRequest("./webapi/worker/getAnimeEntries.js")
            .then(url => {
                progress.set(25)
                if (gettingAnimeEntriesInterval) {
                    clearInterval(gettingAnimeEntriesInterval)
                    gettingAnimeEntriesInterval = null
                }
                if (getAnimeEntriesTerminateTimeout) clearTimeout(getAnimeEntriesTerminateTimeout)
                let worker = new Worker(url)
                worker.postMessage(_data)
                worker.onmessage = ({ data }) => {
                    if (data?.hasOwnProperty("status")) {
                        dataStatusPrio = true
                        dataStatus.set(data.status)
                    } else {
                        progress.set(100)
                        dataStatusPrio = false
                        updateRecommendationList.update(e => !e)
                        getAnimeEntriesTerminateTimeout = setTimeout(() => {
                            worker?.terminate?.();
                        }, terminateDelay)
                        resolve(data)
                    }
                }
                worker.onerror = (error) => {
                    progress.set(100)
                    reject(error)
                }
            }).catch((error) => {
                progress.set(100)
                if (gettingAnimeEntriesInterval) {
                    clearInterval(gettingAnimeEntriesInterval)
                    gettingAnimeEntriesInterval = null
                }
                dataStatus.set(null)
                alertError()
                reject(error)
            })
    })
}

let getFilterOptionsTerminateTimeout, getFilterOptionsInterval, getFilterOptionsWorker;
const getFilterOptions = (_data) => {
    return new Promise((resolve, reject) => {
        if (getFilterOptionsTerminateTimeout) clearTimeout(getFilterOptionsTerminateTimeout)
        if (getFilterOptionsWorker) {
            getFilterOptionsWorker?.terminate?.()
            getFilterOptionsWorker = null
        }
        getFilterOptionsInterval = setInterval(() => {
            if (!gettingAnimeEntriesInterval) {
                dataStatus.set("Getting Filters")
            }
        }, 300)
        cacheRequest("./webapi/worker/getFilterOptions.js")
            .then(url => {
                if (getFilterOptionsTerminateTimeout) clearTimeout(getFilterOptionsTerminateTimeout)
                if (getFilterOptionsWorker) {
                    getFilterOptionsWorker?.terminate?.()
                    getFilterOptionsWorker = null
                }
                if (getFilterOptionsInterval) {
                    clearInterval(getFilterOptionsInterval)
                    getFilterOptionsInterval = null
                }
                getFilterOptionsWorker = new Worker(url)
                getFilterOptionsWorker.postMessage(_data)
                getFilterOptionsWorker.onmessage = ({ data }) => {
                    if (data?.hasOwnProperty("status")) {
                        dataStatusPrio = true
                        dataStatus.set(data.status)
                    } else {
                        dataStatusPrio = false
                        getFilterOptionsTerminateTimeout = setTimeout(() => {
                            getFilterOptionsWorker?.terminate?.();
                        }, terminateDelay)
                        resolve(data)
                    }
                }
                getFilterOptionsWorker.onerror = (error) => {
                    reject(error)
                }
            }).catch((error) => {
                if (getFilterOptionsInterval) {
                    clearInterval(getFilterOptionsInterval)
                    getFilterOptionsInterval = null
                }
                dataStatus.set(null)
                alertError()
                reject(error)
            })
    })
}

function stopConflictingWorkers(blocker) {
    progress.set(0)
    requestAnimeEntriesWorker?.terminate?.()
    isGettingNewEntries = blocker?.isGettingNewEntries ?? false
    requestUserEntriesWorker?.terminate?.()
    userRequestIsRunning.set(false)
    importUserDataWorker?.terminate?.()
    isImporting.set(blocker?.isImporting ?? false)
    isCurrentlyImporting = blocker?.isImporting ?? false
    exportUserDataWorker?.terminate?.()
    isExporting = blocker?.isExporting ?? false
    getFilterOptionsWorker?.terminate?.()
    clearInterval(gettingAnimeEntriesInterval)
    gettingAnimeEntriesInterval = null
    clearInterval(getFilterOptionsInterval)
    getFilterOptionsInterval = null
    dataStatus.set(null)
}

function alertError() {
    if (get(android)) {
        window.confirmPromise?.({
            isAlert: true,
            title: "Something went wrong",
            text: "App may not be working properly, you may want to restart and make sure you're running the latest version.",
        })
    } else {
        window.confirmPromise?.({
            isAlert: true,
            title: "Something went wrong",
            text: "App may not be working properly, you may want to refresh the page, or if not clear your cookies but backup your data first.",
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
    animeLoader,
    getExtraInfo
}
