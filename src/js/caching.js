import { get } from "svelte/store"
import { android, appID, dataStatus, progress } from "./globalValues.js"
import { isConnected } from "./others/helper.js"

let version, appIDNotChecked = true
let loadedRequestUrlPromises = {}
let loadedRequestUrls = {}

const cacheRequest = async (url, totalLength, status, getBlob) => {
    if (loadedRequestUrls[url]) {
        return loadedRequestUrls[url]
    } else if (loadedRequestUrlPromises[url]) {
        return loadedRequestUrlPromises[url]
    } else if (!window.location?.protocol?.includes?.("file")) {
        loadedRequestUrlPromises[url] = (async () => {
            // Check App ID/Version Once for Consistency
            if (appIDNotChecked) {
                appIDNotChecked = false
                version = get(appID)
            }

            let newUrl
            if (typeof version === "number") {
                newUrl = url + "?v=" + version
            }

            try {
                let response = await fetch(newUrl || url, {
                    headers: {
                        'Cache-Control': 'public, max-age=31536000, immutable',
                    },
                    cache: 'no-cache'
                })

                if (totalLength && status) {
                    const reader = response?.body?.getReader?.();
                    if (typeof (reader?.read) === "function") {
                        try {
                            response = new Response(new ReadableStream({
                                async start(controller) {
                                    let receivedLength = 0;
                                    let streamStatusTimeout, isDataStatusShowing;
                                    while (true) {
                                        const { done, value } = await reader.read()
                                        if (done) {
                                            clearTimeout(streamStatusTimeout)
                                            dataStatus.set(null)
                                            progress.set(100)
                                            return controller.close()
                                        }
                                        receivedLength += value?.byteLength || value?.length || 0;
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
                                                    if (percent >= 100) {
                                                        dataStatus.set(`100% ` + status)
                                                    } else {
                                                        dataStatus.set(`${percent.toFixed(2)}% ` + status)
                                                    }
                                                }
                                                isDataStatusShowing = false
                                            }, 17)
                                        }
                                        controller.enqueue(value)
                                    }
                                }
                            }));
                        } catch (ex) {
                            console.error(ex)
                            return await cacheRequest(url)
                        }
                    } else {
                        return await cacheRequest(url)
                    }
                }

                if (getBlob) {
                    loadedRequestUrlPromises[url] = null
                    return await response.blob()
                } else {
                    const result = await response.blob()
                    try {
                        const blobUrl = URL.createObjectURL(result);
                        loadedRequestUrls[url] = blobUrl;
                        loadedRequestUrlPromises[url] = null
                        return blobUrl
                    } catch (ex) {
                        console.error(ex)
                        loadedRequestUrlPromises[url] = null
                        return url
                    }
                }
            } catch (ex) {
                loadedRequestUrlPromises[url] = null
                if (get(android) || (await isConnected())) {
                    await new Promise((r) => setTimeout(r, 5000))
                    return await cacheRequest(url)
                } else {
                    throw new Error("Server unreachable")
                }
            }
        })();
        return loadedRequestUrlPromises[url]
    } else {
        return url
    }
}

let loadedImagePromises = {}
let loadedImages = {}
const cacheImage = (url, width, height) => {
    if (loadedImages[url]) {
        return loadedImages[url]
    } else if (loadedImagePromises[url]) {
        return loadedImagePromises[url]
    } else {
        const TOKEN = window["Kanshi.Media.Recommendations.Anilist.W~uPtWCq=vG$TR:Zl^#t<vdS]I~N70.isOwner"]
        if (typeof TOKEN === "string" && get(android)) {
            loadedImagePromises[url] = new Promise(async (resolve) => {
                let newUrl = `https://cors-anywhere-kuro.vercel.app/api/${TOKEN}?url=${url}`;
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
            // Empty Image
            return "data:image/png;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="
        }
    }
}
export { cacheRequest, cacheImage }