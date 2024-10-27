let db,
    recommendedMediaEntries,
    recommendedMediaEntriesArray,
    hiddenMediaEntries, cautions;

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
    const postId = data.postId
    try {
        self.postMessage({ status: "Updating Categories and List" })

        if (!db) await IDBinit()

        const {
            updateRecommendedMediaList,
            mediaFilters,
            mediaCautions,
            categoriesToEdit,
            entriesToHide,
            entriesToShow,
            initList
        } = data || {}

        let shouldReloadAllCategories = updateRecommendedMediaList
        
        const messageToPost = {
            updateDate: new Date(),
            postId,
            initList,
            updateRecommendedMediaList
        }

        const collectionToPut = {
            categories: await retrieveJSON("categories") || getDefaultCategories(),
            mediaCautions: await retrieveJSON("categories") || getDefaulMediaCautions(),
            hiddenMediaEntries: await retrieveJSON("hiddenEntries") || {}
        }

        if (mediaCautions instanceof Array) {
            messageToPost.updateUserData = messageToPost.updateMediaCautions = shouldReloadAllCategories = true
            collectionToPut.mediaCautions = mediaCautions
        }

        if (!jsonIsEmpty(entriesToShow) || !jsonIsEmpty(entriesToHide)) {
            messageToPost.updateUserData = shouldReloadAllCategories = true
            if (entriesToShow["all"]) {
                collectionToPut.hiddenMediaEntries = {}
            } else {
                for (let id in entriesToShow) {
                    delete collectionToPut.hiddenMediaEntries[id]
                }
    
                for (let id in entriesToHide) {
                    collectionToPut.hiddenMediaEntries[id] = true
                }
            }
        }

        if (categoriesToEdit instanceof Array && categoriesToEdit.length > 0) {
            messageToPost.updateUserData = true
            messageToPost.updatedCategories = {}
            for (let i = 0; i < categoriesToEdit.length; i++) {
                const action = categoriesToEdit[i]
                if (action?.add) {
                    for (const categoryToAddKey in action.add) {
                        const categoryToAddFromKey = action.add[categoryToAddKey]

                        const categoryToAddFrom = collectionToPut.categories[categoryToAddFromKey]

                        if (categoryToAddFrom != null) {
                            collectionToPut.categories[categoryToAddKey] = JSON.parse(JSON.stringify(categoryToAddFrom))
                            messageToPost.updatedCategories[categoryToAddKey] = true
                        }
                    }
                } else if (action?.rename) {
                    for (const newNameForCategory in action.rename) {                        
                        const categoryToBeRenamedKey = action.rename[newNameForCategory]

                        const categoryToBeRenamed = collectionToPut.categories[categoryToBeRenamedKey]

                        if (categoryToBeRenamed != null) {
                            collectionToPut.categories[newNameForCategory] = JSON.parse(JSON.stringify(categoryToBeRenamed))
                            delete collectionToPut.categories[categoryToBeRenamedKey]

                            messageToPost.updatedCategories[newNameForCategory] = true
                        }

                        if (mediaFilters[categoryToBeRenamedKey] != null) {
                            mediaFilters[newNameForCategory] = JSON.parse(JSON.stringify(mediaFilters[categoryToBeRenamedKey]))
                            delete mediaFilters[categoryToBeRenamedKey]
                        }
                    }
                } else if (action?.delete) {
                    const categoryToDeleteKey = action.delete
                    delete collectionToPut.categories[categoryToDeleteKey]
                    delete mediaFilters[categoryToDeleteKey]
                }
            }
        }

        if (shouldReloadAllCategories || !jsonIsEmpty(mediaFilters)) {
            messageToPost.updateUserData = true
            recommendedMediaEntries = await retrieveJSON("recommendedMediaEntries")            

            if (recommendedMediaEntries != null) {
                const categories = collectionToPut.categories
                cautions = getContentCaution(collectionToPut.mediaCautions)
                recommendedMediaEntriesArray = Object.values(recommendedMediaEntries)
                hiddenMediaEntries = collectionToPut.hiddenMediaEntries

                if (shouldReloadAllCategories) {
                    const categoriesCount = Object.keys(categories||{}).length
                    let loadedCount = 0
                    for (const categoryKey in categories) {
                        const category = categories[categoryKey]

                        if (category != null) {

                            collectionToPut.categories[categoryKey] = updateMediaList(
                                mediaFilters?.[categoryKey]?.mediaFilters || category.mediaFilters,
                                mediaFilters?.[categoryKey]?.sortBy || category.sortBy,
                                Math.min(1, loadedCount / categoriesCount)
                            )
                            loadedCount++
                        }
                    }
                } else {
                    const categoriesCount = Object.keys(mediaFilters||{}).length
                    let loadedCount = 0
                    for (const categoryKey in mediaFilters) {
                        const category = categories[categoryKey]
                        const mediaFilter = mediaFilters[categoryKey]

                        if (category != null) {

                            collectionToPut.categories[categoryKey] = updateMediaList(
                                mediaFilter.mediaFilters || category.mediaFilters,
                                mediaFilter.sortBy || category.sortBy,
                                Math.min(1, loadedCount / categoriesCount)
                            )
                            loadedCount++
                        }
                    }
                }
            }

            self.postMessage({ progress: 85 })

            collectionToPut.shouldManageMedia = false
            await saveJSONCollection(collectionToPut)
            
        } else if (messageToPost.updateUserData) {
            self.postMessage({ progress: 85 })

            await saveJSONCollection(collectionToPut)
        }

        self.postMessage({ progress: 95 })

        self.postMessage(messageToPost)
    } catch (reason) {
        console.error(reason)
        let error = reason?.stack || reason?.message
        if (typeof error !== "string" || !error) {
            error = "Something went wrong"
        }
        self.postMessage({
            error,
            postId,
        })
    }
};

