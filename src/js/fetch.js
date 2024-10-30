import { get } from "svelte/store";
import { timeout } from "./utils/appUtils.js";
import { isConnected } from "./utils/deviceUtils.js";
import { appID, dataStatus, progress } from "./variables.js";

let version, appIDNotChecked = true
const loadedRequestUrlPromises = {}

const progressedFetch = (url, totalLength, status, getBlob) => {
    if (loadedRequestUrlPromises[url]) {
        return loadedRequestUrlPromises[url]
    }    
    loadedRequestUrlPromises[url] = (async () => {
        // Check App ID/Version Once for Consistency
        if (appIDNotChecked) {
            appIDNotChecked = false
            version = get(appID)
        }

        const cachedUrl = typeof version === "number" ? `${url}?v=${version}` : url

        try {
            let response = await fetch(cachedUrl)

            if (totalLength && status) {
                try {
                    response = response.body.getReader();

                    const chunks = []

                    let value,
                        done = false, 
                        receivedLength = 0,
                        streamStatusTimeout, isDataStatusShowing;
                    
                    while (true) {
                        ({ done, value } = await response.read());

                        if (done) break;

                        if (getBlob) chunks.push(value);

                        receivedLength += value?.byteLength ?? 0;

                        if (isDataStatusShowing) continue
                        isDataStatusShowing = true

                        streamStatusTimeout = setTimeout(() => {
                            const percent = (receivedLength / totalLength) * 100
                            const currentProgress = get(progress)
                            if (percent > 0 && percent <= 100
                                && (
                                    !currentProgress
                                    || percent > currentProgress
                                    || currentProgress >= 100
                                )
                            ) {
                                progress.set(percent)
                                if (percent >= 100) {
                                    dataStatus.set(`100% ` + status)
                                } else {
                                    dataStatus.set(`${percent.toFixed(2)}% ` + status)
                                }
                            }
                            isDataStatusShowing = false
                        }, 200)
                    }

                    clearTimeout(streamStatusTimeout)
                    dataStatus.set(null)
                    progress.set(30)
                    progress.set(100)

                    if (getBlob) {
                        return new Blob(chunks)
                    } else {
                        return cachedUrl
                    }
                } catch (ex) {
                    console.error(ex)
                    return await progressedFetch(url, null, null, getBlob)
                }
            } else {
                if (getBlob) {
                    return await response.blob()
                } else {
                    return cachedUrl
                }
            }
        } catch (ex) {
            console.error(ex)
            if (getBlob) {
                if (await isConnected()) {
                    await timeout(5000)
                    return await progressedFetch(url, totalLength, status, getBlob)
                } else {
                    delete loadedRequestUrlPromises[url]
                    throw new Error("Server unreachable")
                }
            } else {
                return cachedUrl
            }
        }
    })();
    return loadedRequestUrlPromises[url]
}

export { progressedFetch }