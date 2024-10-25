import { get } from "svelte/store"
import { android, appID, dataStatus, progress } from "./globalValues.js"
import { isConnected } from "./helper.js"

let version, appIDNotChecked = true
let loadedRequestUrlPromises = {}

const progressedFetch = async (url, totalLength, status, getBlob) => {
    if (loadedRequestUrlPromises[url]) {
        return loadedRequestUrlPromises[url]
    }
    loadedRequestUrlPromises[url] = (async () => {
        // Check App ID/Version Once for Consistency
        if (appIDNotChecked) {
            appIDNotChecked = false
            version = get(appID)
        }

        if (typeof version === "number") {
            url = url + "?v=" + version
        }

        try {
            let response = await fetch(url)

            if (totalLength && status) {
                try {
                    response = new Response(new ReadableStream({
                        async start(controller) {
                            let receivedLength = 0;
                            let streamStatusTimeout, isDataStatusShowing;
                            
                            for await (const chunk of response.body) {
                                controller.enqueue(chunk)

                                receivedLength += chunk.byteLength || chunk.length || 0;

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
                delete loadedRequestUrlPromises[url]
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