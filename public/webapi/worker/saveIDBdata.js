let db;
self.onmessage = async({data}) => {
    if(!db) await IDBinit()
    if(data.data!==undefined&&data.name){
        await saveJSON(data.data, data.name)
        self.postMessage({message:'success'})
    }
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
async function saveJSON(data, name) {
    return await new Promise(async (resolve) => {
        try {
            let write = db
            .transaction("MyObjectStore", "readwrite")
            .objectStore("MyObjectStore")
            .openCursor();
            write.onsuccess = async (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    if (cursor.key === name) {
                        await cursor.update(data);
                        console.log("updated",name)
                        return resolve();
                    }
                    await cursor.continue();
                } else {
                    let add = await db
                    .transaction("MyObjectStore", "readwrite")
                    .objectStore("MyObjectStore")
                    .add(data, name);
                    add.onsuccess = (event) => {
                        return resolve();
                    }
                    add.onerror = (event) => {
                        return resolve();
                    }
                }
            };
            write.onerror = async (error) => {
                console.error(error);
                let add = await db
                    .transaction("MyObjectStore", "readwrite")
                    .objectStore("MyObjectStore")
                    .add(data, name);
                add.onsuccess = () => {
                    return resolve();
                }
                add.onerror = () => {
                    return resolve()
                }
            };
        } catch (ex) {
            try {
                console.error(ex);
                let add = await db
                    .transaction("MyObjectStore", "readwrite")
                    .objectStore("MyObjectStore")
                    .add(data, name);
                add.onsuccess = () => {
                    return resolve();
                }
                add.onerror = () => {
                    return resolve()
                }
            } catch (ex2) {
                console.error(ex2);
                return resolve();
            }
        }
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