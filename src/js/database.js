import { get } from "svelte/store";
import { android, isBackgroundUpdateKey, uniqueKey } from "./globalValues";
import { isJsonObject } from "./utils/dataUtils.js";

let db
const IDBInit = () => {
    return new Promise((resolve, reject) => {
        try {
            const request = indexedDB.open(
                get(uniqueKey),
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
const hasIDBData = (recordKeys) => {
    return new Promise(async (resolve) => {
        try {
            if (!db) await IDBInit()
            const transaction = db.transaction(recordKeys, "readonly")
            resolve((
                await Promise.all(
                    recordKeys.map((key) => {
                        return new Promise((resolve) => {
                            const getKey = transaction
                                .objectStore(key)
                                .getKey(key)
                            getKey.onsuccess = async () => {
                                resolve(getKey.result !== undefined);
                            };
                            getKey.onerror = (ex) => {
                                console.error(ex);
                                resolve(false);
                            };
                        })
                    })
            )).every(exists => exists))
        } catch (ex) {
            console.error(ex)
            resolve(false)
        }
    })
}
const getIDBData = (key) => {
    return new Promise(async (resolve) => {
        try {
            if (!db) await IDBInit()
            const get = db.transaction(key, "readonly")
                .objectStore(key)
                .get(key)
            get.onsuccess = async () => {
                let value = get.result;
                if (value instanceof Blob) {
                    value = await new Response(
                        value
                        .stream()
                        .pipeThrough(new CompressionStream("gzip"))
                    ).blob()
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
const getIDBRecords = (recordKeys) => {
    return new Promise(async (resolve) => {
        try {
            if (!db) await IDBInit()
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
                                    ).blob()
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
const setIDBData = (key, value, isImportant) => {
    if (get(android) && window[get(isBackgroundUpdateKey)] === true && !isImportant) return
    return new Promise(async (resolve, reject) => {
        if (!db) await IDBInit()
        try {
            const transaction = db.transaction(key, "readwrite")
            const store = transaction.objectStore(key)
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
            transaction.oncomplete = () => resolve()
        } catch (ex) {
            console.error(ex);
            reject(ex);
        }
    });
}
// const setIDBRecords = (records, isImportant) => {
//     if (get(android) && window[get(isBackgroundUpdateKey)] === true && !isImportant) return
//     return new Promise(async (resolve, reject) => {
//         if (!db) await IDBInit()
//         try {
//             const transaction = db.transaction(Object.keys(records), "readwrite");
//             for (const key in records) {
//                 const store = transaction.objectStore(key);
//                 let value = records[key];
//                 let put;
//                 if (value instanceof Blob) {
//                     value = await new Response(
//                         value
//                         .stream()
//                         .pipeThrough(new CompressionStream("gzip"))
//                     ).blob()
//                     put = store.put(value, key);
//                 } else if (isJsonObject(value) || value instanceof Array) {
//                     value = await new Response(
//                         new Blob([JSON.stringify(value)])
//                         .stream()
//                         .pipeThrough(new CompressionStream("gzip"))
//                     ).blob()
//                     put = store.put(value, key);
//                 } else {
//                     put = store.put(value, key);
//                 }
//                 put.onerror = (ex) => {
//                     console.error(ex);
//                     reject(ex);
//                     transaction.abort();
//                 };
//             }
//             transaction.oncomplete = () => resolve()
//         } catch (ex) {
//             console.error(ex);
//             reject(ex);
//         }
//     });
// }
const getLSData = (key) => {
    try {
        let data;
        key = get(uniqueKey) + key;
        let value = localStorage.getItem(key)
        data = JSON.parse(value)
        return data
    } catch { }
}
const setLSData = async (key, value) => {
    localStorage.setItem(get(uniqueKey) + key, JSON.stringify(value))
}
const removeLSData = (key) => {
    try {
        localStorage.removeItem(get(uniqueKey) + key);
    } catch { }
}
export { 
    hasIDBData,
    getIDBData,
    setIDBData,
    getIDBRecords,
    // setIDBRecords,
    getLSData,
    setLSData,
    removeLSData
}