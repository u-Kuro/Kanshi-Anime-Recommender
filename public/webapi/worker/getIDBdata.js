let db;
self.onmessage = async({data}) => {
    if(!db) await IDBinit()
    if(data.name==="animeEntriesLength"){
        let _data = Object.keys(await retrieveJSON("animeEntries")||{}).length
        self.postMessage(_data)
    } else if(data.name==="animeFranchisesLength"){
        let _data = (await retrieveJSON("animeFranchises")||[]).length
        self.postMessage(_data)
    } else if(data.name==="recommendedAnimeListLength"){
        let _data = (await retrieveJSON("recommendedAnimeList")||[]).length
        self.postMessage(_data)
    } else if(data.name) {
        self.postMessage(await retrieveJSON(data.name))
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