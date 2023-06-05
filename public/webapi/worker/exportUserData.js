importScripts("../importScripts/jsonBufferize.js");
let request, db;

self.onmessage = async ({ data }) => {
    if (!db) {
        await IDBinit();
    }
    self.postMessage({ status: "Exporting User Data..." })
    if (data === 'android') {
        self.postMessage({ state: 0 }) // Start Deleting Existing File
    }
    const username = await retrieveJSON("username");
    const backUpData = {
        username: username,
        lastAnimeUpdate: await retrieveJSON("lastAnimeUpdate"),
        lastUserAnimeUpdate: await retrieveJSON("lastUserAnimeUpdate"),
        activeTagFilters: await retrieveJSON("activeTagFilters"),
        hiddenEntries: await retrieveJSON("hiddenEntries"),
        userEntries: await retrieveJSON("userEntries"),
        filterOptions: await retrieveJSON("filterOptions"),
        animeEntries: await retrieveJSON("animeEntries"),
    };
    if (data === 'android') {
        const byteSize = 1024 * 1024
        let chunkStr = ''
        function stringify(x) {
            if (chunkStr.length >= byteSize) {
                self.postMessage({
                    chunk: chunkStr,
                    state: 1
                })
                chunkStr = ''
            }
            let first = true;
            if (isJsonObject(x)) {
                chunkStr += '{'
                for (const [k, v] of Object.entries(x)) {
                    if (v === undefined) continue
                    if (isJsonObject(v) || v instanceof Array) {
                        if (first) {
                            first = false
                            chunkStr += `${JSON.stringify(k)}:`
                        } else {
                            chunkStr += `,${JSON.stringify(k)}:`
                        }
                        stringify(v)
                    } else {
                        if (first) {
                            first = false
                            chunkStr += `${JSON.stringify(k)}:${JSON.stringify(v)}`
                        } else {
                            chunkStr += `,${JSON.stringify(k)}:${JSON.stringify(v)}`
                        }
                    }
                }
                chunkStr += '}'
                return
            } else if (x instanceof Array) {
                chunkStr += '[';
                for (let i = 0; i < x.length; i++) {
                    let v = x[i]
                    if (isJsonObject(v) || v instanceof Array) {
                        if (first) { first = false }
                        else { chunkStr += ',' }
                        stringify(v)
                    } else {
                        if (first) {
                            first = false
                            chunkStr += JSON.stringify(v)
                        } else {
                            chunkStr += `,${JSON.stringify(v)}`
                        }
                    }
                }
                chunkStr += ']'
                return
            }
        }
        stringify(backUpData)
        self.postMessage({ status: null })
        self.postMessage({
            chunk: chunkStr,
            state: 2,
            username: username
        })
    } else {
        let buffer = await JSON.bufferize(backUpData);
        let blob = new Blob([buffer], { type: "text/json" });
        let url = URL.createObjectURL(blob);
        self.postMessage({ status: null })
        self.postMessage({ url: url, username: username });
    }
};


function isJsonObject(obj) {
    return Object.prototype.toString.call(obj) === "[object Object]"
}
async function IDBinit() {
    return await new Promise((resolve) => {
        request = indexedDB.open(
            "Kanshi.Anime.Recommendations.Anilist.W~uPtWCq=vG$TR:Zl^#t<vdS]I~N70",
            1
        );
        request.onerror = (error) => {
            console.error(error);
        };
        request.onsuccess = (event) => {
            db = event.target.result;
            return resolve();
        };
        request.onupgradeneeded = (event) => {
            db = event.target.result;
            db.createObjectStore("MyObjectStore");
            return resolve();
        };
    });
}
async function retrieveJSON(name) {
    return await new Promise((resolve) => {
        try {
            let read = db
                .transaction("MyObjectStore", "readwrite")
                .objectStore("MyObjectStore")
                .get(name);
            read.onsuccess = () => {
                return resolve(read.result);
            };
            read.onerror = (error) => {
                console.error(error);
                return resolve();
            };
        } catch (ex) {
            console.error(ex);
            return resolve();
        }
    });
}
