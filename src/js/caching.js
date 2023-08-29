import { isAndroid, hasValidOrigin, isMobile } from "./others/helper"

let loadedRequestUrlPromises = {}
let loadedRequestUrls = {}
const cacheRequest = async (url) => {
    if (loadedRequestUrls[url]) {
        return loadedRequestUrls[url]
    } else if (loadedRequestUrlPromises[url]) {
        return loadedRequestUrlPromises[url]
    } else if (hasValidOrigin(url)) {
        loadedRequestUrlPromises[url] = new Promise(async (resolve) => {
            fetch(url, {
                cache: 'force-cache'
            }).then(async response => await response.blob())
                .then(blob => {
                    try {
                        let blobUrl = URL.createObjectURL(blob);
                        loadedRequestUrls[url] = blobUrl;
                        loadedRequestUrlPromises[url] = null
                        resolve(blobUrl)
                    } catch (e) {
                        loadedRequestUrlPromises[url] = null
                        resolve(url)
                    }
                })
                .catch(() => {
                    loadedRequestUrlPromises[url] = null
                    resolve(url)
                })
        })
        return loadedRequestUrlPromises[url]
    } else {
        return url
    }
}

const emptyImage = "data:image/png;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
const android = isAndroid()
const mobile = android || isMobile()
let loadedImagePromises = {}
let loadedImages = {}
const cacheImage = (url, width, height) => {
    if (loadedImages[url]) {
        return loadedImages[url]
    } else if (loadedImagePromises[url]) {
        return loadedImagePromises[url]
    } else if (mobile && window?.location?.protocol?.includes?.('https') && hasValidOrigin(url)) {
        loadedImagePromises[url] = new Promise(async (resolve) => {
            let newUrl = url
            if (window?.location?.origin?.includes?.('https://u-kuro.github.io') && android) {
                newUrl = "https://cors-anywhere-kuro.vercel.app/api?url=" + newUrl;
            }
            fetch(newUrl, {
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