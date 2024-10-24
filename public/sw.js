const UNIQUE_KEY = "Dev" + "Kanshi.Media.Recommendations.Anilist.W~uPtWCq=vG$TR:Zl^#t<vdS]I~N70",
    CHUNK_SIZE = 1024,
    ENCODER = new TextEncoder(),
    DECODER = new TextDecoder()
    
var db,
    entries

self.addEventListener("fetch", event => {
    const request = event.request
    const { pathname, searchParams } = new URL(request.url)
    if (pathname.endsWith("/category/media")) {
    } else if (pathname.endsWith("/category/media")) {
    } else if (pathname.endsWith("/media")) {
        const id = searchParams.get("id")
        if (searchParams.has("keys")) {
            try {
                return event.respondWith(getMedia(id, JSON.parse(searchParams.get("keys"))))
            } catch {}
        }
        event.respondWith(getMedia(id))
    } else if (pathname.endsWith("/genre")) {
    } else if (pathname.endsWith("/tag")) {
    } else if (pathname.endsWith("/studio")) {
    } else if (pathname.endsWith("/categories")) {
    } else if (pathname.endsWith("/get")) {
        event.respondWith(getData(searchParams.get("key"), request))
    } else if (pathname.endsWith("/set")) {
        event.respondWith(setData(searchParams.get("key"), request))
    } else if (pathname.endsWith("/initial-check")) {
        console.log(event.clientId)
        event.respondWith(requestInitialData(event.clientId))
    }
})

async function getMedia(id, keys = []) {
    await checkEntries()
    if (keys.length) {
        const obj = {}
        for (const key of keys) {
            if (entries[id][key] != null) {
                obj[key] = entries[id][key]
            }
        }
        return getResponse(obj)
    }
    return getResponse(entries[id])
}
async function getData(key, request) {
    await checkIDB()
    let data
    if (key === "mediaEntriesIsEmpty") {
        entries = await retrieveData("mediaEntries")
        data = jsonIsEmpty(entries)
    } else if (key === "username") {
        data = await retrieveData("userData")?.username || ""
    } else if (key === "recommendedMediaListIsEmpty") {
        data = jsonIsEmpty(await retrieveData("recommendedMediaList"))
    } else if (key === "aniIdsNotificationToBeUpdated") {
        data = {}
        const aniIdsNotificationToBeUpdated = await request.json()
        if (aniIdsNotificationToBeUpdated instanceof Array && aniIdsNotificationToBeUpdated.length > 0) {
            const recommendedMediaList = await retrieveData("recommendedMediaList")
            if (recommendedMediaList) {
                aniIdsNotificationToBeUpdated.forEach((mediaId) => {
                    const media = recommendedMediaList[mediaId]
                    if (media) {
                        const title = media?.title?.english || media?.title?.romaji || media?.title?.native;
                        const episodes = media?.episodes
                        const mediaUrl = media?.mediaUrl
                        const userStatus = media?.userStatus?.toUpperCase?.()
                        const episodeProgress = media?.episodeProgress || 0
                        data[media.id] = {
                            title: typeof title === "string" ? title : "",
                            maxEpisode: typeof episodes === "number" ? episodes : -1,
                            mediaUrl: typeof mediaUrl === "string" ? mediaUrl : "",
                            userStatus: typeof userStatus === "string" ? userStatus : "Unseen",
                            episodeProgress: typeof episodeProgress === "number" ? episodeProgress : 0
                        }
                    }
                })
            }
        }
    } else {
        data = await retrieveData(key)
    }
    return getResponse(data)
}
async function setData(key, request) {
    await checkIDB()
    const data = await request.json()
    await saveData(key, data)
    return new Response(null)
}

async function requestInitialData(clientId) {
    await checkIDB()
    const initalData = await Promise.all([
        retrieveData("mediaEntries"),
        retrieveData("excludedEntries"),
        retrieveData("orderedMediaOptions"),
        retrieveData("tagInfo"),
    ])
    do {
        if (
            jsonIsEmpty(initalData[0]) || !isJsonObject(initalData[0])
            || jsonIsEmpty(initalData[1]) || !isJsonObject(initalData[1])
            || jsonIsEmpty(initalData[2]) || !isJsonObject(initalData[2])
            || jsonIsEmpty(initalData[3]) || !isJsonObject(initalData[3])
        ) {
            const response = await progressedFetch({
                url: "/data/initial-data.gzip",
                message: "Getting Anime, Manga, and Novel Entries",
                size: 37014496,
                clientId
            })
            if (response.ok) {
                let { 
                    mediaEntries,
                    excludedEntries,
                    orderedMediaOptions,
                    tagInfo
                } = await getCompressedBlobs(response.body);
                // TODO: Add orderedMediaOptions
                await saveDataRecords({ mediaEntries, excludedEntries, orderedMediaOptions, tagInfo })
                // orderedMediaOptions = await decompressBlobToJSON(orderedMediaOptions);
                tagInfo = await decompressBlobToJSON(tagInfo);
                (async () => {
                    try {
                        entries = mediaEntries = await decompressBlobToJSON(mediaEntries);
                    } catch (error) { console.error(error) }
                })()
                return getResponse({ orderedMediaOptions, tagInfo });
            }
        } else {
            entries = initalData[0]  
            return getResponse({
                orderedMediaOptions: initalData[2],
                tagInfo: initalData[3]
            })
        }
    } while (false)
    throw new Error("Failed to fetch gzip file");
}

