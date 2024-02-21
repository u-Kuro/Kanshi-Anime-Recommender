let db,
    userList,
    recommendedAnimeList,
    loadAnimeTimeout = {};
const hasOwnProperty = Object.prototype.hasOwnProperty
self.onmessage = async ({ data }) => {
    let postId = data.postId

    try {
        if (!db) await IDBinit()

        let updateRecommendedAnimeList,
            updateUserList
        if (!isJsonObject(userList) || jsonIsEmpty(userList)) {
            userList = await retrieveJSON("userList") || getDefaultUserList()
            updateUserList = true
        }

        if (data?.updateRecommendedAnimeList != null || recommendedAnimeList == null) {
            recommendedAnimeList = await retrieveJSON("recommendedAnimeList")
            updateRecommendedAnimeList = true
        }

        if (hasOwnProperty.call(data, "selectCategory")) {

            let selectedCategory = data?.selectCategory

            if (userList != null && selectedCategory != null) {
                let categories = userList?.categories
                let category = categories?.[selectedCategory]

                if (category == null) {
                    self.postMessage({ postId })
                    return
                }

                userList.selectedCategory = selectedCategory

                saveJSON(userList, "userList").then(() => {
                    self.postMessage({ postId })
                })

            } else {
                self.postMessage({ postId })
            }
        } else if (hasOwnProperty.call(data, "updateAnimeFilter")) {

            self.postMessage({ status: "Updating Anime Lists" })

            let selectedCategory = data?.selectedCategory
            let newAnimeFilters = data?.animeFilters
            let newSortBy = data?.sortBy

            if (recommendedAnimeList != null
                && userList != null
                && selectedCategory != null
                && (newAnimeFilters != null || newSortBy != null)
            ) {
                let categories = userList?.categories
                let category = categories?.[selectedCategory]

                if (category == null) {
                    self.postMessage({ progress: 95 })
                    self.postMessage({ postId })
                    return
                }

                let animeFilters = data?.animeFilters || category.animeFilters
                let sortBy = data?.sortBy || category.sortBy

                let newCategory = updateAnimeList(
                    animeFilters,
                    sortBy,
                    Object.values(recommendedAnimeList),
                    userList.hiddenEntries
                )

                category.isHiddenList = newCategory.isHiddenList
                category.shownSortName = newCategory.shownSortName
                category.sortBy = newCategory.sortBy
                category.animeFilters = newCategory.animeFilters
                category.animeList = newCategory.animeList

                userList.categories[selectedCategory] = category

                self.postMessage({ progress: 85 })

                saveJSON(userList, "userList").then(() => {
                    self.postMessage({ progress: 95 })
                    self.postMessage({
                        updateUserList: true,
                        postId,
                    })
                })
            } else {
                self.postMessage({ progress: 95 })
                self.postMessage({ postId })
            }

        } else if (hasOwnProperty.call(data, "removeId")) {

            self.postMessage({ status: "Updating Anime Lists" })

            let removedId = data?.removeId
            let isHiding = data?.isHiding
            if (recommendedAnimeList != null
                && userList != null
                && removedId != null
                && (isHiding != null || removedId === "all")
            ) {
                if (removedId === "all") {
                    userList.hiddenEntries = {}
                    isHiding = false
                } else if (isHiding) {
                    userList.hiddenEntries[removedId] = 1
                } else {
                    delete userList?.hiddenEntries?.[removedId]
                }

                let recommendedAnimeListArray = Object.values(recommendedAnimeList)
                let hiddenEntries = userList.hiddenEntries

                let categories = userList?.categories

                let categoriesCount = Object.keys(categories || {}).length
                let loadedCount = 0

                let selectedCategory = data?.selectedCategory

                if (categories?.[selectedCategory] != null) {
                    let category = categories[selectedCategory]
                    let isHiddenList = category?.isHiddenList
                    let animeList = category?.animeList
                    ++loadedCount
                    let loadedPercent = Math.min(1, loadedCount / categoriesCount)
                    let idx
                    if (isHiding !== isHiddenList) {
                        if (removedId === "all") {
                            category.animeList = []
                        } else {
                            category.animeList = animeList.filter((id, i) => {
                                if (id === removedId) {
                                    idx = i
                                    return false
                                }
                                return true
                            })
                        }
                        userList.categories[selectedCategory] = category

                        self.postMessage({ progress: loadedPercent * 80 })

                    } else {
                        let { animeFilters, sortBy } = category

                        let newCategory = updateAnimeList(animeFilters, sortBy, recommendedAnimeListArray, hiddenEntries, loadedPercent)
                        category.animeFilters = newCategory.animeFilters
                        category.isHiddenList = newCategory.isHiddenList
                        category.shownSortName = newCategory.shownSortName
                        category.sortBy = newCategory.sortBy
                        category.animeList = newCategory.animeList

                        userList.categories[selectedCategory] = category
                    }
                    self.postMessage({
                        removedIdx: idx,
                        postId,
                    })
                }

                for (let categoryKey in categories) {
                    if (categoryKey === selectedCategory) continue

                    ++loadedCount
                    let loadedPercent = Math.min(1, loadedCount / categoriesCount)

                    let category = categories[categoryKey]
                    let isHiddenList = category?.isHiddenList
                    let animeList = category?.animeList
                    if (isHiding !== isHiddenList) {
                        if (removedId === "all") {
                            category.animeList = []
                        } else {
                            category.animeList = animeList.filter((id) => id !== removedId)
                        }
                        userList.categories[categoryKey] = category

                        self.postMessage({ progress: loadedPercent * 80 })
                    } else {
                        let { animeFilters, sortBy } = category

                        let newCategory = updateAnimeList(animeFilters, sortBy, recommendedAnimeListArray, hiddenEntries, loadedPercent)

                        category.animeFilters = newCategory.animeFilters
                        category.isHiddenList = newCategory.isHiddenList
                        category.shownSortName = newCategory.shownSortName
                        category.sortBy = newCategory.sortBy
                        category.animeList = newCategory.animeList

                        userList.categories[categoryKey] = category
                    }
                }

                self.postMessage({ progress: 85 })

                saveJSON(userList, "userList").then(() => {
                    self.postMessage({ progress: 95 })
                    self.postMessage({
                        updateUserList: true,
                        postId,
                    })
                })
            } else {
                self.postMessage({ progress: 95 })
                self.postMessage({ postId })
            }

        } else if (hasOwnProperty.call(data, "addedCategoryKey")) {

            self.postMessage({ status: "Updating Category" })
            self.postMessage({ progress: 30 })

            let addedCategoryKey = data?.addedCategoryKey

            if (userList != null && addedCategoryKey != null) {
                let copiedCategoryKey = data?.copiedCategoryKey
                let categories = userList?.categories

                let category = categories?.[copiedCategoryKey]

                if (category == null) {
                    self.postMessage({ progress: 95 })
                    self.postMessage({ postId })
                    return
                }

                category = JSON.parse(JSON.stringify(category))

                userList.categories[addedCategoryKey] = category

                self.postMessage({ progress: 85 })

                saveJSON(userList, "userList").then(() => {
                    self.postMessage({ progress: 95 })
                    self.postMessage({
                        updateUserList: true,
                        updateCategories: true,
                        selectThisCategory: addedCategoryKey,
                        postId,
                    })
                })
            } else {
                self.postMessage({ progress: 95 })
                self.postMessage({ postId })
            }

        } else if (hasOwnProperty.call(data, "renamedCategoryKey")) {

            self.postMessage({ status: "Updating Category" })
            self.postMessage({ progress: 30 })

            let renamedCategoryKey = data?.renamedCategoryKey

            if (userList != null && renamedCategoryKey != null) {
                let replacedCategoryKey = data?.replacedCategoryKey
                let categories = userList?.categories

                let category = categories?.[replacedCategoryKey]

                if (category == null) {
                    self.postMessage({ progress: 95 })
                    self.postMessage({ postId })
                    return
                }

                category = JSON.parse(JSON.stringify(category))

                userList.categories[renamedCategoryKey] = category

                delete userList?.categories?.[replacedCategoryKey]

                self.postMessage({ progress: 85 })

                saveJSON(userList, "userList").then(() => {
                    self.postMessage({ progress: 95 })
                    self.postMessage({
                        updateUserList: true,
                        updateCategories: true,
                        selectThisCategory: renamedCategoryKey,
                        postId,
                    })
                })
            } else {
                self.postMessage({ progress: 95 })
                self.postMessage({ postId })
            }

        } else if (hasOwnProperty.call(data, "deletedCategoryKey")) {

            self.postMessage({ status: "Updating Category" })
            self.postMessage({ progress: 30 })

            let deletedCategoryKey = data?.deletedCategoryKey

            if (userList != null && deletedCategoryKey != null) {
                delete userList?.categories?.[deletedCategoryKey]

                self.postMessage({ progress: 85 })

                saveJSON(userList, "userList").then(() => {
                    self.postMessage({ progress: 95 })
                    self.postMessage({
                        updateUserList: true,
                        updateCategories: true,
                        postId,
                    })
                })
            } else {
                self.postMessage({ progress: 95 })
                self.postMessage({ postId })
            }

        } else if (hasOwnProperty.call(data, "updateAnimeCautions")) {

            self.postMessage({ status: "Updating Anime Lists" })
            self.postMessage({ progress: 30 })

            let animeCautions = data?.animeCautions
            if (animeCautions != null) {

                self.postMessage({ progress: 85 })

                saveJSON(animeCautions, "animeCautions").then(() => {
                    self.postMessage({ progress: 95 })
                    self.postMessage({
                        updateUserList: true,
                        updateAnimeCautions: true,
                        postId,
                    })
                })
            } else {
                self.postMessage({ progress: 95 })
                self.postMessage({ postId })
            }

        } else {

            if (recommendedAnimeList != null && userList != null) {

                self.postMessage({ status: "Updating Anime Lists" })

                let categories = userList?.categories || {}
                let categoriesCount = Object.keys(categories || {}).length
                let loadedCount = 0

                let recommendedAnimeListArray = Object.values(recommendedAnimeList || {})
                let hiddenEntries = userList.hiddenEntries

                for (let categoryKey in categories) {
                    let category = categories?.[categoryKey] || {}

                    ++loadedCount
                    let loadedPercent = Math.min(1, loadedCount / categoriesCount)

                    if (category == null) continue

                    let { animeFilters, sortBy } = category

                    let newCategory = updateAnimeList(animeFilters, sortBy, recommendedAnimeListArray, hiddenEntries, loadedPercent)

                    category.animeFilters = newCategory.animeFilters
                    category.isHiddenList = newCategory.isHiddenList
                    category.shownSortName = newCategory.shownSortName
                    category.sortBy = newCategory.sortBy
                    category.animeList = newCategory.animeList

                    userList.categories[categoryKey] = category
                }

                self.postMessage({ progress: 85 })

                await saveJSON(userList, "userList").then(async () => {
                    await saveJSON(false, "shouldLoadAnime")
                    self.postMessage({ progress: 95 })
                    self.postMessage({
                        updateUserList,
                        updateRecommendedAnimeList,
                        postId,
                    })
                })
            } else {
                self.postMessage({ progress: 95 })
                self.postMessage({ postId })
            }
        }
    } catch (e) {
        console.error(e)
        self.postMessage({
            error: true,
            postId,
        })
    }
};
function updateAnimeList(animeFilters, sortBy, recommendedAnimeListArray, hiddenEntries, loadedPercent = 1) {
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
            popularity: null,
            year: null,
        },
        shownAnime = {
            include: {},
            exclude: {}
        },
        shownSortName

    let showHiddenList = false,
        hideMyAnime = false,
        hideWatched = false,
        showMyAnime = false,
        showAiring = false,
        showAllSequels = false,
        showUserUnwatchedSequel = false;

    for (let i = 0, l = animeFilters?.length; i < l; i++) {
        let {
            status,
            filterType,
            optionName,
            optionCategory,
            optionValue,
            CMPOperator,
            CMPNumber
        } = animeFilters[i] || {}
        if (status === "included") {
            if (filterType === 'selection') {
                if (optionCategory === 'shown score') {
                    shownSortName = optionName.toLowerCase()
                } else if (optionCategory === 'flexible inclusion') {
                    flexibleInclusion[optionName.replace('OR: ', '').toLowerCase()] = true
                } else if (optionCategory === 'shown anime') {
                    shownAnime.include[optionName.toLowerCase()] = true
                } else if (optionCategory === 'genre') {
                    include.genres[optionName.toLowerCase()] = true
                } else if (optionCategory === 'tag') {
                    include.tags[optionName.toLowerCase()] = true
                } else if (optionCategory === 'year') {
                    include.year[optionName] = true
                } else if (optionCategory === 'season') {
                    include.season[optionName.toLowerCase()] = true
                } else if (optionCategory === 'format') {
                    include.format[optionName.toLowerCase()] = true
                } else if (optionCategory === 'airing status') {
                    include.status[optionName.toLowerCase()] = true
                } else if (optionCategory === 'user status') {
                    include.userStatus[optionName.toLowerCase()] = true
                } else if (optionCategory === 'studio') {
                    include.studios[optionName.toLowerCase()] = true
                }
            } else if (filterType === "bool") {
                if (optionName.toLowerCase() === 'hidden anime') {
                    showHiddenList = true
                } else if (optionName.toLowerCase() === 'hide my anime') {
                    hideMyAnime = true
                } else if (optionName.toLowerCase() === 'hide watched') {
                    hideWatched = true
                } else if (optionName.toLowerCase() === 'show my anime') {
                    showMyAnime = true
                } else if (optionName.toLowerCase() === 'show airing') {
                    showAiring = true
                } else if (optionName.toLowerCase() === 'show all sequels') {
                    showAllSequels = true
                } else if (optionName.toLowerCase() === 'show next sequel') {
                    showUserUnwatchedSequel = true
                }
            } else if (filterType === "number") {
                if (optionName.toLowerCase() === "weighted score") {
                    comparisonFilter.weightedScore = {
                        operator: CMPOperator,
                        value: parseFloat(CMPNumber ?? optionValue)
                    }
                } else if (optionName.toLowerCase() === "score") {
                    comparisonFilter.score = {
                        operator: CMPOperator,
                        value: parseFloat(CMPNumber ?? optionValue)
                    }
                } else if (optionName.toLowerCase() === "average score") {
                    comparisonFilter.averageScore = {
                        operator: CMPOperator,
                        value: parseFloat(CMPNumber ?? optionValue)
                    }
                } else if (optionName.toLowerCase() === "user score") {
                    comparisonFilter.userScore = {
                        operator: CMPOperator,
                        value: parseFloat(CMPNumber ?? optionValue)
                    }
                } else if (optionName.toLowerCase() === "popularity") {
                    comparisonFilter.popularity = {
                        operator: CMPOperator,
                        value: parseFloat(CMPNumber ?? optionValue)
                    }
                } else if (optionName.toLowerCase() === "year") {
                    comparisonFilter.year = {
                        operator: CMPOperator,
                        value: parseFloat(CMPNumber ?? optionValue)
                    }
                }
            }
        } else if (status === 'excluded') {
            if (filterType === 'selection') {
                if (optionCategory === 'shown anime') {
                    shownAnime.exclude[optionName.toLowerCase()] = true
                } else if (optionCategory === 'genre') {
                    exclude.genres[optionName.toLowerCase()] = true
                } else if (optionCategory === 'tag') {
                    exclude.tags[optionName.toLowerCase()] = true
                } else if (optionCategory === 'year') {
                    exclude.year[optionName] = true
                } else if (optionCategory === 'season') {
                    exclude.season[optionName.toLowerCase()] = true
                } else if (optionCategory === 'format') {
                    exclude.format[optionName.toLowerCase()] = true
                } else if (optionCategory === 'airing status') {
                    exclude.status[optionName.toLowerCase()] = true
                } else if (optionCategory === 'user status') {
                    exclude.userStatus[optionName.toLowerCase()] = true
                } else if (optionCategory === 'studio') {
                    exclude.studios[optionName.toLowerCase()] = true
                }
            }
        }
    }

    let recommendedAnimeListArrayLen = recommendedAnimeListArray.length
    let isShowingProgress
    let animeList = recommendedAnimeListArray.filter((anime, idx) => {
        if (!isShowingProgress) {
            isShowingProgress = true
            setTimeout(() => {
                self.postMessage({ progress: Math.min(((idx + 1) / recommendedAnimeListArrayLen) * loadedPercent * 100, 80) })
                isShowingProgress = false
            }, 17)
        }

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

        if (!jsonIsEmpty(shownAnime.exclude)) {
            if (typeof anime.score !== "number") {
                return false
            }
            if (shownAnime.exclude['recommended']) {
                if (typeof anime.meanScoreAbove !== "number") return false
                if (anime.score >= anime.meanScoreAbove) return false
            }
            if (shownAnime.exclude['semi-recommended']) {
                if (
                    typeof anime.meanScoreAll !== "number"
                    || typeof anime.meanScoreAbove !== "number"
                ) return false
                if (
                    anime.score < anime.meanScoreAbove
                    && anime.score >= anime.meanScoreAll
                ) return false
            }
            if (shownAnime.exclude['other']) {
                if (typeof anime.meanScoreAll !== "number") return false
                if (anime.score < anime.meanScoreAll) return false
            }
        }

        if (!jsonIsEmpty(shownAnime.include)) {
            if (typeof anime.score !== "number") {
                return false
            }
            if (
                !(shownAnime.include['recommended']
                    && shownAnime.include['semi-recommended']
                    && shownAnime.include['other'])
            ) {
                if (
                    shownAnime.include['recommended']
                    && shownAnime.include['semi-recommended']
                ) {
                    if (typeof anime.meanScoreAll !== "number") return false
                    if (anime.score < anime.meanScoreAll) return false
                } else if (
                    shownAnime.include['recommended']
                    && shownAnime.include['other']
                ) {
                    if (
                        typeof anime.meanScoreAll !== "number"
                        || typeof anime.meanScoreAbove !== "number"
                    ) return false
                    if (
                        anime.score < anime.meanScoreAbove
                        && anime.score >= anime.meanScoreAll
                    ) return false
                } else if (
                    shownAnime.include['semi-recommended']
                    && shownAnime.include['other']
                ) {
                    if (typeof anime.meanScoreAbove !== "number") return false
                    if (anime.score >= anime.meanScoreAbove) return false
                } else if (shownAnime.include['recommended']) {
                    if (typeof anime.meanScoreAbove !== "number") return false
                    if (anime.score < anime.meanScoreAbove) return false
                } else if (shownAnime.include['semi-recommended']) {
                    if (
                        typeof anime.meanScoreAll !== "number"
                        || typeof anime.meanScoreAbove !== "number"
                    ) return false
                    if (
                        anime.score >= anime.meanScoreAbove
                        || anime.score < anime.meanScoreAll
                    ) return false
                } else if (shownAnime.include['other']) {
                    if (typeof anime.meanScoreAll !== "number") return false
                    if (anime.score >= anime.meanScoreAll) return false
                }
            }
        }

        if (hideWatched) {
            if (['completed', 'dropped'].some((e) => ncsCompare(e, anime?.userStatus))) {
                return false
            }
        }

        if (showHiddenList) {
            // do hidden
            if (hiddenEntries?.[anime.id] === undefined) {
                return false
            }
        } else {
            if (hiddenEntries[anime.id]) {
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

        if (comparisonFilter.year) {
            if (anime.year == null) return false
            let year = parseInt(anime.year)
            let operator = comparisonFilter.year.operator?.trim?.(),
                value = comparisonFilter.year.value
            if (typeof year !== "number") {
                return false
            } else if (typeof operator === "string" && typeof value === "number") {
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
            } else if (typeof value === "number") {
                if (year !== value) return false
            }
        }

        // Should Exclude
        if (exclude.season["current season"]) {
            let year = anime?.year;
            if (!isNaN(parseInt(year))) {
                let season = anime?.season?.toLowerCase?.();
                let currentSeasonYear = getCurrentSeasonYear() || {}
                if (typeof season === 'string') {
                    // is Current Season
                    if (season === currentSeasonYear?.season && parseInt(year) === currentSeasonYear?.year) {
                        return false
                    }
                }
                if (typeof anime?.status === 'string') {
                    let { month, day } = anime?.startDate || {}
                    if (parseInt(month) > 0) { month = parseInt(month) - 1 }
                    let startDate = getJapaneseStartDate({ season, year, month, day })
                    // is an Ongoing Anime in Previous Season
                    if (["releasing", "not yet released"].some((status) => status === anime.status.toLowerCase())
                        && startDate < currentSeasonYear.date
                    ) {
                        return false
                    }
                }
            }
        }

        if (exclude.season["upcoming season"]) {
            let year = anime?.year;
            // invalid Start Date
            if (!isNaN(parseInt(year))) {
                let season = anime?.season?.toLowerCase?.();
                let { month, day } = anime?.startDate || {}
                if (parseInt(month) > 0) { month = parseInt(month) - 1 }
                let startDate = getJapaneseStartDate({ season, year, month, day })
                let { nextSeasonDate } = getCurrentSeasonYear() || {}
                if (startDate >= nextSeasonDate) {
                    return false
                }
            }
        }

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
                let tagName = e?.name || e
                if (typeof tagName !== 'string') return false
                return exclude.tags[tagName.toLowerCase()]
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
            if (include.season["current season"] && include.season["upcoming season"]) {
                let year = anime?.year;
                // Still include if Invalid Start Date for Upcoming
                if (!isNaN(parseInt(year))) {
                    let currentSeasonYear = getCurrentSeasonYear() || {}
                    // Anime is Not in Current Season
                    let season = anime?.season?.toLowerCase?.()
                    if (typeof season !== "string" || season !== currentSeasonYear?.season || parseInt(year) !== currentSeasonYear?.year) {
                        // Get Season Dates
                        let { month, day } = anime?.startDate || {}
                        if (parseInt(month) > 0) { month = parseInt(month) - 1 }
                        let startDate = getJapaneseStartDate({ season, year, month, day })
                        // is Not an Upcoming Anime
                        if (startDate < currentSeasonYear.nextSeasonDate) {
                            // is Not an Ongoing Anime in Previous Season
                            if (typeof anime?.status !== "string" || startDate >= currentSeasonYear.date || ["releasing", "not yet released"].every((status) => status !== anime.status.toLowerCase())) {
                                return false
                            }
                        }
                    }
                }
            } else if (include.season["current season"]) {
                let year = anime?.year;
                // is Invalid Start Date
                if (isNaN(parseInt(year))) return false
                let currentSeasonYear = getCurrentSeasonYear() || {}
                // is Not Current Season
                let season = anime?.season?.toLowerCase?.()
                if (typeof season !== "string" || season !== currentSeasonYear?.season || parseInt(year) !== currentSeasonYear?.year) {
                    // invalid Anime Status
                    if (typeof anime?.status !== "string") return false
                    // Get Season Dates
                    let { month, day } = anime?.startDate || {}
                    if (parseInt(month) > 0) { month = parseInt(month) - 1 }
                    let startDate = getJapaneseStartDate({ season, year, month, day })
                    // is Not an Ongoing Anime in Previous Season
                    if (startDate >= currentSeasonYear.nextSeasonDate || ["releasing", "not yet released"].every((status) => status !== anime.status.toLowerCase())) {
                        return false
                    }
                }
            } else if (include.season["upcoming season"]) {
                let year = anime?.year;
                // Still include if Invalid Start Date for Upcoming
                if (!isNaN(parseInt(year))) {
                    // Get Next Season Date
                    let season = anime?.season?.toLowerCase?.();
                    let { month, day } = anime?.startDate || {}
                    if (parseInt(month) > 0) { month = parseInt(month) - 1 }
                    let startDate = getJapaneseStartDate({ season, year, month, day })
                    let { nextSeasonDate } = getCurrentSeasonYear() || {}
                    if (startDate < nextSeasonDate) {
                        return false
                    }
                }
            }
            let nonSeasonCount = (include.season["current season"] ? 1 : 0) + (include.season["upcoming season"] ? 1 : 0)
            if (Object.keys(include.season).length > nonSeasonCount) {
                if (!include.season[anime?.season?.toLowerCase?.()]) {
                    return false
                }
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

        let inclusions = {}
        // Should Include Genre / Tag / Studio
        if (flexibleInclusion['genre / tag / studio']) {
            inclusions.genre = inclusions.tag = inclusions.studio = true
            let isIncluded = jsonIsEmpty(include.genres) && jsonIsEmpty(include.tags) && jsonIsEmpty(include.studios)
            // Should Include OR Genre / Tag / Studio
            if (!isIncluded && !jsonIsEmpty(include.genres)) {
                isIncluded = anime.genres.some(genre => include.genres[genre.toLowerCase()])
            }
            if (!isIncluded && !jsonIsEmpty(include.tags)) {
                isIncluded = anime.tags.some(tag => {
                    let tagName = tag?.name || tag
                    return include.tags[tagName.toLowerCase()]
                })
            }
            if (!isIncluded && !jsonIsEmpty(include.studios)) {
                for (let studio in anime.studios) {
                    if (include.studios[studio.toLowerCase()]) {
                        isIncluded = true
                        break
                    }
                }
            }
            if (!isIncluded) return false
        } else if (flexibleInclusion['genre / tag']) {
            inclusions.genre = inclusions.tag = true
            let isIncluded = jsonIsEmpty(include.genres) && jsonIsEmpty(include.tags)
            // Should Include OR Genre / Tag / Studio
            if (!isIncluded && !jsonIsEmpty(include.genres)) {
                isIncluded = anime.genres.some(genre => include.genres[genre.toLowerCase()])
            }
            if (!isIncluded && !jsonIsEmpty(include.tags)) {
                isIncluded = anime.tags.some(tag => {
                    let tagName = tag?.name || tag
                    return include.tags[tagName.toLowerCase()]
                })
            }
            if (!isIncluded) return false
        } else if (flexibleInclusion['genre / studio']) {
            inclusions.genre = inclusions.studio = true
            let isIncluded = jsonIsEmpty(include.genres) && jsonIsEmpty(include.studios)
            // Should Include OR Genre / Tag / Studio
            if (!isIncluded && !jsonIsEmpty(include.genres)) {
                isIncluded = anime.genres.some(genre => include.genres[genre.toLowerCase()])
            }
            if (!isIncluded && !jsonIsEmpty(include.studios)) {
                for (let studio in anime.studios) {
                    if (include.studios[studio.toLowerCase()]) {
                        isIncluded = true
                        break
                    }
                }
            }
            if (!isIncluded) return false
        } else if (flexibleInclusion['tag / studio']) {
            inclusions.tag = inclusions.studio = true
            let isIncluded = jsonIsEmpty(include.tags) && jsonIsEmpty(include.studios)
            // Should Include OR Genre / Tag / Studio
            if (!isIncluded && !jsonIsEmpty(include.tags)) {
                isIncluded = anime.tags.some(tag => {
                    let tagName = tag?.name || tag
                    return include.tags[tagName.toLowerCase()]
                })
            }
            if (!isIncluded && !jsonIsEmpty(include.studios)) {
                for (let studio in anime.studios) {
                    if (include.studios[studio.toLowerCase()]) {
                        isIncluded = true
                        break
                    }
                }
            }
            if (!isIncluded) return false
        }

        // Should Include
        if (!inclusions.genre) {
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
        }

        if (!inclusions.tag) {
            if (flexibleInclusion['tag']) {
                // Should Include OR
                if (!jsonIsEmpty(include.tags)) {
                    if (!anime.tags.some(tag => {
                        let tagName = tag?.name || tag
                        return include.tags[tagName.toLowerCase()]
                    })) {
                        return false
                    }
                }
            } else {
                // Should Include AND
                for (let tag in include.tags) {
                    if (!anime.tags.some(e => {
                        let tagName = e?.name || e
                        return ncsCompare(tagName, tag)
                    })) return false
                }
            }
        }

        if (!inclusions.studio) {
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
        }

        let animeRelations = anime?.animeRelations
        if (
            showUserUnwatchedSequel
            && animeRelations instanceof Array
        ) {
            let userStatus = anime?.userStatus?.trim?.()?.toLowerCase?.()
            // Is Unwatched and Prequel is in User List
            let isNotUserAnimeUnwatchedSequel =
                // If anime is watched
                ["completed", "repeating", "dropped"].some(e => e === userStatus)
                // if prequel is not watched
                || !animeRelations.some((e) => {
                    let animeRelationType = e?.relationType?.trim?.()?.toLowerCase?.();
                    let animeRelationID = e?.node?.id;
                    if (
                        typeof animeRelationType === "string" &&
                        animeRelationType === "prequel" &&
                        typeof animeRelationID === "number" &&
                        !isNaN(animeRelationID)
                    ) {
                        let relationAnime = recommendedAnimeListArray?.find?.((anime) => anime?.id === animeRelationID)
                        let relationStatus = relationAnime?.userStatus?.trim?.()?.toLowerCase?.()
                        return ["completed", "repeating"].some(e => e === relationStatus)
                    }
                });
            // if anime is in franchise and unwatched
            if (isNotUserAnimeUnwatchedSequel) {
                return false
            }
        }
        if (
            !showAllSequels
            && animeRelations instanceof Array
        ) {
            // Show All Sequels or Hide Next Sequels that have dropped or unwatched prequel
            let isUnwatchedSequel =
                // Have No Prequel
                !animeRelations.some((e) => {
                    let animeRelationType = e?.relationType?.trim?.()?.toLowerCase?.();
                    return (typeof animeRelationType === "string" && animeRelationType === "prequel")
                }) ||
                // or Have Prequel but...
                animeRelations.some((e) => {
                    let animeRelationType = e?.relationType?.trim?.()?.toLowerCase?.();
                    let animeRelationID = e?.node?.id;
                    if (
                        typeof animeRelationType === "string" &&
                        animeRelationType === "prequel" &&
                        typeof animeRelationID === "number" &&
                        !isNaN(animeRelationID)
                    ) {
                        let relationAnime = recommendedAnimeListArray?.find?.((anime) => anime?.id === animeRelationID)
                        let relationStatus = relationAnime?.userStatus?.trim?.()?.toLowerCase?.()
                        // ...Prequel is in the User List and not Dropped
                        if (
                            relationStatus !== "unwatched" &&
                            relationStatus !== "dropped"
                        ) {
                            return true;
                        } else {
                            // ...Prequel is a Small/Unpopular Anime
                            let animePopularity = anime?.popularity
                            let animeRelationPopularity = e?.node?.popularity;
                            return (
                                typeof animePopularity === "number" && !isNaN(animePopularity) &&
                                typeof animeRelationPopularity === "number" && !isNaN(animeRelationPopularity) &&
                                animeRelationPopularity <= animePopularity
                            );
                        }
                    }
                });
            // If only show next sequel, Then Don't Include if Sequel 
            if (!isUnwatchedSequel) {
                return false;
            }
        }
        // Add the recommended Anime
        return true;
    });

    // Sort List
    let sortType = sortBy?.sortType || 'desc'
    let sortName = sortBy?.sortName || 'weighted score'
    if (sortType === "desc") {
        if (sortName === "weighted score") {
            animeList.sort((a, b) => {
                let x = a?.weightedScore != null ? a.weightedScore : -Infinity,
                    y = b?.weightedScore != null ? b.weightedScore : -Infinity;
                if (x !== y) return y - x;
                // Sort by user score (descending), place falsy values at last
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
        } else if (sortName === "score") {
            animeList.sort((a, b) => {
                let x = a?.score != null ? a.score : -Infinity,
                    y = b?.score != null ? b.score : -Infinity;
                if (x !== y) return y - x;
                // Sort by user score (descending), place falsy values at last
                x = a?.userScore != null ? a.userScore : -Infinity;
                y = b?.userScore != null ? b.userScore : -Infinity;
                if (x !== y) return y - x;
                // Sort by trending (descending), place falsy values at last
                x = a?.trending != null ? a.trending : -Infinity;
                y = b?.trending != null ? b.trending : -Infinity;
                return y - x
            })
        } else if (sortName === "average score") {
            animeList.sort((a, b) => {
                let x = a?.averageScore != null ? a.averageScore : -Infinity,
                    y = b?.averageScore != null ? b.averageScore : -Infinity;
                if (x !== y) return y - x;
                // Sort by user score (descending), place falsy values at last
                x = a?.userScore != null ? a.userScore : -Infinity;
                y = b?.userScore != null ? b.userScore : -Infinity;
                if (x !== y) return y - x;
                // Sort by score (descending), place falsy values at last
                x = a?.score != null ? a.score : -Infinity;
                y = b?.score != null ? b.score : -Infinity;
                return y - x
            })
        } else if (sortName === "user score") {
            animeList.sort((a, b) => {
                let x = a?.userScore != null ? a.userScore : -Infinity,
                    y = b?.userScore != null ? b.userScore : -Infinity;
                if (x !== y) return y - x;
                // Sort by score (descending), place falsy values at last
                x = a?.score != null ? a.score : -Infinity;
                y = b?.score != null ? b.score : -Infinity;
                if (x !== y) return y - x;
                // Sort by average score (descending), place falsy values at last
                x = a?.averageScore != null ? a.averageScore : -Infinity;
                y = b?.averageScore != null ? b.averageScore : -Infinity;
                return y - x
            })
        } else if (sortName === "popularity") {
            animeList.sort((a, b) => {
                let x = a?.popularity != null ? a.popularity : -Infinity,
                    y = b?.popularity != null ? b.popularity : -Infinity;
                if (x !== y) return y - x;
                // Sort by user score (descending), place falsy values at last
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
        } else if (sortName === "trending") {
            animeList.sort((a, b) => {
                let x = a?.trending != null ? a.trending : -Infinity,
                    y = b?.trending != null ? b.trending : -Infinity;
                if (x !== y) return y - x;
                // Sort by user score (descending), place falsy values at last
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
        } else if (sortName === "favorites") {
            animeList.sort((a, b) => {
                let x = a?.favorites != null ? a.favorites : -Infinity,
                    y = b?.favorites != null ? b.favorites : -Infinity;
                if (x !== y) return y - x;
                // Sort by user score (descending), place falsy values at last
                x = a?.userScore != null ? a.userScore : -Infinity;
                y = b?.userScore != null ? b.userScore : -Infinity;
                if (x !== y) return y - x;
                // Sort by average score (descending), place falsy values at last
                x = a?.averageScore != null ? a.averageScore : -Infinity;
                y = b?.averageScore != null ? b.averageScore : -Infinity;
                if (x !== y) return y - x;
                // Sort by score (descending), place falsy values at last
                x = a?.score != null ? a.score : -Infinity;
                y = b?.score != null ? b.score : -Infinity;
                return y - x
            })
        } else if (sortName === "date updated") {
            animeList.sort((a, b) => {
                // Sort by date edited/updated or added (descending), place falsy values at last
                let x = a?.dateEdited ? a?.dateEdited : a?.dateAdded ? a?.dateAdded : -Infinity
                let y = b?.dateEdited ? b?.dateEdited : b?.dateAdded ? b?.dateAdded : -Infinity
                if (x !== y) return y - x;
                // Sort by date start (descending), place falsy values at last
                let year = a?.year
                let season = a?.season?.toLowerCase?.();
                let startDate = a?.startDate || {}
                let month = startDate?.month
                if (parseInt(month) > 0) { month = parseInt(month) - 1 }
                let day = startDate?.day
                let dateA = getJapaneseStartDate({ season, year, month, day })?.getTime?.()
                // Get Date B
                year = b?.year
                season = b?.season?.toLowerCase?.();
                startDate = b?.startDate || {}
                month = startDate?.month
                if (parseInt(month) > 0) { month = parseInt(month) - 1 }
                day = startDate?.day
                let dateB = getJapaneseStartDate({ season, year, month, day })?.getTime?.()
                // Sort by date (descending), place falsy values at last
                x = dateA != null ? dateA : -Infinity;
                y = dateB != null ? dateB : -Infinity;
                if (x !== y) return y - x;
                // Sort by user score (descending), place falsy values at last
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
        } else if (sortName === "date added") {
            animeList.sort((a, b) => {
                // Sort by date added (descending), place falsy values at last
                let x = a?.dateAdded ? a?.dateAdded : -Infinity
                let y = b?.dateAdded ? b?.dateAdded : -Infinity
                if (x !== y) return y - x;
                // Sort by date start (descending), place falsy values at last
                let year = a?.year
                let season = a?.season?.toLowerCase?.();
                let startDate = a?.startDate || {}
                let month = startDate?.month
                if (parseInt(month) > 0) { month = parseInt(month) - 1 }
                let day = startDate?.day
                let dateA = getJapaneseStartDate({ season, year, month, day })?.getTime?.()
                // Get Date B
                year = b?.year
                season = b?.season?.toLowerCase?.();
                startDate = b?.startDate || {}
                month = startDate?.month
                if (parseInt(month) > 0) { month = parseInt(month) - 1 }
                day = startDate?.day
                let dateB = getJapaneseStartDate({ season, year, month, day })?.getTime?.()
                // Sort by date (descending), place falsy values at last
                x = dateA != null ? dateA : -Infinity;
                y = dateB != null ? dateB : -Infinity;
                if (x !== y) return y - x;
                // Sort by user score (descending), place falsy values at last
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
        } else if (sortName === "date") {
            animeList.sort((a, b) => {
                // Get Date A
                let year = a?.year
                let season = a?.season?.toLowerCase?.();
                let startDate = a?.startDate || {}
                let month = startDate?.month
                if (parseInt(month) > 0) { month = parseInt(month) - 1 }
                let day = startDate?.day
                let dateA = getJapaneseStartDate({ season, year, month, day })?.getTime?.()
                // Get Date B
                year = b?.year
                season = b?.season?.toLowerCase?.();
                startDate = b?.startDate || {}
                month = startDate?.month
                if (parseInt(month) > 0) { month = parseInt(month) - 1 }
                day = startDate?.day
                let dateB = getJapaneseStartDate({ season, year, month, day })?.getTime?.()
                // Sort by date (descending), place falsy values at last
                let x = dateA != null ? dateA : -Infinity;
                let y = dateB != null ? dateB : -Infinity;
                if (x !== y) return y - x;
                // Sort by user score (descending), place falsy values at last
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
        if (sortName === "weighted score") {
            animeList.sort((a, b) => {
                let x = a?.weightedScore != null ? a?.weightedScore : Infinity,
                    y = b?.weightedScore != null ? b?.weightedScore : Infinity;
                return x - y
            })
        } else if (sortName === "score") {
            animeList.sort((a, b) => {
                let x = a?.score != null ? a?.score : Infinity,
                    y = b?.score != null ? b?.score : Infinity;
                return x - y
            })
        } else if (sortName === "average score") {
            animeList.sort((a, b) => {
                let x = a?.averageScore != null ? a?.averageScore : Infinity,
                    y = b?.averageScore != null ? b?.averageScore : Infinity;
                return x - y
            })
        } else if (sortName === "user score") {
            animeList.sort((a, b) => {
                let x = a?.userScore != null ? a?.userScore : Infinity,
                    y = b?.userScore != null ? b?.userScore : Infinity;
                return x - y
            })
        } else if (sortName === "popularity") {
            animeList.sort((a, b) => {
                let x = a?.popularity != null ? a?.popularity : Infinity,
                    y = b?.popularity != null ? b?.popularity : Infinity;
                return x - y
            })
        } else if (sortName === "trending") {
            animeList.sort((a, b) => {
                let x = a?.trending != null ? a?.trending : Infinity,
                    y = b?.trending != null ? b?.trending : Infinity;
                if (x !== y) return x - y;
                // Sort by popularity (descending), place falsy values at last
                x = a?.popularity != null ? a.popularity : Infinity;
                y = b?.popularity != null ? b.popularity : Infinity;
                return x - y
            })
        } else if (sortName === "favorites") {
            animeList.sort((a, b) => {
                let x = a?.favorites != null ? a?.favorites : Infinity,
                    y = b?.favorites != null ? b?.favorites : Infinity;
                if (x !== y) return x - y;
                // Sort by popularity (descending), place falsy values at last
                x = a?.popularity != null ? a.popularity : Infinity;
                y = b?.popularity != null ? b.popularity : Infinity;
                return x - y
            })
        } else if (sortName === "date updated") {
            animeList.sort((a, b) => {
                // Sort by date edited/updated or added (ascending), place falsy values at last
                let x = a?.dateEdited ? a?.dateEdited : a?.dateAdded ? a?.dateAdded : null
                let y = b?.dateEdited ? b?.dateEdited : b?.dateAdded ? b?.dateAdded : null
                // Sort by date start (ascending), place falsy values at last
                if (!x) {
                    let year = a?.year
                    let season = a?.season?.toLowerCase?.();
                    let startDate = a?.startDate || {}
                    let month = startDate?.month
                    if (parseInt(month) > 0) { month = parseInt(month) - 1 }
                    let day = startDate?.day
                    x = getJapaneseStartDate({ season, year, month, day })?.getTime?.()
                }
                // Get Date B
                if (!y) {
                    year = b?.year
                    season = b?.season?.toLowerCase?.();
                    startDate = b?.startDate || {}
                    month = startDate?.month
                    if (parseInt(month) > 0) { month = parseInt(month) - 1 }
                    day = startDate?.day
                    y = getJapaneseStartDate({ season, year, month, day })?.getTime?.()
                }
                // Sort by date (ascending), place falsy values at last
                x = x != null ? x : Infinity;
                y = y != null ? y : Infinity;
                return x - y;
            })
        } else if (sortName === "date added") {
            animeList.sort((a, b) => {
                // Sort by date added (ascending), place falsy values at last
                let x = a?.dateAdded ? a?.dateAdded : null
                let y = b?.dateAdded ? b?.dateAdded : null
                // Sort by date start (ascending), place falsy values at last
                if (!x) {
                    let year = a?.year
                    let season = a?.season?.toLowerCase?.();
                    let startDate = a?.startDate || {}
                    let month = startDate?.month
                    if (parseInt(month) > 0) { month = parseInt(month) - 1 }
                    let day = startDate?.day
                    x = getJapaneseStartDate({ season, year, month, day })?.getTime?.()
                }
                // Get Date B
                if (!y) {
                    year = b?.year
                    season = b?.season?.toLowerCase?.();
                    startDate = b?.startDate || {}
                    month = startDate?.month
                    if (parseInt(month) > 0) { month = parseInt(month) - 1 }
                    day = startDate?.day
                    y = getJapaneseStartDate({ season, year, month, day })?.getTime?.()
                }
                // Sort by date (ascending), place falsy values at last
                x = x != null ? x : Infinity;
                y = y != null ? y : Infinity;
                return x - y;
            })
        } else if (sortName === "date") {
            animeList.sort((a, b) => {
                // Get Date A
                let year = a?.year
                let season = a?.season?.toLowerCase?.();
                let startDate = a?.startDate || {}
                let month = startDate?.month
                if (parseInt(month) > 0) { month = parseInt(month) - 1 }
                let day = startDate?.day
                let dateA = getJapaneseStartDate({ season, year, month, day })?.getTime?.()
                // Get Date B
                year = b?.year
                season = b?.season?.toLowerCase?.();
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
        animeList: animeList.map(({ id }) => id),
        isHiddenList: showHiddenList,
        shownSortName: shownSortName || sortName,
        animeFilters,
        sortBy
    }
}
function getCurrentSeasonYear() {
    let currentDate = new Date()
    let year = currentDate.getFullYear()
    let seasons = {
        nextWinter: new Date(parseInt(year + 1), 0, 1),  // January 1
        winter: new Date(parseInt(year), 0, 1),  // January 1
        spring: new Date(parseInt(year), 3, 1),  // April 1
        summer: new Date(parseInt(year), 6, 1),  // July 1
        fall: new Date(parseInt(year), 9, 1),    // October 1
    };
    if (currentDate >= seasons.winter && currentDate < seasons.spring) {
        return { season: "winter", year, date: seasons.winter, nextSeasonDate: seasons.spring }
    } else if (currentDate >= seasons.spring && currentDate < seasons.summer) {
        return { season: "spring", year, date: seasons.spring, nextSeasonDate: seasons.summer }
    } else if (currentDate >= seasons.summer && currentDate < seasons.fall) {
        return { season: "summer", year, date: seasons.summer, nextSeasonDate: seasons.fall }
    } else {
        return { season: "fall", year, date: seasons.fall, nextSeasonDate: seasons.nextWinter }
    }
}
function getJapaneseStartDate({ season, year, month, day }) {
    if (parseInt(year) >= 0) {
        if (parseInt(month) >= 0) {
            return new Date(parseInt(year), parseInt(month), parseInt(day || 1) || 1)
        }
        const seasonKey = season?.trim()?.toLowerCase?.();
        if (["winter", "spring", "summer", "fall"].includes(seasonKey) && !isNaN(year)) {
            let seasons = {
                winter: new Date(parseInt(year), 0, 1),  // January 1
                spring: new Date(parseInt(year), 3, 1),  // April 1
                summer: new Date(parseInt(year), 6, 1),  // July 1
                fall: new Date(parseInt(year), 9, 1),    // October 1
            };
            return seasons[seasonKey];
        }
        return new Date(parseInt(year), 0, 1);
    } else {
        return null;
    }
}
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
        } else if (Math.abs(number) < 0.01 && Math.abs(number) > 0) {
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
const ncsCompare = (str1, str2) => {
    if (typeof str1 !== "string" || typeof str2 !== "string") {
        return false;
    }
    return str1.toLowerCase() === str2.toLowerCase();
}
async function IDBinit() {
    return await new Promise((resolve) => {
        let request = indexedDB.open(
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
function getDefaultUserList() {
    let defaultCategories = [
        "  Complete Series",
        " Airing & Upcoming",
        " Next Sequel in My List",
        "Anticipated",
        "My Watch List"
    ]
    return {
        hiddenEntries: {},
        selectedCategory: "  Complete Series",
        categories: defaultCategories.reduce((acc, addedCategory) => {
            // Sort
            let isUserRelated = addedCategory === " Next Sequel in My List" || addedCategory === "My Watch List"
            let sortName, shownSortName
            if (isUserRelated) {
                sortName = "score"
            } else if (addedCategory === "Anticipated") {
                sortName = "popularity"
            } else {
                sortName = "weighted score"
            }
            // Anime Filter
            switch (addedCategory) {
                case "  Complete Series": {
                    animeFilters = [
                        {
                            optionName: "finished",
                            optionCategory: "airing status",
                            status: "included",
                            filterType: "selection"
                        },
                        {
                            optionName: "hide my anime",
                            filterType: "bool",
                            status: "included",
                        },
                        {
                            optionName: "hide watched",
                            filterType: "bool",
                            status: "included",
                        },
                        {
                            optionName: "average score",
                            optionCategory: "shown score",
                            status: "included",
                            filterType: "selection"
                        }
                    ]
                    shownSortName = "average score"
                    break
                }
                case " Airing & Upcoming": {
                    animeFilters = [
                        {
                            optionName: "hide my anime",
                            filterType: "bool",
                            status: "included",
                        },
                        {
                            optionName: "hide watched",
                            filterType: "bool",
                            status: "included",
                        },
                        {
                            optionName: "releasing",
                            optionCategory: "airing status",
                            status: "included",
                            filterType: "selection"
                        },
                        {
                            optionName: "not yet released",
                            optionCategory: "airing status",
                            status: "included",
                            filterType: "selection"
                        },
                        {
                            optionName: "average score",
                            optionCategory: "shown score",
                            status: "included",
                            filterType: "selection"
                        }
                    ]
                    shownSortName = "average score"
                    break
                }
                case " Next Sequel in My List": {
                    animeFilters = [
                        {
                            optionName: "finished",
                            optionCategory: "airing status",
                            status: "none",
                            filterType: "selection"
                        },
                        {
                            optionName: "hide my anime",
                            filterType: "bool",
                            status: "included",
                        },
                        {
                            optionName: "hide watched",
                            filterType: "bool",
                            status: "included",
                        },
                        {
                            optionName: "show next sequel",
                            filterType: "bool",
                            status: "included",
                        },
                        {
                            optionName: "average score",
                            optionCategory: "shown score",
                            status: "included",
                            filterType: "selection"
                        }
                    ]
                    shownSortName = "average score"
                    break
                }
                case "Anticipated": {
                    animeFilters = [
                        {
                            optionName: "hide my anime",
                            status: "included",
                            filterType: "bool",
                        },
                        {
                            optionName: "hide watched",
                            status: "included",
                            filterType: "bool",
                        },
                        {
                            optionName: "not yet released",
                            optionCategory: "airing status",
                            status: "included",
                            filterType: "selection"
                        }
                    ]
                    break
                }
                case "My Watch List": {
                    animeFilters = [
                        {
                            optionName: "finished",
                            optionCategory: "airing status",
                            status: "none",
                            filterType: "selection"
                        },
                        {
                            optionName: "repeating",
                            optionCategory: "user status",
                            status: "none",
                            filterType: "selection"
                        },
                        {
                            optionName: "hide watched",
                            filterType: "bool",
                            status: "included",
                        },
                        {
                            optionName: "show my anime",
                            filterType: "bool",
                            status: "included",
                        },
                        {
                            optionName: "average score",
                            optionCategory: "shown score",
                            status: "included",
                            filterType: "selection"
                        }
                    ]
                    shownSortName = "average score"
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
                animeFilters,
                // algorithmFilters: [],
            }
            return acc
        }, {})
    }
}