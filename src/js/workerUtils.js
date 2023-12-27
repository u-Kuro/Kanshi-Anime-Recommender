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
import { downloadLink, isJsonObject, removeLocalStorage, setLocalStorage, showToast, } from "../js/others/helper.js"
import { cacheRequest } from "./caching";

let terminateDelay = 1000;
let dataStatusPrio = false
let isExporting = false;
let isCurrentlyImporting = false;
let isGettingNewEntries = false;
let isRequestingAnimeEntries = false

let passedFilterOptions, passedActiveTagFilters, passedSelectedCustomFilter

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
                        if (get(android) && window?.isInAndroidBackgroundProcess === true) {
                            console.log({ animeLoader: 0 })
                            animeLoaderWorker?.terminate?.()
                            animeLoaderWorker = null
                        } else {
                            console.log({ animeLoader: 1, isInAndroidBackgroundProcess: window?.isInAndroidBackgroundProcess })
                            data.animeLoaderWorker = animeLoaderWorker
                            resolve(data)
                        }
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
    })
}
let processRecommendedAnimeListTerminateTimeout;
let processRecommendedAnimeListWorker;
let animeCompletionUpdateTimeout
window.setAnimeCompletionUpdateTimeout = (neareastAnimeCompletionAiringAt = 0) => {
    if (typeof neareastAnimeCompletionAiringAt !== 'number') {
        neareastAnimeCompletionAiringAt = 0
    }
    let timeLeftBeforeAnimeCompletionUpdate = (neareastAnimeCompletionAiringAt * 1000) - (new Date).getTime()
    clearTimeout(animeCompletionUpdateTimeout)
    animeCompletionUpdateTimeout = setTimeout(() => {
        updateRecommendationList.update(e => !e)
    }, Math.min(timeLeftBeforeAnimeCompletionUpdate, 2000000000))
}
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
                const lastProcessRecommendationAiringAt = parseInt((new Date().getTime() / 1000))
                let neareastAnimeCompletionAiringAt
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
                    } else if (typeof data?.animeCompletionAiringAt === "number" && data?.animeCompletionAiringAt > lastProcessRecommendationAiringAt) {
                        if (!neareastAnimeCompletionAiringAt
                            || (
                                typeof neareastAnimeCompletionAiringAt === "number" &&
                                neareastAnimeCompletionAiringAt > data?.animeCompletionAiringAt
                            )
                        ) {
                            neareastAnimeCompletionAiringAt = data?.animeCompletionAiringAt
                        }
                    } else {
                        setLocalStorage("neareastAnimeCompletionAiringAt", neareastAnimeCompletionAiringAt)
                            .catch(() => removeLocalStorage("neareastAnimeCompletionAiringAt"))
                            .finally(() => saveIDBdata(neareastAnimeCompletionAiringAt, "neareastAnimeCompletionAiringAt"));
                        setLocalStorage("lastProcessRecommendationAiringAt", lastProcessRecommendationAiringAt)
                            .catch(() => removeLocalStorage("lastProcessRecommendationAiringAt"))
                            .finally(() => saveIDBdata(lastProcessRecommendationAiringAt, "lastProcessRecommendationAiringAt"));
                        if (window?.shouldUpdateNotifications === true && get(android)) {
                            window.shouldUpdateNotifications = false
                            if (typeof (get(username)) === "string") {
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
                        if (neareastAnimeCompletionAiringAt) {
                            window?.setAnimeCompletionUpdateTimeout?.(neareastAnimeCompletionAiringAt)
                        }
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
    console.log({ requestAnimeEntries: 0 });
    return new Promise((resolve, reject) => {
        if (isRequestingAnimeEntries) {
            console.log({ requestAnimeEntries: 1 });
            resolve()
            return
        }
        if (requestAnimeEntriesTerminateTimeout) clearTimeout(requestAnimeEntriesTerminateTimeout)
        if (requestAnimeEntriesWorker) {
            console.log({ requestAnimeEntries: 2 });
            requestAnimeEntriesWorker?.terminate?.()
            requestAnimeEntriesWorker = null
        }
        if (!get(initData)) {
            console.log({ requestAnimeEntries: 3 });
            if (isGettingNewEntries
                || isCurrentlyImporting
                || isExporting
                || get(isImporting)
            ) {
                console.log({ requestAnimeEntries: 4 });
                resolve()
                return
            }
        }
        console.log({ requestAnimeEntries: 5 });
        progress.set(0)
        cacheRequest("./webapi/worker/requestAnimeEntries.js")
            .then(url => {
                console.log({ requestAnimeEntries: 6 });
                if (requestAnimeEntriesTerminateTimeout) clearTimeout(requestAnimeEntriesTerminateTimeout)
                if (requestAnimeEntriesWorker) {
                    console.log({ requestAnimeEntries: 7 });
                    requestAnimeEntriesWorker?.terminate?.()
                    requestAnimeEntriesWorker = null
                }
                requestAnimeEntriesWorker = new Worker(url)
                requestAnimeEntriesWorker.postMessage(_data)
                isRequestingAnimeEntries = true
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
                        console.log({ requestAnimeEntries: 8 });
                        updateRecommendationList.update(e => !e)
                    } else if (data?.lastRunnedAutoUpdateDate instanceof Date && !isNaN(data?.lastRunnedAutoUpdateDate)) {
                        console.log({ requestAnimeEntries: 9 });
                        lastRunnedAutoUpdateDate.set(data.lastRunnedAutoUpdateDate)
                    } else if (data?.errorDuringInit !== undefined) {
                        console.log({ requestAnimeEntries: 10 });
                        isRequestingAnimeEntries = false
                        resolve(data)
                    } else if (data?.hasOwnProperty("notifyAddedEntries")) {
                        console.log({ requestAnimeEntries: 11 });
                        if (get(android)) {
                            console.log({ requestAnimeEntries: 12 });
                            try {
                                let newAddedAnimeCount = data?.notifyAddedEntries
                                if (typeof newAddedAnimeCount === "number" && newAddedAnimeCount > 0) {
                                    JSBridge?.showNewAddedAnimeNotification?.(newAddedAnimeCount)
                                }
                            } catch (e) {
                                console.log({ requestAnimeEntries: 13 });
                            }
                        }
                    } else {
                        if (data?.noEntriesFound) {
                            console.log({ requestAnimeEntries: 14 });
                            alertError()
                        } else if (data?.getEntries === true) {
                            console.log({ requestAnimeEntries: 15 });
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
                        isRequestingAnimeEntries = false
                        requestAnimeEntriesTerminateTimeout = setTimeout(() => {
                            console.log({ requestAnimeEntries: 16 });
                            requestAnimeEntriesWorker?.terminate?.();
                        }, terminateDelay)
                        progress.set(100)
                        resolve(data)
                    }
                }
                requestAnimeEntriesWorker.onerror = (error) => {
                    console.log({ requestAnimeEntries: 17 });
                    isRequestingAnimeEntries = false
                    isGettingNewEntries = false
                    progress.set(100)
                    reject(error)
                }
            }).catch((error) => {
                console.log({ requestAnimeEntries: 18 });
                isRequestingAnimeEntries = false
                isGettingNewEntries = false
                progress.set(100)
                alertError()
                reject(error)
            })
    })
}
let requestUserEntriesTerminateTimeout, requestUserEntriesWorker;
const requestUserEntries = (_data) => {
    console.log({ requestUserEntries: 0 });
    return new Promise((resolve, reject) => {
        if (requestUserEntriesTerminateTimeout) clearTimeout(requestUserEntriesTerminateTimeout)
        if (requestUserEntriesWorker) {
            console.log({ requestUserEntries: 1 });
            requestUserEntriesWorker?.terminate?.()
            requestUserEntriesWorker = null
        }
        if (!get(initData)) {
            console.log({ requestUserEntries: 2 });
            if (isExporting
                || get(isImporting)
                || isCurrentlyImporting
                || isGettingNewEntries
            ) {
                console.log({ requestUserEntries: 3 });
                userRequestIsRunning.set(false)
                reject()
                return
            }
        }
        console.log({ requestUserEntries: 3.5 });
        userRequestIsRunning.set(true)
        progress.set(0)
        cacheRequest("./webapi/worker/requestUserEntries.js")
            .then(url => {
                console.log({ requestUserEntries: 4 });
                if (requestUserEntriesTerminateTimeout) clearTimeout(requestUserEntriesTerminateTimeout)
                if (requestUserEntriesWorker) {
                    console.log({ requestUserEntries: 5 });
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
                        }
                    } else if (data?.error) {
                        console.log({ requestUserEntries: 6 });
                        window.confirmPromise({
                            isAlert: true,
                            text: "Failed retrieval, " + (data?.error?.toLowerCase?.() || "please try again") + ".",
                        })
                        userRequestIsRunning.set(false)
                        loadAnime.update((e) => !e)
                        requestUserEntriesTerminateTimeout = setTimeout(() => {
                            requestUserEntriesWorker?.terminate?.();
                        }, terminateDelay)
                        progress.set(100)
                        reject(data)
                    } else if (data?.updateRecommendationList !== undefined) {
                        console.log({ requestUserEntries: 7 });
                        if (get(android)) {
                            console.log({ requestUserEntries: 8 });
                            window.shouldUpdateNotifications = true
                        }
                        updateRecommendationList.update(e => !e)
                    } else {
                        console.log({ requestUserEntries: 9 });
                        userRequestIsRunning.set(false)
                        requestUserEntriesTerminateTimeout = setTimeout(() => {
                            console.log({ requestUserEntries: 10 });
                            requestUserEntriesWorker?.terminate?.();
                        }, terminateDelay)
                        progress.set(100)
                        resolve(data)
                    }
                }
                requestUserEntriesWorker.onerror = (error) => {
                    console.log({ requestUserEntries: 11 });
                    userRequestIsRunning.set(false)
                    loadAnime.update((e) => !e)
                    requestUserEntriesTerminateTimeout = setTimeout(() => {
                        console.log({ requestUserEntries: 12 });
                        requestUserEntriesWorker?.terminate?.();
                    }, terminateDelay)
                    progress.set(100)
                    reject(error)
                }
            }).catch((error) => {
                console.log({ requestUserEntries: 13 });
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
    console.log({ exportUserData: 0 });
    return new Promise((resolve, reject) => {
        if (exportUserDataWorker) {
            console.log({ exportUserData: 1 });
            exportUserDataWorker?.terminate?.()
            exportUserDataWorker = null
        }
        if (!get(initData)) {
            console.log({ exportUserData: 2 });
            if (get(isImporting) || isCurrentlyImporting || isGettingNewEntries) return
            console.log({ exportUserData: 3 });
            isExporting = true
            stopConflictingWorkers({ isExporting: true })
        }
        console.log({ exportUserData: 4 });
        waitForExportApproval?.reject?.()
        waitForExportApproval = null
        progress.set(0)
        cacheRequest("./webapi/worker/exportUserData.js")
            .then(url => {
                console.log({ exportUserData: 5 });
                waitForExportApproval?.reject?.()
                waitForExportApproval = null
                if (exportUserDataWorker) {
                    console.log({ exportUserData: 6 });
                    exportUserDataWorker?.terminate?.()
                    exportUserDataWorker = null
                }
                exportUserDataWorker = new Worker(url)
                if (get(android)) {
                    console.log({ exportUserData: 7 });
                    exportUserDataWorker.postMessage('android')
                } else {
                    console.log({ exportUserData: 8 });
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
                                console.log({ exportUserData: 9 });
                                JSBridge.exportJSON('', 0, '')
                            } else if (state === 1) {
                                JSBridge.exportJSON(chunk, 1, '')
                            } else if (state === 2) {
                                console.log({ exportUserData: 10 });
                                let username = data?.username
                                JSBridge.exportJSON(chunk, 2, `Kanshi.${username?.toLowerCase?.() || "Backup"}.json`)
                                isExporting = false
                                exportUserDataWorker?.terminate?.();
                                new Promise((resolve, reject) => {
                                    console.log({ exportUserData: 11 });
                                    waitForExportApproval = { resolve, reject }
                                }).catch(() => {
                                    console.log({ exportUserData: 12 });
                                    waitForExportApproval?.reject?.()
                                }).finally(() => {
                                    console.log({ exportUserData: 13 });
                                    waitForExportApproval = null
                                    progress.set(100)
                                    showToast("Data has been Exported")
                                    resolve(data)
                                })
                            }
                        } catch (e) {
                            console.log({ exportUserData: 14 });
                            isExporting = false
                            exportUserDataWorker?.terminate?.();
                            waitForExportApproval?.reject?.()
                            waitForExportApproval = null
                            progress.set(100)
                            resolve(data)
                        }
                    } else {
                        console.log({ exportUserData: 15 });
                        dataStatusPrio = false
                        let username = data?.username
                        progress.set(100)
                        downloadLink(data.url, `Kanshi.${username?.toLowerCase?.() || "Backup"}.json`)
                        isExporting = false
                        resolve(data)
                        // dont terminate, can't oversee blob link lifetime
                    }
                }
                exportUserDataWorker.onerror = (error) => {
                    console.log({ exportUserData: 16 });
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
                console.log({ exportUserData: 17 });
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
                removeLocalStorage("username");
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
                    } else if (data?.importedUsername !== undefined) {
                        if (typeof data?.importedUsername === "string") {
                            setLocalStorage("username", data.importedUsername).catch(() => {
                                removeLocalStorage("username");
                            });
                            username.set(data.importedUsername)
                        } else {
                            username.set("")
                        }
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
                            }).finally(() => {
                                if (get(android)) {
                                    showToast("Data has been Imported")
                                }
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
                    worker?.terminate?.()
                    if (data === "Failed to initialize database") {
                        alertError()
                        reject(data)
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
    isRequestingAnimeEntries = false
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
