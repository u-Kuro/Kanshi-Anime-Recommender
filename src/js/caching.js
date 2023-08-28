import { get } from "svelte/store"
import { appID } from "./globalValues"
import { isAndroid } from "./others/helper"
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
                        'Cache-Control': 'public, max-age=31536000, immutable',
                        'cache': 'force-cache'
                    }
                }).then(async response => await response.blob())
                    .then(blob => {
                        try {
                            let blobUrl = URL.createObjectURL(blob);
                            loadedRequestUrls[url] = blobUrl
                            resolve(blobUrl)
                        } catch (e) {
                            resolve(url)
                        }
                    })
                    .catch(() => {
                        resolve(url)
                    })
            }
        }
    })
}

const emptyImage = "data:image/png;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
const android = isAndroid()
let loadedImages = {}
const cacheImage = (url, width, height) => {
    return new Promise(async (resolve) => {
        if (!window.location.origin.includes('https://u-kuro.github.io') || !android) {
            resolve(url)
        } else if (loadedImages[url]) {
            resolve(loadedImages[url])
        } else if (url) {
            let newUrl = "https://cors-anywhere-kuro.vercel.app/api?url=" + url;
            fetch(newUrl, {
                headers: {
                    'Cache-Control': 'public, max-age=31536000, immutable',
                    'cache': 'force-cache'
                }
            }).then(async response => await response.blob())
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
        } else {
            resolve(emptyImage)
        }
    })
}
export { cacheRequest, cacheImage }