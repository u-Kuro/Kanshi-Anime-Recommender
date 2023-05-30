const getIDBdata = (name) => {
    let worker = new Worker("./webapi/worker/getIDBdata.js")
    return new Promise((resolve, reject) => {
        worker.postMessage({name:name})
        worker.onmessage = ({data}) => {
            worker.terminate()
            worker = null
            resolve(data)
        }
        worker.onerror = (error) => {
            reject(error)
        }
    })
}

let saveIDBdataWorker;
const saveIDBdata = (data, name) => {
    return new Promise((resolve, reject) => {
        if(!saveIDBdataWorker) saveIDBdataWorker = new Worker("./webapi/worker/saveIDBdata.js")
        saveIDBdataWorker.onmessage = ({message}) => {
            resolve(message)
        }
        saveIDBdataWorker.onerror = (error) => {
            reject(error)
        }
        saveIDBdataWorker.postMessage({data:data, name:name})
    })
}

const requestAnimeEntries = (_data) => {
    return new Promise((resolve, reject) => {
        let worker = new Worker("./webapi/worker/requestAnimeEntries.js")
        worker.postMessage(_data)
        worker.onmessage = ({data}) => {
            worker.terminate();
            resolve(data)
        }
        worker.onerror = (error) => {
            reject(error)
        }
    })
}

const requestUserEntries = (_data) => {
    return new Promise((resolve, reject) => {
        let worker = new Worker("./webapi/worker/requestUserEntries.js")
        worker.postMessage(_data)
        worker.onmessage = ({data}) => {
            worker.terminate();
            resolve(data)
        }
        worker.onerror = (error) => {
            reject(error)
        }
    })
}

const processRecommendedAnimeList = (_data) => {
    return new Promise((resolve, reject) => {
        let worker = new Worker("./webapi/worker/processRecommendedAnimeList.js")
        worker.postMessage(_data)
        worker.onmessage = ({data}) => {
            worker.terminate();
            resolve(data)
        }
        worker.onerror = (error) => {
            reject(error)
        }
    })
}

const animeLoader = (_data) => {
    return new Promise((resolve, reject) => {
        let worker = new Worker("./webapi/worker/animeLoader.js")
        worker.postMessage(_data)
        worker.onmessage = ({data}) => {
            worker.terminate();
            resolve(data)
        }
        worker.onerror = (error) => {
            reject(error)
        }
    })
}

const getAnimeEntries = (_data) => {
    return new Promise((resolve, reject) => {
        let worker = new Worker("./webapi/worker/getAnimeEntries.js")
        worker.postMessage(_data)
        worker.onmessage = ({data}) => {
            worker.terminate();
            resolve(data)
        }
        worker.onerror = (error) => {
            reject(error)
        }
    })
}

const getUserEntries = (_data) => {
    return new Promise((resolve, reject) => {
        let worker = new Worker("./webapi/worker/getUserEntries.js")
        worker.postMessage(_data)
        worker.onmessage = ({data}) => {
            worker.terminate();
            resolve(data)
        }
        worker.onerror = (error) => {
            reject(error)
        }
    })
}

const getFilterOptions = (_data) => {
    return new Promise((resolve, reject) => {
        let worker = new Worker("./webapi/worker/getFilterOptions.js")
        worker.postMessage(_data)
        worker.onmessage = ({data}) => {
            worker.terminate();
            resolve(data)
        }
        worker.onerror = (error) => {
            reject(error)
        }
    })
}

const getAnimeFranchises = (_data) => {
    return new Promise((resolve, reject) => {
        let worker = new Worker("./webapi/worker/getAnimeFranchises.js")
        worker.postMessage(_data)
        worker.onmessage = ({data}) => {
            worker.terminate();
            resolve(data)
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
    getUserEntries, 
    getFilterOptions,
    getAnimeFranchises,
    requestAnimeEntries,
    requestUserEntries,
    processRecommendedAnimeList,
    animeLoader
}