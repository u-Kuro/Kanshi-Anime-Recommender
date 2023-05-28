const getIDBInfo = (info) => {
    return new Promise((resolve, reject) => {
        let worker = new Worker("./webapi/worker/getIDBInfo.js")
        worker.postMessage({info:info})
        worker.onmessage = ({data}) => {
            worker.terminate();
            resolve(data)
        }
        worker.onerror = (error) => {
            reject(error)
        }
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

export { 
    getIDBInfo,
    getAnimeEntries, 
    getUserEntries, 
    getFilterOptions,
    requestAnimeEntries,
    requestUserEntries,
    processRecommendedAnimeList
}