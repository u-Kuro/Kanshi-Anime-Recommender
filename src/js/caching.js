import { get } from "svelte/store"
import { isAndroid } from "./others/helper"
import { appID } from "./globalValues"
let loadedUrls = {}

const cacheRequest = (url) => {
    return new Promise((resolve) => {
        if (isAndroid()) {
            resolve(url)
        } else if (loadedUrls[url]) {
            resolve(loadedUrls[url])
        } else {
            url = url + "?v=" + (get(appID))
            fetch(url, {
                headers: {
                    'Cache-Control': 'max-age=31536000, immutable'
                }
            }).then(response => response.blob())
                .then(blob => {
                    let bloburl = URL.createObjectURL(blob);
                    loadedUrls[url] = bloburl
                    resolve(bloburl);
                })
                .catch(async () => {
                    resolve(url)
                })
        }
    })
}

export { cacheRequest }