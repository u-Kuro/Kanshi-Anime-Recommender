let db,
    userList,
    recommendedMediaList,
    lastCategoriesKeys,
    semiContentCautions = {
        genres: {},
        tags: {},
    },
    cautionContents = {
        genres: {},
        tags: {},
    },
    loadedIds = {},
    nextIndexToLoad = {},
    loadedMediaList = {},
    loadMediaTimeout = {},
    lastSearchedWord = {},
    shouldUpdateUserList, shouldUpdateRecommendedMediaList, shouldUpdateMediaCautions,
    updateListTimeout,
    selectCategoryTimeout,
    messageQueue = [], isProcessing,
    latestUpdateDate, latestSearchDate = {};
// K Icon
const hasOwnProperty = Object.prototype.hasOwnProperty

self.addEventListener("unhandledrejection", (event) => {
    const reason = event?.reason
    console.error(reason)
    
    let error = reason?.stack || reason?.message
    if (typeof error !== "string" || !error) {
        error = "Something went wrong"
    }
    self.postMessage({ error })
});

self.onmessage = ({ data }) => {
    messageQueue.push(data)
    if (!isProcessing) {
        isProcessing = true;
        executeMessage()
    }
};

async function executeMessage() {
    const data = messageQueue.shift();
    const postId = data?.postId
    try {
        if (!db) await IDBinit()

        if (hasOwnProperty.call(data, "loadMore")) {

            let selectedCategory = data?.selectedCategory

            if (recommendedMediaList != null
                && userList != null
                && selectedCategory != null
            ) {
                const searchDate = data?.searchDate
                if (searchDate > latestSearchDate[selectedCategory] || (latestSearchDate[selectedCategory] == null && searchDate)) {
                    latestSearchDate[selectedCategory] = searchDate
                }
                clearTimeout(loadMediaTimeout[selectedCategory])
                loadMediaTimeout[selectedCategory] = setTimeout(() => {
                    let categories = userList?.categories
                    let category = categories?.[selectedCategory]

                    if (category != null) {

                        const searchedWord = data?.searchedWord
                        const shouldReload = data?.reload || searchedWord !== lastSearchedWord[selectedCategory]

                        let idx
                        if (shouldReload || !loadedMediaList[selectedCategory]) {
                            idx = 0
                            const mediaList = category.mediaList

                            if (typeof searchedWord === "string") {
                                const query = searchedWord.trim().replace(/[\uFF01-\uFF60\uFFE0-\uFFE6\u3000]/g, (ch) => {
                                    if (ch === '\u3000') return '';
                                    return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
                                }).normalize('NFD').replace(/[^a-zA-Z0-9\p{Lo}]/gu, '').toLowerCase()
                                loadedMediaList[selectedCategory] = mediaList.filter((id) => {
                                    let title = recommendedMediaList[id]?.title
                                    if (isJsonObject(title)) {
                                        return Object.values(title).some(($title) => 
                                            typeof $title === "string" && $title.trim().replace(/[\uFF01-\uFF60\uFFE0-\uFFE6\u3000]/g, (ch) => {
                                                if (ch === '\u3000') return '';
                                                return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
                                            }).normalize('NFD').replace(/[^a-zA-Z0-9\p{Lo}]/gu, '').toLowerCase().includes(query)
                                        );
                                    }
                                })
                            } else {
                                loadedMediaList[selectedCategory] = mediaList
                            }
                        } else {
                            idx = nextIndexToLoad[selectedCategory] ?? 0
                        }
                        
                        const mediaListLen = loadedMediaList[selectedCategory].length                        
                        if (idx < mediaListLen && (id = loadedMediaList[selectedCategory][idx])) {
                            const media = editMedia(recommendedMediaList[id], category.shownSortName)
                            const airingAt = media?.nextAiringEpisode?.airingAt

                            self.postMessage({
                                loadMore: true,
                                selectedCategory,
                                idx,
                                media,
                                airingAt: media?.nextAiringEpisode?.estimated !== true && (airingAt * 1000) > new Date().getTime() ? airingAt : undefined,
                                isLast: idx + 1 === mediaListLen,
                                updateDate: latestUpdateDate,
                                searchDate: latestSearchDate[selectedCategory]
                            })
                            nextIndexToLoad[selectedCategory] = idx + 1
                            loadedIds[selectedCategory] = loadedMediaList[selectedCategory].slice(0, idx).map((id) => id)
                        } else if (mediaListLen === 0) {
                            self.postMessage({
                                loadMore: true,
                                selectedCategory,
                                isLast: true,
                                updateDate: latestUpdateDate,
                                searchDate: latestSearchDate[selectedCategory]
                            })

                            nextIndexToLoad[selectedCategory] = 0
                            loadedIds[selectedCategory] =  []
                        } else {
                            self.postMessage({
                                loadMore: true,
                                selectedCategory,
                                updateDate: latestUpdateDate,
                                searchDate: latestSearchDate[selectedCategory]
                            })
                        }
                        
                        lastSearchedWord[selectedCategory] = searchedWord
                    }
                }, 0)
            }
        } else if (hasOwnProperty.call(data, "categorySelected")) {

            let categorySelected = data?.categorySelected

            if (userList != null && categorySelected != null) {
                let categories = userList?.categories
                let category = categories?.[categorySelected]

                if (category != null) {

                    const { mediaFilters, sortBy } = category
                    
                    self.postMessage({
                        categorySelected,
                        category: {
                            mediaFilters,
                            sortBy,
                        },
                        reloadList: true,
                        postId
                    })
                }
            }
        } else if (hasOwnProperty.call(data, "getEarlisetReleaseDate")) {
            if (recommendedMediaList != null) {

                let loadedListsArrays = Object.values(loadedIds)
                let flattenedLoadedList = loadedListsArrays.reduce((acc, curr) => {
                    for (let i = 0, l = curr?.length; i < l; i++) {
                        acc.push(curr[i])
                    }
                    return acc
                }, [])
                let loadedList = flattenedLoadedList.map((id) => recommendedMediaList[id])
                if (loadedList.length) {
                    const currentDateTime = new Date().getTime()
                    loadedList = loadedList.filter((e) => e?.nextAiringEpisode?.estimated === true ? false : (e?.nextAiringEpisode?.airingAt * 1000) > currentDateTime)
                    if (loadedList.length) {
                        loadedList.sort((a, b) => {
                            let x = a?.nextAiringEpisode?.airingAt,
                                y = b?.nextAiringEpisode?.airingAt;
                            x = x != null ? x : Infinity
                            y = y != null ? y : Infinity
                            return x - y
                        })

                        const earliestReleaseDate = loadedList?.[0]?.nextAiringEpisode?.airingAt
                        if (typeof earliestReleaseDate === "number" && !isNaN(earliestReleaseDate)) {
                            self.postMessage({
                                getEarlisetReleaseDate: true,
                                earliestReleaseDate,
                            });
                        }
                    }
                }
            }
        } else if (hasOwnProperty.call(data, "loadAll")) {

            userList = await retrieveJSON("userList")
            if (!isJsonObject(userList) || jsonIsEmpty(userList)) {
                self.postMessage({
                    loadAll: true,
                    shouldReloadList: true,
                    updateDate: latestUpdateDate,
                    postId,
                })
            } else {
                let selectedCategory = data.selectedCategory
                const { categories, hiddenEntries, mediaCautions } = userList
                const categoriesKeys = Object.keys(categories)
                removeDeletedCategories(categories, categoriesKeys)

                let category = categories?.[selectedCategory]
                if (category == null) {
                    for (let categoriesKey in categories) {
                        selectedCategory = categoriesKey
                        category = categories[selectedCategory]
                        break
                    }
                }
                
                const { mediaFilters, sortBy } = category || {}
                
                self.postMessage({
                    loadAll: true,
                    shouldReloadList: false,
                    categories: categoriesKeys.sort().reduce((acc, rec) => {
                        acc[rec] = 1
                        return acc
                    }, {}),
                    hiddenEntries,
                    mediaCautions,
                    selectedCategory,
                    category: {
                        mediaFilters,
                        sortBy,
                    },
                    reloadList: true,
                    updateDate: latestUpdateDate,
                    postId,
                })

                for (let i = 0, l = mediaCautions?.length; i < l; i++) {
                    let {
                        status,
                        filterType,
                        optionName,
                        optionCategory
                    } = mediaCautions[i] || {}
                    // Included is Semi Caution and Excluded is Caution
                    if (status === "included") {
                        if (filterType === 'selection') {
                            if (optionCategory === 'Genre') {
                                semiContentCautions.genres[optionName] = true
                            } else if (optionCategory === 'Tag') {
                                semiContentCautions.tags[optionName] = true
                            }
                        }
                    } else if (status === 'excluded') {
                        if (filterType === 'selection') {
                            if (optionCategory === 'Genre') {
                                cautionContents.genres[optionName] = true
                            } else if (optionCategory === 'Tag') {
                                cautionContents.tags[optionName] = true
                            }
                        }
                    }
                }

                recommendedMediaList = await retrieveJSON("recommendedMediaList")
            }
        } else {

            shouldUpdateUserList = shouldUpdateUserList || hasOwnProperty.call(data, "updateUserList")
            shouldUpdateRecommendedMediaList = shouldUpdateRecommendedMediaList || hasOwnProperty.call(data, "updateRecommendedMediaList")
            shouldUpdateMediaCautions = shouldUpdateMediaCautions || hasOwnProperty.call(data, "updateMediaCautions")
            
            const updateList = (updateDate, updatedCategories) => {
                let promises = []

                if (shouldUpdateRecommendedMediaList) {
                    promises.push((async () => {
                        recommendedMediaList = await retrieveJSON("recommendedMediaList") || recommendedMediaList
                        shouldUpdateRecommendedMediaList = false
                    })())
                }

                if (shouldUpdateMediaCautions) {
                    promises.push((async () => {
                        (function (newUserList) {
                            if (isJsonObject(newUserList) && !jsonIsEmpty(newUserList)) {
                                userList = newUserList
                                removeDeletedCategories(userList.categories)
                            }
                        })(await retrieveJSON("userList"));

                        const mediaCautions = userList?.mediaCautions
                        if (mediaCautions instanceof Array) {
                            semiContentCautions = {
                                genres: {},
                                tags: {},
                            }
                            cautionContents = {
                                genres: {},
                                tags: {},
                            }
                            for (let i = 0, l = mediaCautions?.length; i < l; i++) {
                                let {
                                    status,
                                    filterType,
                                    optionName,
                                    optionCategory
                                } = mediaCautions[i] || {}
                                // Included is Semi Caution and Excluded is Caution
                                if (status === "included") {
                                    if (filterType === 'selection') {
                                        if (optionCategory === 'Genre') {
                                            semiContentCautions.genres[optionName] = true
                                        } else if (optionCategory === 'Tag') {
                                            semiContentCautions.tags[optionName] = true
                                        }
                                    }
                                } else if (status === 'excluded') {
                                    if (filterType === 'selection') {
                                        if (optionCategory === 'Genre') {
                                            cautionContents.genres[optionName] = true
                                        } else if (optionCategory === 'Tag') {
                                            cautionContents.tags[optionName] = true
                                        }
                                    }
                                }
                            }
                        }
                        shouldUpdateUserList = shouldUpdateMediaCautions = false
                    })())
                } else if (shouldUpdateUserList || updatedCategories) {
                    promises.push((async () => {
                        (function (newUserList) {
                            if (isJsonObject(newUserList) && !jsonIsEmpty(newUserList)) {
                                userList = newUserList
                                removeDeletedCategories(userList.categories)
                            }
                        })(await retrieveJSON("userList"));
                        shouldUpdateUserList = false
                    })())
                }

                Promise.all(promises).then(() => {
                    if (updatedCategories) {
                        const categories = userList?.categories || {}
                        const categoriesKeys = Object.keys(categories)

                        for (const categoryKey in updatedCategories) {
                            const category = categories[categoryKey]

                            if (category == null) continue

                            const { mediaFilters, sortBy } = category
                            
                            updatedCategories[categoryKey] = { mediaFilters, sortBy }
                        }

                        if (updateDate > latestUpdateDate || (latestUpdateDate == null && updateDate)) {
                            latestUpdateDate = updateDate
                        }

                        self.postMessage({
                            updateDate,
                            updatedCategories,
                            categories: categoriesKeys.sort().reduce((acc, rec) => {
                                acc[rec] = 1
                                return acc
                            }, {}),
                            reloadList: true,
                            updateDate,
                            postId
                        })
                    } else {
                        if (updateDate > latestUpdateDate || (latestUpdateDate == null && updateDate)) {
                            latestUpdateDate = updateDate
                        }

                        self.postMessage({
                            reloadList: true,
                            updateDate,
                            postId
                        })
                    }
                })
            }

            const updateDate = data.updateDate
            if (updateDate > latestUpdateDate || (latestUpdateDate == null && updateDate)) {
                clearTimeout(updateListTimeout)
            }
            if (hasOwnProperty.call(data, "updatedCategories")) {
                updateList(updateDate, data.updatedCategories)
            } else {
                updateListTimeout = setTimeout(() => updateList(updateDate))
            }
        }
    } catch (reason) {
        console.error(reason)
        let error = reason?.stack || reason?.message
        if (typeof error !== "string" || !error) {
            error = "Something went wrong"
        }
        self.postMessage({
            error,
            postId
        })
    }
    if (messageQueue.length > 0) {
        executeMessage()
    } else {
        isProcessing = false;
    }
}

