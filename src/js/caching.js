let cacheID = 1
let loadedUrls = {}
const cacheRequest = (url) => {
    return new Promise((resolve, reject) => {
        url = url + `?v=${cacheID}`
        if (loadedUrls[url]) {
            resolve(loadedUrls[url])
        } else {
            fetch(url, {
                headers: {
                    'Cache-Control': 'max-age=31536000, immutable'
                }
            })
                .then(response => response.blob())
                .then(blob => {
                    let bloburl = URL.createObjectURL(blob);
                    loadedUrls[url] = bloburl
                    resolve(bloburl);
                })
                .catch((error) => {
                    reject(new Error(error))
                })
        }
    })
}

export { cacheRequest }