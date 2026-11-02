import { get } from "svelte/store";
import { isJsonObject } from "./utils/dataUtils.js";
import { androidBackground, uniqueKey } from "./variables.js";

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
                    const stores = [
                        // All Media
                        "mediaEntries", "mediaEntriesInfo", "excludedMediaIds",
                        "userListMediaUpdateAt", "currentMediaUpdateAt", "releasingMediaUpdateAt", "waitingMediaUpdateAt", "otherMediaUpdateAt",
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
                        if (!result.objectStoreNames.contains(store)) {
                            result.createObjectStore(store);
                        }
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
const compressIDBValue = async (value) => {
    if (isJsonObject(value) || Array.isArray(value)) {
        const json = JSON.stringify(value);
        if (json === undefined) {
            throw new TypeError("Value cannot be serialized as JSON");
        }
        value = new Blob([json]);
    }

    if (value instanceof Blob) {
        return new Response(
            value.stream().pipeThrough(new CompressionStream("gzip"))
        ).blob();
    }

    return value;
};

const decompressIDBValue = async (value) => {
    if (!(value instanceof Blob)) return value;

    return new Response(
        value.stream().pipeThrough(new DecompressionStream("gzip"))
    ).json();
};

const getIDBRequestValue = (request) => new Promise(resolve => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = event => {
        console.error(request.error || event);
        resolve(undefined);
    };
});

const getIDBData = async (key) => {
    try {
        if (!db) await IDBInit();
        const request = db.transaction(key, "readonly")
            .objectStore(key)
            .get(key);
        return await decompressIDBValue(await getIDBRequestValue(request));
    } catch (error) {
        console.error(error);
        return undefined;
    }
};

const getIDBRecords = async (recordKeys) => {
    try {
        if (!db) await IDBInit();
        if (recordKeys.length === 0) return {};

        const transaction = db.transaction(recordKeys, "readonly");
        const storedValues = await Promise.all(recordKeys.map(key =>
            getIDBRequestValue(transaction.objectStore(key).get(key))
        ));

        const entries = [];
        for (let i = 0; i < recordKeys.length; i++) {
            entries.push([
                recordKeys[i],
                await decompressIDBValue(storedValues[i])
            ]);
        }

        return Object.fromEntries(entries);
    } catch (error) {
        console.error(error);
        return undefined;
    }
};

const setIDBData = async (key, value, isImportant) => {
    if (get(androidBackground) && !isImportant) return;

    try {
        if (!db) await IDBInit();
        const storedValue = await compressIDBValue(value);

        await new Promise((resolve, reject) => {
            const transaction = db.transaction(key, "readwrite");
            transaction.objectStore(key).put(storedValue, key);
            transaction.oncomplete = resolve;
            transaction.onabort = () => reject(
                transaction.error || new Error("IndexedDB write transaction aborted")
            );
            transaction.onerror = () => reject(
                transaction.error || new Error("IndexedDB write transaction failed")
            );
        });
    } catch (error) {
        console.error(error);
        throw error;
    }
};
// const setIDBRecords = async (records, isImportant) => {
//     if (get(androidBackground) && !isImportant) return;
//
//     try {
//         if (!db) await IDBInit();
//
//         const entries = Object.entries(records);
//         if (entries.length === 0) return;
//
//         const storedEntries = [];
//         for (const [key, value] of entries) {
//             storedEntries.push([key, await compressIDBValue(value)]);
//         }
//
//         await new Promise((resolve, reject) => {
//             const transaction = db.transaction(
//                 storedEntries.map(([key]) => key),
//                 "readwrite"
//             );
//
//             transaction.oncomplete = resolve;
//             transaction.onabort = () => reject(
//                 transaction.error || new Error("IndexedDB write transaction aborted")
//             );
//             transaction.onerror = () => reject(
//                 transaction.error || new Error("IndexedDB write transaction failed")
//             );
//
//             for (const [key, storedValue] of storedEntries) {
//                 transaction.objectStore(key).put(storedValue, key);
//             }
//         });
//     } catch (error) {
//         console.error(error);
//         throw error;
//     }
// };
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