function editMedia(media, shownSortName) {
    if (media == null) return null

    media = JSON.parse(JSON.stringify(media))
    if (hasOwnProperty.call(media, "isEdited")) {
        return media
    }
    // Add Cautions
    const contentCaution = {
        caution: [],
        semiCaution: []
    }
    // Add Genre Caution
    media.genres.forEach(genre => {
        if (cautionContents.genres[genre]) {
            contentCaution.caution.push(genre)
        } else if (semiContentCautions.genres[genre]) {
            contentCaution.semiCaution.push(genre)
        }
    })

    // Add Tag Caution
    media.tags.forEach(tag => {
        let tagName = tag?.name
        if (cautionContents.tags[tagName]) {
            contentCaution.caution.push(tagName)
        } else if (semiContentCautions.tags[tagName]) {
            contentCaution.semiCaution.push(tagName)
        }
    })

    // Limit Favorite Contents
    let sortedFavoriteContents = []
    if (isJsonObject(media.favoriteContents) && !jsonIsEmpty(media.favoriteContents)) {
        sortedFavoriteContents = Object.entries(media.favoriteContents.studios)
            .concat(Object.entries(media.favoriteContents.tags))
            .concat(Object.entries(media.favoriteContents.genres))
            .sort((a, b) => b[1] - a[1])
            .map(([k, v]) => `${k}: (${formatNumber(v)})`)
    }

    // Last Edit Contents for Frontend
    // Edit Genre
    let genres = media?.genres
    if (genres?.length) {
        let favouriteGenres = media?.favoriteContents?.genres || {},
            otherGenres = media?.otherContents?.genres || {},
            caution = {}, semiCaution = {};
        if (isJsonObject(contentCaution) && !jsonIsEmpty(contentCaution)) {
            contentCaution.caution.forEach((genre) => {
                caution[genre] = true;
            });
            contentCaution.semiCaution.forEach((genre) => {
                semiCaution[genre] = true;
            });
        }
        let genresFavourite = [],
            genreCaution = [],
            genreSemiCaution = [],
            genresOthers = [],
            others = [],
            genresRunnned = {};
        genres.forEach((genre) => {
            if (genresRunnned[genre] || !genre) return
            genresRunnned[genre] = true;

            if (caution[genre]) {
                if (favouriteGenres[genre] > 0) {
                    genre = `${genre} (${formatNumber(favouriteGenres[genre])})`
                } else if (otherGenres[genre] > 0) {
                    genre = `${genre} (${formatNumber(otherGenres[genre])})`
                }
                genreCaution.push({ genre, genreColor: "red" });
            } else if (semiCaution[genre]) {
                if (favouriteGenres[genre] > 0) {
                    genre = `${genre} (${formatNumber(favouriteGenres[genre])})`
                } else if (otherGenres[genre] > 0) {
                    genre = `${genre} (${formatNumber(otherGenres[genre])})`
                }
                genreSemiCaution.push({ genre, genreColor: "teal" });
            } else if (favouriteGenres[genre]) {
                genresFavourite.push({
                    genre,
                    score: favouriteGenres[genre],
                });
            } else if (favouriteGenres[genre] > 0) {
                genresFavourite.push({
                    genre,
                    score: favouriteGenres[genre],
                });
            } else if (otherGenres[genre] > 0) {
                genresOthers.push({
                    genre,
                    score: otherGenres[genre],
                });
            } else {
                others.push({ genre, genreColor: null });
            }
        });
        genresFavourite.sort((a, b) => {
            let aScore = a?.score, bScore = b?.score
            if (aScore==null || isNaN(aScore)) return 1
            if (bScore==null || isNaN(bScore)) return -1
            return bScore - aScore
        });
        genresFavourite = genresFavourite.map((e) => {
            return {
                genre: `${e.genre} (${formatNumber(e.score)})`,
                genreColor: "green",
            };
        });
        genresOthers.sort((a, b) => {
            let aScore = a?.score, bScore = b?.score
            if (aScore==null || isNaN(aScore)) return 1
            if (bScore==null || isNaN(bScore)) return -1
            return bScore - aScore
        });
        genresOthers = genresOthers.map((e) => {
            return {
                genre: `${e.genre} (${formatNumber(e.score)})`,
                genreColor: null,
            };
        });
        media.shownGenres = genreCaution
            .concat(genreSemiCaution)
            .concat(genresFavourite)
            .concat(genresOthers)
            .concat(others);
    } else {
        media.shownGenres = []
    }

    // Edit Tag
    let tags = media?.tags
    if (tags?.length) {
        let favouriteTags = media?.favoriteContents?.tags || {},
            otherTags = media?.otherContents?.tags || {},
            caution = {},
            semiCaution = {};
        if (isJsonObject(contentCaution) && !jsonIsEmpty(contentCaution)) {
            contentCaution.caution.forEach((tag) => {
                caution[tag] = true;
            });
            contentCaution.semiCaution.forEach((tag) => {
                semiCaution[tag] = true;
            });
        }
        let tagsFavourite = [],
            tagsOthers = [],
            tagCaution = [],
            tagSemiCaution = [],
            others = [];
        let tagsRunnned = {};
        tags.forEach((tag) => {
            let tagName = tag?.name;
            if (tagsRunnned[tagName] || !tagName) return
            tagsRunnned[tagName] = true

            let tagRank = tag?.rank;

            if (caution[tagName]) {
                let score
                if (favouriteTags[tagName] > 0) {
                    score = favouriteTags[tagName]
                } else if (otherTags[tagName] > 0) {
                    score = otherTags[tagName]
                }
                tagCaution.push({
                    tagName,
                    score,
                    tagRank,
                });
            } else if (semiCaution[tagName]) {
                let score
                if (favouriteTags[tagName] > 0) {
                    score = favouriteTags[tagName]
                } else if (otherTags[tagName] > 0) {
                    score = otherTags[tagName]
                }
                tagSemiCaution.push({
                    tagName,
                    score,
                    tagRank,
                });
            } else if (favouriteTags[tagName] > 0) {
                tagsFavourite.push({
                    tagName,
                    score: favouriteTags[tagName],
                    tagRank,
                });
            } else if (otherTags[tagName] > 0) {
                tagsOthers.push({
                    tagName,
                    score: otherTags[tagName],
                    tagRank,
                });
            } else {
                others.push({
                    tagName,
                    tagRank,
                });
            }
        });
        tagCaution.sort((a, b) => {
            let aRank = a?.tagRank, bRank = b?.tagRank
            if (aRank==null || isNaN(aRank)) return 1
            if (bRank==null || isNaN(bRank)) return -1
            if (bRank !== aRank) return bRank - aRank

            let aScore = a?.score, bScore = b?.score
            if (aScore==null || isNaN(aScore)) return 1
            if (bScore==null || isNaN(bScore)) return -1
            return aScore - bScore
        })
        tagCaution = tagCaution.map(({ tagName, score, tagRank }) => {
            let tag
            if (score != null) {
                tag = `<span>${tagName} (${formatNumber(score)})${tagRank ? "</span><span> " + tagRank + "%" : ""}</span>`
            } else {
                tag =  `<span>${tagName}${tagRank ? "</span><span> " + tagRank + "%" : ""}</span>`
            }
            return {
                tagName,
                tag,
                tagColor: "red",
            }
        })
        tagSemiCaution.sort((a, b) => {
            let aRank = a?.tagRank, bRank = b?.tagRank
            if (aRank==null || isNaN(aRank)) return 1
            if (bRank==null || isNaN(bRank)) return -1
            if (bRank !== aRank) return bRank - aRank

            let aScore = a?.score, bScore = b?.score
            if (aScore==null || isNaN(aScore)) return 1
            if (bScore==null || isNaN(bScore)) return -1
            return aScore - bScore
        })
        tagSemiCaution = tagSemiCaution.map(({ tagName, score, tagRank }) => {
            let tag
            if (score != null) {
                tag = `<span>${tagName} (${formatNumber(score)})${tagRank ? "</span><span> " + tagRank + "%" : ""}</span>`
            } else {
                tag =  `<span>${tagName}${tagRank ? "</span><span> " + tagRank + "%" : ""}</span>`
            }
            return {
                tagName,
                tag,
                tagColor: "teal",
            }
        })
        tagsFavourite.sort((a, b) => {
            let aScore = a?.score, bScore = b?.score
            if (aScore==null || isNaN(aScore)) return 1
            if (bScore==null || isNaN(bScore)) return -1
            if (bScore !== aScore) return bScore - aScore

            let aRank = a?.tagRank, bRank = b?.tagRank
            if (aRank==null || isNaN(aRank)) return 1
            if (bRank==null || isNaN(bRank)) return -1
            return bRank - aRank
        });
        tagsFavourite = tagsFavourite.map(({ tagName, score, tagRank }) => {
            return {
                tagName,
                tag: `<span>${tagName} (${formatNumber(score)})${tagRank ? "</span><span> " + tagRank + "%" : ""}</span>`,
                tagColor: "green",
            };
        });
        tagsOthers.sort((a, b) => {
            let aRank = a?.tagRank, bRank = b?.tagRank
            if (aRank==null || isNaN(aRank)) return 1
            if (bRank==null || isNaN(bRank)) return -1
            if (bRank !== aRank) return bRank - aRank
            
            let aScore = a?.score, bScore = b?.score
            if (aScore==null || isNaN(aScore)) return 1
            if (bScore==null || isNaN(bScore)) return -1
            return bScore - aScore
        });
        tagsOthers = tagsOthers.map(({ tagName, score, tagRank }) => {
            return {
                tagName,
                tag: `<span>${tagName} (${formatNumber(score)})${tagRank ? "</span><span> " + tagRank + "%" : ""}</span>`,
                tagColor: null,
            };
        });
        others.sort((a, b) => {
            let aRank = a?.tagRank, bRank = b?.tagRank
            if (aRank==null || isNaN(aRank)) return 1
            if (bRank==null || isNaN(bRank)) return -1
            return bRank - aRank
        });
        others = others.map(({ tagName, tagRank }) => {
            return {
                tagName,
                tag: `<span>${tagName}${tagRank ? "</span><span> " + tagRank + "%" : ""}</span>`,
                tagColor: null,
            }
        })
        media.shownTags = tagCaution
            .concat(tagSemiCaution)
            .concat(tagsFavourite)
            .concat(tagsOthers)
            .concat(others);
    } else {
        media.shownTags = []
    }

    // Edit Studio
    let studios = Object.entries(media.studios || {})
    if (studios?.length) {
        let favouriteStudios = media?.favoriteContents?.studios || {},
            otherStudios = media?.otherContents?.studios || {},
            studiosFavourite = [], 
            studiosOthers = [], 
            others = [],
            studiosRunnned = {};
        studios.forEach(([studio, studioUrl]) => {
            if (studiosRunnned[studio] || !studio) return
            studiosRunnned[studio] = true
            
            if (favouriteStudios[studio] > 0) {
                studiosFavourite.push({
                    studio: [studio, studioUrl],
                    score: favouriteStudios[studio],
                });
            } else if (otherStudios[studio] > 0) {
                studiosOthers.push({
                    studio: [studio, studioUrl],
                    score: otherStudios[studio],
                });
            } else {
                others.push({
                    studio: {
                        studioName: studio,
                        studioUrl: studioUrl,
                    },
                    studioColor: null,
                });
            }
        });
        studiosFavourite.sort((a, b) => {
            let aScore = a?.score, bScore = b?.score
            if (aScore==null || isNaN(aScore)) return 1
            if (bScore==null || isNaN(bScore)) return -1
            return bScore - aScore
        });
        studiosFavourite = studiosFavourite.map((e) => {
            return {
                studio: {
                    studioName: `${e.studio[0]} (${formatNumber(e.score)})`,
                    studioUrl: e.studio[1],
                },
                studioColor: "green",
            };
        });
        studiosOthers.sort((a, b) => {
            let aScore = a?.score, bScore = b?.score
            if (aScore==null || isNaN(aScore)) return 1
            if (bScore==null || isNaN(bScore)) return -1
            return bScore - aScore
        });
        studiosOthers = studiosOthers.map((e) => {
            return {
                studio: {
                    studioName: `${e.studio[0]} (${formatNumber(e.score)})`,
                    studioUrl: e.studio[1],
                },
                studioColor: null,
            };
        });
        media.shownStudios = studiosFavourite.concat(studiosOthers).concat(others)
    } else {
        media.shownStudios = []
    }

    // Shown Title
    let title = media?.title
    media.shownTitle = title?.english || title?.romaji || title?.native || ""
    media.copiedTitle = title?.romaji || title?.english || title?.native || ""
    // Brief Info
    let score = media?.score
    let $contentCaution = [];
    if (contentCaution?.caution instanceof Array) {
        $contentCaution = $contentCaution.concat(contentCaution.caution)
    }
    if (contentCaution?.semiCaution instanceof Array) {
        $contentCaution = $contentCaution.concat(contentCaution.semiCaution)
    }
    let briefInfo;
    if (sortedFavoriteContents.length) {
        briefInfo = `LOVED \n - ${sortedFavoriteContents.join(", \n - ")}`;
    }
    if ($contentCaution.length) {
        briefInfo = `${briefInfo ? (briefInfo + '\n\n ') : ''}${"CAUTION \n - " + $contentCaution.join(", \n - ")}`;
    }
    media.briefInfo = briefInfo;

    // User Status Color
    let userStatus = media?.userStatus
    if (userStatus === "Completed") {
        media.userStatusColor = "green";
    } else if (
        userStatus === "Current" ||
        userStatus === "Repeating"
    ) {
        media.userStatusColor = "blue";
    } else if (userStatus === "Planning") {
        media.userStatusColor = "orange";
    } else if (userStatus === "Paused") {
        media.userStatusColor = "peach";
    } else if (userStatus === "Dropped") {
        media.userStatusColor = "red";
    }

    // Caution Color
    let contentCautionColor;
    if (contentCaution?.caution?.length) {
        // Caution
        contentCautionColor = "red";
    } else if (contentCaution?.semiCaution?.length) {
        // Semi Caution
        contentCautionColor = "teal";
    } else if (media.recommendationCode === 0) {
        // Very Low Score
        contentCautionColor = "purple";
    } else if (media.recommendationCode === 1) {
        // Low Score
        contentCautionColor = "orange";
    } else {
        contentCautionColor = "green";
    }
    media.contentCautionColor = contentCautionColor;

    media.formattedWeightedScore = formatNumber(media?.weightedScore)
    media.formattedAverageScore = formatNumber(media?.averageScore * 0.1, 1)
    media.formattedPopularity = formatNumber(media?.popularity, media?.popularity >= 1000 ? 1 : 0)

    // Get Shown Metric
    if (shownSortName === "Score" || shownSortName === "Date" || shownSortName === "Date Added" || shownSortName === "Date Updated") {
        media.shownScore = formatNumber(score) ?? "N/A";
    } else if (shownSortName === "User Score") {
        media.shownScore = media?.userScore ?? "N/A";
    } else if (shownSortName === "Average Score") {
        media.shownScore = media?.averageScore ?? "N/A";
    } else if (shownSortName === "Popularity") {
        media.shownCount = media.formattedPopularity ?? "N/A";
    } else if (shownSortName === "Trending") {
        media.shownActivity = formatNumber(media?.trending, media?.trending >= 1000 ? 1 : 0) ?? "N/A";
    } else if (shownSortName === "Favorites") {
        media.shownFavorites = formatNumber(media?.favorites, media?.favorites >= 1000 ? 1 : 0) ?? "N/A";
    } else {
        media.shownScore = media.formattedWeightedScore ?? "N/A"
    }

    let recommendedRatingColor;
    if (media.recommendationCode === 0) {
        recommendedRatingColor = "purple-fill";
    } else if (media.recommendationCode === 1) {
        recommendedRatingColor = "orange-fill";
    } else {
        recommendedRatingColor = "green-fill";
    }
    media.recommendedRatingColor = recommendedRatingColor

    media.isEdited = true

    return media;
}
function removeDeletedCategories(categories, newCategoriesKeys) {
    if (!newCategoriesKeys) newCategoriesKeys = Object.keys(categories)
    if (lastCategoriesKeys) {
        for (const categoryName of lastCategoriesKeys) {
            if (!categories[categoryName]) {
                clearTimeout(loadMediaTimeout[categoryName])
                delete loadMediaTimeout[categoryName]
                delete loadedIds[categoryName]
                delete nextIndexToLoad[categoryName]
                delete loadedMediaList[categoryName]
                delete lastSearchedWord[categoryName]
            }
        }
    }
    lastCategoriesKeys = newCategoriesKeys
}
function formatNumber(number, dec = 2) {
    if (typeof number === "number") {
        const formatter = new Intl.NumberFormat("en-US", {
            maximumFractionDigits: dec, // display up to 2 decimal places
            minimumFractionDigits: 0, // display at least 0 decimal places
            notation: "compact", // use compact notation for large numbers
            compactDisplay: "short", // use short notation for large numbers (K, M, etc.)
        });
        if (Math.abs(number) >= 1000) {
            return formatter.format(number);
        } else if (Math.abs(number) < 0.01 && Math.abs(number) > 0) {
            return number.toExponential(0);
        } else {
            let formattedNumber = number.toFixed(dec);
            // Remove trailing zeros and decimal point if not needed
            if (formattedNumber.indexOf('.') !== -1) {
                formattedNumber = formattedNumber.replace(/\.?0+$/, '');
            }
            return formattedNumber || number.toLocaleString("en-US", { maximumFractionDigits: dec });
        }
    } else {
        return null;
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