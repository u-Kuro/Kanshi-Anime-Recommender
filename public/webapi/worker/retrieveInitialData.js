
let db;
let appID

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
        if (!db) await IDBInit();

        let { initialDataBlob } = data;

        self.postMessage({ status: `Updating Existing Data` })

        if (initialDataBlob instanceof Blob) {
            initialDataBlob = await getCompressedBlobs(initialDataBlob);
            initialDataBlob.mediaUpdateAt = 1722318748
            // TODO: Add orderedMediaOptions
            await setIDBRecords(initialDataBlob)
            self.postMessage({ status: null });
            self.postMessage({ done: true });
        } else {
            const error = "Failed to retrieve initial data"
            console.error(error)
            self.postMessage({ error })
        }
    } catch (reason) {
        console.error(reason)
        let error = reason?.stack || reason?.message
        if (typeof error !== "string" || !error) {
            error = "Something went wrong"
        }
        self.postMessage({ error })
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
            console.log(Object.keys(records))
            const transaction = db.transaction(Object.keys(records), "readwrite");
            for (const key in records) {
                const store = transaction.objectStore(key);
                let value = records[key];
                let put;
                if (value instanceof Blob) {
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
function isJsonObject(obj) {
    return Object.prototype.toString.call(obj) === "[object Object]"
}
function jsonIsEmpty(obj) {
    for (const key in obj) {
        return false;
    }
    return true;
}
async function getCompressedBlobs(data) {
    const arrayBuffer = await new Response(data.stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
    const dataView = new DataView(arrayBuffer);
    let offset = 0;
    const numBlobs = dataView.getUint32(offset, true);
    offset += 4;
  
    const result = {};
    for (let i = 0; i < numBlobs; i++) {
        const keyLength = dataView.getUint32(offset, true);
        offset += 4;
        const key = new TextDecoder().decode(arrayBuffer.slice(offset, offset + keyLength));
        offset += keyLength;
    
        const blobLength = dataView.getUint32(offset, true);
        offset += 4;
        result[key] = new Blob([arrayBuffer.slice(offset, offset + blobLength)]);
        offset += blobLength;
    }

    return result;
}
function arraySum(obj) {
    return obj.reduce((a, b) => a + b, 0)
}