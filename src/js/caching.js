import { get } from "svelte/store"
import { appID } from "./globalValues"
import getWebVersion from "../version"

let loadedRequestUrls = {}
const cacheRequest = (url) => {
    return new Promise(async (resolve) => {
        if (typeof window !== "undefined" && window.location.protocol.includes('file')) {
            resolve(url)
        } else {
            let _appID = get(appID)
            if (!_appID) {
                _appID = await getWebVersion()
                appID.set(_appID)
            }
            url = url + "?v=" + _appID
            if (loadedRequestUrls[url]) {
                resolve(loadedRequestUrls[url])
            } else {
                fetch(url, {
                    headers: {
                        'Cache-Control': 'max-age=31536000, immutable'
                    }
                }).then(async response => await response.blob())
                    .then(blob => {
                        try {
                            let blobUrl = URL.createObjectURL(blob);
                            loadedRequestUrls[url] = blobUrl
                            resolve(blobUrl)
                        } catch (e) {
                            loadedRequestUrls[url] = url
                            resolve(url)
                        }
                    })
                    .catch(() => {
                        loadedRequestUrls[url] = url
                        resolve(url)
                    })
            }
        }
    })
}

let loadedImages = {}
const cacheImage = (url, width, height) => {
    return new Promise(async (resolve) => {
        if (!window.location.origin.includes('https://u-kuro.github.io')) {
            resolve(url)
        } else if (loadedImages[url]) {
            resolve(loadedImages[url])
        } else {
            let newUrl = "https://cors-anywhere-kuro.vercel.app/?url=" + url;
            fetch(newUrl).then(async response => await response.blob())
                .then(blob => {
                    try {
                        let imgUrl = URL.createObjectURL(blob);
                        let img = new Image();
                        img.src = imgUrl
                        img.onload = () => {
                            try {
                                let canvas = document.createElement('canvas')
                                canvas.width = width || img.naturalWidth
                                canvas.height = height || img.naturalHeight
                                let ctx = canvas.getContext('2d')
                                ctx.drawImage(img, 0, 0)
                                canvas.toBlob((blob) => {
                                    try {
                                        let blobUrl = URL.createObjectURL(blob)
                                        loadedImages[url] = blobUrl
                                        resolve(blobUrl)
                                    } catch (e) {
                                        loadedImages[url] = imgUrl
                                        resolve(imgUrl)
                                    }
                                }, 'image/webp', 0.8)
                            } catch (e) {
                                loadedImages[url] = imgUrl
                                resolve(imgUrl)
                            }
                        }
                        img.onerror = () => {
                            loadedImages[url] = imgUrl
                            resolve(imgUrl)
                        }
                    } catch (e) {
                        loadedImages[url] = url
                        resolve(url)
                    }
                })
                .catch(e => {
                    loadedImages[url] = url
                    resolve(url)
                })
        }
    })
}
export { cacheRequest, cacheImage }