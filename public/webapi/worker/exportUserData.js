let request, db;
const maxByteSize = 64 * 1024;  // 64KB
const sendTimeThresh = 300

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
    if (!db) {
        await IDBInit();
    }
    self.postMessage({ status: "Exporting User Data" })

    if (data === "android") {
        self.postMessage({ state: 0 }) // Start Deleting Existing File
    }

    const { 
        username,
        categories,
        excludedMediaIds,
        mediaEntries
    } = await getIDBDataAsBlob([
        "username",
        "categories",
        "excludedMediaIds",
        "mediaEntries"
    ])

    if (
        !(categories instanceof Blob)
        || !(excludedMediaIds instanceof Blob)
        || !(mediaEntries instanceof Blob)
    ) {
        self.postMessage({ missingData: true })
        return
    }
    
    let backUpData = await getIDBDataAsBlob([
        "mediaUpdateAt",
        "hiddenMediaEntries",
        "algorithmFilters",
        "mediaCautions",
        "userMediaEntries",
        "userMediaUpdateAt",
        "tagInfo",
        "tagInfoUpdateAt",
    ])
    backUpData.username = username
    backUpData.categories = categories
    backUpData.excludedMediaIds = excludedMediaIds
    backUpData.mediaEntries = mediaEntries

    self.postMessage({ progress: 0 })
    
    if (data === "android") {
        backUpData = await compressBlobs(backUpData)
        const totalSize = backUpData.size,
            stream = backUpData.stream()
        let bytesSent = 0
        for await (const chunk of stream) {
            self.postMessage({
                state: 1,
                chunk,
                loaded: ((bytesSent += chunk.byteLength) / totalSize) * 100
            }, [chunk.buffer]);
        }
        await setIDBData("runnedAutoExportAt", new Date().getTime());
        self.postMessage({
            state: 2,
            username: username
        });
    } else {
        // Combine and Compress Blobs
        self.postMessage({ progress: 30 })
        backUpData = await compressBlobs(backUpData)
        const url = URL.createObjectURL(backUpData);
        await setIDBData("runnedAutoExportAt", new Date().getTime());
        self.postMessage({ status: "Data has been Exported" })
        self.postMessage({ progress: 100 })
        self.postMessage({ status: null })
        self.postMessage({ url, username });
    }
};

