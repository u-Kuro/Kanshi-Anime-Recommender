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
        if (!db) await IDBinit()
        if (data.name === "checkInitialData") {
            self.postMessage(
                await checkData("mediaEntries")
                || await checkData("excludedEntries")
                || await checkData("orderedMediaOptions")
                || await checkData("tagInfo")
            )
        } else if (data.name === "username") {
            const userData = await retrieveJSON("userData")
            self.postMessage((userData?.username ?? await retrieveJSON("username")) || "")
        } else if (data.name === "recommendedMediaListIsEmpty") {
            self.postMessage(await checkData("recommendedMediaList"))
        } else if (data.name === "aniIdsNotificationToBeUpdated") {
            let updatedAniIdsNotification = {}
            let aniIdsNotificationToBeUpdated = data?.aniIdsNotificationToBeUpdated
            if (aniIdsNotificationToBeUpdated instanceof Array && aniIdsNotificationToBeUpdated.length > 0) {
                let recommendedMediaList = await retrieveJSON("recommendedMediaList")
                if (recommendedMediaList) {
                    updatedAniIdsNotification = aniIdsNotificationToBeUpdated.reduce((result, mediaId) => {
                        let media = recommendedMediaList?.[mediaId]
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
        } else if (data.name) {
            self.postMessage(await retrieveJSON(data.name))
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
function IDBinit() {
    return new Promise((resolve) => {
        let request = indexedDB.open(
            "Kanshi.Media.Recommendations.Anilist.W~uPtWCq=vG$TR:Zl^#t<vdS]I~N70",
            1
        );
        request.onsuccess = (event) => {
            db = event.target.result;
            resolve()
        };
        request.onupgradeneeded = (event) => {
            db = event.target.result;
            db.createObjectStore("others");
            event.target.transaction.oncomplete = () => {
                resolve();
            }
        }
        request.onerror = (error) => {
            console.error(error);
        };
    })
}
function checkData(name) {
    return new Promise((resolve) => {
        try {
            let get = db
                .transaction("others", "readonly")
                .objectStore("others")
                .get(name);
            get.onsuccess = () => {
                return resolve(get.result !== undefined)
            };
            get.onerror = (ex) => {
                console.error(ex);
                resolve(false);
            };
        } catch (ex) {
            console.error(ex);
            resolve(false);
        }
    });
}
function retrieveJSON(name) {
    return new Promise((resolve) => {
        try {
            let get = db
                .transaction("others", "readonly")
                .objectStore("others")
                .get(name);
            get.onsuccess = () => {
                let result = get.result;
                if (result instanceof Blob) {
                    result = JSON.parse((new FileReaderSync()).readAsText(result));
                } else if (result instanceof ArrayBuffer) {
                    result = JSON.parse((new TextDecoder()).decode(result));
                }
                resolve(result);
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