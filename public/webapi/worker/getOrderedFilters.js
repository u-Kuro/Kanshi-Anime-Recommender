let db;

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
    if (!db) await IDBinit()

    const mediaOptions = await retrieveJSON("mediaOptions")
    if (isJsonObject(mediaOptions) && !jsonIsEmpty(mediaOptions)) {
        const orderedMediaOptions = {
            sortFilter: [
                "Weighted Score",
                "Score",
                "Average Score",
                "User Score",
                "Popularity",
                "Trending",
                "Date",
                "Date Updated",
                "Date Added",
                "Favorites",
            ],
            Season: [
                "Current Season",
                "Next Season",
                "Previous Season",
                "Ongoing Seasons",
                "Future Seasons",
                "Past Seasons",
                "Winter",
                "Spring",
                "Summer",
                "Fall",
            ],
            "Flexible Inclusion": [
                "OR: Genre",
                "OR: Tag",
                "OR: Studio",
                "OR: Genre / Tag",
                "OR: Genre / Studio",
                "OR: Tag / Studio",
                "OR: Genre / Tag / Studio",
            ],
            "Shown Metric": [
                "Weighted Score",
                "Score",
                "Average Score",
                "User Score",
                "Popularity",
                "Favorites",
                "Trending",
            ],
            "Shown List": [
                "Recommended Studio",
                "Non-Caution",
                "Non-Semi-Caution",
                "Recommended Score",
                "Semi-Recommended Score",
                "Other Score",
            ]
        }
        const orderedFiltersKeys = ["Genre", "Tag", "Tag Category", "Year", "Format", "Country Of Origin", "Release Status", "User Status", "Studio"]
        const optionsSort = {
            Year: "descnum",
            Format: { Special: 9, "One Shot": 8, ONA: 7, OVA: 6, "TV Short": 5, Movie: 4, TV: 3, Novel: 2, Manga: 1, Anime: 0 },
            "Country Of Origin": { TW: 3, CN: 2, KR: 1, JP: 0 },
        }
        const algorithmFilterSelections = { Genre: 1, Tag: 1, "Tag Category": 1 }
        for (let i = 0, l = orderedFiltersKeys.length; i < l; i++) {
            const filterKey = orderedFiltersKeys[i], isAlgorithmFilterSelection = algorithmFilterSelections[filterKey]
            let options = Object.keys(mediaOptions[filterKey])
                .reduce((uniqueOptions, k) => {
                    if (!uniqueOptions[k]) {
                        uniqueOptions[k] = 1
                    }
                    return uniqueOptions;
                }, {})
            if (isAlgorithmFilterSelection) {
                delete options["All"]
                options = Object.keys(options)
            } else {
                options = Object.keys(options)
            }
            const optionSort = optionsSort[filterKey]
            if (optionSort === "descnum") {
                options.sort((a, b) => parseFloat(b) - parseFloat(a))
                // }  else if (optionSort === "ascnum") {
                //     options.sort((a, b) => parseFloat(a) - parseFloat(b))
                // } else if (optionSort === "desclet") {
                //     options.sort((a, b) => a.localeCompare(b, undefined, {sensitivity: "base"}))
                //     options.reverse()
            } else if (isJsonObject(optionSort)) {
                options.sort((a, b) => {
                    const optionSortA = optionSort[a];
                    const optionSortB = optionSort[b];
                
                    const isNumberA = typeof optionSortA === "number";
                    const isNumberB = typeof optionSortB === "number";
                
                    if (isNumberA && isNumberB) {
                        return optionSortA - optionSortB;
                    }
                
                    if (isNumberA) {
                        return -1;
                    }
                
                    if (isNumberB) {
                        return 1;
                    }
                
                    const isStringA = typeof a === "string";
                    const isStringB = typeof b === "string";
                
                    if (isStringA && isStringB) {
                        return a.localeCompare(b, undefined, {sensitivity: "base"});
                    }
                
                    if (isStringA) {
                        return -1;
                    }
                
                    if (isStringB) {
                        return 1;
                    }
                
                    return 0;
                });
            } else {
                options.sort((a, b) => a.localeCompare(b, undefined, {sensitivity: "base"})) // default ascending
            }
            if (isAlgorithmFilterSelection) {
                options.unshift("All")
            }
            orderedMediaOptions[filterKey] = options
        }
        self.postMessage({ orderedMediaOptions })
    } else {
        self.postMessage({ error: "Filters not found." })
    }
};
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
function jsonIsEmpty(obj) {
    for (const key in obj) {
        return false;
    }
    return true;
}
function isJsonObject(obj) {
    return Object.prototype.toString.call(obj) === "[object Object]"
}