function isJsonObject(obj) {
    return Object.prototype.toString.call(obj) === "[object Object]"
}
const jsonIsEmpty = (obj) => {
    for (const key in obj) {
        return false;
    }
    return true;
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
function setIDBData(key, value) {
    return new Promise((resolve, reject) => {
        try {
            const transaction = db.transaction(key, "readwrite")
            const put = transaction
                .objectStore(key)
                .put(value, key);
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
function getIDBDataAsBlob(recordKeys) {
    return new Promise(async (resolve, reject) => {
        try {
            const transaction = db.transaction(recordKeys, "readonly")
            resolve(Object.fromEntries(
                (await Promise.all(
                    recordKeys.map((key) => {
                        return new Promise((resolve) => {
                            const get = transaction
                                .objectStore(key)
                                .get(key)
                            get.onsuccess = async () => {
                                let value = get.result;
                                if (value instanceof Blob) {
                                    resolve([key, value]);
                                } else if (value != null) {
                                    // Do Not Insert Undefined or it Will Cause an Exception on Parse
                                    value = await compressBlob(new Blob([JSON.stringify(value)]))
                                    resolve([key, value]);
                                } else {
                                    resolve([key]);
                                }
                            };
                            get.onerror = (ex) => {
                                console.error(ex);
                                resolve([key]);
                            };
                        })
                    })
                )).filter(([_, value]) => value != null)
            ))
        } catch (ex) {
            console.error(ex);
            reject(ex);
        }
    });
}
async function compressBlobs(blobsWithKeys) {
    const blobsArray = [];
    let totalSize = 4; // 4 bytes for number of blobs

    // Calculate total size and prepare blob array
    for (const [key, blob] of Object.entries(blobsWithKeys)) {
        const keyBlob = new Blob([key]);
        blobsArray.push({ keyBlob, blob });
        totalSize += 4 + keyBlob.size + 4 + blob.size; // 4 bytes each for key length and blob length
    }

    const combinedArrayBuffer = new ArrayBuffer(totalSize);
    const dataView = new DataView(combinedArrayBuffer);
    dataView.setUint32(0, Object.keys(blobsWithKeys).length, true);

    let offset = 4;
    for (const { keyBlob, blob } of blobsArray) {
        const keyBuffer = await keyBlob.arrayBuffer();
        const blobBuffer = await blob.arrayBuffer();

        dataView.setUint32(offset, keyBlob.size, true);
        offset += 4;
        new Uint8Array(combinedArrayBuffer).set(new Uint8Array(keyBuffer), offset);
        offset += keyBlob.size;

        dataView.setUint32(offset, blob.size, true);
        offset += 4;
        new Uint8Array(combinedArrayBuffer).set(new Uint8Array(blobBuffer), offset);
        offset += blob.size;
    }

    return await compressBlob(new Blob([combinedArrayBuffer]));
}
async function compressBlob(blob) {
    return await new Response(
        blob
        .stream()
        .pipeThrough(new CompressionStream("gzip"))
    ).blob()
}
// function splitString(str, chunkSize) {
//     let parts = [];
//     for (let i = 0; i < str.length; i += chunkSize) {
//         parts.push(str.slice(i, i + chunkSize));
//     }
//     return parts;
// }
// function JSONToBlob(object, _maxRecursion) {
//     let propertyStrings = [];
//     let chunkStr = "";
//     const maxRecursion = _maxRecursion
//     function isJsonObject(obj) {
//         return Object.prototype.toString.call(obj) === "[object Object]"
//     }
//     let completedRecursionCalls = 0
//     let startPost = performance.now()
//     function bloberize(x) {
//         if (chunkStr.length >= maxByteSize) {
//             const propertyBlob = new Blob([chunkStr]);
//             propertyStrings.push(propertyBlob);
//             chunkStr = "";
//             let progress = (completedRecursionCalls / maxRecursion)
//             if (progress < .9763) {
//                 const endPost = performance.now()
//                 if (endPost - startPost > 17) {
//                     startPost = endPost
//                     progress = progress * 100
//                     self.postMessage({ progress })
//                     if (progress > 0.01) {
//                         self.postMessage({ status: `${progress.toFixed(2)}% Exporting User Data` })
//                     }
//                 }
//             }
//         }
//         completedRecursionCalls++;
//         let first = true;
//         if (isJsonObject(x)) {
//             chunkStr += "{";
//             for (let [k, v] of Object.entries(x)) {
//                 if (v === undefined) continue;
//                 if (isJsonObject(v) || v instanceof Array) {
//                     if (first) {
//                         first = false;
//                         chunkStr += `${JSON.stringify(k)}:`;
//                     } else {
//                         chunkStr += `,${JSON.stringify(k)}:`;
//                     }
//                     bloberize(v);
//                 } else {
//                     if (first) {
//                         first = false;
//                         chunkStr += `${JSON.stringify(k)}:${JSON.stringify(v)}`;
//                     } else {
//                         chunkStr += `,${JSON.stringify(k)}:${JSON.stringify(v)}`;
//                     }
//                 }
//             }
//             chunkStr += "}";
//         } else if (x instanceof Array) {
//             chunkStr += "[";
//             for (let i = 0, l = x.length; i < l; i++) {
//                 let v = x[i];
//                 if (isJsonObject(v) || v instanceof Array) {
//                     if (first) {
//                         first = false;
//                     } else {
//                         chunkStr += ",";
//                     }
//                     bloberize(v);
//                 } else {
//                     if (first) {
//                         first = false;
//                         chunkStr += JSON.stringify(v);
//                     } else {
//                         chunkStr += `,${JSON.stringify(v)}`;
//                     }
//                 }
//             }
//             chunkStr += "]";
//         }
//     }
//     bloberize(object)
//     const propertyBlob = new Blob([chunkStr], { type: "text/plain" });
//     propertyStrings.push(propertyBlob);
//     chunkStr = "";
//     return new Blob(propertyStrings, { type: "application/json" });
// }