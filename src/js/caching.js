import { get } from "svelte/store"
import { appID } from "./globalValues"
import getWebVersion from "../version"
let loadedUrls = {}

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
            if (loadedUrls[url]) {
                resolve(loadedUrls[url])
            } else {
                fetch(url, {
                    headers: {
                        'Cache-Control': 'max-age=31536000, immutable'
                    }
                }).then(async response => await response.blob())
                    .then(blob => {
                        let blobUrl = URL.createObjectURL(blob);
                        loadedUrls[url] = blobUrl
                        resolve(blobUrl)
                    })
                    .catch(() => {
                        resolve(url)
                    })
            }
        }
    })
}

export { cacheRequest }