function getContentCaution(mediaCautions) {
    let semiContentCautions = {
        genres: {},
        tags: {},
    },
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
            if (filterType === "selection") {
                if (optionCategory === "Genre") {
                    semiContentCautions.genres[optionName] = true
                } else if (optionCategory === "Tag") {
                    semiContentCautions.tags[optionName] = true
                }
            }
        } else if (status === "excluded") {
            if (filterType === "selection") {
                if (optionCategory === "Genre") {
                    cautionContents.genres[optionName] = true
                } else if (optionCategory === "Tag") {
                    cautionContents.tags[optionName] = true
                }
            }
        }
    }
    return { semiContentCautions, cautionContents }
}
function updateMediaList(mediaFilters, sortBy, loadedPercent = 1) {
    let flexibleInclusion = {
            genreTagStudio: false,
            genreTag: false,
            genreStudio: false,
            tagStudio: false,
            genres: false,
            tags: false,
            studios: false,
        },
        include = {
            genres: {},
            tags: {},
            season: {},
            sequentialSeason: {},
            format: {},
            countryOfOrigin: {},
            status: {},
            userStatus: {},
            studios: {},
            year: {},
            shownList: {}
        },
        exclude = {
            genres: {},
            tags: {},
            season: {},
            sequentialSeason: {},
            format: {},
            countryOfOrigin: {},
            status: {},
            userStatus: {},
            studios: {},
            year: {},
            shownList: {}
        },
        comparisonFilter = {
            weightedScore: null,
            score: null,
            averageScore: null,
            userScore: null,
            popularity: null,
            year: null,
        },
        shownSortName,
        animeIncluded;

    let showHiddenList = false,
        hideMyList = false,
        hideMyFinishedList = false,
        showMyList = false,
        showAllSequels = false,
        showUserUnseenSequel = false,
        showAnimeAdapted = false,
        hasUnseenProgress = false;

    const {
        semiContentCautions,
        cautionContents
    } = cautions;

    for (let i = 0, l = mediaFilters?.length; i < l; i++) {
        let {
            status,
            filterType,
            optionName,
            optionCategory,
            optionValue,
            CMPOperator,
            CMPNumber
        } = mediaFilters[i] || {}
        if (status === "included") {
            if (filterType === "selection") {
                if (optionCategory === "Shown Metric") {
                    shownSortName = optionName
                } else if (optionCategory === "Flexible Inclusion") {
                    if (optionName==="OR: Genre / Tag / Studio") {
                        flexibleInclusion.genreTagStudio = true
                    } else if (optionName === "OR: Genre / Tag") {
                        flexibleInclusion.genreTag = true
                    } else if (optionName === "OR: Genre / Studio") {
                        flexibleInclusion.genreStudio = true
                    } else if (optionName === "OR: Tag / Studio") {
                        flexibleInclusion.tagStudio = true
                    } else if (optionName === "OR: Genre") {
                        flexibleInclusion.genres = true
                    } else if (optionName === "OR: Tag") {
                        flexibleInclusion.tags = true
                    } else if (optionName === "OR: Studio") {
                        flexibleInclusion.studios = true
                    }
                } else if (optionCategory === "Shown List") {
                    include.shownList[optionName] = true
                } else if (optionCategory === "Genre") {
                    include.genres[optionName] = true
                } else if (optionCategory === "Tag") {
                    include.tags[optionName] = true
                } else if (optionCategory === "Year") {
                    include.year[optionName] = true
                } else if (optionCategory === "Season") {
                    let lowerOptionName = optionName
                    if (
                        lowerOptionName === "Current Season"
                        || lowerOptionName === "Next Season"
                        || lowerOptionName === "Previous Season"
                        || lowerOptionName === "Ongoing Seasons"
                        || lowerOptionName === "Future Seasons"
                        || lowerOptionName === "Past Seasons"
                    ) {
                        hasNonBaselineIncludedSeason = true
                        include.sequentialSeason[lowerOptionName] = true
                    } else {
                        include.season[lowerOptionName] = true
                    }
                } else if (optionCategory === "Format") {
                    if (optionName === "Anime") {
                        animeIncluded = true
                    } else {
                        include.format[optionName] = true   
                    }
                } else if (optionCategory === "Country Of Origin") {
                    include.countryOfOrigin[optionName] = true
                } else if (optionCategory === "Release Status") {
                    include.status[optionName] = true
                } else if (optionCategory === "User Status") {
                    include.userStatus[optionName] = true
                } else if (optionCategory === "Studio") {
                    include.studios[optionName] = true
                }
            } else if (filterType === "bool") {
                if (optionName === "Hide My List") {
                    hideMyList = true
                } else if (optionName === "Hide My Finished List") {
                    hideMyFinishedList = true
                } else if (optionName === "Show My List") {
                    showMyList = true
                } else if (optionName === "Show All Sequels") {
                    showAllSequels = true
                } else if (optionName === "Show Next Sequel") {
                    showUserUnseenSequel = true
                } else if (optionName === "Show Anime Adapted") {
                    showAnimeAdapted = true
                } else if (optionName === "Has Unseen Progress") {
                    hasUnseenProgress = true
                } else if (optionName === "Hidden List") {
                    showHiddenList = true
                }                
            } else if (filterType === "number") {
                if (optionName === "Weighted Score") {
                    comparisonFilter.weightedScore = {
                        operator: CMPOperator,
                        value: parseFloat(CMPNumber ?? optionValue)
                    }
                } else if (optionName === "Score") {
                    comparisonFilter.score = {
                        operator: CMPOperator,
                        value: parseFloat(CMPNumber ?? optionValue)
                    }
                } else if (optionName === "Average Score") {
                    comparisonFilter.averageScore = {
                        operator: CMPOperator,
                        value: parseFloat(CMPNumber ?? optionValue)
                    }
                } else if (optionName === "User Score") {
                    comparisonFilter.userScore = {
                        operator: CMPOperator,
                        value: parseFloat(CMPNumber ?? optionValue)
                    }
                } else if (optionName === "Popularity") {
                    comparisonFilter.popularity = {
                        operator: CMPOperator,
                        value: parseFloat(CMPNumber ?? optionValue)
                    }
                } else if (optionName === "Year") {
                    comparisonFilter.year = {
                        operator: CMPOperator,
                        value: parseFloat(CMPNumber ?? optionValue)
                    }
                }
            }
        } else if (status === "excluded") {
            if (filterType === "selection") {
                if (optionCategory === "Shown List") {
                    exclude.shownList[optionName] = true
                } else if (optionCategory === "Genre") {
                    exclude.genres[optionName] = true
                } else if (optionCategory === "Tag") {
                    exclude.tags[optionName] = true
                } else if (optionCategory === "Year") {
                    exclude.year[optionName] = true
                } else if (optionCategory === "Season") {
                    let lowerOptionName = optionName
                    if (
                        lowerOptionName === "Current Season"
                        || lowerOptionName === "Next Season"
                        || lowerOptionName === "Previous Season"
                        || lowerOptionName === "Ongoing Seasons"
                        || lowerOptionName === "Future Seasons"
                        || lowerOptionName === "Past Seasons"
                    ) {
                        exclude.sequentialSeason[lowerOptionName] = true
                    } else {
                        exclude.season[lowerOptionName] = true
                    }
                } else if (optionCategory === "Format") {
                    if (optionName === "Anime") {
                        animeIncluded = false
                    } else {
                        exclude.format[optionName] = true
                    }
                } else if (optionCategory === "Country Of Origin") {
                    exclude.countryOfOrigin[optionName] = true
                } else if (optionCategory === "Release Status") {
                    exclude.status[optionName] = true
                } else if (optionCategory === "User Status") {
                    exclude.userStatus[optionName] = true
                } else if (optionCategory === "Studio") {
                    exclude.studios[optionName] = true
                }
            }
        }
    }
    let hasFilter = {
        genres: {
            include: !jsonIsEmpty(include.genres),
            exclude: !jsonIsEmpty(exclude.genres),
        },
        tags: {
            include: !jsonIsEmpty(include.tags),
            exclude: !jsonIsEmpty(exclude.tags),
        },
        season: {
            include: !jsonIsEmpty(include.season),
            exclude: !jsonIsEmpty(exclude.season),
        },
        sequentialSeason: {
            include: !jsonIsEmpty(include.sequentialSeason),
            exclude: !jsonIsEmpty(exclude.sequentialSeason),
        },
        format: {
            include: !jsonIsEmpty(include.format),
            exclude: !jsonIsEmpty(exclude.format),
        },
        countryOfOrigin: {
            include: !jsonIsEmpty(include.countryOfOrigin),
            exclude: !jsonIsEmpty(exclude.countryOfOrigin),
        },
        status: {
            include: !jsonIsEmpty(include.status),
            exclude: !jsonIsEmpty(exclude.status),
        },
        userStatus: {
            include: !jsonIsEmpty(include.userStatus),
            exclude: !jsonIsEmpty(exclude.userStatus),
        },
        studios: {
            include: !jsonIsEmpty(include.studios),
            exclude: !jsonIsEmpty(exclude.studios),
        },
        year: {
            include: !jsonIsEmpty(include.year),
            exclude: !jsonIsEmpty(exclude.year),
        },
        shownList: {
            include: !jsonIsEmpty(include.shownList),
            exclude: !jsonIsEmpty(exclude.shownList),
        },
        flexibleInclusion: {
            combinedGenres: flexibleInclusion.genreTagStudio ||flexibleInclusion.genreStudio || flexibleInclusion.genreTag,
            combinedTags: flexibleInclusion.genreTagStudio ||flexibleInclusion.genreTag || flexibleInclusion.tagStudio,
            combinedStudios: flexibleInclusion.genreTagStudio ||flexibleInclusion.genreStudio || flexibleInclusion.tagStudio,
        },
        cautionContents: {
            genres: !jsonIsEmpty(cautionContents.genres),
            tags: !jsonIsEmpty(cautionContents.tags),
        },
        semiContentCautions: {
            genres: !jsonIsEmpty(semiContentCautions.genres),
            tags: !jsonIsEmpty(semiContentCautions.tags),
        }
    }

    let recommendedMediaEntriesArrayLen = recommendedMediaEntriesArray.length
    let mediaList = recommendedMediaEntriesArray.filter((media, idx) => {

        loadProgress(Math.min(((idx + 1) / recommendedMediaEntriesArrayLen) * loadedPercent * 100, 80))

        if (hideMyList) {
            if (media?.userStatus !== "Unseen") {
                return false;
            }
        }
        if (showMyList) {
            if (typeof media?.userStatus !== "string" || media.userStatus === "Unseen") {
                return false;
            }
        }

        if (showHiddenList) {
            // do hidden
            if (hiddenMediaEntries?.[media?.id] === undefined) {
                return false
            }
        } else {
            if (hiddenMediaEntries[media?.id]) {
                return false
            }
        }

        if (hideMyFinishedList) {
            let userStatus = media?.userStatus
            if (userStatus === "Completed" || userStatus === "Dropped") {
                return false
            }
        }

        let entryMightBeAnime
        if (hasUnseenProgress) {
            if (media?.userStatus === "Completed" || media?.status === "Not Yet Released") {
                return false
            } else {
                let currentProgress, releasedProgress,
                    entryIsFinished = media?.status === "Finished",
                    format = media?.format
                entryMightBeAnime = format !== "Manga" && format !== "One Shot" && format !== "Novel"
                if (entryMightBeAnime) {
                    // Check for anime/manga/novel episodes/chapters
                    currentProgress = media?.episodeProgress
                    if (entryIsFinished) {
                        releasedProgress = media?.episodes
                    }
                    if (!(releasedProgress > 0)) {
                        const nextAiringEpisode = media?.nextAiringEpisode
                        if (nextAiringEpisode?.estimated === true) return false
                        const nextEpisodeIsAired = nextAiringEpisode?.airingAt * 1000 <= new Date().getTime()
                        const airingEpisode = nextAiringEpisode?.episode ?? 1
                        releasedProgress = nextEpisodeIsAired ? airingEpisode : airingEpisode - 1   
                    }
                } else {
                    // Check for manga/novel volumes
                    if (entryIsFinished) {
                        currentProgress = media?.episodeProgress
                        releasedProgress = media?.chapters
                        if (!(releasedProgress > 0 && currentProgress > 0)) {
                            currentProgress = media?.volumeProgress
                            releasedProgress = media?.volumes
                        }
                    }
                }
                if (
                    typeof releasedProgress !== "number" || isNaN(releasedProgress) || !isFinite(releasedProgress)
                    || (currentProgress || 0) >= releasedProgress
                ) {
                    return false
                }
            }
        }

        // Comparison Filter >=, >, <, <=, number
        if (comparisonFilter.userScore) {
            let operator = comparisonFilter.userScore.operator,
                value = comparisonFilter.userScore.value
            if (typeof media?.userScore !== "number") {
                return false
            } else if (typeof value === "number") {
                if (typeof operator === "string") {
                    switch (operator) {
                        case ">=": {
                            if (media.userScore < value) return false
                            break
                        }
                        case "<=": {
                            if (media.userScore > value) return false
                            break
                        }
                        case "<": {
                            if (media.userScore >= value) return false
                            break
                        }
                        case ">": {
                            if (media.userScore <= value) return false
                            break
                        }
                    }
                } else if (media.userScore !== value) {
                    return false
                }
            }
        }

        if (comparisonFilter.averageScore) {
            let operator = comparisonFilter.averageScore.operator,
                value = comparisonFilter.averageScore.value
            if (typeof media?.averageScore !== "number") {
                return false
            } else if (typeof value === "number") {
                if (typeof operator === "string") {
                    switch (operator) {
                        case ">=": {
                            if (media.averageScore < value) return false
                            break
                        }
                        case "<=": {
                            if (media.averageScore > value) return false
                            break
                        }
                        case "<": {
                            if (media.averageScore >= value) return false
                            break
                        }
                        case ">": {
                            if (media.averageScore <= value) return false
                            break
                        }
                    }
                } else if (media.averageScore !== value) {
                    return false
                }
            }
        }

        if (comparisonFilter.popularity) {
            let operator = comparisonFilter.popularity.operator,
                value = comparisonFilter.popularity.value
            if (typeof media?.popularity !== "number") {
                return false
            } else if (typeof value === "number") {
                if (typeof operator === "string") {
                    switch (operator) {
                        case ">=": {
                            if (media.popularity < value) return false
                            break
                        }
                        case "<=": {
                            if (media.popularity > value) return false
                            break
                        }
                        case "<": {
                            if (media.popularity >= value) return false
                            break
                        }
                        case ">": {
                            if (media.popularity <= value) return false
                            break
                        }
                    }
                } else if (media.popularity !== value) {
                    return false
                }
            }
        }

        if (comparisonFilter.weightedScore) {
            let operator = comparisonFilter.weightedScore.operator,
                value = comparisonFilter.weightedScore.value
            if (typeof media?.weightedScore !== "number") {
                return false
            } else if (typeof value === "number") {
                if (typeof operator === "string") {
                    switch (operator) {
                        case ">=": {
                            if (media.weightedScore < value) return false
                            break
                        }
                        case "<=": {
                            if (media.weightedScore > value) return false
                            break
                        }
                        case "<": {
                            if (media.weightedScore >= value) return false
                            break
                        }
                        case ">": {
                            if (media.weightedScore <= value) return false
                            break
                        }
                    }
                } else if (media.weightedScore !== value) {
                    return false
                }
            }
        }

        if (comparisonFilter.score) {
            let operator = comparisonFilter.score.operator,
                value = comparisonFilter.score.value
            if (typeof media?.score !== "number") {
                return false
            } else if (typeof value === "number") {
                if (typeof operator === "string") {
                    switch (operator) {
                        case ">=": {
                            if (media.score < value) return false
                            break
                        }
                        case "<=": {
                            if (media.score > value) return false
                            break
                        }
                        case "<": {
                            if (media.score >= value) return false
                            break
                        }
                        case ">": {
                            if (media.score <= value) return false
                            break
                        }
                    }
                } else if (media.score !== value) {
                    return false
                }
            }
        }

        if (comparisonFilter.year) {
            if (media?.year == null) return false
            let year = parseInt(media?.year)
            if (isNaN(year)) return false
            let operator = comparisonFilter.year.operator,
                value = comparisonFilter.year.value
            if (typeof year !== "number") {
                return false
            } else if (typeof value === "number") {
                if (typeof operator === "string") {
                    switch (operator) {
                        case ">=": {
                            if (year < value) return false
                            break
                        }
                        case "<=": {
                            if (year > value) return false
                            break
                        }
                        case "<": {
                            if (year >= value) return false
                            break
                        }
                        case ">": {
                            if (year <= value) return false
                            break
                        }
                    }
                } else if (year !== value) {
                    return false
                }
            }
        }

        // anime excluded if its false and not null
        if (animeIncluded === false) {
            if (typeof media?.format === "string") {
                let format = media.format
                let entryIsAnime = format === "TV" 
                        || format === "Movie"
                        || format === "ONA"
                        || format === "Special"
                        || format === "TV Short"
                        || format === "OVA"
                if (entryIsAnime) {
                    return false
                }
            }
        }

        if (typeof media?.format === "string" && exclude.format[media.format]) {
            return false
        }

        if (typeof media?.countryOfOrigin === "string" && exclude.countryOfOrigin[media.countryOfOrigin]) {
            return false
        }

        if (typeof media?.userStatus === "string" && exclude.userStatus[media.userStatus]) {
            return false
        }

        if (typeof media?.status === "string" && exclude.status[media.status]) {
            return false
        }

        if (media?.year != null && exclude.year[media?.year?.toString()]) {
            return false
        }

        if (typeof media?.season === "string" && exclude.season[media.season]) {
            return false
        }

        if (hasFilter.sequentialSeason.exclude) {
            if (entryMightBeAnime == null) {
                let format = media?.format
                entryMightBeAnime = format !== "Manga" && format !== "One Shot" && format !== "Novel"
            }
            let season = media?.season
            let hasSeason = season === "Winter" || season === "Spring" || season === "Summer" || season === "Fall"
            if (entryMightBeAnime || hasSeason) {
                // Should Exclude
                if (
                    exclude.sequentialSeason["Current Season"]
                    || exclude.sequentialSeason["Next Season"]
                    || exclude.sequentialSeason["Previous Season"]
                    || exclude.sequentialSeason["Ongoing Seasons"]
                    || exclude.sequentialSeason["Future Seasons"]
                    || exclude.sequentialSeason["Past Seasons"]
                ) {
                    let year = parseInt(media?.year);
                    if (!isNaN(year)) {
                        let currentSeasonYear = getCurrentSeasonYear() || {}
                        if (hasSeason) {
                            const seasonYear = `${season} ${year}`
                            // is Current Season
                            if ((
                                    exclude.sequentialSeason["Current Season"]
                                    || exclude.sequentialSeason["Ongoing Seasons"]
                                ) && seasonYear === currentSeasonYear.seasonYear
                            ) {
                                return false
                            }
                            // is Next or Future Seasons
                            if ((
                                    exclude.sequentialSeason["Next Season"]
                                    || exclude.sequentialSeason["Future Seasons"]
                                ) && seasonYear === currentSeasonYear.nextSeasonYear
                            ) {
                                return false
                            }
                            // is Previous or Past Seasons
                            if ((
                                    exclude.sequentialSeason["Previous Season"]
                                    || exclude.sequentialSeason["Past Seasons"]
                                ) && seasonYear === currentSeasonYear.previousSeasonYear
                            ) {
                                return false
                            }
                        }
                        // are Past and Ongoing Seasons
                        if (
                            (
                                exclude.sequentialSeason["Ongoing Seasons"]
                                || exclude.sequentialSeason["Past Seasons"]
                            ) && (
                                year < currentSeasonYear.year
                                || (
                                    year === currentSeasonYear.year
                                    && currentSeasonYear.pastSeasonsInCurrentYear?.[season]
                                )
                            )
                        ) {
                            if (exclude.sequentialSeason["Past Seasons"]) {
                                return false
                            } else if (typeof media?.status === "string") {
                                // is an Ongoing Media in Past Seasons
                                let status = media.status
                                if (
                                    status === "Releasing"
                                    || status === "Not Yet Released"
                                ) {
                                    return false
                                }
                            }
                        }
                        // are Future Seasons
                        if (
                            exclude.sequentialSeason["Future Seasons"]
                            && (
                                year > currentSeasonYear.year
                                || (
                                    year === currentSeasonYear.year
                                    && currentSeasonYear.futureSeasonsInCurrentYear?.[season]
                                )
                            )
                        ) {
                            return false
                        }
                    }
                }
            }
        }

        let studioArray
        if (hasFilter.shownList.exclude) {
            if (exclude.shownList["Recommended Studio"]) {
                if (entryMightBeAnime == null) {
                    let format = media?.format
                    entryMightBeAnime = format !== "Manga" && format !== "One Shot" && format !== "Novel"
                }
                if (entryMightBeAnime && isJsonObject(media?.favoriteContents?.studios) && !jsonIsEmpty(media.favoriteContents.studios)) {
                    studioArray = Object.keys(media.studios||{})
                    if (studioArray.some((studio) => typeof studio === "string" && media.favoriteContents.studios[studio])) {
                        return false;
                    }
                }
            }
            if (exclude.shownList["Non-Caution"]) {
                if ((
                        hasFilter.cautionContents.genres
                        && !media?.genres?.some(genre => typeof genre === "string" && cautionContents.genres[genre])
                    ) || (
                        hasFilter.cautionContents.tags
                        && !media?.tags?.some(tag => typeof tag?.name === "string" && cautionContents.tags[tag.name])
                )) {
                    return false
                }
            }
            if (exclude.shownList["Non-Semi-Caution"]) {
                if ((
                        hasFilter.semiContentCautions.genres
                        && !media?.genres?.some(genre => typeof genre === "string" && semiContentCautions.genres[genre]) 
                    ) || (
                        hasFilter.semiContentCautions.tags
                        && !media?.tags?.some(tag => typeof tag?.name === "string" && semiContentCautions.tags[tag.name])
                )) {
                    return false
                }
            }
            if (
                exclude.shownList["Recommended Score"]
                || exclude.shownList["Semi-Recommended Score"]
                || exclude.shownList["Other Score"]
            ) {
                if (exclude.shownList["Recommended Score"]) {
                    if (media.recommendationCode === 2) return false
                }
                if (exclude.shownList["Semi-Recommended Score"]) {
                    if (media.recommendationCode === 1) return false
                }
                if (exclude.shownList["Other Score"]) {
                    if (media.recommendationCode === 0) return false
                }
            }
        }

        if (hasFilter.genres.exclude) {
            if (media?.genres?.some(genre => typeof genre === "string" && exclude.genres[genre])) return false
        }

        if (hasFilter.tags.exclude) {
            if (media?.tags?.some(tag => typeof tag?.name === "string" && exclude.tags[tag.name])) return false
        }

        if (hasFilter.studios.exclude) {
            studioArray = studioArray || Object.keys(media.studios||{})
            if (studioArray?.length > 0) {
                if (studioArray.some((studio) => typeof studio === "string" && exclude.studios[studio])) {
                    return false
                }
            }
        }

        // Should Include
        if (hasFilter.shownList.include) {
            if (include.shownList["Recommended Studio"]) {
                if (entryMightBeAnime == null) {
                    let format = media?.format
                    entryMightBeAnime = format !== "Manga" && format !== "One Shot" && format !== "Novel"
                }
                studioArray = studioArray || Object.keys(media.studios||{})
                if (entryMightBeAnime || studioArray?.length > 0) {
                    if (isJsonObject(media?.favoriteContents?.studios)) { 
                        if (jsonIsEmpty(media.favoriteContents.studios)) return false
                        if (!studioArray.some((studio) => typeof studio === "string" && media.favoriteContents.studios[studio])) {
                            return false;
                        }
                    }
                }
            }
            if (include.shownList["Non-Caution"]) {
                if (media?.genres?.some(genre => typeof genre === "string" && cautionContents.genres[genre])) return false
                if (media?.tags?.some(tag => typeof tag?.name === "string" && cautionContents.tags[tag.name])) return false
            }
            if (include.shownList["Non-Semi-Caution"]) {
                if (media?.genres?.some(genre => typeof genre === "string" && semiContentCautions.genres[genre])) return false
                if (media?.tags?.some(tag => typeof tag?.name === "string" && semiContentCautions.tags[tag.name])) return false
            }
            if (
                include.shownList["Recommended Score"]
                || include.shownList["Semi-Recommended Score"]
                || include.shownList["Other Score"]
            ) {
                if (
                    include.shownList["Recommended Score"]
                    && include.shownList["Semi-Recommended Score"]
                ) {
                    if (media.recommendationCode !== 2 && media.recommendationCode !== 1) return false
                } else if (
                    include.shownList["Recommended Score"]
                    && include.shownList["Other Score"]
                ) {
                    if (media.recommendationCode !== 2 && media.recommendationCode !== 0) return false
                } else if (
                    include.shownList["Semi-Recommended Score"]
                    && include.shownList["Other Score"]
                ) {
                    if (media.recommendationCode !== 1 && media.recommendationCode !== 0) return false
                } else if (include.shownList["Recommended Score"]) {
                    if (media.recommendationCode !== 2) return false
                } else if (include.shownList["Semi-Recommended Score"]) {
                    if (media.recommendationCode !== 1) return false
                } else if (include.shownList["Other Score"]) {
                    if (media.recommendationCode !== 0) return false
                }
            }
        }

        // Should Include OR
        if (hasFilter.sequentialSeason.include) {
            if (entryMightBeAnime == null) {
                let format = media?.format
                entryMightBeAnime = format !== "Manga" && format !== "One Shot" && format !== "Novel"
            }
            let season = media?.season
            let hasSeason = season === "Winter" || season === "Spring" || season === "Summer" || season === "Fall"
            if (entryMightBeAnime || hasSeason) {
                if (
                    include.sequentialSeason["Current Season"]
                    || include.sequentialSeason["Next Season"]
                    || include.sequentialSeason["Previous Season"]
                    || include.sequentialSeason["Ongoing Seasons"]
                    || include.sequentialSeason["Future Seasons"]
                    || include.sequentialSeason["Past Seasons"]
                ) {
                    let isNotIncluded
                    do {
                        let year = parseInt(media?.year);
                        if (!isNaN(year)) {
                            let currentSeasonYear = getCurrentSeasonYear() || {}
                            if (hasSeason) {
                                const seasonYear = `${season} ${year}`
                                // is Current Season
                                if ((
                                        include.sequentialSeason["Current Season"]
                                        || include.sequentialSeason["Ongoing Seasons"]
                                    ) && seasonYear === currentSeasonYear.seasonYear
                                ) {
                                    break
                                }
                                // is Next or Future Seasons
                                if ((
                                        include.sequentialSeason["Next Season"]
                                        || include.sequentialSeason["Future Seasons"]
                                    ) && seasonYear === currentSeasonYear.nextSeasonYear
                                ) {
                                    break
                                }
                                // is Previous or Past Seasons
                                if ((
                                        include.sequentialSeason["Previous Season"]
                                        || include.sequentialSeason["Past Seasons"]
                                    ) && seasonYear === currentSeasonYear.previousSeasonYear
                                ) {
                                    break
                                }
                            }
                            // are Past and Ongoing Seasons
                            if (
                                (
                                    include.sequentialSeason["Ongoing Seasons"]
                                    || include.sequentialSeason["Past Seasons"]
                                ) && (
                                    year < currentSeasonYear.year
                                    || (
                                        year === currentSeasonYear.year
                                        && currentSeasonYear.pastSeasonsInCurrentYear?.[season]
                                    )
                                )
                            ) {
                                if (include.sequentialSeason["Past Seasons"]) {
                                    break
                                } else if (typeof media?.status === "string") {
                                    // is an Ongoing Media in Past Seasons
                                    let status = media?.status
                                    if (
                                        status === "Releasing"
                                        || status === "Not Yet Released"
                                    ) {
                                        break
                                    }
                                }
                            }
                            // are Future Seasons
                            if (
                                include.sequentialSeason["Future Seasons"]
                                && (
                                    year > currentSeasonYear.year
                                    || (
                                        year === currentSeasonYear.year
                                        && currentSeasonYear.futureSeasonsInCurrentYear?.[season]
                                    )
                                )
                            ) {
                                break
                            }
                        }
                        isNotIncluded = true
                        break
                    } while (false)

                    if (isNotIncluded) {
                        return false
                    }
                }
            }
        }

        // Should Include OR
        if (hasFilter.season.include) {
            if (entryMightBeAnime == null) {
                let format = media?.format
                entryMightBeAnime = format !== "Manga" && format !== "One Shot" && format !== "Novel"
            }
            let season = media?.season
            let hasSeason = season === "Winter" || season === "Spring" || season === "Summer" || season === "Fall"
            if (entryMightBeAnime || hasSeason) {
                if (!include.season[season]) {
                    return false
                }
            }
        }

        // anime included if its true and not null
        if (animeIncluded === true) {
            if (typeof media?.format === "string") {
                let format = media.format
                if (
                    (format === "Manga" && !include.format.Manga)
                    || (format === "One Shot" && !include.format["One Shot"])
                    || (format === "Novel" && !include.format.Novel)
                ) {
                    return false
                }
            }
        } else if (hasFilter.format.include) {
            // Should Include OR
            if (typeof media?.format !== "string" || !include.format[media.format]) {
                return false
            }
        }

        // Should Include OR
        if (hasFilter.countryOfOrigin.include) {
            if (typeof media?.countryOfOrigin !== "string" || !include.countryOfOrigin[media.countryOfOrigin]) {
                return false
            }
        }

        // Should Include OR
        if (hasFilter.userStatus.include) {
            if (typeof media?.userStatus !== "string" || !include.userStatus[media.userStatus]) {
                return false
            }
        }

        // Should Include OR
        if (hasFilter.status.include) {
            if (typeof media?.status !== "string" || !include.status[media.status]) {
                return false
            }
        }

        // Should Include OR
        if (hasFilter.year.include) {
            if (media?.year == null || !include.year[media?.year?.toString?.()]) {
                return false
            }
        }

        // Should Include Genre / Tag / Studio
        if (flexibleInclusion.genreTagStudio) {
            let isNotIncluded
            do {
                if (!hasFilter.genres.include && !hasFilter.tags.include && !hasFilter.studios.include) {
                    break
                }
                // Should Include OR Genre / Tag / Studio
                if (hasFilter.genres.include && media?.genres?.some?.(genre => typeof genre === "string" && include.genres[genre])) {
                    break
                }
                if (hasFilter.tags.include && media?.tags?.some(tag => typeof tag?.name === "string" && include.tags[tag.name])) {
                    break 
                }
                if (hasFilter.studios.include) {
                    // Include if its not an anime (has-no-studio)
                    if (entryMightBeAnime == null) {
                        let format = media?.format
                        entryMightBeAnime = format !== "Manga" && format !== "One Shot" && format !== "Novel"
                    }
                    studioArray = studioArray || Object.keys(media?.studios||{})
                    if (entryMightBeAnime || studioArray?.length > 0) {
                        if (studioArray.some((studio) => typeof studio === "string" && include.studios[studio])) {
                            break
                        }
                    } else {
                        break
                    }
                }
                isNotIncluded = true
                break
            } while (false)
            if (isNotIncluded) return false
        } else if (flexibleInclusion.genreTag) {
            let isNotIncluded
            do {
                if (!hasFilter.genres.include && !hasFilter.tags.include) {
                    break
                }
                // Should Include OR Genre / Tag
                if (hasFilter.genres.include && media?.genres?.some?.(genre => typeof genre === "string" && include.genres[genre])) {
                    break
                }
                if (hasFilter.tags.include && media?.tags?.some(tag => typeof tag?.name === "string" && include.tags[tag.name])) {
                    break 
                }
                isNotIncluded = true
                break
            } while (false)
            if (isNotIncluded) return false
        } else if (flexibleInclusion.genreStudio) {
            let isNotIncluded
            do {
                if (!hasFilter.genres.include && !hasFilter.studios.include) {
                    break
                }
                // Should Include OR Genre / Studio
                if (hasFilter.genres.include && media?.genres?.some?.(genre => typeof genre === "string" && include.genres[genre])) {
                    break
                }
                if (hasFilter.studios.include) {
                    // Include if its not an anime (has-no-studio)
                    if (entryMightBeAnime == null) {
                        let format = media?.format
                        entryMightBeAnime = format !== "Manga" && format !== "One Shot" && format !== "Novel"
                    }
                    studioArray = studioArray || Object.keys(media?.studios||{})
                    if (entryMightBeAnime || studioArray?.length > 0) {
                        if (studioArray.some((studio) => typeof studio === "string" && include.studios[studio])) {
                            break
                        }
                    } else {
                        break
                    }
                }
                isNotIncluded = true
                break
            } while (false)
            if (isNotIncluded) return false
        } else if (flexibleInclusion.tagStudio) {
            let isNotIncluded
            do {
                if (!hasFilter.tags.include && !hasFilter.studios.include) {
                    break
                }
                // Should Include OR Tag / Studio
                if (hasFilter.tags.include && media?.tags?.some(tag => typeof tag?.name === "string" && include.tags[tag.name])) {
                    break 
                }
                if (hasFilter.studios.include) {
                    // Include if its not an anime (has-no-studio)
                    if (entryMightBeAnime == null) {
                        let format = media?.format
                        entryMightBeAnime = format !== "Manga" && format !== "One Shot" && format !== "Novel"
                    }
                    studioArray = studioArray || Object.keys(media?.studios||{})
                    if (entryMightBeAnime || studioArray?.length > 0) {
                        if (studioArray.some((studio) => typeof studio === "string" && include.studios[studio])) {
                            break
                        }
                    } else {
                        break
                    }
                }
                isNotIncluded = true
                break
            } while (false)
            if (isNotIncluded) return false
        }

        // Should Include
        if (!hasFilter.flexibleInclusion.combinedGenres && hasFilter.genres.include) {
            if (flexibleInclusion.genres) {
                // Should Include OR
                if (!media?.genres?.some(genre => typeof genre === "string" && include.genres[genre])) {
                    return false
                }
            } else {
                // Should Include AND                
                for (let genre in include.genres) {
                    if (!media?.genres?.some(g => typeof g === "string" && g === genre)) {
                        return false
                    }
                }
            }
        }

        if (!hasFilter.flexibleInclusion.combinedTags && hasFilter.tags.include) {
            if (flexibleInclusion.tags) {
                // Should Include OR
                if (!media?.tags?.some(tag => typeof tag?.name === "string" && include.tags[tag.name])) {
                    return false
                }
            } else {
                // Should Include AND
                for (let tag in include.tags) {
                    if (!media?.tags?.some(t => typeof t?.name === "string" && t.name === tag)) {
                        return false
                    }
                }
            }
        }

        if (!hasFilter.flexibleInclusion.combinedStudios && hasFilter.studios.include) {
            if (entryMightBeAnime == null) {
                let format = media?.format
                entryMightBeAnime = format !== "Manga" && format !== "One Shot" && format !== "Novel"
            }
            studioArray = studioArray || Object.keys(media?.studios||{})
            // Include if its not an anime (no-studio)
            if (entryMightBeAnime || studioArray?.length > 0) {
                if (flexibleInclusion.studios) {
                    // Should Include OR
                    if (!studioArray.some((studio) => typeof studio === "string" && include.studios[studio])) return false
                } else {
                    // Should Include AND
                    for (let studio in include.studios) {
                        if (!studioArray.some(s => typeof s === "string" && s === studio)) {
                            return false
                        }
                    }
                }
            }
        }

        let mediaRelations = media?.mediaRelations
        if (mediaRelations instanceof Array) {
            if (showUserUnseenSequel) {
                let userStatus = media?.userStatus
                // Is Unseen and Prequel is in User List
                let isNotUserMediaUnseenSequel =
                    // If media is seen
                    userStatus === "Completed" || userStatus === "Repeating" || userStatus === "Dropped"
                    // if prequel is not seen
                    || !mediaRelations.some((e) => {
                        if (e?.relationType?.toLowerCase?.() === "prequel") {
                            let mediaRelationID = e?.node?.id;
                            if (mediaRelationID != null) {
                                mediaRelationID = Math.floor(mediaRelationID)
                                let relationMedia = recommendedMediaEntries[mediaRelationID]
                                let relationStatus = relationMedia?.userStatus
                                return relationStatus === "Completed" || relationStatus === "Repeating"
                            }
                        }
                    });
                // if media is in franchise and unseen
                if (isNotUserMediaUnseenSequel) {
                    return false
                }
            }
            if (!showAllSequels) {
                // Show All Sequels or Hide Next Sequels that have dropped or unseen prequel
                let isUnseenSequel =
                    // Have No Prequel
                    !mediaRelations.some((e) => e?.relationType?.toLowerCase?.() === "prequel")
                    // or Have Prequel but...
                    || mediaRelations.some((e) => {
                        if (e?.relationType?.toLowerCase?.() === "prequel") {
                            let mediaRelationID = e?.node?.id;
                            if (mediaRelationID != null) {
                                mediaRelationID = Math.floor(mediaRelationID)
                                let relationMedia = recommendedMediaEntries[mediaRelationID]
                                let relationStatus = relationMedia?.userStatus
                                // ...Prequel is in the User List and not Dropped
                                if (
                                    relationStatus !== "Unseen" &&
                                    relationStatus !== "Dropped"
                                ) {
                                    return true;
                                } else {
                                    // ...Prequel is has Smaller Popularity (e.g. Special / OVA Prequels)
                                    return e?.node?.popularity < media?.popularity;
                                }
                            }
                        }
                    });
                // If only Show Next Sequel, Then Don't Include if Sequel 
                if (!isUnseenSequel) {
                    return false;
                }
            }
            if (!showAnimeAdapted) {
                let format = media?.format
                // For All Manga / Novel
                if (format === "Manga" || format === "One Shot" || format === "Novel") {
                    let hasAnimeAdaptation = mediaRelations.some((e) => {
                        let mediaRelationType = e?.relationType?.toLowerCase?.();
                        if (mediaRelationType === "adaptation" || mediaRelationType === "alternative") {
                            let mediaRelationID = e?.node?.id;
                            if (mediaRelationID != null) {
                                mediaRelationID = Math.floor(mediaRelationID)
                                let relationMedia = recommendedMediaEntries[mediaRelationID]
                                let relationFormat = relationMedia?.format
                                // Check if it has a possible Anime Adaptation that is Released
                                let possibleAnime = relationFormat !== "Manga" && relationFormat !== "One Shot" && relationFormat !== "Novel"
                                if (possibleAnime) {
                                    let relationStatus = relationMedia?.status
                                    return relationStatus === "Finished" || relationStatus === "Releasing" || relationStatus === "Not Yet Released"
                                }
                            }
                        }
                    })
                    if (hasAnimeAdaptation) {
                        return false
                    }
                }
            }
        }
        // Add the recommended Media
        return true;
    });

    // Sort List
    let sortType = sortBy?.sortType || "desc"
    let sortName = sortBy?.sortName || "Weighted Score"
    if (sortType === "desc") {
        if (sortName === "Weighted Score") {
            mediaList.sort((a, b) => {
                let x = a?.weightedScore != null ? a.weightedScore : -Infinity,
                    y = b?.weightedScore != null ? b.weightedScore : -Infinity;
                if (x !== y) return y - x;
                // Sort by User Score (descending), place falsy values at last
                x = a?.userScore != null ? a.userScore : -Infinity;
                y = b?.userScore != null ? b.userScore : -Infinity;
                if (x !== y) return y - x;
                // Sort by score (descending), place falsy values at last
                x = a?.score != null ? a.score : -Infinity;
                y = b?.score != null ? b.score : -Infinity;
                if (x !== y) return y - x;
                // Sort by trending (descending), place falsy values at last
                x = a?.trending != null ? a.trending : -Infinity;
                y = b?.trending != null ? b.trending : -Infinity;
                return y - x
            })
        } else if (sortName === "Score") {
            mediaList.sort((a, b) => {
                let x = a?.score != null ? a.score : -Infinity,
                    y = b?.score != null ? b.score : -Infinity;
                if (x !== y) return y - x;
                // Sort by User Score (descending), place falsy values at last
                x = a?.userScore != null ? a.userScore : -Infinity;
                y = b?.userScore != null ? b.userScore : -Infinity;
                if (x !== y) return y - x;
                // Sort by trending (descending), place falsy values at last
                x = a?.trending != null ? a.trending : -Infinity;
                y = b?.trending != null ? b.trending : -Infinity;
                return y - x
            })
        } else if (sortName === "Average Score") {
            mediaList.sort((a, b) => {
                let x = a?.averageScore != null ? a.averageScore : -Infinity,
                    y = b?.averageScore != null ? b.averageScore : -Infinity;
                if (x !== y) return y - x;
                // Sort by User Score (descending), place falsy values at last
                x = a?.userScore != null ? a.userScore : -Infinity;
                y = b?.userScore != null ? b.userScore : -Infinity;
                if (x !== y) return y - x;
                // Sort by score (descending), place falsy values at last
                x = a?.score != null ? a.score : -Infinity;
                y = b?.score != null ? b.score : -Infinity;
                return y - x
            })
        } else if (sortName === "User Score") {
            mediaList.sort((a, b) => {
                let x = a?.userScore != null ? a.userScore : -Infinity,
                    y = b?.userScore != null ? b.userScore : -Infinity;
                if (x !== y) return y - x;
                // Sort by score (descending), place falsy values at last
                x = a?.score != null ? a.score : -Infinity;
                y = b?.score != null ? b.score : -Infinity;
                if (x !== y) return y - x;
                // Sort by Average Score (descending), place falsy values at last
                x = a?.averageScore != null ? a.averageScore : -Infinity;
                y = b?.averageScore != null ? b.averageScore : -Infinity;
                return y - x
            })
        } else if (sortName === "Popularity") {
            mediaList.sort((a, b) => {
                let x = a?.popularity != null ? a.popularity : -Infinity,
                    y = b?.popularity != null ? b.popularity : -Infinity;
                if (x !== y) return y - x;
                // Sort by User Score (descending), place falsy values at last
                x = a?.userScore != null ? a.userScore : -Infinity;
                y = b?.userScore != null ? b.userScore : -Infinity;
                if (x !== y) return y - x;
                // Sort by favorites (descending), place falsy values at last
                x = a?.favorites != null ? a.favorites : -Infinity;
                y = b?.favorites != null ? b.favorites : -Infinity;
                if (x !== y) return y - x;
                // Sort by trend (descending), place falsy values at last
                x = a?.trending != null ? a.trending : -Infinity;
                y = b?.trending != null ? b.trending : -Infinity;
                if (x !== y) return y - x;
                // Sort by score (descending), place falsy values at last
                x = a?.score != null ? a.score : -Infinity;
                y = b?.score != null ? b.score : -Infinity;
                return y - x
            })
        } else if (sortName === "Trending") {
            mediaList.sort((a, b) => {
                let x = a?.trending != null ? a.trending : -Infinity,
                    y = b?.trending != null ? b.trending : -Infinity;
                if (x !== y) return y - x;
                // Sort by User Score (descending), place falsy values at last
                x = a?.userScore != null ? a.userScore : -Infinity;
                y = b?.userScore != null ? b.userScore : -Infinity;
                if (x !== y) return y - x;
                // Sort by popularity (descending), place falsy values at last
                x = a?.popularity != null ? a.popularity : -Infinity;
                y = b?.popularity != null ? b.popularity : -Infinity;
                if (x !== y) return y - x;
                // Sort by favorites (descending), place falsy values at last
                x = a?.favorites != null ? a.favorites : -Infinity;
                y = b?.favorites != null ? b.favorites : -Infinity;
                if (x !== y) return y - x;
                // Sort by score (descending), place falsy values at last
                x = a?.score != null ? a.score : -Infinity;
                y = b?.score != null ? b.score : -Infinity;
                return y - x
            })
        } else if (sortName === "Favorites") {
            mediaList.sort((a, b) => {
                let x = a?.favorites != null ? a.favorites : -Infinity,
                    y = b?.favorites != null ? b.favorites : -Infinity;
                if (x !== y) return y - x;
                // Sort by User Score (descending), place falsy values at last
                x = a?.userScore != null ? a.userScore : -Infinity;
                y = b?.userScore != null ? b.userScore : -Infinity;
                if (x !== y) return y - x;
                // Sort by Average Score (descending), place falsy values at last
                x = a?.averageScore != null ? a.averageScore : -Infinity;
                y = b?.averageScore != null ? b.averageScore : -Infinity;
                if (x !== y) return y - x;
                // Sort by score (descending), place falsy values at last
                x = a?.score != null ? a.score : -Infinity;
                y = b?.score != null ? b.score : -Infinity;
                return y - x
            })
        } else if (sortName === "Date Updated") {
            mediaList.sort((a, b) => {
                // Sort by date edited/updated or added (descending), place falsy values at last
                let x = a?.dateEdited || a?.dateAdded ? Math.max(a?.dateEdited || 0, a?.dateAdded || 0) : -Infinity,
                    y = b?.dateEdited || b?.dateAdded ? Math.max(b?.dateEdited || 0, b?.dateAdded || 0) : -Infinity
                if (x !== y) return y - x;
                // Sort by date start (descending), place falsy values at last
                let year = a?.year
                let season = a?.season;
                let startDate = a?.startDate || {}
                let month = startDate?.month
                if (parseInt(month) > 0) { month = parseInt(month) - 1 }
                let day = startDate?.day
                let dateA = getJapaneseStartDate({ season, year, month, day })?.getTime?.()
                // Get Date B
                year = b?.year
                season = b?.season;
                startDate = b?.startDate || {}
                month = startDate?.month
                if (parseInt(month) > 0) { month = parseInt(month) - 1 }
                day = startDate?.day
                let dateB = getJapaneseStartDate({ season, year, month, day })?.getTime?.()
                // Sort by date (descending), place falsy values at last
                x = dateA != null ? dateA : -Infinity;
                y = dateB != null ? dateB : -Infinity;
                if (x !== y) return y - x;
                // Sort by User Score (descending), place falsy values at last
                x = a?.userScore != null ? a.userScore : -Infinity;
                y = b?.userScore != null ? b.userScore : -Infinity;
                if (x !== y) return y - x;
                // Sort by trend (descending), place falsy values at last
                x = a?.trending != null ? a.trending : -Infinity;
                y = b?.trending != null ? b.trending : -Infinity;
                if (x !== y) return y - x;
                // Sort by popularity (descending), place falsy values at last
                x = a?.popularity != null ? a.popularity : -Infinity;
                y = b?.popularity != null ? b.popularity : -Infinity;
                if (x !== y) return y - x;
                // Sort by score (descending), place falsy values at last
                x = a?.score != null ? a.score : -Infinity;
                y = b?.score != null ? b.score : -Infinity;
                return y - x;
            })
        } else if (sortName === "Date Added") {
            mediaList.sort((a, b) => {
                // Sort by id (descending), place falsy values at last
                let x = a?.id != null ? parseInt(a?.id) : -Infinity,
                    y = b?.id != null ? parseInt(b?.id) : -Infinity
                if (x !== y) return y - x;
                // Sort by Date Added (descending), place falsy values at last
                x = a?.dateAdded ? a?.dateAdded : -Infinity
                y = b?.dateAdded ? b?.dateAdded : -Infinity
                if (x !== y) return y - x;
                // Sort by date start (descending), place falsy values at last
                let year = a?.year
                let season = a?.season;
                let startDate = a?.startDate || {}
                let month = startDate?.month
                if (parseInt(month) > 0) { month = parseInt(month) - 1 }
                let day = startDate?.day
                let dateA = getJapaneseStartDate({ season, year, month, day })?.getTime?.()
                // Get Date B
                year = b?.year
                season = b?.season;
                startDate = b?.startDate || {}
                month = startDate?.month
                if (parseInt(month) > 0) { month = parseInt(month) - 1 }
                day = startDate?.day
                let dateB = getJapaneseStartDate({ season, year, month, day })?.getTime?.()
                // Sort by date (descending), place falsy values at last
                x = dateA != null ? dateA : -Infinity;
                y = dateB != null ? dateB : -Infinity;
                if (x !== y) return y - x;
                // Sort by User Score (descending), place falsy values at last
                x = a?.userScore != null ? a.userScore : -Infinity;
                y = b?.userScore != null ? b.userScore : -Infinity;
                if (x !== y) return y - x;
                // Sort by trend (descending), place falsy values at last
                x = a?.trending != null ? a.trending : -Infinity;
                y = b?.trending != null ? b.trending : -Infinity;
                if (x !== y) return y - x;
                // Sort by popularity (descending), place falsy values at last
                x = a?.popularity != null ? a.popularity : -Infinity;
                y = b?.popularity != null ? b.popularity : -Infinity;
                if (x !== y) return y - x;
                // Sort by score (descending), place falsy values at last
                x = a?.score != null ? a.score : -Infinity;
                y = b?.score != null ? b.score : -Infinity;
                return y - x;
            })
        } else if (sortName === "Date") {
            mediaList.sort((a, b) => {
                // Get Date A
                let year = a?.year
                let season = a?.season;
                let startDate = a?.startDate || {}
                let month = startDate?.month
                if (parseInt(month) > 0) { month = parseInt(month) - 1 }
                let day = startDate?.day
                let dateA = getJapaneseStartDate({ season, year, month, day })?.getTime?.()
                // Get Date B
                year = b?.year
                season = b?.season;
                startDate = b?.startDate || {}
                month = startDate?.month
                if (parseInt(month) > 0) { month = parseInt(month) - 1 }
                day = startDate?.day
                let dateB = getJapaneseStartDate({ season, year, month, day })?.getTime?.()
                // Sort by date (descending), place falsy values at last
                let x = dateA != null ? dateA : -Infinity;
                let y = dateB != null ? dateB : -Infinity;
                if (x !== y) return y - x;
                // Sort by User Score (descending), place falsy values at last
                x = a?.userScore != null ? a.userScore : -Infinity;
                y = b?.userScore != null ? b.userScore : -Infinity;
                if (x !== y) return y - x;
                // Sort by trend (descending), place falsy values at last
                x = a?.trending != null ? a.trending : -Infinity;
                y = b?.trending != null ? b.trending : -Infinity;
                if (x !== y) return y - x;
                // Sort by popularity (descending), place falsy values at last
                x = a?.popularity != null ? a.popularity : -Infinity;
                y = b?.popularity != null ? b.popularity : -Infinity;
                if (x !== y) return y - x;
                // Sort by score (descending), place falsy values at last
                x = a?.score != null ? a.score : -Infinity;
                y = b?.score != null ? b.score : -Infinity;
                return y - x;
            })
        }
    } else if (sortType === "asc") {
        if (sortName === "Weighted Score") {
            mediaList.sort((a, b) => {
                let x = a?.weightedScore != null ? a?.weightedScore : Infinity,
                    y = b?.weightedScore != null ? b?.weightedScore : Infinity;
                return x - y
            })
        } else if (sortName === "Score") {
            mediaList.sort((a, b) => {
                let x = a?.score != null ? a?.score : Infinity,
                    y = b?.score != null ? b?.score : Infinity;
                return x - y
            })
        } else if (sortName === "Average Score") {
            mediaList.sort((a, b) => {
                let x = a?.averageScore != null ? a?.averageScore : Infinity,
                    y = b?.averageScore != null ? b?.averageScore : Infinity;
                return x - y
            })
        } else if (sortName === "User Score") {
            mediaList.sort((a, b) => {
                let x = a?.userScore != null ? a?.userScore : Infinity,
                    y = b?.userScore != null ? b?.userScore : Infinity;
                return x - y
            })
        } else if (sortName === "Popularity") {
            mediaList.sort((a, b) => {
                let x = a?.popularity != null ? a?.popularity : Infinity,
                    y = b?.popularity != null ? b?.popularity : Infinity;
                return x - y
            })
        } else if (sortName === "Trending") {
            mediaList.sort((a, b) => {
                let x = a?.trending != null ? a?.trending : Infinity,
                    y = b?.trending != null ? b?.trending : Infinity;
                if (x !== y) return x - y;
                // Sort by popularity (descending), place falsy values at last
                x = a?.popularity != null ? a.popularity : Infinity;
                y = b?.popularity != null ? b.popularity : Infinity;
                return x - y
            })
        } else if (sortName === "Favorites") {
            mediaList.sort((a, b) => {
                let x = a?.favorites != null ? a?.favorites : Infinity,
                    y = b?.favorites != null ? b?.favorites : Infinity;
                if (x !== y) return x - y;
                // Sort by popularity (descending), place falsy values at last
                x = a?.popularity != null ? a.popularity : Infinity;
                y = b?.popularity != null ? b.popularity : Infinity;
                return x - y
            })
        } else if (sortName === "Date Updated") {
            mediaList.sort((a, b) => {
                // Sort by date edited/updated or added (ascending), place falsy values at last
                let x = a?.dateEdited || a?.dateAdded ? Math.max(a?.dateEdited || 0, a?.dateAdded || 0) : Infinity,
                    y = b?.dateEdited || b?.dateAdded ? Math.max(b?.dateEdited || 0, b?.dateAdded || 0) : Infinity
                if (x !== y) return x - y;
                // Sort by date start (ascending), place falsy values at last
                let year = a?.year
                let season = a?.season;
                let startDate = a?.startDate || {}
                let month = startDate?.month
                if (parseInt(month) > 0) { month = parseInt(month) - 1 }
                let day = startDate?.day
                x = getJapaneseStartDate({ season, year, month, day })?.getTime?.()
                // Get Date B
                year = b?.year
                season = b?.season;
                startDate = b?.startDate || {}
                month = startDate?.month
                if (parseInt(month) > 0) { month = parseInt(month) - 1 }
                day = startDate?.day
                y = getJapaneseStartDate({ season, year, month, day })?.getTime?.()
                // Sort by date (ascending), place falsy values at last
                x = x != null ? x : Infinity;
                y = y != null ? y : Infinity;
                return x - y;
            })
        } else if (sortName === "Date Added") {
            mediaList.sort((a, b) => {
                // Sort by id (ascending), place falsy values at last
                let x = a?.id != null ? parseInt(a?.id) : Infinity,
                    y = b?.id != null ? parseInt(b?.id) : Infinity
                if (x !== y) return x - y;
                // Sort by Date Added (ascending), place falsy values at last
                x = a?.dateAdded ? a?.dateAdded : Infinity
                y = b?.dateAdded ? b?.dateAdded : Infinity
                if (x !== y) return x - y;
                // Sort by date start (ascending), place falsy values at last
                let year = a?.year
                let season = a?.season;
                let startDate = a?.startDate || {}
                let month = startDate?.month
                if (parseInt(month) > 0) { month = parseInt(month) - 1 }
                let day = startDate?.day
                x = getJapaneseStartDate({ season, year, month, day })?.getTime?.()
                // Get Date B
                year = b?.year
                season = b?.season;
                startDate = b?.startDate || {}
                month = startDate?.month
                if (parseInt(month) > 0) { month = parseInt(month) - 1 }
                day = startDate?.day
                y = getJapaneseStartDate({ season, year, month, day })?.getTime?.()
                // Sort by date (ascending), place falsy values at last
                x = x != null ? x : Infinity;
                y = y != null ? y : Infinity;
                return x - y;
            })
        } else if (sortName === "Date") {
            mediaList.sort((a, b) => {
                // Get Date A
                let year = a?.year
                let season = a?.season;
                let startDate = a?.startDate || {}
                let month = startDate?.month
                if (parseInt(month) > 0) { month = parseInt(month) - 1 }
                let day = startDate?.day
                let dateA = getJapaneseStartDate({ season, year, month, day })?.getTime?.()
                // Get Date B
                year = b?.year
                season = b?.season;
                startDate = b?.startDate || {}
                month = startDate?.month
                if (parseInt(month) > 0) { month = parseInt(month) - 1 }
                day = startDate?.day
                let dateB = getJapaneseStartDate({ season, year, month, day })?.getTime?.()
                // Sort by date (ascending), place falsy values at last
                let x = dateA != null ? dateA : Infinity;
                let y = dateB != null ? dateB : Infinity;
                return x - y;
            })
        }
    }

    return {
        mediaList: mediaList.map(({ id }) => id),
        isHiddenList: showHiddenList,
        shownSortName: shownSortName || sortName,
        mediaFilters,
        sortBy
    }
}
function getCurrentSeasonYear() {
    let currentDate = new Date()
    let year = currentDate.getFullYear()
    let seasons = {
        Winter: new Date(parseInt(year), 0, 1),  // January 1
        Spring: new Date(parseInt(year), 3, 1),  // April 1
        Summer: new Date(parseInt(year), 6, 1),  // July 1
        Fall: new Date(parseInt(year), 9, 1),    // October 1
    };
    if (isNaN(year)) return null
    if (currentDate < seasons.Spring) {
        return {
            year,
            seasonYear: `Winter ${year}`, 
            nextSeasonYear: `Spring ${year}`,
            previousSeasonYear: `Fall ${year - 1}`,
            futureSeasonsInCurrentYear: {
                Spring: true,
                Summer: true,
                Fall: true,
            },
            pastSeasonsInCurrentYear: {},
        }
    } else if (currentDate >= seasons.Spring && currentDate < seasons.Summer) {
        return {
            year,
            seasonYear: `Spring ${year}`, 
            nextSeasonYear: `Summer ${year}`,
            previousSeasonYear: `Winter ${year}`,
            futureSeasonsInCurrentYear: {
                Summer: true,
                Fall: true, 
            },
            pastSeasonsInCurrentYear: {
                Winter: true,
            },
        }
    } else if (currentDate >= seasons.Summer && currentDate < seasons.Fall) {
        return {
            year,
            seasonYear: `Summer ${year}`, 
            nextSeasonYear: `Fall ${year}`,
            previousSeasonYear: `Spring ${year}`,
            futureSeasonsInCurrentYear: {
                Fall: true,
            },
            pastSeasonsInCurrentYear: {
                Winter: true,
                Spring: true,
            },
        }
    } else {
        return {
            year,
            seasonYear: `Fall ${year}`, 
            nextSeasonYear: `Winter ${year + 1}`,
            previousSeasonYear: `Summer ${year}`,
            futureSeasonsInCurrentYear: {},
            pastSeasonsInCurrentYear: {
                Winter: true,
                Spring: true,
                Summer: true,
            },
        }
    }
}
function getJapaneseStartDate({ season, year, month, day }) {
    if (parseInt(year) >= 0) {
        if (parseInt(month) >= 0) {
            return new Date(parseInt(year), parseInt(month), parseInt(day || 1) || 1)
        }
        const seasonKey = season?.trim();
        if (
            seasonKey
            && (
                seasonKey === "Winter" 
                || seasonKey === "Spring" 
                || seasonKey === "Summer" 
                || seasonKey === "Fall"
            ) && !isNaN(year)
        ) {
            let seasons = {
                Winter: new Date(parseInt(year), 0, 1),  // January 1
                Spring: new Date(parseInt(year), 3, 1),  // April 1
                Summer: new Date(parseInt(year), 6, 1),  // July 1
                Fall: new Date(parseInt(year), 9, 1),    // October 1
            };
            return seasons[seasonKey];
        }
        return new Date(parseInt(year), 0, 1);
    } else {
        return null;
    }
}
function msToTime(duration, limit) {
    try {
        if (duration < 1e3) {
            return "0s";
        }
        let seconds = Math.floor((duration / 1e3) % 60),
            minutes = Math.floor((duration / 6e4) % 60),
            hours = Math.floor((duration / 3.6e6) % 24),
            days = Math.floor((duration / 8.64e7) % 7),
            weeks = Math.floor((duration / 6.048e8) % 4),
            months = Math.floor((duration / 2.4192e9) % 12),
            years = Math.floor((duration / 2.90304e10) % 10),
            decades = Math.floor((duration / 2.90304e11) % 10),
            century = Math.floor((duration / 2.90304e12) % 10),
            millenium = Math.floor((duration / 2.90304e13) % 10);
        let time = []
        if (millenium > 0) time.push(`${millenium}mil`)
        if (century > 0) time.push(`${century}cen`)
        if (decades > 0) time.push(`${decades}dec`)
        if (years > 0) time.push(`${years}y`)
        if (months > 0) time.push(`${months}mon`)
        if (weeks > 0) time.push(`${weeks}w`)
        if (days > 0) time.push(`${days}d`)
        if (hours > 0) time.push(`${hours}h`)
        if (minutes > 0) time.push(`${minutes}m`)
        if (seconds > 0) time.push(`${seconds}s`)
        if (limit > 0) {
            time = time.slice(0, limit)
        }
        return time.join(" ") || "0s"
    } catch (e) {
        return ""
    }
}
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
function saveJSON(data, name) {
    return new Promise((resolve, reject) => {
        let blob, transaction
        try {
            transaction = db.transaction("others", "readwrite");
            let store = transaction.objectStore("others");
            let put;
            transaction.oncomplete = () => {
                resolve();
            }
            if (data instanceof Blob) {
                blob = data
                put = store.put(blob, name);
            } else if (isJsonObject(data) || data instanceof Array) {
                blob = new Blob([JSON.stringify(data)]);
                put = store.put(blob, name);
            } else {
                put = store.put(data, name);
            }
            put.onerror = (ex) => {
                transaction.oncomplete = undefined
                if (blob instanceof Blob) {
                    (async()=>{
                        try {
                            await saveJSON((new FileReaderSync()).readAsArrayBuffer(blob), name)
                            resolve()
                        } catch (ex2) {
                            console.error(ex);
                            console.error(ex2);
                            reject(ex);
                        }
                    })();
                } else {
                    console.error(ex);
                    reject(ex);
                }
            };
            try {
                transaction?.commit?.();
            } catch {}
        } catch (ex) {
            if (transaction?.oncomplete) {
                transaction.oncomplete = undefined
            }
            if (blob instanceof Blob) {
                (async()=>{
                    try {
                        await saveJSON((new FileReaderSync()).readAsArrayBuffer(blob), name)
                        resolve()
                    } catch (ex2) {
                        console.error(ex);
                        console.error(ex2);
                        reject(ex);
                    }
                })();
            } else {
                console.error(ex);
                reject(ex);
            }
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
function getDefaulMediaCautions() {
    return [
        {
            optionName: "Netorare",
            optionCategory: "Tag",
            status: "excluded",
            filterType: "selection"
        },
        {
            optionName: "Rape",
            optionCategory: "Tag",
            status: "excluded",
            filterType: "selection"
        },
        {
            optionName: "Prostitution",
            optionCategory: "Tag",
            status: "excluded",
            filterType: "selection"
        },
        {
            optionName: "Ero Guro",
            optionCategory: "Tag",
            status: "excluded",
            filterType: "selection"
        },
        {
            optionName: "Suicide",
            optionCategory: "Tag",
            status: "excluded",
            filterType: "selection"
        },
        {
            optionName: "Slavery",
            optionCategory: "Tag",
            status: "excluded",
            filterType: "selection"
        },
        {
            optionName: "Tragedy",
            optionCategory: "Tag",
            status: "excluded",
            filterType: "selection"
        },
        {
            optionName: "Ecchi",
            optionCategory: "Genre",
            status: "included",
            filterType: "selection"
        },
        {
            optionName: "Nudity",
            optionCategory: "Tag",
            status: "included",
            filterType: "selection"
        }
    ]
}
function getDefaultCategories() {
    return [
        "   Completed Anime",
        "   Completed Manga",
        "   Completed Novel",
        "  Airing & Upcoming",
        "  Ongoing Manga",
        "  Ongoing Novel",
        " Next Sequel in My List",
        "Anticipated",
        "My List",
        "Recently Updated"
    ].reduce((acc, addedCategory) => {
        // Sort
        let isUserRelated = addedCategory === " Next Sequel in My List" || addedCategory === "My List"
        let sortName, shownSortName
        if (isUserRelated) {
            sortName = "Score"
        } else if (addedCategory === "Anticipated") {
            sortName = "Popularity"
        } else if (addedCategory === "Recently Updated") {
            sortName = "Date Updated"
        } else {
            sortName = "Weighted Score"
        }
        // Media Filter
        switch (addedCategory) {
            case "   Completed Anime": {
                mediaFilters = [
                    {
                        optionName: "Finished",
                        optionCategory: "Release Status",
                        status: "included",
                        filterType: "selection"
                    },
                    {
                        optionName: "Hide My List",
                        filterType: "bool",
                        status: "included",
                    },
                    {
                        optionName: "Hide My Finished List",
                        filterType: "bool",
                        status: "included",
                    },
                    {
                        optionName: "Average Score",
                        optionCategory: "Shown Metric",
                        status: "included",
                        filterType: "selection"
                    },
                    {
                        optionName: "Anime",
                        optionCategory: "Format",
                        status: "included",
                        filterType: "selection"
                    }
                ]
                shownSortName = "Average Score"
                break
            }
            case "   Completed Manga": {
                mediaFilters = [
                    {
                        optionName: "Finished",
                        optionCategory: "Release Status",
                        status: "included",
                        filterType: "selection"
                    },
                    {
                        optionName: "Hide My List",
                        filterType: "bool",
                        status: "included",
                    },
                    {
                        optionName: "Hide My Finished List",
                        filterType: "bool",
                        status: "included",
                    },
                    {
                        optionName: "Average Score",
                        optionCategory: "Shown Metric",
                        status: "included",
                        filterType: "selection"
                    },
                    {
                        optionName: "Anime",
                        optionCategory: "Format",
                        status: "excluded",
                        filterType: "selection"
                    },
                    {
                        optionName: "Novel",
                        optionCategory: "Format",
                        status: "excluded",
                        filterType: "selection"
                    }
                ]
                shownSortName = "Average Score"
                break
            }
            case "   Completed Novel": {
                mediaFilters = [
                    {
                        optionName: "Finished",
                        optionCategory: "Release Status",
                        status: "included",
                        filterType: "selection"
                    },
                    {
                        optionName: "Hide My List",
                        filterType: "bool",
                        status: "included",
                    },
                    {
                        optionName: "Hide My Finished List",
                        filterType: "bool",
                        status: "included",
                    },
                    {
                        optionName: "Average Score",
                        optionCategory: "Shown Metric",
                        status: "included",
                        filterType: "selection"
                    },
                    {
                        optionName: "Novel",
                        optionCategory: "Format",
                        status: "included",
                        filterType: "selection"
                    },
                ]
                shownSortName = "Average Score"
                break
            }
            case "  Airing & Upcoming": {
                mediaFilters = [
                    {
                        optionName: "Hide My List",
                        filterType: "bool",
                        status: "included",
                    },
                    {
                        optionName: "Hide My Finished List",
                        filterType: "bool",
                        status: "included",
                    },
                    {
                        optionName: "Releasing",
                        optionCategory: "Release Status",
                        status: "included",
                        filterType: "selection"
                    },
                    {
                        optionName: "Not Yet Released",
                        optionCategory: "Release Status",
                        status: "included",
                        filterType: "selection"
                    },
                    {
                        optionName: "Average Score",
                        optionCategory: "Shown Metric",
                        status: "included",
                        filterType: "selection"
                    },
                    {
                        optionName: "Anime",
                        optionCategory: "Format",
                        status: "included",
                        filterType: "selection"
                    }
                ]
                shownSortName = "Average Score"
                break
            }
            case "  Ongoing Manga": {
                mediaFilters = [
                    {
                        optionName: "Hide My List",
                        filterType: "bool",
                        status: "included",
                    },
                    {
                        optionName: "Hide My Finished List",
                        filterType: "bool",
                        status: "included",
                    },
                    {
                        optionName: "Releasing",
                        optionCategory: "Release Status",
                        status: "included",
                        filterType: "selection"
                    },
                    {
                        optionName: "Average Score",
                        optionCategory: "Shown Metric",
                        status: "included",
                        filterType: "selection"
                    },
                    {
                        optionName: "Anime",
                        optionCategory: "Format",
                        status: "excluded",
                        filterType: "selection"
                    },
                    {
                        optionName: "Novel",
                        optionCategory: "Format",
                        status: "excluded",
                        filterType: "selection"
                    }
                ]
                shownSortName = "Average Score"
                break
            }
            case "  Ongoing Novel": {
                mediaFilters = [
                    {
                        optionName: "Hide My List",
                        filterType: "bool",
                        status: "included",
                    },
                    {
                        optionName: "Hide My Finished List",
                        filterType: "bool",
                        status: "included",
                    },
                    {
                        optionName: "Releasing",
                        optionCategory: "Release Status",
                        status: "included",
                        filterType: "selection"
                    },
                    {
                        optionName: "Average Score",
                        optionCategory: "Shown Metric",
                        status: "included",
                        filterType: "selection"
                    },
                    {
                        optionName: "Novel",
                        optionCategory: "Format",
                        status: "included",
                        filterType: "selection"
                    }
                ]
                shownSortName = "Average Score"
                break
            }
            case " Next Sequel in My List": {
                mediaFilters = [
                    {
                        optionName: "Finished",
                        optionCategory: "Release Status",
                        status: "none",
                        filterType: "selection"
                    },
                    {
                        optionName: "Hide My List",
                        filterType: "bool",
                        status: "included",
                    },
                    {
                        optionName: "Hide My Finished List",
                        filterType: "bool",
                        status: "included",
                    },
                    {
                        optionName: "Show Next Sequel",
                        filterType: "bool",
                        status: "included",
                    },
                    {
                        optionName: "Average Score",
                        optionCategory: "Shown Metric",
                        status: "included",
                        filterType: "selection"
                    }
                ]
                shownSortName = "Average Score"
                break
            }
            case "Anticipated": {
                mediaFilters = [
                    {
                        optionName: "Hide My List",
                        status: "included",
                        filterType: "bool",
                    },
                    {
                        optionName: "Hide My Finished List",
                        status: "included",
                        filterType: "bool",
                    },
                    {
                        optionName: "Not Yet Released",
                        optionCategory: "Release Status",
                        status: "included",
                        filterType: "selection"
                    }
                ]
                break
            }
            case "My List": {
                mediaFilters = [
                    {
                        optionName: "Finished",
                        optionCategory: "Release Status",
                        status: "none",
                        filterType: "selection"
                    },
                    {
                        optionName: "Repeating",
                        optionCategory: "User Status",
                        status: "none",
                        filterType: "selection"
                    },
                    {
                        optionName: "Hide My Finished List",
                        filterType: "bool",
                        status: "included",
                    },
                    {
                        optionName: "Show My List",
                        filterType: "bool",
                        status: "included",
                    },
                    {
                        optionName: "Average Score",
                        optionCategory: "Shown Metric",
                        status: "included",
                        filterType: "selection"
                    }
                ]
                shownSortName = "Average Score"
                break
            }
            case "Recently Updated": {
                mediaFilters = [
                    {
                        optionName: "Show All Sequels",
                        filterType: "bool",
                        status: "included",
                    },
                    {
                        optionName: "Score",
                        optionCategory: "Shown Metric",
                        status: "included",
                        filterType: "selection"
                    }
                ]
                shownSortName = "Score"
                break
            }
        }
        acc[addedCategory] = {
            isHiddenList: false,
            shownSortName: shownSortName || sortName,
            sortBy: {
                sortName,
                sortType: "desc"
            },
            mediaFilters,
        }
        return acc
    }, {})
}
let startPost = performance.now();
function loadProgress(progress) {
    let endPost = performance.now();
    if (endPost - startPost > 17) {
        self.postMessage({ progress })
        startPost = endPost
    }
}