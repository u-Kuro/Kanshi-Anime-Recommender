import { get } from "svelte/store"
import { isAndroid } from "./others/helper"
import { appID } from "./globalValues"
import getWebVersion from "../version"
let loadedUrls = {}

const cacheRequest = (url) => {
    return new Promise(async (resolve) => {
        if (isAndroid()) {
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
        }
    })
}

export { cacheRequest }