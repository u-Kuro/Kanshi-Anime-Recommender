import getWebVersion from "./version.js";
import { get } from "svelte/store";
import { timeout } from "./utils/appUtils.js";
import { isConnected } from "./utils/deviceUtils.js";
import { android, appID, dataStatus, progress } from "./variables.js";

let versionParameter
const getConsistentVersion = async () => {
    if (versionParameter instanceof Promise) {
        versionParameter = `?v=${await versionParameter}`
    } else if (versionParameter == null) {
        versionParameter = getWebVersion()
        appID.set(await versionParameter)
        versionParameter = `?v=${await versionParameter}`
    }
    return versionParameter
}

const fetchPromises = {}
const progressedFetch = async ({ url, totalLength, status, getBlob }) => {
    if (fetchPromises[url]) {
        return fetchPromises[url]
    }
    
    // Cache Validation Not Needed for Android
    if (!get(android) && typeof versionParameter !== "number") {
        versionParameter = await getConsistentVersion()
    }

    const { promise, resolve } = Promise.withResolvers();
    const cachedUrl = versionParameter ? url + versionParameter : url
    try {
        let response = await fetch(cachedUrl)

        if (totalLength && status) {
            try {
                response = response.body.getReader();

                const chunks = []

                let value, done = false, 
                    receivedLength = 0,
                    streamStatusTimeout, isDataStatusShowing;
                
                while (true) {
                    ({ done, value } = await response.read());

                    if (done) break;

                    if (getBlob) chunks.push(value);

                    receivedLength += value.byteLength ?? 0;

                    if (isDataStatusShowing) continue
                    isDataStatusShowing = true

                    streamStatusTimeout = setTimeout(() => {
                        const newProgress = (receivedLength / totalLength) * 100,
                            currentProgress = get(progress)
                        // Only Allow Increasing Progress
                        if (newProgress > currentProgress || currentProgress >= 100) {
                            progress.set(newProgress)
                            dataStatus.set(`${newProgress.toFixed(2)}% ` + status)
                        }
                        isDataStatusShowing = false
                    }, 200)
                }

                clearTimeout(streamStatusTimeout)
                dataStatus.set(null)
                progress.set(100)

                if (getBlob) {
                    resolve(new Blob(chunks))
                } else {
                    resolve(cachedUrl)
                }
            } catch (ex) {
                console.error(ex)
                resolve(await progressedFetch({ url, getBlob }))
            }
        } else {
            if (getBlob) {
                resolve(await response.blob())
            } else {
                resolve(cachedUrl)
            }
        }
    } catch (ex) {
        console.error(ex)
        if (getBlob) {
            if (await isConnected()) {
                await timeout(5000)
                resolve(await progressedFetch({ url, totalLength, status, getBlob }))
            } else {
                delete fetchPromises[url]
                throw new Error("Server unreachable")
            }
        } else {
            return cachedUrl
        }
    }
    fetchPromises[url] = promise
    return await fetchPromises[url];
}

export { progressedFetch }