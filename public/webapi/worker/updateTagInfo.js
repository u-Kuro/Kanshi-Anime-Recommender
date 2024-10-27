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
    if (data?.connected != null) {
        connected = data?.connected;
        return
    }
    if (server == null && data?.server != null) {
        server = data.server
    }
    if (!db) await IDBInit();
    const {
        tagInfo,
        tagInfoUpdateAt
    } = await getIDBRecords([
        "tagInfo",
        "tagInfoUpdateAt"
    ])
    if (tagInfoUpdateAt > 0 && hasTagInfoData(tagInfo)) {
        const tagInfoUpdateAtDate = new Date(tagInfoUpdateAt * 1e3);
        const currentDate = new Date;
        const currentYear = currentDate.getFullYear();
        const seasons = {
            Winter: new Date(parseInt(currentYear), 0, 1),
            Spring: new Date(parseInt(currentYear), 3, 1),
            Summer: new Date(parseInt(currentYear), 6, 1),
            Fall: new Date(parseInt(currentYear), 9, 1)
        };
        let shouldUpdateTagInfo;
        if (currentDate >= seasons.Winter && currentDate < seasons.Spring) {
            shouldUpdateTagInfo = tagInfoUpdateAtDate < seasons.Winter
        } else if (currentDate >= seasons.Spring && currentDate < seasons.Summer) {
            shouldUpdateTagInfo = tagInfoUpdateAtDate < seasons.Spring
        } else if (currentDate >= seasons.Summer && currentDate < seasons.Fall) {
            shouldUpdateTagInfo = tagInfoUpdateAtDate < seasons.Summer
        } else {
            shouldUpdateTagInfo = tagInfoUpdateAtDate < seasons.Fall
        }
        if (shouldUpdateTagInfo) {
            getTagInfoData(tagInfo)
        } else {
            self.postMessage({
                done: true
            })
        }
    } else {
        getTagInfoData()
    }
};
async function getTagInfoData(tagInfo) {
    try {
        const response = await fetch("https://graphql.anilist.co", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify({
                query: `{MediaTagCollection{name category description}}`
            })
        });
        const result = await response?.json?.();
        const mediaTagCollection = result?.data?.MediaTagCollection || [];
        for (let i = 0, l = mediaTagCollection?.length; i < l; i++) {
            const tagCollected = mediaTagCollection?.[i];
            const description = tagCollected?.description;
            let category = tagCollected?.category;
            let tag = tagCollected?.name;
            if (typeof tag === "string" && typeof category !== "string" && tag && category) {
                if (!isJsonObject(tagInfo)) {
                    tagInfo = {};
                    tagInfo[category] = {}
                } else if (!isJsonObject(tagInfo?.[category])) {
                    tagInfo[category] = {}
                }
                if (description && typeof description === "string") {
                    tagInfo[category][tag] = description
                }
            }
        }
        if (isJsonObject(tagInfo) && !jsonIsEmpty(tagInfo)) {
            await setIDBRecords({
                tagInfo,
                tagInfoUpdateAt: parseInt((new Date).getTime() / 1e3)
            });
            if (data.getTagInfo) {
                self.postMessage({
                    tagInfo
                })
            } else {
                self.postMessage({
                    done: true
                })
            }
        } else {
            self.postMessage({
                done: true
            })
        }
    } catch {
        if (!await isConnected()) {
            self.postMessage({
                done: true
            })
        } else {
            setTimeout(() => getTagInfoData(tagInfo), 6e4)
        }
    }
}
function hasTagInfoData(tagInfo) {
    for (let category in tagInfo) {
        for (let tag in tagInfo[category]) {
            return typeof tagInfo[category][tag] === "string"
        }
        return false
    }
    return false
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
                    db = result;
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
                        db.createObjectStore(store);
                    }
                    transaction.oncomplete = () => {
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
function setIDBRecords(records) {
    return new Promise(async (resolve, reject) => {
        try {
            const transaction = db.transaction(Object.keys(records), "readwrite");
            for (const key in records) {
                const store = transaction.objectStore(key);
                let value = records[key];
                let put;
                if (value instanceof Blob) {
                    value = await new Response(
                        value
                        .stream()
                        .pipeThrough(new CompressionStream("gzip"))
                    ).blob()
                    put = store.put(value, key);
                } else if (isJsonObject(value) || value instanceof Array) {
                    value = await new Response(
                        new Blob([JSON.stringify(value)])
                        .stream()
                        .pipeThrough(new CompressionStream("gzip"))
                    ).blob()
                    put = store.put(value, key);
                } else {
                    put = store.put(value, key);
                }
                put.onerror = (ex) => {
                    console.error(ex);
                    reject(ex);
                    transaction.abort();
                };
            }
            transaction.oncomplete = () => resolve()
        } catch (ex) {
            console.error(ex);
            reject(ex);
        }
    });
}
function getIDBRecords(recordKeys) {
    return new Promise(async (resolve) => {
        try {
            const transaction = db.transaction(recordKeys, "readonly")
            resolve(Object.fromEntries(
                await Promise.all(
                    recordKeys.map((key) => {
                        return new Promise((resolve) => {
                            const get = transaction
                                .objectStore(key)
                                .get(key)
                            get.onsuccess = async () => {
                                let value = get.result;
                                if (value instanceof Blob) {
                                    value = await new Response(
                                        value
                                        .stream()
                                        .pipeThrough(new CompressionStream("gzip"))
                                    ).json()
                                }
                                resolve([key, value]);
                            };
                            get.onerror = (ex) => {
                                console.error(ex);
                                resolve([key]);
                            };
                        })
                    })
                )
            ))
        } catch (ex) {
            console.error(ex);
            resolve();
        }
    });
}
function isJsonObject(obj) {
    return Object.prototype.toString.call(obj) === "[object Object]"
}
function jsonIsEmpty(obj) {
    for (const key in obj) return false;
    return true
}
function isConnected(url = server) {
    if (typeof url === "string" && url !== "") {
        return new Promise(async resolve => {
            if (await checkConnection(url)) return resolve(true);
            else await new Promise(r => setTimeout(r, 5e3));
            return resolve(await checkConnection(url))
        })
    } else {
        const $connected = connected;
        if (typeof $connected === "boolean") {
            connected = null;
            return $connected
        } else {
            self.postMessage({
                getConnectionState: true
            });
            return true
        }
    }
}
async function checkConnection(url) {
    try {
        if (navigator?.onLine !== false) {
            const response = await fetch(url, {
                method: "HEAD",
                cache: "no-store"
            });
            return response?.ok
        }
    } catch {}
    return false
}