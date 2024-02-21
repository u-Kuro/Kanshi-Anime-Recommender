import { get } from "svelte/store"
import { isAndroid } from "./others/helper.js"
import { appID, dataStatus, progress } from "./globalValues.js"
import getWebVersion from "../version.js"

let loadedRequestUrlPromises = {}
let loadedRequestUrls = {}
const cacheRequest = async (url, totalLength, status) => {
    if (loadedRequestUrls[url]) {
        return loadedRequestUrls[url]
    } else if (loadedRequestUrlPromises[url]) {
        return loadedRequestUrlPromises[url]
    } else if (!window?.location?.protocol?.includes?.("file")) {
        loadedRequestUrlPromises[url] = new Promise(async (resolve) => {
            let app_id = get(appID)
            if (!app_id) {
                app_id = await getWebVersion()
                appID.set(app_id)
            }
            if (typeof app_id !== "number") {
                loadedRequestUrlPromises[url] = null
                resolve(url)
            } else {
                let newUrl = url + "?v=" + app_id
                fetch(newUrl, {
                    headers: {
                        'Cache-Control': 'public, max-age=31536000, immutable',
                    },
                    cache: 'force-cache'
                }).then(async response => {
                    if (totalLength && status) {
                        const reader = response?.body?.getReader?.();
                        if (typeof (reader?.read) === "function") {
                            return await new Promise(async (resolve) => {
                                try {
                                    new ReadableStream({
                                        async start(controller) {
                                            if (typeof (controller?.close) === "function") {
                                                let receivedLength = 0;
                                                let chunks = [];
                                                let streamStatusTimeout, isDataStatusShowing;
                                                let push = () => {
                                                    reader.read().then(({ done, value }) => {
                                                        if (value) {
                                                            chunks.push(value);
                                                            receivedLength += value?.byteLength ?? value?.length;
                                                            if (!isDataStatusShowing) {
                                                                isDataStatusShowing = true
                                                                streamStatusTimeout = setTimeout(() => {
                                                                    let percent = (receivedLength / totalLength) * 100
                                                                    let currentProgress = get(progress)
                                                                    if (percent > 0 && percent <= 100
                                                                        && (
                                                                            !currentProgress
                                                                            || currentProgress >= 100
                                                                            || percent > currentProgress)
                                                                    ) {
                                                                        progress.set(percent)
                                                                        dataStatus.set(`${percent.toFixed(2)}% ` + status)
                                                                    }
                                                                    isDataStatusShowing = false
                                                                }, 17)
                                                            }
                                                        }
                                                        if (done === false) {
                                                            push();
                                                        } else if (done === true) {
                                                            controller.close();
                                                            clearTimeout(streamStatusTimeout)
                                                            dataStatus.set(null)
                                                            progress.set(100)
                                                            resolve(new Blob(chunks))
                                                            push = undefined
                                                            return
                                                        }
                                                    })
                                                }
                                                push();
                                            } else {
                                                return resolve(await response.blob())
                                            }
                                        }
                                    });
                                } catch (e) {
                                    return resolve(await response.blob())
                                }
                            })
                        } else {
                            resolve(await cacheRequest(url))
                            return
                        }
                    } else {
                        return await response.blob()
                    }
                })
                    .then(blob => {
                        if (blob) {
                            try {
                                let blobUrl = URL.createObjectURL(blob);
                                loadedRequestUrls[url] = blobUrl;
                                loadedRequestUrlPromises[url] = null
                                resolve(blobUrl)
                            } catch (e) {
                                loadedRequestUrlPromises[url] = null
                                resolve(url)
                            }
                        }
                    })
                    .catch((e) => {
                        loadedRequestUrlPromises[url] = null
                        resolve(url)
                    })
            }
        })
        return loadedRequestUrlPromises[url]
    } else {
        return url
    }
}

const emptyImage = "data:image/png;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
const android = isAndroid()
let loadedImagePromises = {}
let loadedImages = {}
const cacheImage = (url, width, height) => {
    if (loadedImages[url]) {
        return loadedImages[url]
    } else if (loadedImagePromises[url]) {
        return loadedImagePromises[url]
    } else if (window?.location?.origin?.includes?.('https://u-kuro.github.io') && android) {
        loadedImagePromises[url] = new Promise(async (resolve) => {
            let newUrl = "https://cors-anywhere-kuro.vercel.app/api?url=" + url;
            fetch(newUrl, {
                headers: {
                    'Cache-Control': 'public, max-age=31536000, immutable',
                },
                cache: 'force-cache'
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
                                        loadedImagePromises[url] = null
                                        resolve(blobUrl)
                                    } catch (e) {
                                        loadedImages[url] = imgUrl
                                        loadedImagePromises[url] = null
                                        resolve(imgUrl)
                                    }
                                }, 'image/webp', 0.8)
                            } catch (e) {
                                loadedImages[url] = imgUrl
                                loadedImagePromises[url] = null
                                resolve(imgUrl)
                            }
                        }
                        img.onerror = () => {
                            loadedImagePromises[url] = null
                            resolve(url)
                        }
                    } catch (e) {
                        loadedImagePromises[url] = null
                        resolve(url)
                    }
                })
                .catch(e => {
                    loadedImagePromises[url] = null
                    resolve(url)
                })
        })
        return loadedImagePromises[url]
    } else if (url) {
        return url
    } else {
        return emptyImage
    }
}
export { cacheRequest, cacheImage }