async function checkEntries() {
    await checkIDB()
    if (!entries) entries = await retrieveData("mediaEntries")
}
async function checkIDB() {
    if (!db) await openIDB()
}

function openIDB() {
    return new Promise((resolve, reject) => {
        try {
            const request = indexedDB.open(UNIQUE_KEY, 1)
            request.onupgradeneeded = event => {
                db = event.target.result
                db.createObjectStore("others")
            }
            request.onsuccess = event => {
                db = event.target.result
                resolve()
            }
            request.onerror = () => { throw null }
        } catch {
            reject("Error opening IndexedDB")
        }
    })
}
function saveDataRecords(records) {
    return new Promise((resolve, reject) => {
        try {
            let transaction = db.transaction("others", "readwrite")
            transaction.oncomplete = () => { resolve() }
            try {
                const store = transaction.objectStore("others")
                for (const key in records) {
                    store.put(records[key], key)
                    .onerror = (ex) => {
                        console.error(ex);
                        reject(ex);
                    }
                }
            } catch (ex) {
                console.error(ex);
                reject(ex);
            }
        } catch (ex) {
            console.error(ex);
            reject(ex);
        }
    });
}
function saveData(key, data) {
    return new Promise((resolve, reject) => {
        try {
            let transaction = db.transaction("others", "readwrite")
            transaction.oncomplete = () => { resolve() }
            try {
                const store = transaction.objectStore("others")
                store.put(data, key)
                .onerror = (ex) => {
                    console.error(ex);
                    reject(ex);
                }
            } catch (ex) {
                console.error(ex);
                reject(ex);
            }
        } catch (ex) {
            console.error(ex);
            reject(ex);
        }
    });
}
function retrieveData(key) {
    return new Promise((resolve) => {
        try {
            const get = db
                .transaction("others", "readonly")
                .objectStore("others")
                .get(key)
            get.onsuccess = async () => {
                const result = get.result
                if (result instanceof Blob) {
                    resolve(await decompressBlobToJSON(result))
                } else if (result instanceof ArrayBuffer) {
                    resolve(JSON.parse(DECODER.decode(result)))
                } else {
                    resolve(result)
                }
            }
            get.onerror = (error) => { throw error }
        } catch (error) {
            console.error(error)
            resolve()
        }
    });
}

async function progressedFetch({ url, clientId, size, message }) {
    const response = await fetch(url);
    let loaded = 0;
    return new Response(new ReadableStream({
        async start(controller) {
            for await (const chunk of response.body) {
                loaded += chunk.length;
                if (clientId) {
                    const client = await self.clients.get(clientId);
                    if (client) {
                        client.postMessage({
                            type: "progress",
                            percent: (loaded / size) * 100,
                            message
                        });
                    }
                } else {
                    // Not Ideal
                    // If clientId is not available (rare case), find the client by URL
                    // const clients = await self.clients.matchAll();
                    // for (const client of clients) {
                    //     // Check if this client's URL matches the request's referrer
                    //     if (client.url === request.referrer) {
                    //         client.postMessage({
                    //         type: 'download_progress',
                    //         progress: progress.toFixed(2),
                    //         loaded,
                    //         total: contentLength,
                    //         url: request.url
                    //         });
                    //         break;
                    //     }
                    // }
                }
                controller.enqueue(chunk);
            }
            controller.close()
        }
    }));
}

function getResponse(data, getSize) {
    const stringed = JSON.stringify(data)
    const headers = { "Content-Type": "application/json" }
    if (getSize) { headers["Content-Length"] = ENCODER.encode(stringed).length }
    return new Response(stringed, { headers })
}

self.addEventListener("message", event => {
    if (event.data && event.data === "MESSAGE") {
        // TODO   
    }
})

// On install: Skip caching and immediately activate the service worker
self.addEventListener("install", () => {
    self.skipWaiting()
})

// On activate: Ensure the service worker takes control of clients immediately
self.addEventListener("activate", async () => {
    self.clients.claim()
})

// UTILS
function isJsonObject(obj) {
    return Object.prototype.toString.call(obj) === "[object Object]"
}
function jsonIsEmpty(obj) {
    for (const key in obj) return false;
    return true;
}
async function combineBlobs(blobsWithKeys) {
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

    return new Blob([combinedArrayBuffer]);
}
async function getCompressedBlobs(data) {
    const arrayBuffer = await pipeThroughGzipResponse(data).arrayBuffer();
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
async function compressArrayBuffer(arrayBuffer) {
    new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(arrayBuffer)); // Convert ArrayBuffer to Uint8Array and enqueue
          controller.close(); // Signal that the stream is complete
        }
      });
    return await new Res
}
async function compressBlob(blob) {
    return await new Response(blob.stream()).blob();
}
async function decompressBlob(blob) {
    return await new Response(blob.stream()).blob();
}
async function decompressBlobToJSON(blob) {
    return await new Response(blob.stream()).json();
}
function pipeThroughGzipResponse(data) {
    return new Response(data.pipeThrough(new DecompressionStream("gzip")))
}

  