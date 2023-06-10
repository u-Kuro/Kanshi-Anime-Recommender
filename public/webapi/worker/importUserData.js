importScripts("../importScripts/asyncJsonParser.js");
let request, db;

self.onmessage = async ({ data }) => {
    if (!db) {
        await IDBinit();
    }
    self.postMessage({ status: "Importing User Data..." })
    const reader = new FileReader()
    reader.onload = async () => {
        let fileContent = await JSON.parse(reader.result)
        let username = fileContent.username
        if (typeof username === "string") {
            await saveJSON(username, "username")
        }
        let lastAnimeUpdate = fileContent.lastAnimeUpdate ? new Date(fileContent.lastAnimeUpdate) : null
        if (lastAnimeUpdate instanceof Date && !isNaN(lastAnimeUpdate)) {
            await saveJSON(lastAnimeUpdate, "lastAnimeUpdate")
        }
        let lastUserAnimeUpdate = fileContent.lastUserAnimeUpdate ? new Date(fileContent.lastUserAnimeUpdate) : null
        if (lastUserAnimeUpdate instanceof Date && !isNaN(lastUserAnimeUpdate)) {
            await saveJSON(lastUserAnimeUpdate, "lastUserAnimeUpdate")
        }
        let lastRunnedAutoUpdateDate = fileContent.lastRunnedAutoUpdateDate ? new Date(fileContent.lastRunnedAutoUpdateDate) : null
        if (lastRunnedAutoUpdateDate instanceof Date && !isNaN(lastRunnedAutoUpdateDate)) {
            await saveJSON(lastRunnedAutoUpdateDate, "lastRunnedAutoUpdateDate")
        }
        let lastRunnedAutoExportDate = fileContent.lastRunnedAutoExportDate ? new Date(fileContent.lastRunnedAutoExportDate) : null
        if (lastRunnedAutoExportDate instanceof Date && !isNaN(lastRunnedAutoExportDate)) {
            await saveJSON(lastRunnedAutoExportDate, "lastRunnedAutoExportDate")
        }
        let activeTagFilters = fileContent.activeTagFilters
        if (isJsonObject(activeTagFilters) && !jsonIsEmpty(activeTagFilters)) {
            await saveJSON(activeTagFilters, "activeTagFilters")
        }
        let hiddenEntries = fileContent.hiddenEntries
        if (isJsonObject(hiddenEntries)) {
            await saveJSON(hiddenEntries, "hiddenEntries")
        }
        let userEntries = fileContent.userEntries
        if (userEntries instanceof Array) {
            await saveJSON(userEntries, "userEntries")
        }
        let filterOptions = fileContent.filterOptions
        if (isJsonObject(filterOptions) && !jsonIsEmpty(filterOptions)) {
            await saveJSON(filterOptions, "filterOptions")
        }
        let animeEntries = fileContent.animeEntries
        if (isJsonObject(filterOptions) && !jsonIsEmpty(filterOptions)) {
            await saveJSON(animeEntries, "animeEntries")
        }
        self.postMessage({ status: "Data has been Imported..." })
        self.postMessage({ importedUsername: username })
        self.postMessage({ importedlastRunnedAutoUpdateDate: lastRunnedAutoUpdateDate })
        self.postMessage({ importedlastRunnedAutoExportDate: lastRunnedAutoExportDate })
        self.postMessage({ updateFilters: true })
        self.postMessage({ updateRecommendationList: true })
        self.postMessage({ status: null })
        self.postMessage({ message: "success" })
    }
    reader.onerror = (error) => {
        console.error(error);
        self.postMessage({ status: typeof error === "string" ? error : "Something went wrong..." })
        self.postMessage({ message: error })
    }
    if (reader.readyState !== 1) {// Not Loaded
        reader.readAsText(data.importedFile);
    } else {
        reader.onabort = () => {
            reader.readAsText(data.importedFile);
        }
        reader.abort();
    }
};

function isJsonObject(obj) {
    return Object.prototype.toString.call(obj) === "[object Object]"
}
function jsonIsEmpty(obj) {
    for (const key in obj) {
        return false;
    }
    return true;
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
    return await new Promise(async (resolve, reject) => {
        try {
            let write = db
                .transaction("MyObjectStore", "readwrite")
                .objectStore("MyObjectStore")
                .openCursor();
            write.onsuccess = async (event) => {
                let put = await db
                    .transaction("MyObjectStore", "readwrite")
                    .objectStore("MyObjectStore")
                    .put(data, name);
                put.onsuccess = (event) => {
                    return resolve();
                }
                put.onerror = (event) => {
                    return resolve();
                }
            };
            write.onerror = async (error) => {
                console.error(error);
                return reject()
            };
        } catch (ex) {
            console.error(ex)
        }
    });
}