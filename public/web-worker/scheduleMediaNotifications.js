let db, server, connected;
self.addEventListener("unhandledrejection", event => {
    const reason = event?.reason;
    console.error(reason);
    let error = reason?.stack || reason?.message;
    if (typeof error !== "string" || !error) {
        error = "Something went wrong"
    }
    self.postMessage({
        error: error
    })
});
self.onmessage = async ({
    data
}) => {
    if (!db) await IDBInit();
    const recommendedMediaEntriesArray = Object.values(await getIDBData("recommendedMediaEntries") || {}),
        currentDateAt = Math.floor((new Date().getTime() / 1000)),
        dayInMillis = 1000 * 60 * 60 * 24,
        mediaReleaseNotifications = [];
    let nearestMediaReleaseAiringAt
    // Handle Media Release Dates
    for (let i = 0; i < recommendedMediaEntriesArray.length; i++) {
        const {
            media: {
                id,
                title,
                coverImageUrl,
                mediaUrl,
                userStatus,
                weightedScore,
                episodes,
                episodeProgress,
                nextAiringEpisode
            } = {},
        } = recommendedMediaEntriesArray[i]
        if (!isJsonObject(nextAiringEpisode)) continue

        const {
            episode,
            airingAt,
            estimated
        } = nextAiringEpisode
        if (estimated) continue

        const {
            english,
            romaji,
            native
        } = title || {}

        const releaseDateMillis = airingAt * 1000
        if (isValidNumber(episode) && isValidDateTime(releaseDateMillis)) {
            // Refresh List on Media Release
            if (
                new Date(releaseDateMillis) > new Date()
                && airingAt > currentDateAt
                && (nearestMediaReleaseAiringAt > airingAt || nearestMediaReleaseAiringAt == null)
            ) {
                nearestMediaReleaseAiringAt = airingAt
            }
            // Add Media Release Notification
            if (
                (userStatus !== "Unseen" || weightedScore > 0.01)
                && releaseDateMillis >= (new Date().getTime() - dayInMillis)
            ) {
                const $title = english || romaji || native,
                    $imageURL = coverImageUrl || "",
                    $episodeProgress = episodeProgress || 0
                mediaReleaseNotifications.push({
                    id,
                    title: typeof $title === "string" ? $title : "",
                    releaseEpisode: episode,
                    maxEpisode: typeof episodes === "number" ? episodes : -1,
                    releaseDateMillis,
                    userStatus: typeof userStatus === "string" ? userStatus : "Unseen",
                    imageURL: typeof $imageURL === "string" ? $imageURL : "",
                    mediaUrl: typeof mediaUrl === "string" ? mediaUrl : "",
                    episodeProgress: typeof $episodeProgress === "number" ? $episodeProgress : 0
                })
            }
        }
    }
    self.postMessage({
        nearestMediaReleaseAiringAt,
        mediaReleaseNotificationsBlob: await compressBlob(new Blob([JSON.stringify(mediaReleaseNotifications)])),
    })
};
function IDBInit() {
    return new Promise((resolve, reject) => {
        try {
            const request = indexedDB.open(
                "Kanshi.Media.Recommendations.AniList.W~uPtWCq=vG$TR:Zl^#t<vdS]I~N70",
                1
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
                        "mediaEntries", "mediaEntriesInfo", "excludedMediaIds", "mediaUpdateAt",
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
async function compressBlob(blob) {
    return await new Response(
        blob
        .stream()
        .pipeThrough(new CompressionStream("gzip"))
    ).blob()
}
function isJsonObject(obj) {
    return Object.prototype.toString.call(obj) === "[object Object]"
}
function isValidNumber(num) {
    return typeof num === "number" && !isNaN(num) && isFinite(num) && num <= Number.MAX_SAFE_INTEGER
}
function isValidDateTime(dateTime) {
    return typeof dateTime === "number" && !isNaN(new Date(dateTime))
}