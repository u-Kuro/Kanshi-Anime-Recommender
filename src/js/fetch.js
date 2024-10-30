import { get } from "svelte/store";
import { timeout } from "./utils/appUtils.js";
import { isConnected } from "./utils/deviceUtils.js";
import { android, appID, dataStatus, progress } from "./variables.js";

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

        try {
            let response = await fetch(typeof version === "number" ? `${url}?v=${version}` : url)

            if (totalLength && status) {
                try {
                    response = new Response(new ReadableStream({
                        async start(controller) {
                            let receivedLength = 0;
                            let streamStatusTimeout, isDataStatusShowing;
                            
                            for await (const chunk of response.body) {
                                controller.enqueue(chunk)

                                receivedLength += chunk.byteLength ?? 0;

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
                            controller.close()
                        }
                    }));
                } catch (ex) {
                    console.error(ex)
                    return await progressedFetch(url, null, null, getBlob)
                }
            }

            if (getBlob) {
                return await response.blob()
            } else {
                return url
            }
        } catch (ex) {
            console.error(ex)
            if (getBlob) {
                if (get(android) || (await isConnected())) {
                    await timeout(5000)
                    return await progressedFetch(url, null, null, getBlob)
                } else {
                    delete loadedRequestUrlPromises[url]
                    throw new Error("Server unreachable")
                }
            } else {
                return url
            }
        }
    })();
    return loadedRequestUrlPromises[url]
}

export { progressedFetch }