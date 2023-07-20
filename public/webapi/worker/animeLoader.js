let db,
    finalAnimeList,
    filteredList,
    keyword,
    loadLimit = 13,
    seasonOrder = { fall: 3, summer: 2, spring: 1, winter: 0 };

self.onmessage = async ({ data }) => {
    if (data?.checkStatus) {
        self.postMessage({ isAlive: true })
    } else if (data?.reload !== undefined) { // Animation Async
        self.postMessage({
            reload: data?.reload,
            finalAnimeList: finalAnimeList.slice(0, loadLimit),
            numberOfNextLoadedGrid: Math.min(Math.max(finalAnimeList.length - loadLimit, 0), loadLimit)
        });
        filteredList = finalAnimeList.slice(loadLimit)
    } else if (data?.filterKeyword !== undefined) {
        keyword = data?.filterKeyword
        if (!keyword) {
            filteredList = finalAnimeList
        } else {
            filteredList = finalAnimeList.filter(({ title }) => {
                if (isJsonObject(title)) {
                    let titles = Object.values(title)
                    return titles.some((_title) => _title?.toLowerCase?.().includes(keyword?.trim()?.toLowerCase?.()))
                } else {
                    return title?.toLowerCase?.().includes(keyword?.trim()?.toLowerCase?.())
                }
            })
        }
        self.postMessage({
            isNew: true,
            finalAnimeList: filteredList.slice(0, loadLimit),
            numberOfNextLoadedGrid: Math.min(Math.max(filteredList.length - loadLimit, 0), loadLimit)
        });
        filteredList = filteredList.slice(loadLimit)
    } else if (data?.removeID !== undefined) {
        finalAnimeList = finalAnimeList.filter(({ id }) => id !== data.removeID)
        filteredList = filteredList.filter(({ id }) => id !== data.removeID)
        self.postMessage({
            isRemoved: true,
            removedID: data.removeID,
            numberOfNextLoadedGrid: Math.min(filteredList.length, loadLimit)
        });
    } else if (data?.loadMore !== undefined) {
        self.postMessage({
            isNew: false,
            isLast: filteredList.length <= loadLimit,//nextIdx >= filteredList.length,
            finalAnimeList: filteredList.slice(0, loadLimit),
            numberOfNextLoadedGrid: Math.min(Math.max(filteredList.length - loadLimit, 0), loadLimit)
        });
        filteredList = filteredList.slice(loadLimit)
    } else {
        finalAnimeList = filteredList = []
        if (!db) await IDBinit()
        self.postMessage({ status: "Initializing Filters" })
        let activeTagFilters = data?.activeTagFilters || await retrieveJSON("activeTagFilters")
        // Init Content Caution
        let semiCautionContents = {
            genres: {},
            tags: {},
        },
            cautionContents = {
                genres: {},
                tags: {},
            };
        activeTagFilters?.['Content Caution']?.forEach(({ selected, filterType, optionName, optionType }) => {
            // Included is Semi Caution and Excluded is Caution
            if (selected === "included") {
                if (filterType === 'dropdown') {
                    if (optionType === 'genre') {
                        semiCautionContents.genres[optionName.toLowerCase()] = true
                    } else if (optionType === 'tag') {
                        semiCautionContents.tags[optionName.toLowerCase()] = true
                    }
                }
            } else if (selected === 'excluded') {
                if (filterType === 'dropdown') {
                    if (optionType === 'genre') {
                        cautionContents.genres[optionName.toLowerCase()] = true
                    } else if (optionType === 'tag') {
                        cautionContents.tags[optionName.toLowerCase()] = true
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
            comparisonFilter = {
                weightedScore: null,
                score: null,
                averageScore: null,
                userScore: null,
                popularity: null
            }
        let hideMyAnime = false,
            hiddenList = false,
            hideWatched = false,
            showMyAnime = false,
            showAiring = false,
            favoriteContentsLimit = 5;
        activeTagFilters?.['Anime Filter']?.forEach(({ selected, filterType, optionName, optionType, optionValue, CMPoperator, CMPNumber }) => {
            if (selected === "included") {
                if (filterType === 'dropdown') {
                    if (optionType === 'flexible inclusion') {
                        flexibleInclusion[optionName.replace('OR: ', '').toLowerCase()] = true
                    } else if (optionType === 'genre') {
                        include.genres[optionName.toLowerCase()] = true
                    } else if (optionType === 'tag') {
                        include.tags[optionName.toLowerCase()] = true
                    } else if (optionType === 'year') {
                        include.year[optionName] = true
                    } else if (optionType === 'season') {
                        include.season[optionName.toLowerCase()] = true
                    } else if (optionType === 'format') {
                        include.format[optionName.toLowerCase()] = true
                    } else if (optionType === 'airing status') {
                        include.status[optionName.toLowerCase()] = true
                    } else if (optionType === 'user status') {
                        include.userStatus[optionName.toLowerCase()] = true
                    } else if (optionType === 'studio') {
                        include.studios[optionName.toLowerCase()] = true
                    }
                } else if (filterType === 'checkbox') {
                    if (optionName.toLowerCase() === 'hidden anime') {
                        hiddenList = true
                    } else if (optionName.toLowerCase() === 'hide my anime') {
                        hideMyAnime = true
                    } else if (optionName.toLowerCase() === 'hide watched') {
                        hideWatched = true
                    } else if (optionName.toLowerCase() === 'show my anime') {
                        showMyAnime = true
                    } else if (optionName.toLowerCase() === 'show airing') {
                        showAiring = true
                    }
                } else if (filterType === 'input number') {
                    if (optionName.toLowerCase() === "weighted score") {
                        comparisonFilter.weightedScore = {
                            operator: CMPoperator,
                            value: parseFloat(CMPNumber ?? optionValue)
                        }
                    } else if (optionName.toLowerCase() === "score") {
                        comparisonFilter.score = {
                            operator: CMPoperator,
                            value: parseFloat(CMPNumber ?? optionValue)
                        }
                    } else if (optionName.toLowerCase() === "average score") {
                        comparisonFilter.averageScore = {
                            operator: CMPoperator,
                            value: parseFloat(CMPNumber ?? optionValue)
                        }
                    } else if (optionName.toLowerCase() === "user score") {
                        comparisonFilter.userScore = {
                            operator: CMPoperator,
                            value: parseFloat(CMPNumber ?? optionValue)
                        }
                    } else if (optionName.toLowerCase() === "popularity") {
                        comparisonFilter.popularity = {
                            operator: CMPoperator,
                            value: parseFloat(CMPNumber ?? optionValue)
                        }
                    } else if (optionName.toLowerCase() === "limit favourites") {
                        favoriteContentsLimit = parseFloat(optionValue)
                    }
                }
            } else if (selected === 'excluded') {
                if (filterType === 'dropdown') {
                    if (optionType === 'genre') {
                        exclude.genres[optionName.toLowerCase()] = true
                    } else if (optionType === 'tag') {
                        exclude.tags[optionName.toLowerCase()] = true
                    } else if (optionType === 'year') {
                        exclude.year[optionName] = true
                    } else if (optionType === 'season') {
                        exclude.season[optionName.toLowerCase()] = true
                    } else if (optionType === 'format') {
                        exclude.format[optionName.toLowerCase()] = true
                    } else if (optionType === 'user status') {
                        exclude.userStatus[optionName.toLowerCase()] = true
                    } else if (optionType === 'studio') {
                        exclude.studios[optionName.toLowerCase()] = true
                    }
                }
            }
        })
        self.postMessage({ status: "Filtering Recommendation List" })

        // Get Hidden Entries
        let hiddenEntries = (await retrieveJSON("hiddenEntries")) || {}
        // Filter and ADD Caution State below
        let recommendedAnimeList = await retrieveJSON("recommendedAnimeList") || []
        finalAnimeList = recommendedAnimeList.filter((anime, idx) => {
            self.postMessage({ progress: ((idx + 1) / recommendedAnimeList.length) * 100 })
            if (showAiring) {
                if (!ncsCompare(anime?.status, 'releasing')) {
                    return false;
                }
            }

            if (hideMyAnime) {
                if (!ncsCompare(anime?.userStatus, 'unwatched')) {
                    return false;
                }
            }

            if (showMyAnime) {
                if (ncsCompare(anime?.userStatus, 'unwatched')) {
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
                if (hiddenEntries[anime.id] === undefined) {
                    return false
                }
            } else {


                if (hiddenEntries[anime.id] === true) {
                    return false
                }
            }

            // Comparison Filter >=, >, <, <=, number
            if (comparisonFilter.userScore) {
                let operator = comparisonFilter.userScore.operator?.trim?.(),
                    value = comparisonFilter.userScore.value
                if (typeof anime.userScore !== "number") {
                    return false
                } else if (typeof operator === "string" && typeof value === "number") {
                    switch (operator) {
                        case ">=": {
                            if (anime.userScore < value) return false
                            break
                        }
                        case "<=": {
                            if (anime.userScore > value) return false
                            break
                        }
                        case "<": {
                            if (anime.userScore >= value) return false
                            break
                        }
                        case ">": {
                            if (anime.userScore <= value) return false
                            break
                        }
                    }
                } else if (typeof value === "number") {
                    if (anime.userScore !== value) return false
                }
            }

            if (comparisonFilter.averageScore) {
                let operator = comparisonFilter.averageScore.operator?.trim?.(),
                    value = comparisonFilter.averageScore.value
                if (typeof anime.averageScore !== "number") {
                    return false
                } else if (typeof operator === "string" && typeof value === "number") {
                    switch (operator) {
                        case ">=": {
                            if (anime.averageScore < value) return false
                            break
                        }
                        case "<=": {
                            if (anime.averageScore > value) return false
                            break
                        }
                        case "<": {
                            if (anime.averageScore >= value) return false
                            break
                        }
                        case ">": {
                            if (anime.averageScore <= value) return false
                            break
                        }
                    }
                } else if (typeof value === "number") {
                    if (anime.averageScore !== value) return false
                }
            }

            if (comparisonFilter.popularity) {
                let operator = comparisonFilter.popularity.operator?.trim?.(),
                    value = comparisonFilter.popularity.value
                if (typeof anime.popularity !== "number") {
                    return false
                } else if (typeof operator === "string" && typeof value === "number") {
                    switch (operator) {
                        case ">=": {
                            if (anime.popularity < value) return false
                            break
                        }
                        case "<=": {
                            if (anime.popularity > value) return false
                            break
                        }
                        case "<": {
                            if (anime.popularity >= value) return false
                            break
                        }
                        case ">": {
                            if (anime.popularity <= value) return false
                            break
                        }
                    }
                } else if (typeof value === "number") {
                    if (anime.popularity !== value) return false
                }
            }

            if (comparisonFilter.weightedScore) {
                let operator = comparisonFilter.weightedScore.operator?.trim?.(),
                    value = comparisonFilter.weightedScore.value
                if (typeof anime.weightedScore !== "number") {
                    return false
                } else if (typeof operator === "string" && typeof value === "number") {
                    switch (operator) {
                        case ">=": {
                            if (anime.weightedScore < value) return false
                            break
                        }
                        case "<=": {
                            if (anime.weightedScore > value) return false
                            break
                        }
                        case "<": {
                            if (anime.weightedScore >= value) return false
                            break
                        }
                        case ">": {
                            if (anime.weightedScore <= value) return false
                            break
                        }
                    }
                } else if (typeof value === "number") {
                    if (anime.weightedScore !== value) return false
                }
            }

            if (comparisonFilter.score) {
                let operator = comparisonFilter.score.operator?.trim?.(),
                    value = comparisonFilter.score.value
                if (typeof anime.score !== "number") {
                    return false
                } else if (typeof operator === "string" && typeof value === "number") {
                    switch (operator) {
                        case ">=": {
                            if (anime.score < value) return false
                            break
                        }
                        case "<=": {
                            if (anime.score > value) return false
                            break
                        }
                        case "<": {
                            if (anime.score >= value) return false
                            break
                        }
                        case ">": {
                            if (anime.score <= value) return false
                            break
                        }
                    }
                } else if (typeof value === "number") {
                    if (anime.score !== value) return false
                }
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

            // Add Cautions
            anime.contentCaution = {
                caution: [],
                semiCaution: []
            }
            // Add Genre Caution
            anime.genres.forEach(genre => {
                if (cautionContents.genres[genre?.toLowerCase?.()]) {
                    anime.contentCaution.caution.push(genre)
                } else if (semiCautionContents.genres[genre?.toLowerCase?.()]) {
                    anime.contentCaution.semiCaution.push(genre)
                }
            })

            // Add Tag Caution
            anime.tags.forEach(tag => {
                if (cautionContents.tags[tag?.toLowerCase?.()]) {
                    anime.contentCaution.caution.push(tag)
                } else if (semiCautionContents.tags[tag?.toLowerCase?.()]) {
                    anime.contentCaution.semiCaution.push(tag)
                }
            })
            // Limit Favorite Contents
            if (isJsonObject(anime.favoriteContents) && !jsonIsEmpty(anime.favoriteContents)) {
                let sortedFavoriteContents = Object.entries(anime.favoriteContents.genres)
                    .concat(Object.entries(anime.favoriteContents.tags))
                    .concat(Object.entries(anime.favoriteContents.studios))
                    .sort((a, b) => {
                        return b[1] - a[1]
                    })
                    .map(([k, v]) => `${k}: (${formatNumber(v)})`)
                anime.sortedFavoriteContents = sortedFavoriteContents?.slice?.(0, favoriteContentsLimit) || []
            } else {
                anime.sortedFavoriteContents = []
            }

            return true;
        });
        recommendedAnimeList = null
        // Sort List
        let sortFilter = (await retrieveJSON("filterOptions") || []).sortFilter
        let { sortName, sortType } = sortFilter?.filter(({ sortType }) => sortType === "desc" || sortType === "asc")?.[0] || { sortName: 'weighted score', sortType: 'desc' }
        sortFilter = null
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
        sortName = sortType = null
        await saveJSON(activeTagFilters, 'activeTagFilters')
        let filterOptions = data?.filterOptions
        if (filterOptions) {
            await saveJSON(filterOptions, "filterOptions")
        }
        await saveJSON(finalAnimeList, "finalAnimeList")
        self.postMessage({ status: null })
        self.postMessage({ progress: 100 })
        self.postMessage({
            isNew: true,
            finalAnimeList: finalAnimeList.slice(0, loadLimit),
            hiddenEntries: hiddenEntries,
            numberOfNextLoadedGrid: Math.min(Math.max(finalAnimeList.length - loadLimit, 0), loadLimit)
        });
        filteredList = finalAnimeList.slice(loadLimit)
    }
};

// Functions
const formatNumber = (number, dec = 2) => {
    if (typeof number === "number") {
        const formatter = new Intl.NumberFormat("en-US", {
            maximumFractionDigits: dec, // display up to 2 decimal places
            minimumFractionDigits: 0, // display at least 0 decimal places
            notation: "compact", // use compact notation for large numbers
            compactDisplay: "short", // use short notation for large numbers (K, M, etc.)
        });

        if (Math.abs(number) >= 1000) {
            return formatter.format(number);
        } else if (Math.abs(number) < 0.01) {
            return number.toExponential(0);
        } else {
            return (
                number.toFixed(dec) ||
                number.toLocaleString("en-US", { maximumFractionDigits: dec })
            );
        }
    } else {
        return null;
    }
}
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
            let transaction = event.target.transaction
            transaction.oncomplete = () => {
                return resolve();
            }
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
function isJsonObject(obj) {
    return Object.prototype.toString.call(obj) === "[object Object]"
}