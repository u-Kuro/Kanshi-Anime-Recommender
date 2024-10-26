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
        await IDBinit();
    }
    self.postMessage({ status: "Exporting User Data" })

    if (data === "android") {
        self.postMessage({ state: 0 }) // Start Deleting Existing File
    }

    const userData = await retrieveJSON("userData")
    let username
    if (userData?.userEntries instanceof Array && userData?.userEntries?.length > 0) {
        username = userData?.username;
    }

    const userList = await retrieveJSON("userList")

    const excludedEntries = await retrieveJSON("excludedEntries")
    const mediaEntries = await retrieveJSON("mediaEntries")

    if (
        (!isJsonObject(userList) || jsonIsEmpty(userList))
        || (!isJsonObject(excludedEntries) || jsonIsEmpty(excludedEntries))
        || (!isJsonObject(mediaEntries) || jsonIsEmpty(mediaEntries))
    ) {
        self.postMessage({ missingData: true })
        return
    }
    let backUpData = {
        userData,
        mediaUpdateAt: await retrieveJSON("mediaUpdateAt"),
        userMediaUpdateAt: await retrieveJSON("userMediaUpdateAt"),
        tagInfo: await retrieveJSON("tagInfo"),
        userList,
        algorithmFilters: await retrieveJSON("algorithmFilters"),
        excludedEntries,
        mediaEntries,
    };
    self.postMessage({ progress: 0 })
    let maxRecursion = 0;
    function countRecursiveCalls(x) {
        maxRecursion++;
        if (isJsonObject(x)) {
            for (const value of Object.values(x)) {
                if (value === undefined) continue
                if (isJsonObject(value) || value instanceof Array) {
                    countRecursiveCalls(value);
                }
            }
        } else if (x instanceof Array) {
            for (let i = 0, l = x.length; i < l; i++) {
                let value = x[i]
                if (isJsonObject(value) || value instanceof Array) {
                    countRecursiveCalls(value);
                }
            }
        }
    }
    countRecursiveCalls(backUpData)
    if (data === "android") {
        let chunkStr = ""
        let completedRecursionCalls = 0;
        let startPost = performance.now()
        function stringify(x) {
            if (chunkStr.length >= maxByteSize) {
                const endPost = performance.now()
                if (endPost - startPost > sendTimeThresh) {
                    startPost = endPost
                    self.postMessage({
                        chunk: chunkStr,
                        state: 1
                    })
                    chunkStr = ""
                    let progress = (completedRecursionCalls / maxRecursion)
                    if (progress < .9763) {
                        progress = progress * 0.5 * 100 
                        self.postMessage({ progress })
                        if (progress > 0.01) {
                            self.postMessage({ status: `${progress.toFixed(2)}% Exporting User Data` })
                        }
                    }
                }
            }
            completedRecursionCalls++;
            let first = true;
            if (isJsonObject(x)) {
                chunkStr += "{"
                for (const [k, v] of Object.entries(x)) {
                    if (v === undefined) continue
                    if (isJsonObject(v) || v instanceof Array) {
                        if (first) {
                            first = false
                            chunkStr += `${JSON.stringify(k)}:`
                        } else {
                            chunkStr += `,${JSON.stringify(k)}:`
                        }
                        stringify(v);
                    } else {
                        if (first) {
                            first = false
                            chunkStr += `${JSON.stringify(k)}:${JSON.stringify(v)}`
                        } else {
                            chunkStr += `,${JSON.stringify(k)}:${JSON.stringify(v)}`
                        }
                    }
                }
                chunkStr += "}"
            } else if (x instanceof Array) {
                chunkStr += "[";
                for (let i = 0, l = x.length; i < l; i++) {
                    let v = x[i]
                    if (isJsonObject(v) || v instanceof Array) {
                        if (first) { first = false }
                        else { chunkStr += "," }
                        stringify(v);
                    } else {
                        if (first) {
                            first = false
                            chunkStr += JSON.stringify(v)
                        } else {
                            chunkStr += `,${JSON.stringify(v)}`
                        }
                    }
                }
                chunkStr += "]"
            }
            return
        }
        
        stringify(backUpData)
        const firstTimeout = Math.max(0, 17 - (performance.now() - startPost))
        
        if (chunkStr.length > 0) {
            const strLen = chunkStr.length
            const strChunkLeft = splitString(chunkStr, maxByteSize)
            const strChunkLeftLen = strChunkLeft.length
            const midIndex = Math.floor((strChunkLeftLen - 1)/2)
            for (let i = 0; i < strChunkLeftLen; i++) {
                const isLast = i >= strChunkLeftLen - 1
                const chunk = strChunkLeft[i]

                if (i === 0) {
                    const message = { chunk }
                    if (isLast) {
                        message.state = 2
                        message.username = username
                        self.postMessage({ progress: 76.34 })
                        self.postMessage({ status: `76.34% Exporting User Data` })
                    } else {
                        message.state = 1
                    }
                    setTimeout(async () => {
                        if (isLast) {
                            self.postMessage({ progress: 97.63 })
                            self.postMessage({ status: `97.63% Exporting User Data` })
                            await saveJSON(new Date().getTime(), "runnedAutoExportAt");
                        }
                        self.postMessage(message)
                    }, Math.min(firstTimeout, 2000000000))
                } else {
                    // Show first progress
                    // when it is still attaching timeouts
                    if (i === midIndex) {
                        let setupProgress = 0.5 * (maxByteSize / strLen)
                        if (setupProgress < .4763) {
                            setupProgress = (setupProgress + 0.5) * 100
                            self.postMessage({ progress: setupProgress })
                            self.postMessage({ status: `${setupProgress.toFixed(2)}% Exporting User Data` })
                        }
                    }
                    // Since first progress is
                    // already shown skip it below
                    let progress
                    if (i > 1) {
                        progress = 0.5 * ((maxByteSize * i) / strLen)
                        if (progress < .4763) {
                            progress = (progress + 0.5) * 100
                        } else {
                            // Don't show if its large
                            // pct > 97.63
                            progress = undefined
                        }
                    }

                    const message = { chunk }
                    if (isLast) {
                        message.state = 2
                        message.username = username
                    } else {
                        message.state = 1
                    }                    
                    
                    setTimeout(async () => {
                        if (progress < 97.63) {
                            self.postMessage({ progress })
                            self.postMessage({ status: `${progress.toFixed(2)}% Exporting User Data` })
                        }
                        if (isLast) {
                            await saveJSON(new Date().getTime(), "runnedAutoExportAt");
                        }
                        self.postMessage(message)
                    }, Math.min(firstTimeout + (i * sendTimeThresh), 2000000000))
                }
                
            }
        } else {
            self.postMessage({ progress: 76.34 })
            self.postMessage({ status: `76.34% Exporting User Data` })
            await saveJSON(new Date().getTime(), "runnedAutoExportAt");
            setTimeout(async () => {
                self.postMessage({ progress: 97.63 })
                self.postMessage({ status: `97.63% Exporting User Data` })
                self.postMessage({ status: null })
                self.postMessage({
                    chunk: "",
                    state: 2,
                    username
                })
            }, Math.min(firstTimeout, 2000000000))
        }
    } else {
        let blob = JSONToBlob(backUpData, maxRecursion)
        let url = URL.createObjectURL(blob);
        await saveJSON(new Date().getTime(), "runnedAutoExportAt");
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
function saveJSON(data, name) {
    return new Promise((resolve, reject) => {
        let blob, transaction
        try {
            transaction = db.transaction("others", "readwrite");
            let store = transaction.objectStore("others");
            let put;
            transaction.oncomplete = () => {
                resolve();
            }
            if (data instanceof Blob) {
                blob = data
                put = store.put(blob, name);
            } else if (isJsonObject(data) || data instanceof Array) {
                blob = new Blob([JSON.stringify(data)]);
                put = store.put(blob, name);
            } else {
                put = store.put(data, name);
            }
            put.onerror = (ex) => {
                transaction.oncomplete = undefined
                if (blob instanceof Blob) {
                    (async()=>{
                        try {
                            await saveJSON((new FileReaderSync()).readAsArrayBuffer(blob), name)
                            resolve()
                        } catch (ex2) {
                            console.error(ex);
                            console.error(ex2);
                            reject(ex);
                        }
                    })();
                } else {
                    console.error(ex);
                    reject(ex);
                }
            };
            try {
                transaction?.commit?.();
            } catch {}
        } catch (ex) {
            if (transaction?.oncomplete) {
                transaction.oncomplete = undefined
            }
            if (blob instanceof Blob) {
                (async()=>{
                    try {
                        await saveJSON((new FileReaderSync()).readAsArrayBuffer(blob), name)
                        resolve()
                    } catch (ex2) {
                        console.error(ex);
                        console.error(ex2);
                        reject(ex);
                    }
                })();
            } else {
                console.error(ex);
                reject(ex);
            }
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
function JSONToBlob(object, _maxRecursion) {
    let propertyStrings = [];
    let chunkStr = "";
    const maxRecursion = _maxRecursion
    function isJsonObject(obj) {
        return Object.prototype.toString.call(obj) === "[object Object]"
    }
    let completedRecursionCalls = 0
    let startPost = performance.now()
    function bloberize(x) {
        if (chunkStr.length >= maxByteSize) {
            const propertyBlob = new Blob([chunkStr]);
            propertyStrings.push(propertyBlob);
            chunkStr = "";
            let progress = (completedRecursionCalls / maxRecursion)
            if (progress < .9763) {
                const endPost = performance.now()
                if (endPost - startPost > 17) {
                    startPost = endPost
                    progress = progress * 100
                    self.postMessage({ progress })
                    if (progress > 0.01) {
                        self.postMessage({ status: `${progress.toFixed(2)}% Exporting User Data` })
                    }
                }
            }
        }
        completedRecursionCalls++;
        let first = true;
        if (isJsonObject(x)) {
            chunkStr += "{";
            for (let [k, v] of Object.entries(x)) {
                if (v === undefined) continue;
                if (isJsonObject(v) || v instanceof Array) {
                    if (first) {
                        first = false;
                        chunkStr += `${JSON.stringify(k)}:`;
                    } else {
                        chunkStr += `,${JSON.stringify(k)}:`;
                    }
                    bloberize(v);
                } else {
                    if (first) {
                        first = false;
                        chunkStr += `${JSON.stringify(k)}:${JSON.stringify(v)}`;
                    } else {
                        chunkStr += `,${JSON.stringify(k)}:${JSON.stringify(v)}`;
                    }
                }
            }
            chunkStr += "}";
        } else if (x instanceof Array) {
            chunkStr += "[";
            for (let i = 0, l = x.length; i < l; i++) {
                let v = x[i];
                if (isJsonObject(v) || v instanceof Array) {
                    if (first) {
                        first = false;
                    } else {
                        chunkStr += ",";
                    }
                    bloberize(v);
                } else {
                    if (first) {
                        first = false;
                        chunkStr += JSON.stringify(v);
                    } else {
                        chunkStr += `,${JSON.stringify(v)}`;
                    }
                }
            }
            chunkStr += "]";
        }
    }
    bloberize(object)
    const propertyBlob = new Blob([chunkStr], { type: "text/plain" });
    propertyStrings.push(propertyBlob);
    chunkStr = "";
    return new Blob(propertyStrings, { type: "application/json" });
}
function splitString(str, len) {
    const result = [];
    let i = 0;
    while (i < str.length) {
        result.push(str.substring(i, i + len));
        i += len;
    }
    return result;
}