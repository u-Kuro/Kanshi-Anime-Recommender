import { get } from "svelte/store"
import { appID } from "./globalValues"

let loadedRequestUrlPromises = {}
let loadedRequestUrls = {}
const cacheRequest = async (url) => {
    if (loadedRequestUrls[url]) {
        return loadedRequestUrls[url]
    } else if (loadedRequestUrlPromises[url]) {
        return loadedRequestUrlPromises[url]
    } else if (!window?.location?.protocol?.includes?.("file")) {
        loadedRequestUrlPromises[url] = new Promise(async (resolve) => {
            let app_id = get(appID)
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
            }
        })
        return loadedRequestUrlPromises[url]
    } else {
        return url
    }
}

const emptyImage = "data:image/png;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
const cacheImage = (url) => {
    if (url) {
        return url
    } else {
        return emptyImage
    }
}
export { cacheRequest, cacheImage }