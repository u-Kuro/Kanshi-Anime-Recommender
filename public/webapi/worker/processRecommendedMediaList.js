
let db;
const mediaRelationTypes = {
    source: true,
    adaptation: true,
    prequel: true,
    sequel: true,
    parent: true,
    side_story: true,
    summary: true,
    compilation: true,
    alternative: true,
    spin_off: true,
}
const minNumber = 1 - 6e-17 !== 1 ? 6e-17 : Number.EPSILON // Min Value Javascript

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
    try {
        if (!db) await IDBinit()
        // Retrieve Data
        self.postMessage({ status: "Processing Recommendation List" })
        const mediaEntries = await retrieveJSON("mediaEntries") || {}
        const userData = await retrieveJSON("userData")
        const userEntries = (userData?.userEntries ?? await retrieveJSON("userEntries")) || []
        let includedUserEntryCount = 0;
        // Filter Algorithm
        let contentFocused = false,
            includeUnknownVar = false,
            includeYear = true,
            includeAverageScore = false,
            minPopularity = {
                anime: null,
                manga: null,
                novel: null,
            },
            minAverageScore,
            minSampleSize,
            sampleSize,
            tagRankLimit = minNumber,
            customUserScoreBase;
        let include = {
                genres: {}, tags: {}, categories: {}
            },
            exclude = {
                genres: {}, tags: {}, categories: {}
            }

        let algorithmFilters = data?.algorithmFilters
        const hasNewAlgorithmFilter = algorithmFilters != null
        if (!hasNewAlgorithmFilter) {
            algorithmFilters = await retrieveJSON("algorithmFilters") || [
                {
                    filterType: "bool",
                    optionName: "Content Focused",
                    status: "none"
                },
                {
                    filterType: "bool",
                    optionName: "Inc. All Factors",
                    status: "none"
                },
                {
                    filterType: "bool",
                    optionName: "Inc. Average Score",
                    status: "none"
                },
                {
                    filterType: "bool",
                    optionName: "Exclude Year",
                    status: "none"
                },
            ]
        }

        algorithmFilters.forEach(({ status, filterType, optionName, optionCategory, optionValue }) => {
            if (status === "included") {
                if (filterType === "selection") {
                    if (optionCategory === "Genre") {
                        include.genres[optionName] = true
                    } else if (optionCategory === "Tag") {
                        include.tags[optionName] = true
                    } else if (optionCategory === "Tag Category") {
                        include.categories[optionName] = true
                    }
                } else if (filterType === "bool") {
                    if (optionName === "Content Focused") {
                        contentFocused = true
                    } else if (optionName === "Inc. All Factors") {
                        includeUnknownVar = true
                    } else if (optionName === "Inc. Average Score") {
                        includeAverageScore = true
                    } else if (optionName === "Exclude Year") {
                        includeYear = false
                    }
                } else if (filterType === "number") {
                    if (optionName === "Min Tag Percentage") {
                        let newTagRankLimit = parseFloat(optionValue)
                        if (newTagRankLimit > 0) {
                            tagRankLimit = newTagRankLimit
                        }
                    } else if (optionName === "Scoring System") {
                        customUserScoreBase = parseFloat(optionValue)
                    } else if (optionName === "Sample Size") {
                        sampleSize = parseFloat(optionValue)
                    } else if (optionName === "Min Sample Size") {
                        minSampleSize = parseFloat(optionValue)
                    } else if (optionName === "Min Anime Popularity") {
                        minPopularity.anime = parseFloat(optionValue)
                    } else if (optionName === "Min Manga Popularity") {
                        minPopularity.manga = parseFloat(optionValue)
                    } else if (optionName === "Min Novel Popularity") {
                        minPopularity.novel = parseFloat(optionValue)
                    } else if (optionName === "Min Average Score") {
                        minAverageScore = parseFloat(optionValue)
                    }
                }
            } else if (status === "excluded") {
                if (filterType === "selection") {
                    if (optionCategory === "Genre") {
                        exclude.genres[optionName] = true
                    } else if (optionCategory === "Tag") {
                        exclude.tags[optionName] = true
                    } else if (optionCategory === "Tag Category") {
                        exclude.categories[optionName] = true
                    }
                }
            }
        })
        // Init User Entries and Information
        self.postMessage({ status: "Processing Recommendation List" })
        // Sort User Entries for Anomaly Removal
        if (userEntries.length >= 2) {
            if (isJsonObject(userEntries[0]) && isJsonObject(userEntries[1])) {
                // sort by user-score and popularity for unique media in franchise
                userEntries.sort((a, b) => {
                    let x = a?.score != null ? a.score : -Infinity,
                        y = b?.score != null ? b.score : -Infinity;
                    if (x !== y) return y - x;
                    x = a?.media?.popularity != null ? a.media.popularity : -Infinity;
                    y = b?.media?.popularity != null ? b.media.popularity : -Infinity;
                    return y - x
                })
            }
        }
        // Calculate Recommendation Map
        const minScoreValue = 0.01
        let userScores, userScoreBase = 100
        let newHighestRange = userScoreBase, 
            minUserScore = 1,
            newLowestRange = minUserScore
        let varScheme = {
            genres: {},
            tags: {},
            studios: {},
            originalGenres: {},
            originalTags: {}
        }
        let userEntriesStatus = {}
        let averageScore = []
        let year = []
        let genresMeanCount = {}
        let tagsMeanCount = {}
        let studiosMeanCount = {}
        let genresWithUpperCount = {},
            genresWithUpperScore = {},
            tagsWithUpperScore = {},
            studiosWithUpperScore = {}
        let minOthersScore = {
            genres: minScoreValue,
            tags: minScoreValue,
        }, maxOthersScore = {
            genres: minScoreValue,
            tags: minScoreValue,
        }
        // let staffMeanCount = {}
        let includedMediaRelations = {}
        self.postMessage({ status: "Processing Recommendation List" })
        for (let i = 0, l = userEntries.length; i < l; i++) {

            loadProgress(((i + 1) / l) * 100 * 0.3)

            let media = userEntries[i].media
            let mediaID = media?.id
            let status = userEntries[i].status
            let userScore = userEntries[i].score
            let episodeProgress = userEntries[i].progress
            let volumeProgress = userEntries[i].progressVolumes
            // Get Important Info in User Entries
            if (mediaID) {
                if (!isJsonObject(userEntriesStatus[mediaID])) {
                    userEntriesStatus[mediaID] = {}
                }
                if (status && typeof status === "string") {
                    userEntriesStatus[mediaID].userStatus = status
                }
                if (userScore > 0) {
                    userEntriesStatus[mediaID].userScore = userScore
                }
                if (episodeProgress > 0) {
                    userEntriesStatus[mediaID].episodeProgress = episodeProgress
                }
                if (volumeProgress > 0) {
                    userEntriesStatus[mediaID].volumeProgress = volumeProgress
                }
            }
            // Init Variables
            let genres = media?.genres || []
            let tags = media?.tags || []
            let studios = media?.studios?.edges?.filter?.((e) => e?.isMain) || []
            // let staffs = media?.staff?.edges || []
            if (userScore > 0) {// Filter Scored Media
                // Check if a related media is already analyzed
                if (includedMediaRelations[mediaID]) continue
                includedMediaRelations[mediaID] = true
                //
                let mediaRelations = media?.relations?.edges || [];
                if (mediaRelations instanceof Array) {
                    if (mediaRelations.length > 0) {
                        mediaRelations.forEach((e) => {
                            let mediaRelationType = e?.relationType;
                            let relationID = e?.node?.id;
                            if (
                                typeof mediaRelationType === "string" &&
                                typeof relationID === "number"
                            ) {
                                if (
                                    mediaRelationTypes[mediaRelationType.trim().toLowerCase()]
                                ) {
                                    includedMediaRelations[relationID] = true
                                }
                            }
                        });
                    }
                }
                // Add as Included Entry in Recommendation Scheme
                ++includedUserEntryCount
                // Calculate the Variable Scheme
                for (let j = 0, jl = genres.length; j < jl; j++) {
                    let genre = genres[j]
                    if (typeof genre === "string") {
                        if ((jsonIsEmpty(include.genres) || include.genres[genre] || include.genres.All) &&
                            !exclude.genres[genre] &&
                            !exclude.genres.All
                        ) {
                            if (varScheme.genres[genre]) {
                                varScheme.genres[genre].userScore.push(userScore)
                                ++varScheme.genres[genre].count
                            } else {
                                varScheme.genres[genre] = { userScore: [userScore], count: 1 }
                            }
                            if (genresMeanCount[genre]) {
                                ++genresMeanCount[genre]
                            } else {
                                genresMeanCount[genre] = 1
                            }
                        }
                    }
                }
                // Tag
                for (let j = 0, jl = tags.length; j < jl; j++) {
                    let tagRank = tags[j]?.rank;
                    if (!tagRank || tagRank < tagRankLimit) continue
                    let tag = tags[j]?.name
                    let tagCategory = tags[j]?.category
                    if (typeof tag === "string" && typeof tagCategory === "string") {
                        if ((jsonIsEmpty(include.categories) || include.categories[tagCategory] || include.categories.All) &&
                            !exclude.categories[tagCategory] &&
                            !exclude.categories.All &&
                            //
                            (jsonIsEmpty(include.tags) || include.tags[tag] || include.tags.All) &&
                            !exclude.tags[tag] &&
                            !exclude.tags.All
                        ) {
                            let tagWeight = tagRank * 0.01
                            if (varScheme.tags[tag]) {
                                varScheme.tags[tag].userScore.push(userScore * tagWeight)
                                varScheme.tags[tag].count = varScheme.tags[tag].count + tagWeight
                            } else {
                                varScheme.tags[tag] = { userScore: [userScore * tagWeight], count: tagWeight }
                            }
                            if (tagsMeanCount[tag]) {
                                tagsMeanCount[tag] = tagsMeanCount[tag] + tagWeight
                            } else {
                                tagsMeanCount[tag] = tagWeight
                            }
                        }
                    }
                }
                // Studio
                let includedStudios = {}
                for (let j = 0, jl = studios.length; j < jl; j++) {
                    let studio = studios[j]?.node?.name
                    if (typeof studio === "string") {
                        if (includedStudios[studio]) continue
                        includedStudios[studio] = true
                        if (varScheme.studios[studio]) {
                            varScheme.studios[studio].userScore.push(userScore)
                            ++varScheme.studios[studio].count
                        } else {
                            varScheme.studios[studio] = { userScore: [userScore], count: 1 }
                        }
                        if (studiosMeanCount[studio]) {
                            ++studiosMeanCount[studio]
                        } else {
                            studiosMeanCount[studio] = 1
                        }
                    }
                }
                // Init Linear Models Training Data
                if (isAN(media?.averageScore) && includeAverageScore) {
                    averageScore.push({ userScore: userScore, averageScore: media.averageScore })
                }
                let mediaYear = media?.seasonYear || media?.startDate?.year || media?.endDate?.year
                if (isAN(parseFloat(mediaYear)) && includeYear) {
                    year.push({ userScore: userScore, year: parseFloat(mediaYear) })
                }
            }
        }
        if (includedUserEntryCount < 1) {
            varScheme = {}
        } else {
            let maxUserScore = -Infinity
            userScores = Object.values(userEntriesStatus)
                .map((entry) => entry.userScore)
                .filter((uscore) => {
                    let include = uscore > 0
                    if (include) {
                        if (uscore > maxUserScore) {
                            maxUserScore = uscore
                        }
                        if (uscore < minUserScore) {
                            minUserScore = uscore
                        }
                    }
                    return include
                })
            newHighestRange = userScoreBase = maxUserScore <= 3
                ? 3
                : maxUserScore <= 5
                    ? 5
                    : maxUserScore <= 10
                        ? 10
                        : 100;
            if (minUserScore < minScoreValue) {
                for (let key in minOthersScore) {
                    minOthersScore[key] = minUserScore
                }
            }
            newLowestRange = minUserScore
            // Clean Data
            let genresUpperCount
            if (typeof sampleSize === "number" && sampleSize >= 1) {
                genresMeanCount = sampleSize
            } else if (!jsonIsEmpty(genresMeanCount)) {
                let genresMeanAndSTD = arrayMeanAndSTD(Object.values(genresMeanCount))
                genresMeanCount = genresMeanAndSTD.mean
                genresUpperCount = genresMeanAndSTD.mean + genresMeanAndSTD.standardDeviation
            } else {
                genresMeanCount = Math.min(5, includedUserEntryCount)
            }
            if (minSampleSize >= 0) {
                genresMeanCount = Math.max(minSampleSize, genresMeanCount)
            }

            if (typeof sampleSize === "number" && sampleSize >= 1) {
                tagsMeanCount = sampleSize
            } else if (!jsonIsEmpty(tagsMeanCount)) {
                tagsMeanCount = arrayMean(Object.values(tagsMeanCount))
            } else {
                tagsMeanCount = Math.min(5, includedUserEntryCount)
            }
            if (minSampleSize >= 0) {
                tagsMeanCount = Math.max(minSampleSize, tagsMeanCount)
            }

            if (typeof sampleSize === "number" && sampleSize >= 1) {
                studiosMeanCount = sampleSize
            } else if (!jsonIsEmpty(studiosMeanCount)) {
                studiosMeanCount = arrayMean(Object.values(studiosMeanCount))
            } else {
                studiosMeanCount = Math.min(5, includedUserEntryCount)
            }
            if (minSampleSize >= 0) {
                studiosMeanCount = Math.max(minSampleSize, studiosMeanCount)
            }
            // Calculate Variable Scores
            // Genre
            let genresKey = Object.keys(varScheme.genres)
            let genresMeanAndSTD = arrayMeanAndSTD(genresKey.map(genre => arrayMean(varScheme.genres[genre].userScore)))
            const genresMean = genresMeanAndSTD.mean
            const genresUpperScore = genresMeanAndSTD.mean + genresMeanAndSTD.standardDeviation
            for (let i = 0, l = genresKey.length; i < l; i++) {
                const genre = genresKey[i]
                const originalScore = arrayMean(varScheme.genres[genre].userScore)
                const count = varScheme.genres[genre].count
                let score = originalScore
                if (count >= genresUpperCount) {
                    genresWithUpperCount[genre] = true
                    varScheme.originalGenres[genre] = originalScore
                }
                if (
                    contentFocused
                    || originalScore < genresMean
                    || (includeUnknownVar && count < genresMeanCount)
                ) {
                    if (contentFocused || (includeUnknownVar && count < genresMeanCount)) {
                        let Cweight = count / genresMeanCount
                        score = score * Cweight
                    }
                    if (contentFocused || originalScore < genresMean) {
                        let Sweight = originalScore / genresMean
                        score = score * Sweight                    
                    }
                }
                if (
                    contentFocused
                    || includeUnknownVar
                    || originalScore < genresMean
                    || count >= genresUpperCount
                    || (score >= genresUpperScore && count >= genresMeanCount)
                ) {
                    if (contentFocused) {
                        if (originalScore >= genresUpperScore && count >= genresMeanCount) {
                            genresWithUpperScore[genre] = true
                        }
                        if (originalScore > maxOthersScore.genres) {
                            maxOthersScore.genres = originalScore
                        }
                        varScheme.originalGenres[genre] = originalScore
                    } else {
                        if (score >= genresUpperScore && count >= genresMeanCount) {
                            genresWithUpperScore[genre] = true
                        }
                        if (score > maxOthersScore.genres) {
                            maxOthersScore.genres = score
                        }
                    }
                    if (score < minOthersScore.genres) {
                        minOthersScore.genres = score
                    }
                    varScheme.genres[genre] = score
                } else {
                    delete varScheme.genres[genre]
                }
            }

            // Tag
            let tagsKey = Object.keys(varScheme.tags)
            let tagsMeanAndSTD = arrayMeanAndSTD(tagsKey.map(tag => arrayMean(varScheme.tags[tag].userScore)))
            const tagsMean = tagsMeanAndSTD.mean
            const tagsUpperScore = tagsMeanAndSTD.mean + tagsMeanAndSTD.standardDeviation
            for (let i = 0; i < tagsKey.length; i++) {
                const tag = tagsKey[i]
                const originalScore = arrayMean(varScheme.tags[tag].userScore)
                const count = varScheme.tags[tag].count
                let score = originalScore
                if (
                    contentFocused 
                    || originalScore < tagsMean
                    || (includeUnknownVar && count < tagsMeanCount)
                ) {
                    if (contentFocused || (includeUnknownVar && count < tagsMeanCount)) {
                        let Cweight = count / tagsMeanCount
                        score = score * Cweight
                    }
                    if (contentFocused || originalScore < tagsMean) {
                        let Sweight = originalScore / tagsMean
                        score = score * Sweight
                    }
                }
                if (
                    contentFocused
                    || includeUnknownVar
                    || originalScore < tagsMean 
                    || (score >= tagsUpperScore && count >= tagsMeanCount)
                ) {
                    if (contentFocused) {
                        if (originalScore >= tagsUpperScore && count >= tagsMeanCount) {
                            tagsWithUpperScore[tag] = true
                        }
                        if (originalScore > maxOthersScore.tags) {
                            maxOthersScore.tags = originalScore
                        }
                        varScheme.originalTags[tag] = originalScore
                    } else {
                        if (score >= tagsUpperScore && count >= tagsMeanCount) {
                            tagsWithUpperScore[tag] = true
                        }
                        if (score > maxOthersScore.tags) {
                            maxOthersScore.tags = score
                        }
                    }
                    if (score < minOthersScore.tags) {
                        minOthersScore.tags = score
                    }
                    varScheme.tags[tag] = score
                } else {
                    delete varScheme.tags[tag]
                }
            }

            // Studio
            let studiosKey = Object.keys(varScheme.studios)
            let studiosMeanAndSTD = arrayMeanAndSTD(studiosKey.map(studio => arrayMean(varScheme.studios[studio].userScore)))
            const studiosUpperScore = studiosMeanAndSTD.mean + studiosMeanAndSTD.standardDeviation
            for (let i = 0, l = studiosKey.length; i < l; i++) {
                const studio = studiosKey[i]
                const originalScore = arrayMean(varScheme.studios[studio].userScore)
                const count = varScheme.studios[studio].count
                if (originalScore >= studiosUpperScore && count > studiosMeanCount) {
                    studiosWithUpperScore[studio] = true
                }
                varScheme.studios[studio] = originalScore
            }

            // Join Data
            varScheme.genresMean = genresMean
            varScheme.tagsMean = tagsMean
            varScheme.includeCategories = include.categories
            varScheme.excludeCategories = exclude.categories
            varScheme.includeGenres = include.genres
            varScheme.excludeGenres = exclude.genres
            varScheme.includeTags = include.tags
            varScheme.excludeTags = exclude.tags

            // Linear Model Building | y is Predicted so its Userscore
            // Year Model
            if (includeYear) {
                let yearXY = []
                for (let i = 0, l = year.length; i < l; i++) {
                    yearXY.push([year[i].year, year[i].userScore])
                }
                if (yearXY.length >= (minSampleSize || 33)) {
                    varScheme.yearModel = linearRegression(yearXY)
                }
            }
            // Average Score Model
            if (includeAverageScore) {
                let averageScoreXY = []
                for (let i = 0, l = averageScore.length; i < l; i++) {
                    averageScoreXY.push([averageScore[i].averageScore, averageScore[i].userScore])
                }
                if (averageScoreXY.length >= (minSampleSize || 33)) {
                    varScheme.averageScoreModel = linearRegression(averageScoreXY)
                }
            }
        }
        // Calculate Media Recommendation List
        self.postMessage({ status: "Processing Recommendation List" })
        let recommendedMediaListArray = [];
        let usedScoreBasis, maxScore = -Infinity, minScore = Infinity,
            maxWeightedScore = -Infinity, minWeightedScore = Infinity;
        let meanUserScore, meanScoreAll, meanScoreAbove;
        const mediaEntriesArray = Object.values(mediaEntries ?? {});
        let averageScoresArray = [], maxAverageScore = -Infinity,
            animePopularityArray = [], mangaPopularityArray = [], novelPopularityArray = []
        for (let i = 0, l = mediaEntriesArray.length; i < l; i++) {
            const media = mediaEntriesArray[i]
            const averageScore = media.averageScore
            if (averageScore > 0) {
                if (averageScore > maxAverageScore) {
                    maxAverageScore = averageScore
                }
                averageScoresArray.push(averageScore)
            }
            const popularity = media.popularity
            if (popularity > 0) {
                const format = media.format
                if (format === "MANGA" || format === "ONE_SHOT") {
                    mangaPopularityArray.push(popularity)
                } else if (
                    format === "TV" 
                    || format === "MOVIE"
                    || format === "ONA"
                    || format === "SPECIAL"
                    || format === "TV_SHORT"
                    || format === "OVA"
                ) {
                    animePopularityArray.push(popularity)
                } else if (format === "NOVEL") {
                    novelPopularityArray.push(popularity)
                }
            }
        }
        let popularityMode = {
            anime: arrayMode(animePopularityArray),
            manga: arrayMode(mangaPopularityArray),
            novel: arrayMode(novelPopularityArray),
        }
        let maxPopularityMode = getMax([popularityMode.anime || 0, popularityMode.manga || 0, popularityMode.novel || 0])
        let averageScoreMode = minAverageScore ? minAverageScore : arrayMode(averageScoresArray)
        self.postMessage({ 
            averageScoreMode,
            animePopularityMode: popularityMode.anime,
            mangaPopularityMode: popularityMode.manga,
            novelPopularityMode: popularityMode.novel,
        })
        popularityMode = {
            anime: minPopularity.anime ? minPopularity.anime : popularityMode.anime,
            manga: minPopularity.manga ? minPopularity.manga : popularityMode.manga,
            novel: minPopularity.novel ? minPopularity.novel : popularityMode.novel,
        }        
        const dayInMillis = 1000 * 60 * 60 * 24;
        const mediaOptions = {
            "Country Of Origin": {},
            Format: {},
            Genre: {},
            "Release Status": {},
            Season: {},
            Studio: {},
            "Tag Category": {},
            Tag: {},
            "User Status": {},
            Year: {},
        }
        let hasNewFilterOption
        if (
            !jsonIsEmpty(varScheme)
            && userScores?.length > 0
        ) {
            meanUserScore = arrayMean(userScores);
            let { standardDeviation, mean } = arrayMeanAndSTD(
                // exclude unreasonable score
                // this is just for mapping scores
                // unrelated to the algorithm
                customUserScoreBase === 0 ? userScores.filter((score) => score > 1) : userScores
            )
            if (
                customUserScoreBase > 0
                && customUserScoreBase !== userScoreBase
            ) {
                standardDeviation = mapValueDirect(
                    standardDeviation, 
                    userScoreBase,
                    customUserScoreBase
                )
                mean = mapValueDirect(
                    mean, 
                    userScoreBase,
                    customUserScoreBase
                )
                usedScoreBasis = customUserScoreBase
            } else {
                usedScoreBasis = userScoreBase
            }
            newHighestRange = Math.min(
                mean + standardDeviation,
                usedScoreBasis
            )
            newLowestRange = Math.max(
                Math.min(
                    standardDeviation,
                    mean - standardDeviation,
                ),
                minUserScore,
            )
            
            for (let i = 0, l = mediaEntriesArray.length; i < l; i++) {

                loadProgress(((i / l) * 100 * 0.7) + 30)

                let media = mediaEntriesArray[i];
                let mediaID = media?.id;
                let mediaUrl = media?.siteUrl;
                let format = capitalizeWords(media?.format);
                let countryOfOrigin = media?.countryOfOrigin
                let year = media?.seasonYear || media?.startDate?.year || media?.endDate?.year
                let season = capitalizeWords(media?.season);
                let genres = media?.genres || [];
                let tags = media?.tags || [];
                let studios = media?.studios?.edges?.filter?.((e) => e?.isMain) || []
                let status = capitalizeWords(media?.status);
                let popularity = media?.popularity;
                // Update Non Iterative Filters
                let userStatus = "Unseen";
                if (typeof userEntriesStatus?.[mediaID]?.userStatus === "string") {
                    userStatus = capitalizeWords(userEntriesStatus[mediaID].userStatus);
                    if (userStatus && mediaOptions["User Status"][userStatus] === undefined) {
                        hasNewFilterOption = mediaOptions["User Status"][userStatus] = true
                    }
                }
                if (typeof status === "string" && status) {
                    if (mediaOptions["Release Status"][status] === undefined) {
                        hasNewFilterOption = mediaOptions["Release Status"][status] = true
                    }
                }
                if (typeof format === "string" && format) {
                    if (mediaOptions.Format[format] === undefined) {
                        hasNewFilterOption = mediaOptions.Format[format] = true
                    }
                }
                if (typeof countryOfOrigin === "string" && countryOfOrigin) {
                    if (mediaOptions["Country Of Origin"][countryOfOrigin] === undefined) {
                        hasNewFilterOption = mediaOptions["Country Of Origin"][countryOfOrigin] = true
                    }
                }
                if (isAN(year)) {
                    const yearStr = year?.toString?.()
                    if (typeof yearStr === "string" && yearStr && mediaOptions.Year[yearStr] === undefined) {
                        hasNewFilterOption = mediaOptions.Year[yearStr] = true
                    }
                }
                let favouriteGenresIncluded = {},
                    favouriteTagsIncluded = {},
                    favouriteStudiosIncluded = {},
                    genresIncluded = {},
                    tagsIncluded = {},
                    studiosIncluded = {};
                // Calculate Recommendation Scores and Update Iterative Filters
                let zgenres = [];
                for (let j = 0, jl = genres.length; j < jl; j++) {
                    let genre = genres[j];
                    if (typeof genre !== "string") continue;
                    if ((jsonIsEmpty(varScheme.includeGenres) || varScheme.includeGenres[genre] || varScheme.includeGenres.All) &&
                        !varScheme.excludeGenres[genre] &&
                        !varScheme.excludeGenres.All
                    ) {
                        const genreScore = varScheme.genres[genre]
                        if (
                            !favouriteGenresIncluded[genre] 
                            && !genresIncluded[genre]
                        ) {
                            let genreShownScore
                            if (contentFocused) {
                                genreShownScore = varScheme.originalGenres[genre]
                            } else {
                                genreShownScore = genreScore
                            }
                            if (typeof genreShownScore === "number") {
                                if (
                                    genresWithUpperCount?.[genre]
                                    || genresWithUpperScore?.[genre]
                                ) {
                                    // Top Similarities
                                    favouriteGenresIncluded[genre] = genreShownScore
                                } else {
                                    genresIncluded[genre] = genreShownScore
                                }
                            }
                        }
                        if (typeof genreScore === "number") {
                            zgenres.push({ genre, score: genreScore });    
                        }
                    }
                    // Filters
                    if (genre && mediaOptions.Genre[genre] === undefined) {
                        hasNewFilterOption = mediaOptions.Genre[genre] = true
                    }
                }
                let ztags = [];
                for (let j = 0, jl = tags.length; j < jl; j++) {
                    let tag = tags[j]?.name;
                    if (typeof tag !== "string") continue;
                    let tagCategory = tags[j]?.category;
                    if (typeof tagCategory !== "string") continue;
                    const tagRank = tags[j]?.rank;
                    if ((jsonIsEmpty(varScheme.includeCategories) || varScheme.includeCategories[tagCategory] || varScheme.includeCategories.All) &&
                        !varScheme.excludeCategories[tagCategory] &&
                        !varScheme.excludeCategories.All &&
                        //
                        (jsonIsEmpty(varScheme.includeTags) || varScheme.includeTags[tag] || varScheme.includeTags.All) &&
                        !varScheme.excludeTags[tag] &&
                        !varScheme.excludeTags.All
                    ) {
                        const tagScore = varScheme.tags[tag]
                        // Top Similarities
                        if (
                            !favouriteTagsIncluded[tag] 
                            && !tagsIncluded[tag]
                        ) {
                            let tagShownScore
                            if (contentFocused) {
                                tagShownScore = varScheme.originalTags[tag]
                            } else {
                                tagShownScore = tagScore
                            }
                            if (typeof tagShownScore === "number") {
                                if (tagsWithUpperScore?.[tag]) {
                                    favouriteTagsIncluded[tag] = tagShownScore
                                } else {
                                    tagsIncluded[tag] = tagShownScore
                                }
                            }
                        }
                        if (typeof tagScore === "number" && typeof tagRank === "number" && tagRank >= tagRankLimit) {
                            const tagWeight = tagRank * 0.01
                            ztags.push(varScheme.tags[tag] * tagWeight);
                        }
                    }
                    // Filters
                    if (tag && mediaOptions.Tag[tag] === undefined) {
                        hasNewFilterOption = mediaOptions.Tag[tag] = true
                    }
                    if (tagCategory && mediaOptions["Tag Category"][tagCategory] === undefined) {
                        hasNewFilterOption = mediaOptions["Tag Category"][tagCategory] = true
                    }
                }
                let includedStudios = {};
                for (let j = 0, jl = studios.length; j < jl; j++) {
                    let studio = studios[j]?.node?.name;
                    if (typeof studio !== "string") continue;
                    if (includedStudios[studio]) continue;
                    includedStudios[studio] = true;
                    const studioShownScore = varScheme.studios[studio]
                    if (!favouriteStudiosIncluded[studio] && !studiosIncluded[studio]) {
                        if (typeof studioShownScore === "number") {
                            if (studiosWithUpperScore?.[studio]) {
                                favouriteStudiosIncluded[studio] = studioShownScore
                            } else {
                                studiosIncluded[studio] = studioShownScore
                            }
                        }
                    }
                    // Filters
                    if (studio && mediaOptions.Studio[studio] === undefined) {
                        hasNewFilterOption = mediaOptions.Studio[studio] = true
                    }
                }
                // Include Linear Model Prediction from Earlier
                // Media Quality
                let mediaQuality = [];
                let yearModel = varScheme.yearModel ?? {};
                if (isAN(year) && !jsonIsEmpty(yearModel) && includeYear && yearModel?.slope > 0) {
                    let seasonYear = year;
                    if (typeof seasonYear === "string") {
                        seasonYear = parseFloat(seasonYear);
                    }
                    let modelScore = LRpredict(yearModel, seasonYear)
                    if (modelScore >= minScoreValue) {
                        mediaQuality.push(modelScore);
                    } else {
                        mediaQuality.push(minScoreValue)
                    }
                } else {
                    mediaQuality.push(minScoreValue)
                }
                let averageScore = media?.averageScore;
                let averageScoreModel = varScheme.averageScoreModel ?? {};
                if (isAN(averageScore) && !jsonIsEmpty(averageScoreModel) && includeAverageScore && averageScoreModel?.slope > 0) {
                    if (typeof averageScore === "string") {
                        averageScore = parseFloat(averageScore);
                    }
                    let modelScore = LRpredict(averageScoreModel, averageScore)
                    if (modelScore >= minScoreValue) {
                        mediaQuality.push(modelScore);
                    } else {
                        mediaQuality.push(minScoreValue)
                    }
                } else {
                    mediaQuality.push(minScoreValue)
                }
                let episodes = media?.episodes
                let duration = media?.duration

                // Combine Scores
                // Media Content
                let mediaContent = [];
                if (zgenres.length) {
                    let genreValues = zgenres.reduce((acc, _genre) => {
                        acc.push(_genre.score)
                        return acc
                    }, [])
                    if (zgenres.some((e) => !genresWithUpperCount[e.genre])) {
                        mediaContent.push(arrayMean(genreValues));
                    } else {
                        mediaContent.push(getMax(genreValues));
                    }
                } else {
                    mediaContent.push(minScoreValue)
                }
                if (ztags.length) {
                    mediaContent.push(arrayMean(ztags));
                } else {
                    mediaContent.push(minScoreValue)
                }

                // Calculate Recommendation Scores
                let finalMediaQuality =
                    mediaQuality.length
                        ? arrayMean(mediaQuality)
                        : minScoreValue
                let finalMediaContent =
                    mediaContent.length
                        ? arrayMean(mediaContent)
                        : minScoreValue
                let score = finalMediaContent * finalMediaQuality
                // Process other Media Info
                genres = genres.length ? genres : [];
                tags = tags.length ? tags.map((e) => { return { name: e?.name, rank: e?.rank } }) : [];
                studios = studios.reduce((result, e) => {
                    result[e?.node?.name] = e?.node?.siteUrl
                    return result
                }, {});
                // Calculate WeightedScore
                let weightedScore;
                // Low Average
                if (averageScore > 0) {
                    if (score > 0 && averageScore < averageScoreMode) {
                        let ASweight = averageScore / averageScoreMode;
                        weightedScore = score * ASweight
                    } else {
                        weightedScore = score
                    }
                }
                // Low Popularity
                let newScore = weightedScore !== score ? weightedScore : score
                let popularityThreshold
                if (format === "Manga" || format === "One Shot") {
                    popularityThreshold = popularityMode.manga
                } else if (
                    format === "TV" 
                    || format === "Movie"
                    || format === "ONA"
                    || format === "Special"
                    || format === "TV Short"
                    || format === "OVA"
                ) {
                    popularityThreshold = popularityMode.anime
                } else if (format === "Novel") {
                    popularityThreshold = popularityMode.novel
                } else {
                    popularityThreshold = maxPopularityMode
                }
                if (popularity > 0 && popularityThreshold > 0) {
                    if (newScore > 0 && popularity < popularityThreshold) {
                        let PSweight = popularity / popularityThreshold
                        weightedScore = score * PSweight
                    } else {
                        weightedScore = newScore
                    }
                }
                // Handle Score Exceptions
                if (!weightedScore || weightedScore <= 0 || !isFinite(weightedScore)) {
                    weightedScore = minScoreValue;
                }
                if (!score || score <= 0 || !isFinite(score)) {
                    score = minScoreValue;
                }
                if (score > maxScore) {
                    maxScore = score
                }
                if (score < minScore) {
                    minScore = score
                }
                if (weightedScore > maxWeightedScore) {
                    maxWeightedScore = weightedScore
                }
                if (weightedScore < minWeightedScore) {
                    minWeightedScore = weightedScore
                }
                // Handle Media Release Dates
                if (
                    typeof media?.nextAiringEpisode?.episode === "number"
                    && !isNaN(media.nextAiringEpisode.episode)
                    && typeof media.nextAiringEpisode.airingAt === "number"
                    && !isNaN(media.nextAiringEpisode.airingAt)
                ) {
                    let airingAt = media.nextAiringEpisode.airingAt
                    // Refresh List on Media Release
                    let airingAtDate = new Date(airingAt * 1000)
                    let currentDate = new Date()
                    if (airingAtDate <= currentDate) {
                        // List on Media Completion
                        if (media.nextAiringEpisode.episode === episodes) {
                            media.nextAiringEpisode = null
                            status = "Finished"
                        }
                    } else if (airingAtDate > currentDate) {
                        self.postMessage({
                            mediaReleaseAiringAt: media.nextAiringEpisode.airingAt
                        })
                    }
                    // Add Media Release Notification
                    if (isJsonObject(media.nextAiringEpisode)) {
                        let _releaseDateMillis = airingAt * 1000
                        if ((
                            userStatus !== "Unseen" ||
                            weightedScore > minScoreValue
                        ) &&
                            typeof _releaseDateMillis === "number" &&
                            _releaseDateMillis >= (new Date().getTime() - dayInMillis)) {
                            let _title = media.title?.english || media.title?.romaji || media.title?.native;
                            let _releaseEpisode = media.nextAiringEpisode.episode;
                            let _imageURL = media.coverImage?.large || ""
                            let _episodeProgress = userEntriesStatus?.[mediaID]?.episodeProgress || 0
                            self.postMessage({
                                mediaReleaseNotification: {
                                    id: mediaID,
                                    title: typeof _title === "string" ? _title : "",
                                    releaseEpisode: _releaseEpisode,
                                    maxEpisode: typeof episodes === "number" ? episodes : -1,
                                    releaseDateMillis: _releaseDateMillis,
                                    userStatus: typeof userStatus === "string" ? userStatus : "Unseen",
                                    imageURL: typeof _imageURL === "string" ? _imageURL : "",
                                    mediaUrl: typeof mediaUrl === "string" ? mediaUrl : "",
                                    episodeProgress: typeof _episodeProgress === "number" ? _episodeProgress : 0
                                }
                            })
                        }
                    }
                } else if (jsonIsEmpty(media.nextAiringEpisode) && !(status === "Finished" || status === "Cancelled") && year) {
                    let { month, day } = media.startDate || {}
                    if (parseInt(month) > 0) { month = parseInt(month) - 1 }
                    let possibleAiringDate = getJapaneseStartDate({ season, year, month, day })
                    if (possibleAiringDate && possibleAiringDate > new Date()) {
                        media.nextAiringEpisode = {
                            airingAt: Math.floor(possibleAiringDate.getTime() / 1000),
                            estimated: true
                        }
                    }
                }
                // Sort All Top Similarities
                const favoriteContents = {
                    genres: favouriteGenresIncluded,
                    tags: favouriteTagsIncluded,
                    studios: favouriteStudiosIncluded
                }
                const otherContents = {
                    genres: genresIncluded,
                    tags: tagsIncluded,
                    studios: studiosIncluded
                }
                // Add To Processed Recommendation List
                recommendedMediaListArray.push({
                    id: mediaID,
                    title: media?.title,
                    mediaUrl,
                    userScore: userEntriesStatus?.[mediaID]?.userScore,
                    mediaRelations: media?.relations?.edges,
                    averageScore,
                    popularity,
                    trending: media?.trending,
                    favorites: media?.favourites,
                    score,
                    weightedScore,
                    favoriteContents,
                    otherContents,
                    userStatus,
                    status,
                    // Others
                    description: media?.description,
                    genres,
                    tags,
                    dateAdded: media?.dateAdded,
                    dateEdited: media?.dateEdited,
                    startDate: media?.startDate,
                    year,
                    season,
                    format,
                    studios,
                    episodes,
                    episodeProgress: userEntriesStatus?.[mediaID]?.episodeProgress,
                    volumeProgress: userEntriesStatus?.[mediaID]?.volumeProgress,
                    duration,
                    chapters: media?.chapters,
                    volumes: media?.volumes,
                    countryOfOrigin,
                    coverImageUrl: media?.coverImage?.large,
                    trailerID: media?.trailer?.id,
                    bannerImageUrl: media?.bannerImage,
                    trailerThumbnailUrl: media?.trailer?.thumbnail,
                    nextAiringEpisode: media?.nextAiringEpisode
                });
            }
        } else {
            let { standardDeviation, mean } = arrayMeanAndSTD(averageScoresArray)
            if (
                customUserScoreBase > 0
                && averageScoresArray?.length > 0
            ) {
                const averageScoreBase = maxAverageScore <= 3
                    ? 3
                    : maxAverageScore <= 5
                        ? 5
                        : maxAverageScore <= 10
                            ? 10
                            : 100;
                if (customUserScoreBase !== averageScoreBase) {
                    standardDeviation = mapValueDirect(
                        standardDeviation,
                        averageScoreBase,
                        customUserScoreBase
                    )
                    mean = mapValueDirect(
                        mean,
                        averageScoreBase,
                        customUserScoreBase
                    )
                }
                usedScoreBasis = customUserScoreBase
            } else {
                usedScoreBasis = userScoreBase
            }
            newHighestRange = Math.min(
                Math.max(
                    usedScoreBasis - standardDeviation,
                    mean + standardDeviation
                ),
                usedScoreBasis
            )
            newLowestRange = Math.max(
                Math.min(
                    standardDeviation,
                    mean - standardDeviation,
                ),
                minScoreValue,
            )

            for (let i = 0, l = mediaEntriesArray.length; i < l; i++) {

                loadProgress((i / l) * 100)

                let media = mediaEntriesArray[i];
                let mediaID = media?.id;
                let mediaUrl = media?.siteUrl;
                let format = capitalizeWords(media?.format);
                let countryOfOrigin = media?.countryOfOrigin;
                let year = media?.seasonYear || media?.startDate?.year || media?.endDate?.year
                let season = capitalizeWords(media?.season);
                let genres = media?.genres || [];
                let tags = media?.tags || [];
                let studios = media?.studios?.edges?.filter?.((e) => e?.isMain) || []
                // let staffs = media?.staff?.edges || [];
                let status = capitalizeWords(media?.status);
                let episodes = media?.episodes
                let duration = media?.duration
                if (typeof status === "string" && status) {
                    if (mediaOptions["Release Status"][status] === undefined) {
                        hasNewFilterOption = mediaOptions["Release Status"][status] = true
                    }
                }
                if (typeof format === "string" && format) {
                    if (mediaOptions.Format[format] === undefined) {
                        hasNewFilterOption = mediaOptions.Format[format] = true
                    }
                }
                if (typeof countryOfOrigin === "string" && countryOfOrigin) {
                    if (mediaOptions["Country Of Origin"][countryOfOrigin] === undefined) {
                        hasNewFilterOption = mediaOptions["Country Of Origin"][countryOfOrigin] = true
                    }
                }
                if (isAN(year)) {
                    let yearStr = year?.toString?.()
                    if (typeof yearStr === "string" && yearStr && mediaOptions.Year[yearStr] === undefined) {
                        hasNewFilterOption = mediaOptions.Year[yearStr] = true
                    }
                }
                // Arrange
                for (let j = 0, jl = genres.length; j < jl; j++) {
                    let genre = genres[j];
                    if (typeof genre !== "string") continue;
                    if (genre && mediaOptions.Genre[genre] === undefined) {
                        hasNewFilterOption = mediaOptions.Genre[genre] = true
                    }
                }
                for (let j = 0, jl = tags.length; j < jl; j++) {
                    let tag = tags[j]?.name;
                    if (typeof tag !== "string") continue;
                    if (tag && mediaOptions.Tag[tag] === undefined) {
                        hasNewFilterOption = mediaOptions.Tag[tag] = true
                    }
                    let tagCategory = tags[j]?.category;
                    if (typeof tagCategory !== "string") continue;
                    if (tagCategory && mediaOptions["Tag Category"][tagCategory] === undefined) {
                        hasNewFilterOption = mediaOptions["Tag Category"][tagCategory] = true
                    }
                }
                for (let j = 0, jl = studios.length; j < jl; j++) {
                    let studio = studios[j]?.node?.name
                    if (typeof studio !== "string") continue
                    if (studio && mediaOptions.Studio[studio] === undefined) {
                        hasNewFilterOption = mediaOptions.Studio[studio] = true
                    }
                }
                let score = minScoreValue
                let averageScore = media?.averageScore;
                if (isAN(averageScore)) {
                    if (typeof averageScore === "string") {
                        averageScore = parseFloat(averageScore);
                    }
                }
                let favourites = media?.favourites;
                if (isAN(favourites)) {
                    if (typeof favourites === "string") {
                        favourites = parseFloat(favourites);
                    }
                }
                let popularity = media?.popularity;
                if (isAN(popularity)) {
                    if (typeof popularity === "string") {
                        popularity = parseFloat(popularity);
                    }
                }
                if (
                    averageScore > 0 &&
                    favourites > 0 &&
                    popularity > 0 &&
                    isAN(averageScore) &&
                    isAN(favourites) &&
                    isAN(popularity)
                ) {
                    let favPopRatio = Math.min(favourites, popularity) / popularity;
                    score = favPopRatio * averageScore;
                }
                // Other Media Recommendation Info
                genres = genres.length ? genres : [];
                tags = tags.length ? tags.map((e) => { return { name: e?.name, rank: e?.rank } }) : [];
                studios = studios.reduce((result, e) => {
                    result[e?.node?.name] = e?.node?.siteUrl
                    return result
                }, {});
                // Calculate WeightedScore
                let weightedScore;
                // Low Average
                if (averageScore > 0) {
                    if (score > 0 && averageScore < averageScoreMode) {
                        let ASweight = averageScore / averageScoreMode;
                        weightedScore = score * ASweight
                    } else {
                        weightedScore = score
                    }
                }
                // Low Popularity
                let newScore = weightedScore !== score ? weightedScore : score
                if (format === "Manga" || format === "One Shot") {
                    popularityThreshold = popularityMode.manga
                } else if (
                    format === "TV" 
                    || format === "Movie"
                    || format === "ONA"
                    || format === "Special"
                    || format === "TV Short"
                    || format === "OVA"
                ) {
                    popularityThreshold = popularityMode.anime
                } else if (format === "Novel") {
                    popularityThreshold = popularityMode.novel
                } else {
                    popularityThreshold = maxPopularityMode
                }
                if (popularity > 0 && popularityThreshold > 0) {
                    if (newScore > 0 && popularity < popularityThreshold) {
                        let PSweight = popularity / popularityThreshold
                        weightedScore = score * PSweight
                    } else {
                        weightedScore = newScore
                    }
                }
                // Handle Score Exceptions
                if (!weightedScore || weightedScore <= 0 || !isFinite(weightedScore)) {
                    weightedScore = minScoreValue;
                }
                if (!score || score <= 0 || !isFinite(score)) {
                    score = minScoreValue;
                }
                if (score > maxScore) {
                    maxScore = score
                }
                if (score < minScore) {
                    minScore = score
                }
                if (weightedScore > maxWeightedScore) {
                    maxWeightedScore = weightedScore
                }
                if (weightedScore < minWeightedScore) {
                    minWeightedScore = weightedScore
                }
                // Handle Media Release Dates
                if (
                    typeof media?.nextAiringEpisode?.episode === "number"
                    && !isNaN(media.nextAiringEpisode.episode)
                    && typeof media.nextAiringEpisode.airingAt === "number"
                    && !isNaN(media.nextAiringEpisode.airingAt)
                ) {
                    let airingAt = media.nextAiringEpisode.airingAt
                    // Refresh List on Media Release
                    let airingAtDate = new Date(airingAt * 1000)
                    let currentDate = new Date()
                    if (airingAtDate <= currentDate) {
                        // List on Media Completion
                        if (media.nextAiringEpisode.episode === episodes) {
                            media.nextAiringEpisode = null
                            status = "Finished"
                        }
                    } else if (airingAtDate > currentDate) {
                        self.postMessage({
                            mediaReleaseAiringAt: media.nextAiringEpisode.airingAt
                        })
                    }
                    // Add Media Release Notification
                    if (isJsonObject(media.nextAiringEpisode)) {
                        let _releaseDateMillis = airingAt * 1000
                        if (
                            weightedScore > minScoreValue &&
                            typeof _releaseDateMillis === "number" &&
                            _releaseDateMillis >= (new Date().getTime() - dayInMillis)) {
                            let _title = media.title?.english || media.title?.romaji || media.title?.native;
                            let _releaseEpisode = media.nextAiringEpisode.episode;
                            let _imageURL = media.coverImage?.large || ""
                            self.postMessage({
                                mediaReleaseNotification: {
                                    id: mediaID,
                                    title: typeof _title === "string" ? _title : "",
                                    releaseEpisode: _releaseEpisode,
                                    maxEpisode: typeof episodes === "number" ? episodes : -1,
                                    releaseDateMillis: _releaseDateMillis,
                                    userStatus: "Unseen",
                                    imageURL: typeof _imageURL === "string" ? _imageURL : "",
                                    mediaUrl: typeof mediaUrl === "string" ? mediaUrl : "",
                                    episodeProgress: 0
                                }
                            })
                        }
                    }
                } else if (jsonIsEmpty(media.nextAiringEpisode) && !(status === "Finished" || status === "Cancelled") && year) {
                    let { month, day } = media.startDate || {}
                    if (parseInt(month) > 0) { month = parseInt(month) - 1 }
                    let possibleAiringDate = getJapaneseStartDate({ season, year, month, day })
                    if (possibleAiringDate && possibleAiringDate > new Date()) {
                        media.nextAiringEpisode = {
                            airingAt: Math.floor(possibleAiringDate.getTime() / 1000),
                            estimated: true
                        }
                    }
                }
                recommendedMediaListArray.push({
                    id: mediaID,
                    title: media?.title,
                    mediaUrl,
                    mediaRelations: media?.relations?.edges,
                    averageScore,
                    popularity,
                    trending: media?.trending,
                    favorites: media?.favourites,
                    score,
                    weightedScore,
                    userStatus: "Unseen",
                    status,
                    // Others
                    description: media?.description,
                    genres,
                    tags,
                    dateAdded: media?.dateAdded,
                    dateEdited: media?.dateEdited,
                    startDate: media?.startDate,
                    year,
                    season,
                    format,
                    studios,
                    episodes,
                    duration,
                    chapters: media?.chapters,
                    volumes: media?.volumes,
                    countryOfOrigin,
                    coverImageUrl: media?.coverImage?.large,
                    trailerID: media?.trailer?.id,
                    bannerImageUrl: media?.bannerImage,
                    trailerThumbnailUrl: media?.trailer?.thumbnail,
                    nextAiringEpisode: media?.nextAiringEpisode
                });
            }
        }
        // After Loop
        let userMediaWeightedScores = [], userMediaUserScores = []
        let userScoresMedia = [], scoresArray = [], scoreAboveMeanArray = []
        // Map Value to Score Basis
        recommendedMediaListArray = recommendedMediaListArray.map((media) => {
            // if lowest range is less than 0
            media.score = mapValue(media.score, minScore, maxScore, newLowestRange, newHighestRange)
            media.weightedScore = mapValue(media.weightedScore, minWeightedScore, maxWeightedScore, newLowestRange, newHighestRange)
            
            if (isJsonObject(media.favoriteContents) && !jsonIsEmpty(media.favoriteContents)) {
                const { genres, tags, studios } = media.favoriteContents
                for (const genre in genres) {
                    media.favoriteContents.genres[genre] = mapValue(genres[genre], minOthersScore.genres, maxOthersScore.genres, newLowestRange, newHighestRange)
                }
                for (const tag in tags) {
                    media.favoriteContents.tags[tag] = mapValue(tags[tag], minOthersScore.tags, maxOthersScore.tags, newLowestRange, newHighestRange)
                }
                if (customUserScoreBase > 0 && customUserScoreBase !== userScoreBase) {
                    for (const studio in studios) {
                        media.favoriteContents.studios[studio] = mapValueDirect(studios[studio], userScoreBase, customUserScoreBase)
                    }
                }
            }

            if (isJsonObject(media.otherContents) && !jsonIsEmpty(media.otherContents)) {
                const { genres, tags, studios } = media.otherContents
                for (const genre in genres) {
                    media.otherContents.genres[genre] = mapValue(genres[genre], minOthersScore.genres, maxOthersScore.genres, newLowestRange, newHighestRange)
                }
                for (const tag in tags) {
                    media.otherContents.tags[tag] = mapValue(tags[tag], minOthersScore.tags, maxOthersScore.tags, newLowestRange, newHighestRange)
                }
                if (customUserScoreBase > 0 && customUserScoreBase !== userScoreBase) {
                    for (const studio in studios) {
                        media.otherContents.studios[studio] = mapValueDirect(studios[studio], userScoreBase, customUserScoreBase)
                    }
                }
            }

            if (media.userScore != null && media.userScore > 0) {
                if (media.userScore > meanUserScore) {
                    scoreAboveMeanArray.push(media.score)
                }
                userScoresMedia.push(media)
                if (media.userScore > (customUserScoreBase === 0 ? 1 : 0)) {
                    userMediaWeightedScores.push(media.weightedScore)
                    userMediaUserScores.push(mapValue(media.userScore, minUserScore, userScoreBase, newLowestRange, newHighestRange))
                }
            }
            scoresArray.push(media.score)
            return media
        })
        // Get Mean Scores
        if (scoresArray.length) {
            meanScoreAll = arrayMean(scoresArray)
        }
        if (scoreAboveMeanArray.length) {
            meanScoreAbove = arrayMean(scoreAboveMeanArray)
        }
        // Update List
        const recommendedMediaList = {}
        for (let i = 0, l = recommendedMediaListArray.length; i < l; i++) {
            const media = recommendedMediaListArray[i]
            if (media.score > meanScoreAbove) {
                media.recommendationCode = 2
            } else if (media.score > meanScoreAll) {
                media.recommendationCode = 1
            } else {
                media.recommendationCode = 0
            }
            const mediaID = media.id
            recommendedMediaList[mediaID] = media
        }
        // Save Processed Recommendation List and other Data
        const collectionToPut = {
            recommendedMediaList,
            mediaOptions,
            shouldLoadMedia: true,
            shouldProcessRecommendation: false,
        }
        if (hasNewAlgorithmFilter) {
            collectionToPut.algorithmFilters = algorithmFilters
        }
        const recListMAPE = calculateError(userMediaUserScores, userMediaWeightedScores, minUserScore, usedScoreBasis)
        if (recListMAPE != null) {
            collectionToPut.recListMAPE = recListMAPE
            self.postMessage({ recListMAPE })
        }
        await saveJSONCollection(collectionToPut)
        self.postMessage({ status: null })
        self.postMessage({ progress: 100 })
        self.postMessage({
            message: "success",
            passedAlgorithmFilterId: data?.passedAlgorithmFilterId,
            hasNewFilterOption
        })
    } catch (reason) {
        console.error(reason)
        let error = reason?.stack || reason?.message
        if (typeof error !== "string" || !error) {
            error = "Something went wrong"
        }
        self.postMessage({ error })
    }
}
function jsonIsEmpty(obj) {
    for (const key in obj) {
        return false;
    }
    return true;
}
function isAN(num) {
    if (!num && num !== 0) { return false }
    else if (typeof num === "boolean") { return false }
    else if (typeof num === "string" && !num) { return false }
    return !isNaN(num)
}
function isJson(j) {
    try { return (j?.constructor.name === "Object" && `${j}` === "[object Object]") }
    catch (e) { return false }
}
function mapValue(originalValue, lowestValue, highestValue, newLowestRange, newHighestRange) {
    let mappedValue = ((originalValue - lowestValue) * (newHighestRange - newLowestRange) / (highestValue - lowestValue)) + newLowestRange;
    return mappedValue;
}
function mapValueDirect(originalValue, highestValue, newHighestRange) {
    return (originalValue / highestValue) * newHighestRange;
}
function arrayMeanAndSTD(obj) {
    if (obj.length === 0) return 0;
    const mean = arrayMean(obj)
    const standardDeviation = Math.sqrt(obj.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / obj.length)
    return {
        mean,
        standardDeviation: standardDeviation >= 0 ? standardDeviation : 0
    }
}
function arrayMean(obj) {
    return (arraySum(obj) / obj.length) || 0
}
function arraySum(obj) {
    return obj.reduce((a, b) => a + b, 0)
}
function arrayMedian(arr) {
    const sortedArr = arr.slice().sort((a, b) => a - b);
    const n = sortedArr.length;
    if (n % 2 === 0) {
        const middleRight = n / 2;
        const middleLeft = middleRight - 1;
        return (sortedArr[middleLeft] + sortedArr[middleRight]) / 2;
    } else {
        const middle = Math.floor(n / 2);
        return sortedArr[middle];
    }
}
function arrayMode(arr) {
    if (!(arr instanceof Array) || arr.length === 0) return undefined;
    if (arr.length === 1) return arr[0];
    if (arr.length === 2) return (arr[0] + arr[1]) / 2;

    const max = getMax(arr);
    const min = getMin(arr);
    
    if (max === min) return max;

    const classWidth = (max - min) / (1 + 3.322 * Math.log(arr.length));
    if (classWidth < minNumber) return (max + min) / 2;

    const classes = [];
    for (let low = min; low < max; low += classWidth) {
        classes.push({ low, high: low + classWidth, freq: 0 });
    }

    arr.forEach(num => {
        const classIndex = classes.findIndex(c => num >= c.low && num < c.high);
        if (classIndex !== -1) classes[classIndex].freq++;
    });

    const modeClass = classes.reduce((max, c) => c.freq > max.freq ? c : max);
    const modeIndex = classes.indexOf(modeClass);
    const prevFreq = modeIndex > 0 ? classes[modeIndex - 1].freq : 0;
    const nextFreq = modeIndex < classes.length - 1 ? classes[modeIndex + 1].freq : 0;

    const modeAdjustment = (modeClass.freq - prevFreq) / (2 * modeClass.freq - prevFreq - nextFreq);
    return modeClass.low + modeAdjustment * classWidth;
}
function arrayProbability(obj) {
    if (!obj?.length) return 0;
    return obj.reduce((a, b) => a * b, 1);
}
function getMax(arr) {
    let len = arr.length;
    let max = -Infinity; 
    while (len--) {
        max = arr[len] > max ? arr[len] : max;
    }
    return max;
}
function getMin(arr) {
    let len = arr.length;
    let min = Infinity;
    while (len--) {
        min = arr[len] < min ? arr[len] : min;
    }
    return min;
}
function linearRegression(XY) {
    let lr = {};
    let n = XY.length;
    let sum_x = 0;
    let sum_y = 0;
    let sum_xy = 0;
    let sum_xx = 0;
    let sum_yy = 0;
    for (let i = 0, l = XY.length; i < l; i++) {
        sum_x += XY[i][0];
        sum_y += XY[i][1];
        sum_xy += (XY[i][0] * XY[i][1]);
        sum_xx += (XY[i][0] * XY[i][0]);
        sum_yy += (XY[i][1] * XY[i][1]);
    }
    lr["slope"] = (n * sum_xy - sum_x * sum_y) / (n * sum_xx - sum_x * sum_x);
    lr["intercept"] = (sum_y - lr.slope * sum_x) / n;
    lr["r2"] = Math.pow((n * sum_xy - sum_x * sum_y) / Math.sqrt((n * sum_xx - sum_x * sum_x) * (n * sum_yy - sum_y * sum_y)), 2);
    return lr;
}
function LRpredict(modelObj, x) {
    if (!modelObj) return null;
    if (!modelObj.slope || !modelObj.intercept) return null;
    if (isNaN(modelObj.slope) || isNaN(modelObj.intercept)) return null;
    return parseFloat(modelObj.slope) * x + parseFloat(modelObj.intercept);
}
function LRpredictInverse(modelObj, y) {
    if (!modelObj) return null;
    if (!modelObj.slope || !modelObj.intercept) return null;
    if (isNaN(modelObj.slope) || isNaN(modelObj.intercept)) return null;
    if (parseFloat(modelObj.slope) === 0) return null;
    return (parseFloat(y) - parseFloat(modelObj.intercept)) / parseFloat(modelObj.slope);
}
function calculateError(actual, predicted, minval, maxval) {
    const range = maxval - minval;
    let totalError = 0;
    for (let i = 0; i < actual?.length; i++) {
        totalError += Math.abs(actual[i] - predicted[i]) / range;
    }
    const error = totalError / actual?.length
    return error >= 0 ? error * 100 : null;
}
function isJsonObject(obj) {
    return Object.prototype.toString.call(obj) === "[object Object]"
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
function getJapaneseStartDate({ season, year, month, day }) {
    if (parseInt(year) >= 0) {
        if (parseInt(month) >= 0) {
            return new Date(parseInt(year), parseInt(month), parseInt(day || 1) || 1)
        }
        const seasonKey = season?.trim()
        if (typeof seasonKey === "string" 
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
function capitalizeWords(str) {
    if (typeof str !== "string") return
    return str.toLowerCase()
        .replace(/_/g, " ")
        .replace(/\b\w/g, char => char.toUpperCase())
        .replace(/\b(tv|ova|ona)\b/gi, match => match.toUpperCase());
}
let startPost = performance.now();
function loadProgress(progress) {
    let endPost = performance.now();
    if (endPost - startPost > 17) {
        self.postMessage({ progress })
        startPost = endPost
    }
}