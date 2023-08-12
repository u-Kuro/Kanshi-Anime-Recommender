import {
    dataStatus,
    updateRecommendationList,
    username,
    activeTagFilters,
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
    lastNotificationSent
} from "./globalValues";
import { get } from "svelte/store";
import { downloadLink, isJsonObject } from "../js/others/helper.js"
import { cacheRequest } from "./caching";

let terminateDelay = 1000;
let dataStatusPrio = false
let isExporting = false;

let passedFilterOptions, passedActiveTagFilters

// Reactinve Functions
let animeLoaderWorker;
const animeLoader = (_data = {}) => {
    return new Promise((resolve, reject) => {
        dataStatusPrio = true
        progress.set(0)
        cacheRequest("./webapi/worker/animeLoader.js")
            .then(url => {
                if (animeLoaderWorker) {
                    animeLoaderWorker.terminate()
                    animeLoaderWorker = null
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
                animeLoaderWorker = new Worker(url)
                animeLoaderWorker.postMessage(_data)
                animeLoaderWorker.onmessage = ({ data }) => {
                    if (data?.hasOwnProperty("progress")) {
                        if (data?.progress >= 0 && data?.progress <= 100) {
                            progress.set(data.progress)
                        }
                    } else if (data?.hasOwnProperty("status")) {
                        dataStatusPrio = true
                        dataStatus.set(data.status)
                    } else if (data?.isNew) {
                        if (data?.hasPassedFilters === true) {
                            passedFilterOptions = passedActiveTagFilters = undefined
                        }
                        dataStatusPrio = false
                        animeLoaderWorker.onmessage = null
                        progress.set(100)
                        resolve(Object.assign({}, data, { animeLoaderWorker: animeLoaderWorker }))
                    }
                }
                animeLoaderWorker.onerror = (error) => {
                    progress.set(100)
                    reject(error)
                }
            })
            .catch((error) => {
                progress.set(100)
                alertError()
                reject(error)
            })
    })
}
let processRecommendedAnimeListTerminateTimeout;
let processRecommendedAnimeListWorker;
const processRecommendedAnimeList = (_data = {}) => {
    return new Promise((resolve, reject) => {
        dataStatusPrio = true
        if (processRecommendedAnimeListWorker) processRecommendedAnimeListWorker.terminate();
        progress.set(0)
        cacheRequest("./webapi/worker/processRecommendedAnimeList.js")
            .then(url => {
                if (processRecommendedAnimeListTerminateTimeout) clearTimeout(processRecommendedAnimeListTerminateTimeout);
                if (_data?.filterOptions && _data?.activeTagFilters) {
                    passedFilterOptions = _data?.filterOptions
                    passedActiveTagFilters = _data?.activeTagFilters
                    _data.hasPassedFilters = true;
                } else if (passedFilterOptions && passedActiveTagFilters) {
                    _data.filterOptions = passedFilterOptions
                    _data.activeTagFilters = passedActiveTagFilters
                    _data.hasPassedFilters = true;
                }
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
                                    aniReleaseNotif?.releaseDateMillis > (get(lastNotificationSent)?.getTime?.() || new Date().getTime())
                                    && typeof aniReleaseNotif?.releaseEpisodes === "number"
                                    && typeof aniReleaseNotif?.releaseDateMillis === "number"
                                    && typeof aniReleaseNotif?.maxEpisode === "number"
                                    && typeof aniReleaseNotif?.title === "string"
                                    && typeof aniReleaseNotif?.id === "number"
                                    && typeof aniReleaseNotif?.isMyAnime === "boolean"
                                    && typeof aniReleaseNotif?.imageURL === "string"
                                ) {
                                    JSBridge.addAnimeReleaseNotification(
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
                        if (data?.hasPassedFilters === true) {
                            passedFilterOptions = passedActiveTagFilters = undefined
                        }
                        dataStatusPrio = false
                        processRecommendedAnimeListTerminateTimeout = setTimeout(() => {
                            processRecommendedAnimeListWorker.terminate();
                        }, terminateDelay);
                        progress.set(100)
                        resolve()
                    }
                };
                processRecommendedAnimeListWorker.onerror = (error) => {
                    progress.set(100)
                    reject(error);
                };
            }).catch((error) => {
                progress.set(100)
                alertError()
                reject(error)
            })
    });
};
let requestAnimeEntriesTerminateTimeout, requestAnimeEntriesWorker;
const requestAnimeEntries = (_data) => {
    return new Promise((resolve, reject) => {
        if (requestAnimeEntriesWorker) requestAnimeEntriesWorker.terminate()
        progress.set(0)
        cacheRequest("./webapi/worker/requestAnimeEntries.js")
            .then(url => {
                requestAnimeEntriesWorker = new Worker(url)
                if (requestAnimeEntriesTerminateTimeout) clearTimeout(requestAnimeEntriesTerminateTimeout)
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
                        requestAnimeEntriesTerminateTimeout = setTimeout(() => {
                            requestAnimeEntriesWorker.terminate();
                        }, terminateDelay)
                        progress.set(100)
                        resolve(data)
                    }
                }
                requestAnimeEntriesWorker.onerror = (error) => {
                    progress.set(100)
                    reject(error)
                }
            }).catch((error) => {
                progress.set(100)
                alertError()
                reject(error)
            })
    })
}
let requestUserEntriesTerminateTimeout, requestUserEntriesWorker;
const requestUserEntries = (_data) => {
    return new Promise((resolve, reject) => {
        if (!get(initData)) {
            if (isExporting || get(isImporting)) {
                userRequestIsRunning.set(false)
            }
        }
        if (requestUserEntriesWorker) requestUserEntriesWorker.terminate()
        progress.set(0)
        cacheRequest("./webapi/worker/requestUserEntries.js")
            .then(url => {
                requestUserEntriesWorker = new Worker(url)
                if (requestUserEntriesTerminateTimeout) clearTimeout(requestUserEntriesTerminateTimeout)
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
                                    text: "User is not found, you may want to try again..."
                                })
                                requestUserEntriesTerminateTimeout = setTimeout(() => {
                                    requestUserEntriesWorker.terminate();
                                }, terminateDelay)
                                progress.set(100)
                                reject(data)
                            }
                        }
                    } else if (data?.error) {
                        userRequestIsRunning.set(false)
                        loadAnime.update((e) => !e)
                        requestUserEntriesTerminateTimeout = setTimeout(() => {
                            requestUserEntriesWorker.terminate();
                        }, terminateDelay)
                        progress.set(100)
                        reject(data)
                    } else if (data?.updateRecommendationList !== undefined) {
                        updateRecommendationList.update(e => !e)
                    } else {
                        userRequestIsRunning.set(false)
                        requestUserEntriesTerminateTimeout = setTimeout(() => {
                            requestUserEntriesWorker.terminate();
                        }, terminateDelay)
                        progress.set(100)
                        resolve(data)
                    }
                }
                requestUserEntriesWorker.onerror = (error) => {
                    userRequestIsRunning.set(false)
                    loadAnime.update((e) => !e)
                    requestUserEntriesTerminateTimeout = setTimeout(() => {
                        requestUserEntriesWorker.terminate();
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

let exportUserDataWorker;
const exportUserData = (_data) => {
    return new Promise((resolve, reject) => {
        if (!get(initData)) {
            if (get(isImporting)) return
            stopConflictingWorkers()
            isExporting = true
        }
        if (exportUserDataWorker) exportUserDataWorker.terminate()
        progress.set(0)
        cacheRequest("./webapi/worker/exportUserData.js")
            .then(url => {
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
                            progress.set(100)
                            exportUserDataWorker.terminate();
                            isExporting = false
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
                    window.confirmPromise?.({
                        isAlert: true,
                        title: "Export Failed",
                        text: "Data is not exported, please try again in a later time.",
                    })
                    reject(error)
                }
            }).catch((error) => {
                progress.set(100)
                isExporting = false
                alertError()
                reject(error)
            })
    })
}
let importUserDataTerminateTimeout, importUserDataWorker;
const importUserData = (_data) => {
    return new Promise((resolve, reject) => {
        if (!get(initData)) {
            if (isExporting) return
            stopConflictingWorkers()
            isImporting.set(true)
        }
        if (importUserDataWorker) importUserDataWorker.terminate()
        progress.set(0)
        cacheRequest("./webapi/worker/importUserData.js")
            .then(url => {
                importUserDataWorker = new Worker(url)
                if (importUserDataTerminateTimeout) clearTimeout(importUserDataTerminateTimeout)
                importUserDataWorker.postMessage(_data)
                importUserDataWorker.onmessage = ({ data }) => {
                    if (data?.hasOwnProperty("progress")) {
                        if (data?.progress >= 0 && data?.progress <= 100) {
                            progress.set(data.progress)
                        }
                    } else if (data?.error !== undefined) {
                        isImporting.set(false)
                        loadAnime.update((e) => !e)
                        window.confirmPromise?.({
                            isAlert: true,
                            title: "Import Failed",
                            text: "File has not been imported, please ensure that file is in a supported format (e.g., .json)",
                        })
                        progress.set(100)
                        reject(data?.error || "Something went wrong...")
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
                    } else if (data?.updateFilters !== undefined) {
                        isImporting.set(false)
                        getFilterOptions()
                            .then((data) => {
                                activeTagFilters.set(data.activeTagFilters)
                                filterOptions.set(data.filterOptions)
                            })
                    } else if (data?.updateRecommendationList !== undefined) {
                        isImporting.set(false)
                        importantUpdate.update(e => !e)
                    } else {
                        isImporting.set(false)
                        runUpdate.update(e => !e)
                        dataStatusPrio = false
                        importUserDataTerminateTimeout = setTimeout(() => {
                            importUserDataWorker.terminate();
                        }, terminateDelay)
                        progress.set(100)
                        resolve(data)
                    }
                }
                importUserDataWorker.onerror = (error) => {
                    isImporting.set(false)
                    window.confirmPromise?.({
                        isAlert: true,
                        title: "Import Failed",
                        text: "File has not been imported, please ensure that file is in a supported format (e.g., .json)",
                    })
                    loadAnime.update((e) => !e)
                    progress.set(100)
                    reject(error || "Something went wrong...")
                }
            }).catch((error) => {
                progress.set(100)
                isImporting.set(false)
                loadAnime.update((e) => !e)
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
                worker.postMessage({ name: name })
                worker.onmessage = ({ data }) => {
                    if (data?.hasOwnProperty("status")) {
                        dataStatus.set(data.status)
                    } else {
                        worker.terminate()
                        resolve(data)
                    }
                }
                worker.onerror = (error) => {
                    reject(error)
                }
            }).catch(() => {
                alertError()
                reject(error)
            })
    })
}
const saveIDBdata = (data, name) => {
    return new Promise((resolve, reject) => {
        cacheRequest("./webapi/worker/saveIDBdata.js")
            .then(url => {
                let worker = new Worker(url)
                worker.onmessage = ({ data }) => {
                    if (data?.hasOwnProperty("status")) {
                        dataStatus.set(data.status)
                    } else {
                        setTimeout(() => {
                            worker.terminate();
                            worker = null
                        }, terminateDelay)
                        resolve()
                    }
                }
                worker.onerror = (error) => {
                    reject(error)
                }
                worker.postMessage({ data: data, name: name })
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
                let worker = new Worker(url)
                if (getAnimeEntriesTerminateTimeout) clearTimeout(getAnimeEntriesTerminateTimeout)
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
                            worker.terminate();
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

let getAnimeFranchisesTerminateTimeout, gettingAnimeFranchisesInterval
const getAnimeFranchises = (_data) => {
    return new Promise((resolve, reject) => {
        gettingAnimeFranchisesInterval = setInterval(() => {
            if (!gettingAnimeEntriesInterval) {
                dataStatus.set("Getting Anime Franchise")
            }
        }, 300)
        progress.set(0)
        cacheRequest("./webapi/worker/getAnimeFranchises.js")
            .then(url => {
                progress.set(25)
                if (gettingAnimeFranchisesInterval) {
                    clearInterval(gettingAnimeFranchisesInterval)
                    gettingAnimeFranchisesInterval = null
                }
                let worker = new Worker(url)
                if (getAnimeFranchisesTerminateTimeout) clearTimeout(getAnimeFranchisesTerminateTimeout)
                worker.postMessage(_data)
                worker.onmessage = ({ data }) => {
                    if (data?.hasOwnProperty("status")) {
                        dataStatusPrio = true
                        dataStatus.set(data.status)
                    } else {
                        progress.set(100)
                        updateRecommendationList.update(e => !e)
                        dataStatusPrio = false
                        getAnimeFranchisesTerminateTimeout = setTimeout(() => {
                            worker.terminate();
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
                if (gettingAnimeFranchisesInterval) {
                    clearInterval(gettingAnimeFranchisesInterval)
                    gettingAnimeFranchisesInterval = null
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
        getFilterOptionsInterval = setInterval(() => {
            if (!gettingAnimeEntriesInterval && !gettingAnimeFranchisesInterval) {
                dataStatus.set("Getting Filters")
            }
        }, 300)
        cacheRequest("./webapi/worker/getFilterOptions.js")
            .then(url => {
                if (getFilterOptionsInterval) {
                    clearInterval(getFilterOptionsInterval)
                    getFilterOptionsInterval = null
                }
                if (getFilterOptionsWorker) getFilterOptionsWorker.terminate()
                getFilterOptionsWorker = new Worker(url)
                if (getFilterOptionsTerminateTimeout) clearTimeout(getFilterOptionsTerminateTimeout)
                getFilterOptionsWorker.postMessage(_data)
                getFilterOptionsWorker.onmessage = ({ data }) => {
                    if (data?.hasOwnProperty("status")) {
                        dataStatusPrio = true
                        dataStatus.set(data.status)
                    } else {
                        dataStatusPrio = false
                        getFilterOptionsTerminateTimeout = setTimeout(() => {
                            getFilterOptionsWorker.terminate();
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

function stopConflictingWorkers() {
    progress.set(0)
    requestAnimeEntriesWorker?.terminate?.()
    requestUserEntriesWorker?.terminate?.()
    userRequestIsRunning.set(false)
    importUserDataWorker?.terminate?.()
    isImporting.set(false)
    exportUserDataWorker?.terminate?.()
    isExporting = false
    getFilterOptionsWorker?.terminate?.()
    clearInterval(gettingAnimeEntriesInterval)
    gettingAnimeEntriesInterval = null
    clearInterval(gettingAnimeFranchisesInterval)
    gettingAnimeFranchisesInterval = null
    clearInterval(getFilterOptionsInterval)
    getFilterOptionsInterval = null
    dataStatus.set(null)
}

function alertError() {
    if (get(android)) {
        window.confirmPromise?.({
            isAlert: true,
            title: "Something Went Wrong",
            text: "App may not be working properly, you may want to restart and make sure you're running the latest version.",
        })
    } else {
        window.confirmPromise?.({
            isAlert: true,
            title: "Something Went Wrong",
            text: "App may not be working properly, you may want to refresh the page, or if not clear the cookies but backup your data first.",
        })
    }
}

export {
    saveIDBdata,
    getIDBdata,
    getAnimeEntries,
    getFilterOptions,
    getAnimeFranchises,
    requestAnimeEntries,
    requestUserEntries,
    exportUserData,
    importUserData,
    processRecommendedAnimeList,
    animeLoader
}
