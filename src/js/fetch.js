import { get } from "svelte/store";
import { isConnected } from "./utils/deviceUtils.js";
import { android, appID, dataStatus, progress } from "./globalValues.js";

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
            let response = await fetch(typeof version === "number" ? url : url + "?" + version)

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
                            progress.set(100)
                            controller.close()
                        }
                    }));
                } catch (ex) {
                    console.error(ex)
                    return await progressedFetch(url)
                }
            }

            if (getBlob) {
                return await response.blob()
            } else {
                return url
            }
        } catch (ex) {
            delete loadedRequestUrlPromises[url]
            if (get(android) || (await isConnected())) {
                await new Promise((r) => setTimeout(r, 5000))
                return await progressedFetch(url)
            } else {
                throw new Error("Server unreachable")
            }
        }
    })();
    return loadedRequestUrlPromises[url]
}

export { progressedFetch }