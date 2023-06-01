let db,
    finalAnimeList,
    filteredList,
    keyword,
    filterTimeout,
    loadLimit = 18,
    seasonOrder = { fall: 3, summer: 2, spring: 1, winter: 0 };

self.onmessage = async ({ data }) => {
    if (data?.filterKeyword !== undefined) {
        keyword = data?.filterKeyword
        if (filterTimeout) clearTimeout(filterTimeout)
        filterTimeout = setTimeout(() => {
            filteredList = finalAnimeList.filter(({ title }) => title?.toLowerCase?.().includes(keyword))
            self.postMessage({
                isNew: true,
                finalAnimeList: filteredList.slice(0, loadLimit)
            });
        }, 1)
    } else if (data?.removeIndex !== undefined) {
        finalAnimeList.splice(data.removeIndex, 1);
    } else if (data?.loadMore !== undefined) {
        let nextIdx = data.shownAnimeLen;
        self.postMessage({
            isNew: false,
            isLast: nextIdx >= filteredList.length,
            finalAnimeList: filteredList.slice(
                nextIdx,
                Math.min(nextIdx + loadLimit, filteredList.length - 1)
            ),
        });
    } else {
        if (!db) await IDBinit()
        self.postMessage({ status: "Initializing Filters" })
        let activeTagFilters = await retrieveJSON("activeTagFilters")
        let recommendedAnimeList = await retrieveJSON("recommendedAnimeList") || []
        // Init Content Warning
        let contentWarning = activeTagFilters?.['Content Warning'] || []
        let semiWarningContents = {
            genres: {},
            tags: {},
        },
            warningContents = {
                genres: {},
                tags: {},
            };
        contentWarning.forEach(({ selected, filterType, optionName, optionType }) => {
            // Included is Semi Warning and Excluded is Warning
            if (selected === "included") {
                if (filterType === 'dropdown') {
                    if (optionType === 'genre') {
                        semiWarningContents.genres[optionName] = true
                    } else if (optionType === 'tag') {
                        semiWarningContents.tags[optionName] = true
                    }
                }
            } else if (selected === 'excluded') {
                if (filterType === 'dropdown') {
                    if (optionType === 'genre') {
                        warningContents.genres[optionName] = true
                    } else if (optionType === 'tag') {
                        warningContents.tags[optionName] = true
                    }
                }
            }
        })
        // Init Anime Filter
        let flexibleInclusion = {},
            include = {
                genres: {},
                tags: {},
                season: {},
                format: {},
                status: {},
                userStatus: {},
                studios: {},
                year: {},
            },
            exclude = {
                genres: {},
                tags: {},
                season: {},
                format: {},
                status: {},
                userStatus: {},
                studios: {},
                year: {},
            },
            favouriteContents = {};
        let hideMyAnime = false,
            hiddenList = false,
            hideWatched = false,
            favouriteContentsLimit;
        let animeFilter = activeTagFilters?.['Anime Filter'] || []
        animeFilter.forEach(({ selected, filterType, optionName, optionType, optionValue }) => {
            if (selected === "included") {
                if (filterType === 'dropdown') {
                    if (optionType === 'flexible inclusion') {
                        flexibleInclusion[optionName.replace('OR: ', '')] = true
                    } else if (optionType === 'genre') {
                        include.genres[optionName] = true
                    } else if (optionType === 'tag') {
                        include.tags[optionName] = true
                    } else if (optionType === 'year') {
                        include.year[optionName] = true
                    } else if (optionType === 'season') {
                        include.season[optionName] = true
                    } else if (optionType === 'format') {
                        include.format[optionName] = true
                    } else if (optionType === 'airing status') {
                        include.status[optionName] = true
                    } else if (optionType === 'user status') {
                        include.userStatus[optionName] = true
                    } else if (optionType === 'studio') {
                        include.studios[optionName] = true
                    } else if (optionType === 'favourite contents') {
                        favouriteContents[optionName] = true
                    }
                } else if (filterType === 'checkbox') {
                    if (optionName === 'hidden') {
                        hiddenList = true
                    } else if (optionName === 'hide my anime') {
                        hideMyAnime = true
                    } else if (optionName === 'hide watched') {
                        hideWatched = true
                    }
                } else if (filterType === 'input number') {
                    if (optionName === "limit favourites") {
                        favouriteContentsLimit = optionValue
                    }
                }
            } else if (selected === 'excluded') {
                if (filterType === 'dropdown') {
                    if (optionType === 'genre') {
                        exclude.genres[optionName] = true
                    } else if (optionType === 'tag') {
                        exclude.tags[optionName] = true
                    } else if (optionType === 'year') {
                        exclude.year[optionName] = true
                    } else if (optionType === 'season') {
                        exclude.season[optionName] = true
                    } else if (optionType === 'format') {
                        exclude.format[optionName] = true
                    } else if (optionType === 'airing status') {
                        exclude.status[optionName] = true
                    } else if (optionType === 'user status') {
                        exclude.userStatus[optionName] = true
                    } else if (optionType === 'studio') {
                        exclude.studios[optionName] = true
                    }
                }
            }
        })
        self.postMessage({ status: "Filtering Recommendation List" })
        finalAnimeList = recommendedAnimeList.filter(anime => {
            // favouriteContentsLimit
            // favouriteContents
            if (hideMyAnime) {
                if (!ncsCompare(anime?.userStatus, 'unwatched')) {
                    return false;
                }
            }
            if (hideWatched) {
                if (['completed', 'dropped'].some((e) => ncsCompare(e, anime?.userStatus))) {
                    return false
                }
            }
            if (hiddenList) {
                // do hidden
            }
            // Should Exclude
            if (typeof anime?.season === 'string' && !jsonIsEmpty(exclude.season) && exclude.season[anime.season.toLowerCase()]) {
                return false
            }
            if (typeof anime?.format === 'string' && !jsonIsEmpty(exclude.format) && exclude.format[anime.format.toLowerCase()]) {
                return false
            }
            if (typeof anime?.userStatus === 'string' && !jsonIsEmpty(exclude.userStatus) && exclude.userStatus[anime.userStatus.toLowerCase()]) {
                return false
            }
            if (typeof anime?.status === 'string' && !jsonIsEmpty(exclude.status) && exclude.status[anime.status.toLowerCase()]) {
                return false
            }
            if (anime?.year && !jsonIsEmpty(exclude.year) && exclude.year[anime.year?.toString?.()?.toLowerCase?.()]) {
                return false
            }
            if (!jsonIsEmpty(exclude.genres)) {
                if (anime.genres.some(e => {
                    if (typeof e !== 'string') return false
                    return exclude.genres[e.toLowerCase()]
                })) return false
            }
            if (!jsonIsEmpty(exclude.tags)) {
                if (anime.tags.some(e => {
                    if (typeof e !== 'string') return false
                    return exclude.tags[e.toLowerCase()]
                })) return false
            }
            if (!jsonIsEmpty(exclude.studios)) {
                for (let studio in anime.studios) {
                    if (typeof studio === 'string' && exclude.studios[studio?.toLowerCase?.()]) {
                        return false
                    }
                }
            }

            // Should Include
            // Should Include OR
            if (!jsonIsEmpty(include.season)) {
                if (!include.season[anime?.season?.toLowerCase?.()]) {
                    return false
                }
            }
            // Should Include OR
            if (!jsonIsEmpty(include.format)) {
                if (!include.format[anime?.format?.toLowerCase?.()]) {
                    return false
                }
            }
            // Should Include OR
            if (!jsonIsEmpty(include.userStatus)) {
                if (!include.userStatus[anime?.userStatus?.toLowerCase?.()]) {
                    return false
                }
            }
            // Should Include OR
            if (!jsonIsEmpty(include.status)) {
                if (!include.status[anime?.status?.toLowerCase?.()]) {
                    return false
                }
            }
            // Should Include OR
            if (!jsonIsEmpty(include.year)) {
                if (!include.year[anime?.year?.toString?.()?.toLowerCase?.()]) {
                    return false
                }
            }
            // Should Include
            if (flexibleInclusion['genre']) {
                // Should Include OR
                if (!jsonIsEmpty(include.genres)) {
                    if (!anime.genres.some(genre => include.genres[genre.toLowerCase()])) {
                        return false
                    }
                }
            } else {
                // Should Include AND
                for (let genre in include.genres) {
                    if (!anime.genres.some(e => {
                        return ncsCompare(e, genre)
                    })) return false
                }
            }
            if (flexibleInclusion['tag']) {
                // Should Include OR
                if (!jsonIsEmpty(include.tags)) {
                    if (!anime.tags.some(tag => include.tags[tag.toLowerCase()])) {
                        return false
                    }
                }
            } else {
                // Should Include AND
                for (let tag in include.tags) {
                    if (!anime.tags.some(e => {
                        return ncsCompare(e, tag)
                    })) return false
                }
            }
            if (flexibleInclusion['studio']) {
                // Should Include OR
                if (!jsonIsEmpty(include.studios)) {
                    let isNotIncluded = true
                    for (let studio in anime.studios) {
                        if (include.studios[studio.toLowerCase()]) {
                            isNotIncluded = false
                            break
                        }
                    }
                    if (isNotIncluded) return false
                }
            } else {
                // Should Include AND
                let _studios = Object.keys(anime.studios)
                for (let studio in include.studios) {
                    if (!_studios.some(e => {
                        return ncsCompare(e, studio)
                    })) return false
                }
            }

            // added to the filteredList
            return true;
        });

        // Sort List
        let sortFilter = (await retrieveJSON("filterOptions") || []).sortFilter
        let { sortName, sortType } = sortFilter?.filter(({ sortType }) => sortType === "desc" || sortType === "asc")?.[0] || { sortName: 'weighted score', sortType: 'desc' }

        if (sortType === "desc") {
            if (sortName === "weighted score") {
                finalAnimeList.sort((a, b) => {
                    let x = Number(a?.weightedScore),
                        y = Number(b?.weightedScore);
                    if (!x) return 1;
                    if (!y) return -1;
                    return y - x
                })
            } else if (sortName === "score") {
                finalAnimeList.sort((a, b) => {
                    let x = Number(a?.score),
                        y = Number(b?.score);
                    if (!x) return 1;
                    if (!y) return -1;
                    return y - x
                })
            } else if (sortName === "average score") {
                finalAnimeList.sort((a, b) => {
                    let x = Number(a?.averageScore),
                        y = Number(b?.averageScore);
                    if (!x) return 1;
                    if (!y) return -1;
                    return y - x
                })
            } else if (sortName === "user score") {
                finalAnimeList.sort((a, b) => {
                    let x = Number(a?.userScore),
                        y = Number(b?.userScore);
                    if (!x) return 1;
                    if (!y) return -1;
                    return y - x
                })
            } else if (sortName === "popularity") {
                finalAnimeList.sort((a, b) => {
                    let x = Number(a?.popularity),
                        y = Number(b?.popularity);
                    if (!x) return 1;
                    if (!y) return -1;
                    return y - x
                })
            } else if (sortName === "date") {
                finalAnimeList.sort((a, b) => {
                    // Sort by year (descending), place falsy values at last
                    let x = a.year ? a.year : Number.MIN_SAFE_INTEGER;
                    let y = b.year ? b.year : Number.MIN_SAFE_INTEGER;
                    if (x !== y) return y - x;
                    // Sort by season (descending), place falsy values at last
                    x = a.season ? a.season.toLowerCase() : "";
                    y = b.season ? b.season.toLowerCase() : "";
                    if (x !== y) return seasonOrder[y] - seasonOrder[x];
                    // Sort by weightedScore (descending), place falsy values at last
                    x = a.weightedScore ? a.weightedScore : Number.MIN_SAFE_INTEGER;
                    y = b.weightedScore ? b.weightedScore : Number.MIN_SAFE_INTEGER;
                    return y - x;
                })
            }
        } else if (sortType === "asc") {
            if (sortName === "weighted score") {
                finalAnimeList.sort((a, b) => {
                    let x = Number(a?.weightedScore),
                        y = Number(b?.weightedScore);
                    if (!x) return 1;
                    if (!y) return -1;
                    return x - y
                })
            } else if (sortName === "score") {
                finalAnimeList.sort((a, b) => {
                    let x = Number(a?.score),
                        y = Number(b?.score);
                    if (!x) return 1;
                    if (!y) return -1;
                    return x - y
                })
            } else if (sortName === "average score") {
                finalAnimeList.sort((a, b) => {
                    let x = Number(a?.averageScore),
                        y = Number(b?.averageScore);
                    if (!x) return 1;
                    if (!y) return -1;
                    return x - y
                })
            } else if (sortName === "user score") {
                finalAnimeList.sort((a, b) => {
                    let x = Number(a?.userScore),
                        y = Number(b?.userScore);
                    if (!x) return 1;
                    if (!y) return -1;
                    return x - y
                })
            } else if (sortName === "popularity") {
                finalAnimeList.sort((a, b) => {
                    let x = Number(a?.popularity),
                        y = Number(b?.popularity);
                    if (!x) return 1;
                    if (!y) return -1;
                    return x - y
                })
            } else if (sortName === "date") {
                finalAnimeList.sort((a, b) => {
                    // Sort by year (ascending), place falsy values at last
                    let x = a.year ? a.year : Number.MAX_SAFE_INTEGER;
                    let y = b.year ? b.year : Number.MAX_SAFE_INTEGER;
                    if (x !== y) return x - y;
                    // Sort by season (ascending), place falsy values at last
                    x = a.season ? a.season.toLowerCase() : "";
                    y = b.season ? b.season.toLowerCase() : "";
                    if (x !== y) return seasonOrder[x] - seasonOrder[y];
                    // Sort by weightedScore (descending), place falsy values at last
                    x = a.weightedScore ? a.weightedScore : Number.MIN_SAFE_INTEGER;
                    y = b.weightedScore ? b.weightedScore : Number.MIN_SAFE_INTEGER;
                    return x - y;
                })
            }
        }
        // shownScore
        // warningCOlor
        // hasWarning > hasVeryLowScore > hasLowScore > hasSemiWarning > Good
        filteredList = finalAnimeList
        console.log(finalAnimeList.map(({ year }) => year))
        await saveJSON(finalAnimeList, "finalAnimeList")
        self.postMessage({ status: null })
        self.postMessage({
            finalAnimeList: finalAnimeList.slice(0, loadLimit),
        });
    }
};

// Functions
function ncsCompare(str1, str2) {
    if (typeof str1 !== 'string' || typeof str2 !== 'string') {
        return false;
    }
    return str1.toLowerCase() === str2.toLowerCase();
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
function jsonIsEmpty(obj) {
    for (const key in obj) {
        return false;
    }
    return true;
}
function isJson(j) {
    try {
        return j?.constructor.name === "Object" && `${j}` === "[object Object]";
    } catch (e) {
        return false;
    }
}