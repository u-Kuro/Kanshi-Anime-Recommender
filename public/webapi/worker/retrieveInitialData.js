
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
        if (!db) await IDBinit();

        let { initialDataBlob } = data;

        self.postMessage({ status: `Updating Existing Data` })

        if (initialDataBlob instanceof Blob) {
            initialDataBlob = await getCompressedBlobs(initialDataBlob);
            initialDataBlob.mediaUpdateAt = 1722318748
            // TODO: Add orderedMediaOptions
            await saveDataRecords(initialDataBlob)
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
function saveDataRecords(records) {
    return new Promise((resolve, reject) => {
        try {
            const transaction = db.transaction("others", "readwrite");
            transaction.oncomplete = () => {
                resolve();
            }
            const store = transaction.objectStore("others");
            let put;
            for (const key in records) {
                let data = records[key];
                if (data instanceof Blob) {
                    put = store.put(data, key);
                } else if (isJsonObject(data) || data instanceof Array) {
                    data = new Blob([JSON.stringify(data)]);
                    put = store.put(data, key);
                } else {
                    put = store.put(data, key);
                }
                put.onerror = (ex) => {
                    console.error(ex);
                    reject(ex);
                };
            }
            try {
                transaction?.commit?.();
            } catch {}
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
async function getCompressedBlobs(blob) {
    const arrayBuffer = await new Response(blob.stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
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