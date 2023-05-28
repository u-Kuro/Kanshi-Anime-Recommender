
let db;
self.onmessage = async({data}) => {
    if(!db) await IDBinit()
    let username = data?.username || await retrieveJSON("username")
    let userEntries = [];
    let maxAnimePerChunk = 500
    function recallAV(chunk) {
        fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Cache-Control': 'max-age=31536000, immutable'
            },
            body: JSON.stringify({
                query: `
                    {
                        MediaListCollection(
                        userName: "${username}",
                        chunk: ${chunk},
                        perChunk: ${maxAnimePerChunk},
                        forceSingleCompletedList: true,
                        type: ANIME
                        ) {
                            hasNextChunk
                            lists {
                                entries {
                                    status
                                    media {
                                        id
                                    }
                                    score
                                }
                            }
                            user {
                                updatedAt
                            }
                        }
                    }
                `
            })
        })
        .then(async(response) => {
            let headers = response.headers
            let result = await response.json()
            return { result, headers }
        })
        .then(({result, headers}) => {
            let collection = result?.data?.MediaListCollection
            let userList = collection?.lists ?? []
            let hasNextChunk = (result?.data?.MediaListCollection?.hasNextChunk ?? (userList?.length??0)>0)
            for(let i=0; i<userList.length; i++){
                userEntries = userEntries.concat(userList[i]?.entries??[])
            }
            if(hasNextChunk){
            // Handle the successful response here
                console.log(result, headers, 'success')
                if (headers?.get('x-ratelimit-remaining') > 0) {
                    return recallAV(++chunk);
                } else {
                    setTimeout(() => {
                        return recallAV(++chunk);
                    }, 60000);
                }
            } else {
                (async()=>{
                    await saveJSON(userEntries,"userEntries")
                    await saveJSON(username,"username")
                    self.postMessage({message:'success', username: username})
                })();
            }
        })
        .catch((error) => {
            let headers = error.headers;
            let errorText = error.message;
            if (errorText === 'User not found') {
                // Handle the specific error here
                self.postMessage({message: 'User not found'})
            } else {
                if (headers?.get('x-ratelimit-remaining') > 0) {
                    return recallAV(chunk);
                } else {
                    setTimeout(() => {
                        return recallAV(chunk);
                    }, 60000);
                }
            }
            console.error("error",error);
            console.error("error?.headers",error?.headers);
            console.error("error?.message",error?.message);
            console.error("error?.headers?.get('x-ratelimit-remaining')",error?.headers?.get('x-ratelimit-remaining'));
        });
    }
    recallAV(1)
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