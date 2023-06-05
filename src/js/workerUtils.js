import {
    dataStatus,
    activeTagFilters,
    filterOptions,
    toast,
    updateRecommendationList,
    updateFilters,
    loadAnime
} from "./globalValues";
let terminateDelay = 1000;
let dataStatusPrio = false

// Reactinve Functions
let animeLoaderTerminateTimeout;
let animeLoaderWorker;
const animeLoader = (_data) => {
    dataStatusPrio = true
    return new Promise((resolve, reject) => {
        if (animeLoaderWorker) animeLoaderWorker.terminate();
        animeLoaderWorker = new Worker("./webapi/worker/animeLoader.js")
        if (animeLoaderTerminateTimeout) clearTimeout(animeLoaderTerminateTimeout)
        animeLoaderWorker.postMessage(_data)
        animeLoaderWorker.onmessage = ({ data }) => {
            if (data?.status !== undefined) {
                dataStatusPrio = true
                dataStatus.set(data.status)
            } else {
                dataStatusPrio = false
                animeLoaderWorker.onmessage = null
                resolve({ finalAnimeList: data.finalAnimeList, animeLoaderWorker })

            }
        }
        animeLoaderWorker.onerror = (error) => {
            reject(error)
        }
    })
}
let processRecommendedAnimeListTerminateTimeout;
let processRecommendedAnimeListWorker;
const processRecommendedAnimeList = (_data) => {
    dataStatusPrio = true
    return new Promise((resolve, reject) => {
        if (processRecommendedAnimeListWorker) processRecommendedAnimeListWorker.terminate();
        processRecommendedAnimeListWorker = new Worker("./webapi/worker/processRecommendedAnimeList.js");
        if (processRecommendedAnimeListTerminateTimeout) clearTimeout(processRecommendedAnimeListTerminateTimeout);
        processRecommendedAnimeListWorker.postMessage(_data);
        processRecommendedAnimeListWorker.onmessage = ({ data }) => {
            if (data?.status !== undefined) {
                dataStatusPrio = true
                dataStatus.set(data.status);
            } else {
                dataStatusPrio = false
                processRecommendedAnimeListTerminateTimeout = setTimeout(() => {
                    processRecommendedAnimeListWorker.terminate();
                }, terminateDelay);
                updateFilters.update(e => !e)
                loadAnime.update(e => !e)
            }
        };
        processRecommendedAnimeListWorker.onerror = (error) => {
            reject(error);
        };
    });
};
let requestAnimeEntriesTerminateTimeout, requestAnimeEntriesWorker;
const requestAnimeEntries = (_data) => {
    return new Promise((resolve, reject) => {
        if (requestAnimeEntriesWorker) requestAnimeEntriesWorker.terminate()
        requestAnimeEntriesWorker = new Worker("./webapi/worker/requestAnimeEntries.js")
        if (requestAnimeEntriesTerminateTimeout) clearTimeout(requestAnimeEntriesTerminateTimeout)
        requestAnimeEntriesWorker.postMessage(_data)
        requestAnimeEntriesWorker.onmessage = ({ data }) => {
            if (data?.status !== undefined) {
                if (!dataStatusPrio) {
                    dataStatus.set(data.status)
                }
            } else if (data?.updateRecommendationList !== undefined) {
                updateRecommendationList.update(e => !e)
            } else {
                requestAnimeEntriesTerminateTimeout = setTimeout(() => {
                    requestAnimeEntriesWorker.terminate();
                }, terminateDelay)
                resolve(data)
            }
        }
        requestAnimeEntriesWorker.onerror = (error) => {
            reject(error)
        }
    })
}
let requestUserEntriesTerminateTimeout, requestUserEntriesWorker;
const requestUserEntries = (_data) => {
    return new Promise((resolve, reject) => {
        if (requestUserEntriesWorker) requestUserEntriesWorker.terminate()
        requestUserEntriesWorker = new Worker("./webapi/worker/requestUserEntries.js")
        if (requestUserEntriesTerminateTimeout) clearTimeout(requestUserEntriesTerminateTimeout)
        requestUserEntriesWorker.postMessage(_data)
        requestUserEntriesWorker.onmessage = ({ data }) => {
            if (data?.status !== undefined) {
                if (!dataStatusPrio) {
                    dataStatus.set(data.status)
                }
            } else if (data?.updateRecommendationList !== undefined) {
                updateRecommendationList.update(e => !e)
            } else {
                requestUserEntriesTerminateTimeout = setTimeout(() => {
                    requestUserEntriesWorker.terminate();
                }, terminateDelay)
                resolve(data)
            }

        }
        requestUserEntriesWorker.onerror = (error) => {
            reject(error)
        }
    })
}

