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

    const collectionToPut = {}
    const tagInfo = await retrieveJSON("tagInfo")
    const filters = await retrieveJSON("filters")

    if (
        jsonIsEmpty(tagInfo)
        || jsonIsEmpty(filters)
        || !isJsonObject(tagInfo)
        || !isJsonObject(filters)
    ) {
        self.postMessage({ error: "Failed to Retrieve Initial Data" })
    }

    const orderedFilters = {
        sortFilter: [
            "weighted score",
            "score",
            "average score",
            "user score",
            "popularity",
            "trending",
            "date",
            "date updated",
            "date added",
            "favorites",
        ],
        season: [
            "current season",
            "next season",
            "previous season",
            "ongoing seasons",
            "future seasons",
            "past seasons",
            "Winter",
            "Spring",
            "Summer",
            "Fall",
        ],
        "flexible inclusion": [
            "OR: genre",
            "OR: tag",
            "OR: studio",
            "OR: genre / tag",
            "OR: genre / studio",
            "OR: tag / studio",
            "OR: genre / tag / studio",
        ],
        "shown metric": [
            "weighted score",
            "score",
            "average score",
            "user score",
            "popularity",
            "favorites",
            "trending",
        ],
        "shown list": [
            "recommended studios",
            "non-caution",
            "non-semi-caution",
            "recommended score",
            "semi-recommended score",
            "other",
        ]
    }
    const orderedFiltersKeys = ["genre", "tag", "tag category", "year", "format", "country of origin", "release status", "user status", "studio"]
    const optionsSort = {
        year: "descnum",
        format: { Special: 9, "One Shot": 8, ONA: 7, OVA: 6, "TV Short": 5, Movie: 4, TV: 3, Novel: 2, Manga: 1, Anime: 0 },
        "country of origin": { TW: 3, CN: 2, KR: 1, JP: 0 },
    }
    const algorithmFilterSelections = { genre: 1, tag: 1, "tag category": 1 }
    for (let i = 0, l = orderedFiltersKeys.length; i < l; i++) {
        const filterKey = orderedFiltersKeys[i], isAlgorithmFilterSelection = algorithmFilterSelections[filterKey]
        let options = Object.keys(filters[filterKey]);
        options = options.reduce((uniqueOptions, k) => {
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
        let optionSort = optionsSort[filterKey]
        if (optionSort === "descnum") {
            options.sort((a, b) => parseFloat(b) - parseFloat(a))
            // }  else if (optionSort === "ascnum") {
            //     options.sort((a, b) => parseFloat(a) - parseFloat(b))
            // } else if (optionSort === "desclet") {
            //     options.sort((a, b) => a.localeCompare(b, undefined, {sensitivity: 'base'}))
            //     options.reverse()
        } else if (isJsonObject(optionSort)) {
            options.sort((a, b) => {
                const optionSortA = optionSort[a];
                const optionSortB = optionSort[b];
            
                const isNumberA = typeof optionSortA === 'number';
                const isNumberB = typeof optionSortB === 'number';
            
                if (isNumberA && isNumberB) {
                    return optionSortA - optionSortB;
                }
            
                if (isNumberA) {
                    return -1;
                }
            
                if (isNumberB) {
                    return 1;
                }
            
                const isStringA = typeof a === 'string';
                const isStringB = typeof b === 'string';
            
                if (isStringA && isStringB) {
                    return a.localeCompare(b, undefined, {sensitivity: 'base'});
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
            options.sort((a, b) => a.localeCompare(b, undefined, {sensitivity: 'base'})) // default ascending
        }
        if (isAlgorithmFilterSelection) {
            options.unshift("All")
        }
        orderedFilters[filterKey] = options
    }

    const nonOrderedFilters = {
        "Media Filter": {
            bool: [
                "hide my list",
                "hide my finished list",
                "show my list",
                "show all sequels",
                "show next sequel",
                "show anime adapted",
                "has unseen progress",
                "hidden list",
            ],
            number: [
                {
                    name: "average score",
                    maxValue: Infinity,
                    minValue: 0,
                },
                {
                    name: "user score",
                    maxValue: Infinity,
                    minValue: 0,
                },
                {
                    name: "year",
                    max: Infinity,
                    min: 0,
                },
                {
                    name: "popularity",
                    maxValue: Infinity,
                    minValue: 0,
                },
                {
                    name: "score",
                    maxValue: Infinity,
                    minValue: 0,
                },
                {
                    name: "weighted score",
                    max: Infinity,
                    min: 0,
                },
            ]
        },
        "Algorithm Filter": {
            bool: [
                "content focused",
                "inc. average score",
                "inc. all factors",
                "exclude year",
            ],
            number: [
                {
                    name: "min tag percentage",
                    defaultValue: 0,
                    maxValue: Infinity,
                    minValue: 0,
                },
                {
                    name: "scoring system",
                    maxValue: Infinity,
                    minValue: 0,
                },
                {
                    name: "sample size",
                    maxValue: Infinity,
                    minValue: 1,
                },
                {
                    name: "min sample size",
                    maxValue: Infinity,
                    minValue: 1,
                },
                {
                    name: "min average score",
                    minValue: 1,
                },
                {
                    name: "min anime popularity",
                    maxValue: Infinity,
                    minValue: 1,
                },
                {
                    name: "min manga popularity",
                    maxValue: Infinity,
                    minValue: 1,
                },
                {
                    name: "min novel popularity",
                    maxValue: Infinity,
                    minValue: 1,
                }
            ]
        }
    }
    const filterConfig = {
        readOnly: {
            "flexible inclusion": 1,
            "shown metric": 1
        },
        staticSelection: {
            season: 1,
            "flexible inclusion": 1,
            "shown metric": 1,
            "shown list": 1
        },
        selection: {
            "Media Filter": [
                "genre",
                "tag",
                "season",
                "release status",
                "user status",
                "format",
                "country of origin",
                "shown metric",
                "shown list",
                "flexible inclusion",
                "year",
                "studio",
            ],
            "Content Caution": [
                "genre",
                "tag",
            ],
            "Algorithm Filter": [
                "genre",
                "tag",
                "tag category",
            ]
        }
    }

    let algorithmFilters = await retrieveJSON("algorithmFilters")
    if (!(algorithmFilters instanceof Array)) {
        algorithmFilters = [
            {
                filterType: "bool",
                optionName: "content focused",
                status: "none"
            },
            {
                filterType: "bool",
                optionName: "inc. all factors",
                status: "none"
            },
            {
                filterType: "bool",
                optionName: "inc. average score",
                status: "none"
            },
            {
                filterType: "bool",
                optionName: "exclude year",
                status: "none"
            },
        ]
        collectionToPut.algorithmFilters = algorithmFilters
    }

    if (!jsonIsEmpty(collectionToPut)) {
        await saveJSONCollection(collectionToPut)
    }

    self.postMessage({ status: null })
    self.postMessage({
        tagInfo,
        orderedFilters,
        nonOrderedFilters,
        filterConfig,
        algorithmFilters
    })
    
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
function saveJSONCollection(collection) {
    return new Promise((resolve, reject) => {
        try {
            let transaction = db.transaction("others", "readwrite");
            let store = transaction.objectStore("others");
            let put;
            transaction.oncomplete = () => {
                resolve();
            }
            for (let key in collection) {
                let data = collection[key];
                let blob
                if (data instanceof Blob) {
                    blob = data
                    put = store.put(blob, key);
                } else if (isJsonObject(data) || data instanceof Array) {
                    blob = new Blob([JSON.stringify(data)]);
                    put = store.put(blob, key);
                } else {
                    put = store.put(data, key);
                }
                put.onerror = (ex) => {
                    transaction.oncomplete = undefined;
                    if (blob instanceof Blob) {
                        try {
                            transaction.oncomplete = () => {
                                resolve();
                            }
                            put = store.put((new FileReaderSync()).readAsArrayBuffer(blob), key);
                            put.onerror = (ex) => {
                                console.error(ex);
                                reject(ex);
                            }
                            try {
                                transaction?.commit?.();
                            } catch {}
                        } catch (ex2) {
                            console.error(ex);
                            console.error(ex2);
                            reject(ex2);
                        }
                    } else {
                        console.error(ex);
                        reject(ex);
                    }
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
function jsonIsEmpty(obj) {
    for (const key in obj) {
        return false;
    }
    return true;
}
function isJsonObject(obj) {
    return Object.prototype.toString.call(obj) === "[object Object]"
}