const getAnimeEntries = (worker) => {
    return new Promise((resolve, reject) => {
        worker.postMessage(null)
        worker.onmessage = ({data}) => {
            worker.terminate()
            resolve(data)
        }
        worker.onerror = (error) => {
            worker.terminate()
            reject(error)
        }
    })
}

const getUserEntries = (worker) => {
    return new Promise((resolve, reject) => {
        worker.postMessage(null)
        worker.onmessage = ({data}) => {
            worker.terminate()
            resolve(data)
        }
        worker.onerror = (error) => {
            worker.terminate()
            reject(error)
        }
    })
}

const getFilterOptions = (worker) => {
    return new Promise((resolve, reject) => {
        worker.postMessage(null)
        worker.onmessage = ({data}) => {
            worker.terminate()
            resolve(data)
        }
        worker.onerror = (error) => {
            worker.terminate()
            reject(error)
        }
    })
}

export { 
    getAnimeEntries, 
    getUserEntries, 
    getFilterOptions 
}