// IndexedDB
const getIDBdata = (name) => {
    let worker = new Worker("./webapi/worker/getIDBdata.js")
    return new Promise((resolve, reject) => {
        worker.postMessage({ name: name })
        worker.onmessage = ({ data }) => {
            if (data?.status !== undefined) {
                dataStatus.set(data.status)
            } else {
                worker.terminate()
                resolve(data)
            }
        }
        worker.onerror = (error) => {
            reject(error)
        }
    })
}
const saveIDBdata = (data, name) => {
    return new Promise((resolve, reject) => {
        let worker = new Worker("./webapi/worker/saveIDBdata.js")
        worker.onmessage = ({ data }) => {
            if (data?.status !== undefined) {
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
    })
}

// One Time Use
let getAnimeEntriesTerminateTimeout
const getAnimeEntries = (_data) => {
    return new Promise((resolve, reject) => {
        let worker = new Worker("./webapi/worker/getAnimeEntries.js")
        if (getAnimeEntriesTerminateTimeout) clearTimeout(getAnimeEntriesTerminateTimeout)
        worker.postMessage(_data)
        worker.onmessage = ({ data }) => {
            if (data?.status !== undefined) {
                dataStatusPrio = true
                dataStatus.set(data.status)
            } else {
                dataStatusPrio = false
                updateRecommendationList.update(e => !e)
                getAnimeEntriesTerminateTimeout = setTimeout(() => {
                    worker.terminate();
                }, terminateDelay)
                resolve(data)
            }
        }
        worker.onerror = (error) => {
            reject(error)
        }
    })
}

let getAnimeFranchisesTerminateTimeout
const getAnimeFranchises = (_data) => {
    return new Promise((resolve, reject) => {
        let worker = new Worker("./webapi/worker/getAnimeFranchises.js")
        if (getAnimeFranchisesTerminateTimeout) clearTimeout(getAnimeFranchisesTerminateTimeout)
        worker.postMessage(_data)
        worker.onmessage = ({ data }) => {
            if (data?.status !== undefined) {
                dataStatusPrio = true
                dataStatus.set(data.status)
            } else {
                updateRecommendationList.update(e => !e)
                dataStatusPrio = false
                getAnimeFranchisesTerminateTimeout = setTimeout(() => {
                    worker.terminate();
                }, terminateDelay)
                resolve(data)
            }
        }
        worker.onerror = (error) => {
            reject(error)
        }
    })
}

let getFilterOptionsTerminateTimeout
const getFilterOptions = (_data) => {
    return new Promise((resolve, reject) => {
        let worker = new Worker("./webapi/worker/getFilterOptions.js")
        if (getFilterOptionsTerminateTimeout) clearTimeout(getFilterOptionsTerminateTimeout)
        worker.postMessage(_data)
        worker.onmessage = ({ data }) => {
            if (data?.status !== undefined) {
                dataStatusPrio = true
                dataStatus.set(data.status)
            } else {
                dataStatusPrio = false
                getFilterOptionsTerminateTimeout = setTimeout(() => {
                    worker.terminate();
                }, terminateDelay)
                resolve(data)
            }
        }
        worker.onerror = (error) => {
            reject(error)
        }
    })
}

export {
    saveIDBdata,
    getIDBdata,
    getAnimeEntries,
    getFilterOptions,
    getAnimeFranchises,
    requestAnimeEntries,
    requestUserEntries,
    processRecommendedAnimeList,
    animeLoader
}