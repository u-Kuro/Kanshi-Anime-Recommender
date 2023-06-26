import { requestProgress } from "./globalValues"

let cacheID = 1
let loadedUrls = {}
let minProgress = 0;
let runningRequest = 0;
const cacheRequest = (url) => {
    return new Promise((resolve, reject) => {
        url = url + `?v=${cacheID}`
        if (loadedUrls[url]) {
            resolve(loadedUrls[url])
        } else {
            ++runningRequest
            const xhr = new XMLHttpRequest();
            xhr.open("GET", url, true);
            xhr.responseType = "text";
            xhr.setRequestHeader('Cache-Control', 'max-age=31536000, immutable');
            xhr.upload.onprogress = (event) => {
                let total;
                if (event.lengthComputable) {
                    total = event.total;
                } else {
                    total = parseInt(event?.target?.getResponseHeader?.('x-decompressed-content-length'), 10);
                }
                if (total > 0) {
                    let loaded = event.loaded;
                    let progress = (loaded / total) * 100;
                    console.log(progress, loaded, total, url)
                    if (runningRequest < 2) { // Just One Running Request
                        minProgress = progress
                    } else if (progress < minProgress) { // More than 1 Request
                        minProgress = progress
                    }
                    requestProgress.set(minProgress)
                }
                console.log(event, event?.target?.getResponseHeader?.('x-decompressed-content-length'))
            };
            xhr.onload = (z) => {
                --runningRequest
                console.log(xhr, z)
                if (xhr.status === 200) {
                    if (runningRequest < 1) { // All requests have finished
                        minProgress = 100
                        requestProgress.set(minProgress)
                    }
                    const contentType = xhr.getResponseHeader('Content-Type');
                    let responseData;
                    if (xhr.responseType === 'text' || xhr.responseType === '') {
                        responseData = xhr.responseText;
                    } else {
                        responseData = xhr.response;
                    }
                    const blob = new Blob([responseData], { type: contentType });
                    const url = URL.createObjectURL(blob);
                    resolve(url);
                } else {
                    reject(new Error(xhr.status));
                }
            };
            xhr.onerror = (error) => {
                --runningRequest
                console.log(xhr, url, error)
                reject(new Error("Failed to Load: " + url));
            };
            xhr.send();
        }
    })
}

export { cacheRequest }