let db;

self.addEventListener("unhandledrejection", (event) => {
    const reason = event?.reason
    console.error(reason)
    let error = reason?.stack || reason?.message
    if (typeof error !== "string" || !error) {
        error = "Something went wrong"
    }
    self.postMessage({ error })
});

self.onmessage = async ({ data }) => {
    try {
        if (!db) await IDBInit()
        if (data.name === "aniIdsNotificationToBeUpdated") {
            let updatedAniIdsNotification = {}
            let aniIdsNotificationToBeUpdated = data?.aniIdsNotificationToBeUpdated
            if (aniIdsNotificationToBeUpdated instanceof Array && aniIdsNotificationToBeUpdated.length > 0) {
                let recommendedMediaEntries = await getIDBData("recommendedMediaEntries")
                if (recommendedMediaEntries) {
                    updatedAniIdsNotification = aniIdsNotificationToBeUpdated.reduce((result, mediaId) => {
                        let media = recommendedMediaEntries?.[mediaId]
                        if (media) {
                            let title = media?.title?.english || media?.title?.romaji || media?.title?.native;
                            let episodes = media?.episodes
                            let mediaUrl = media?.mediaUrl
                            let userStatus = media?.userStatus?.toUpperCase?.()
                            let episodeProgress = media?.episodeProgress || 0
                            result[media.id] = {
                                title: typeof title === "string" ? title : "",
                                maxEpisode: typeof episodes === "number" ? episodes : -1,
                                mediaUrl: typeof mediaUrl === "string" ? mediaUrl : "",
                                userStatus: typeof userStatus === "string" ? userStatus : "Unseen",
                                episodeProgress: typeof episodeProgress === "number" ? episodeProgress : 0
                            }
                        }
                        return result
                    }, {})
                }
            }
            self.postMessage(updatedAniIdsNotification)
        } else {
            self.postMessage(await getIDBData(data.name))
        }
    } catch (reason) {
        console.error(reason)
        let error = reason?.stack || reason?.message
        if (typeof error !== "string" || !error) {
            error = "Failed to retrieve the data"
        }
        self.postMessage({ "Failed to retrieve the data": error })
    }
}
function IDBInit() {
    return new Promise((resolve, reject) => {
        try {
            const request = indexedDB.open(
                "Kanshi.Media.Recommendations.Anilist.W~uPtWCq=vG$TR:Zl^#t<vdS]I~N70",
                2
            );
            request.onsuccess = ({ target }) => {
                db = target.result;
                resolve()
            };
            request.onupgradeneeded = ({ target }) => {
                try {
                    const { result, transaction } = target
                    const stores = [
                        // All Media
                        "mediaEntries", "excludedMediaIds", "mediaUpdateAt",
                        // Media Options
                        "mediaOptions", "orderedMediaOptions",
                        // Tag Category and Descriptions
                        "tagInfo", "tagInfoUpdateAt",
                        // User Data From AniList
                        "username", "userMediaEntries", "userMediaUpdateAt",
                        // All Recommended Media
                        "recommendedMediaEntries",
                        // User Data In App
                        "algorithmFilters", "mediaCautions", "hiddenMediaEntries",
                        "categories", "selectedCategory",
                        // User Configs In App
                        "autoPlay", "gridFullView", "showRateLimit", "showStatus",
                        "autoUpdate", "autoExport",
                        "runnedAutoUpdateAt", "runnedAutoExportAt",
                        "exportPathIsAvailable",
                        // User Configs In App
                        "shouldManageMedia", "shouldProcessRecommendedEntries",
                        // Other Info / Flags
                        "nearestMediaReleaseAiringAt",
                        "recommendationError",
                        "visited",
                        "others",
                    ]
                    for (const store of stores) {
                        result.createObjectStore(store);
                    }
                    transaction.oncomplete = () => {
                        db = result;
                        resolve();
                    }
                } catch (ex) {
                    console.error(ex);
                    reject(ex);
                    transaction.abort();
                }
            }
            request.onerror = (ex) => {
                console.error(ex);
                reject(ex);
            };
        } catch (ex) {
            console.error(ex);
            reject(ex);
        }
    })
}
function getIDBData(key) {
    return new Promise((resolve) => {
        try {
            const get = db.transaction(key, "readonly")
                .objectStore(key)
                .get(key)
            get.onsuccess = async () => {
                let value = get.result;
                if (value instanceof Blob) {
                    value = await new Response(
                        value
                        .stream()
                        .pipeThrough(new DecompressionStream("gzip"))
                    ).json()
                }
                resolve(value);
            };
            get.onerror = (ex) => {
                console.error(ex);
                resolve();
            };
        } catch (ex) {
            console.error(ex);
            resolve();
        }
    });
}
function jsonIsEmpty(obj) {
    for (const key in obj) {
        return false;
    }
    return true;
}