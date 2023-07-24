let db;
let maxAnimePerPage = 50;
let maxStaffPerPage = 25;

self.onmessage = async ({ data }) => {
    if (!db) await IDBinit()
    let currentYear = (new Date()).getFullYear();
    let onlyGetNewEntries = data?.onlyGetNewEntries ?? false
    let retryCount = 0;
    let animeEntries = await retrieveJSON("animeEntries") || {}
    getNewEntries(animeEntries) // Start Call
    animeEntries = null
    // For Getting new Entries
    // Get all Existing IDs
    // set id_not_in the Existing IDs
    // add results to local list
    async function getNewEntries(animeEntries) {
        self.postMessage({ progress: 0 })
        let currentAnimeIDs = Object.keys(animeEntries).join(',')
        let entriesCount = 0

        self.postMessage({ status: "Checking New Entries..." }) // Update Data Status

        function recallGNE(page) {
            self.postMessage({ progress: 25 })
            fetch('https://graphql.anilist.co', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Cache-Control': 'max-age=31536000, immutable'
                },
                body: JSON.stringify({
                    query: `{
                        Page(page: ${page}, perPage: ${maxAnimePerPage}) {
                            pageInfo{
                                hasNextPage
                            }
                            media(
                                type: ANIME,
                                genre_not_in: ["Hentai"],
                                format_not_in:[MUSIC,MANGA,NOVEL,ONE_SHOT],
                                id_not_in: [${currentAnimeIDs}]
                                ) {
                                id
                                updatedAt
                                title {
                                    romaji
                                    english
                                    userPreferred
                                }
                                relations {
                                    edges {
                                        relationType
                                        node{
                                            id
                                            popularity
                                        }
                                    }
                                }
                                description
                                siteUrl
                                averageScore
                                episodes
                                duration
                                trending
                                popularity
                                favourites
                                format
                                genres
                                status
                                coverImage {
                                    large
                                }
                                trailer {
                                    id
                                    thumbnail
                                    site
                                }
                                bannerImage
                                tags {
                                    name
                                    rank
                                    category
                                }
                                studios {
                                    nodes {
                                        name
                                        siteUrl
                                        isAnimationStudio
                                    }
                                }
                                seasonYear
                                season
                                staff(perPage:${maxStaffPerPage}, page:1, sort:[RELEVANCE]) {
                                    edges {
                                        node {
                                            name {
                                                userPreferred
                                            }
                                            siteUrl
                                        }
                                        role
                                    }
                                }
                                nextAiringEpisode {
                                    episode
                                    airingAt
                                }
                            }
                        }
                    }`
                })
            })
                .then(async (response) => {
                    let headers = response.headers
                    let result = await response.json()
                    return { result, headers }
                })
                .then(async ({ result, headers }) => {
                    let error;
                    if (typeof (error = result?.errors?.[0]?.message) === "string") {
                        if (onlyGetNewEntries) {
                            self.postMessage({ errorDuringInit: true })
                        }
                        ++retryCount
                        if (retryCount >= 2) {
                            self.postMessage({ status: "Request Timeout" })
                        }
                        let rateLimitInterval;
                        if (retryCount < 2) {
                            let secondsPassed = 60
                            rateLimitInterval = setInterval(() => {
                                self.postMessage({ progress: ((60 - secondsPassed) / 60) * 100 })
                                self.postMessage({ status: (error ? (error + " ") : "") + `Rate Limit: ${msToTime(secondsPassed * 1000)}` })
                                --secondsPassed
                            }, 1000)
                        }
                        setTimeout(() => {
                            if (rateLimitInterval) clearInterval(rateLimitInterval)
                            self.postMessage({ progress: 100 })
                            self.postMessage({ status: "Retrying..." })
                            return recallGNE(page);
                        }, 60000);
                    } else {
                        let Page = result?.data?.Page
                        let media = Page?.media || []
                        let hasAddedEntry = false

                        if (media instanceof Array && media.length) {
                            media.forEach((anime) => {
                                if (typeof anime?.id === "number") {
                                    if (anime?.genres instanceof Array) {
                                        let unique = {}
                                        anime.genres = anime.genres.filter((genre) => {
                                            if (genre && !unique[genre]) {
                                                unique[genre] = true
                                                return true
                                            } else {
                                                return false
                                            }
                                        })
                                    }
                                    if (anime?.tags instanceof Array) {
                                        let unique = {}
                                        anime.tags = anime.tags.filter((tag) => {
                                            let _tag = tag?.name
                                            if (_tag && !unique[_tag]) {
                                                unique[_tag] = true
                                                return true
                                            } else {
                                                return false
                                            }
                                        })
                                    }
                                    if (anime?.studios?.nodes instanceof Array) {
                                        let unique = {}
                                        anime.studios.nodes = anime.studios.nodes.filter((studio) => {
                                            let _studio = studio?.name
                                            if (_studio && !unique[_studio]) {
                                                unique[_studio] = true
                                                return true
                                            } else {
                                                return false
                                            }
                                        })
                                    }
                                    animeEntries[anime.id] = anime
                                    hasAddedEntry = true
                                }
                            })
                        }
                        retryCount = 0;
                        let hasNextPage = Page?.pageInfo?.hasNextPage ?? true
                        if (hasNextPage && media.length > 0) {
                            // Handle the successful response here
                            if (hasAddedEntry) {
                                await saveJSON(animeEntries, "animeEntries")
                            }
                            entriesCount += media.length
                            self.postMessage({ status: `${entriesCount} Anime ${entriesCount > 1 ? 'Entries' : 'Entry'} has been added` })
                            if (headers?.get('x-ratelimit-remaining') > 0) {
                                return recallGNE(++page);
                            } else {
                                if (onlyGetNewEntries) {
                                    self.postMessage({ errorDuringInit: true })
                                }
                                let secondsPassed = 60
                                let rateLimitInterval = setInterval(() => {
                                    self.postMessage({ progress: ((60 - secondsPassed) / 60) * 100 })
                                    self.postMessage({ status: `Rate Limit: ${msToTime(secondsPassed * 1000)}` })
                                    --secondsPassed
                                }, 1000)
                                setTimeout(() => {
                                    clearInterval(rateLimitInterval)
                                    self.postMessage({ progress: 100 })
                                    self.postMessage({ status: "Retrying..." })
                                    return recallGNE(++page);
                                }, 60000);
                            }
                        } else {
                            self.postMessage({ progress: 100 })
                            currentAnimeIDs = null
                            // Update User Recommendation List
                            if (hasAddedEntry) {
                                await saveJSON(animeEntries, "animeEntries")
                                self.postMessage({ updateRecommendationList: true })
                            }
                            self.postMessage({ status: null })
                            // Call Next
                            if (onlyGetNewEntries) {
                                self.postMessage({ done: true })
                                animeEntries = null
                            } else {
                                updateAiringAnime(animeEntries)
                                animeEntries = null
                            }
                        }
                    }
                })
                .catch((error) => {
                    if (!navigator.onLine) {
                        self.postMessage({ status: "Currently Offline..." })
                        self.postMessage({ message: 'Currently Offline...' })
                        return
                    }
                    let headers = error.headers;
                    let errorText = error.message;
                    if (errorText === 'User not found') {
                        // Handle the specific error here
                        self.postMessage({ status: null })
                        self.postMessage({ message: 'User not found' })
                    } else {
                        if (headers?.get('x-ratelimit-remaining') > 0) {
                            return recallGNE(page);
                        } else {
                            if (onlyGetNewEntries) {
                                self.postMessage({ errorDuringInit: true })
                            }
                            ++retryCount
                            if (retryCount >= 2) {
                                self.postMessage({ status: "Request Timeout" })
                            }
                            let rateLimitInterval;
                            if (retryCount < 2) {
                                let secondsPassed = 60
                                rateLimitInterval = setInterval(() => {
                                    self.postMessage({ progress: ((60 - secondsPassed) / 60) * 100 })
                                    self.postMessage({ status: `Rate Limit: ${msToTime(secondsPassed * 1000)}` })
                                    --secondsPassed
                                }, 1000)
                            }
                            setTimeout(() => {
                                if (rateLimitInterval) clearInterval(rateLimitInterval)
                                self.postMessage({ progress: 100 })
                                self.postMessage({ status: "Retrying..." })
                                return recallGNE(page);
                            }, 60000);
                        }
                    }
                });
        }
        recallGNE(1)
    }

    // For Updating Entries in List the is Either Currently Releasing or Not_Yet_Released but year>=current year
    // Get entries in string format either Currently Releasing or Not_Yet_Released but year>=current year
    // Get all Existing IDs
    // set id_in Existing IDs
    // update results to local list
    async function updateAiringAnime(animeEntries) {
        self.postMessage({ progress: 0 })
        let airingAnimeIDs = Object.values(animeEntries).filter(({ seasonYear, status }) => {
            // Either Currently Releasing or Not Yet Released but Its Release Year is >= Current Year
            return ncsCompare(status, 'releasing') || (ncsCompare(status, 'not_yet_released') && parseInt(seasonYear) >= currentYear)
        }).map(({ id }) => id)

        let animeLength = airingAnimeIDs.length
        let currentNonProcessedLength = animeLength

        let airingAnimeIDsString = airingAnimeIDs.join(',') // Get IDs

        self.postMessage({ status: "Checking Latest Entries..." }) // Init Data Status

        let lastAnimeUpdate = await retrieveJSON("lastAnimeUpdate") || new Date(1670770349 * 1000)
        let lastAiringUpdateDate = await retrieveJSON("lastAiringAnimeUpdate") || lastAnimeUpdate
        let latestAiringUpdateAtDate

        function recallUAA(page) {
            fetch('https://graphql.anilist.co', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Cache-Control': 'max-age=31536000, immutable'
                },
                body: JSON.stringify({
                    query: `{
                        Page(page: ${page}, perPage: ${maxAnimePerPage}) {
                            pageInfo{
                                hasNextPage
                            }
                            media(
                                type: ANIME,
                                genre_not_in: ["Hentai"],
                                format_not_in:[MUSIC,MANGA,NOVEL,ONE_SHOT],
                                id_in: [${airingAnimeIDsString || ''}],
                                sort: [UPDATED_AT_DESC]
                                ) {
                                id
                                updatedAt
                                title {
                                    romaji
                                    english
                                    userPreferred
                                }
                                relations {
                                    edges {
                                        relationType
                                        node{
                                            id
                                            popularity
                                        }
                                    }
                                }
                                description
                                siteUrl
                                averageScore
                                episodes
                                duration
                                trending
                                popularity
                                favourites
                                format
                                genres
                                status
                                coverImage {
                                    large
                                }
                                trailer {
                                    id
                                    thumbnail
                                    site
                                }
                                bannerImage
                                tags {
                                    name
                                    rank
                                    category
                                }
                                studios {
                                    nodes {
                                        name
                                        siteUrl
                                        isAnimationStudio
                                    }
                                }
                                seasonYear
                                season
                                staff(perPage:${maxStaffPerPage}, page:1, sort:[RELEVANCE]) {
                                    pageInfo{
                                        hasNextPage
                                    }
                                    edges {
                                        node {
                                            name {
                                                userPreferred
                                            }
                                            siteUrl
                                        }
                                        role
                                    }
                                }
                                nextAiringEpisode {
                                    episode
                                    airingAt
                                }
                            }
                        }
                    }`
                })
            })
                .then(async (response) => {
                    let headers = response.headers
                    let result = await response.json()
                    return { result, headers }
                })
                .then(async ({ result, headers }) => {
                    let error;
                    if (typeof (error = result?.errors?.[0]?.message) === "string") {
                        ++retryCount
                        if (retryCount >= 2) {
                            self.postMessage({ status: "Request Timeout" })
                        }
                        let rateLimitInterval;
                        if (retryCount < 2) {
                            let secondsPassed = 60
                            rateLimitInterval = setInterval(() => {
                                self.postMessage({ progress: ((60 - secondsPassed) / 60) * 100 })
                                self.postMessage({ status: (error ? (error + " ") : "") + `Rate Limit: ${msToTime(secondsPassed * 1000)}` })
                                --secondsPassed
                            }, 1000)
                        }
                        setTimeout(() => {
                            if (rateLimitInterval) clearInterval(rateLimitInterval)
                            self.postMessage({ progress: 100 })
                            self.postMessage({ status: "Retrying..." })
                            return recallUAA(page);
                        }, 60000);
                    } else {
                        let Page = result?.data?.Page
                        let media = Page?.media || []
                        let currentAnimeUpdateDate
                        let hasUpdatedEntry = false

                        if (media instanceof Array) {
                            for (let anime of media) {
                                if (typeof anime?.id === "number") {
                                    currentAnimeUpdateDate = new Date(anime.updatedAt * 1000)
                                    if (currentAnimeUpdateDate instanceof Date &&
                                        !isNaN(currentAnimeUpdateDate)
                                    ) {
                                        if (latestAiringUpdateAtDate === undefined ||
                                            currentAnimeUpdateDate > latestAiringUpdateAtDate
                                        ) {
                                            latestAiringUpdateAtDate = currentAnimeUpdateDate
                                        }
                                        if ((lastAiringUpdateDate >= currentAnimeUpdateDate) &&
                                            lastAiringUpdateDate instanceof Date &&
                                            !isNaN(lastAiringUpdateDate)
                                        ) {
                                            // Early Exit
                                            break
                                        }
                                    }
                                    airingAnimeIDs = airingAnimeIDs.filter(_id => _id !== anime.id)
                                    if (anime?.genres instanceof Array) {
                                        let unique = {}
                                        anime.genres = anime.genres.filter((genre) => {
                                            if (genre && !unique[genre]) {
                                                unique[genre] = true
                                                return true
                                            } else {
                                                return false
                                            }
                                        })
                                    }
                                    if (anime?.tags instanceof Array) {
                                        let unique = {}
                                        anime.tags = anime.tags.filter((tag) => {
                                            let _tag = tag?.name
                                            if (_tag && !unique[_tag]) {
                                                unique[_tag] = true
                                                return true
                                            } else {
                                                return false
                                            }
                                        })
                                    }
                                    if (anime?.studios?.nodes instanceof Array) {
                                        let unique = {}
                                        anime.studios.nodes = anime.studios.nodes.filter((studio) => {
                                            let _studio = studio?.name
                                            if (_studio && !unique[_studio]) {
                                                unique[_studio] = true
                                                return true
                                            } else {
                                                return false
                                            }
                                        })
                                    }
                                    animeEntries[anime.id] = anime
                                    hasUpdatedEntry = true
                                }
                            }
                        }
                        retryCount = 0
                        let hasNextPage = Page?.pageInfo?.hasNextPage ?? true
                        // Handle the successful response here
                        if (hasNextPage && media.length > 0 &&
                            ((lastAiringUpdateDate < currentAnimeUpdateDate) ||
                                !(currentAnimeUpdateDate instanceof Date) ||
                                isNaN(currentAnimeUpdateDate) ||
                                !(lastAiringUpdateDate instanceof Date) ||
                                isNaN(lastAiringUpdateDate))
                        ) {
                            if (currentNonProcessedLength > airingAnimeIDs.length) {
                                currentNonProcessedLength = airingAnimeIDs.length // Only Send when its done processing 1 anime
                                let processedLength = Math.max(animeLength - airingAnimeIDs.length, 0)
                                let percentage = (100 * (processedLength / animeLength))
                                percentage = percentage >= 0 ? percentage : 0
                                self.postMessage({ progress: percentage })
                                self.postMessage({ status: `${percentage.toFixed(2)}% Updating Entries` }) // Update Data Status
                            }
                            if (hasUpdatedEntry) {
                                saveJSON(animeEntries, "animeEntries")
                            }
                            // Media Recursion
                            if (headers?.get('x-ratelimit-remaining') > 0) {
                                return recallUAA(++page);
                            } else {
                                let secondsPassed = 60
                                let rateLimitInterval = setInterval(() => {
                                    self.postMessage({ progress: ((60 - secondsPassed) / 60) * 100 })
                                    self.postMessage({ status: `Rate Limit: ${msToTime(secondsPassed * 1000)}` })
                                    --secondsPassed
                                }, 1000)
                                setTimeout(() => {
                                    clearInterval(rateLimitInterval)
                                    self.postMessage({ progress: 100 })
                                    self.postMessage({ status: "Retrying..." })
                                    return recallUAA(++page);
                                }, 60000);
                            }
                        } else {
                            self.postMessage({ progress: 100 })
                            airingAnimeIDsString = airingAnimeIDs = null

                            // Update User Recommendation List
                            if (hasUpdatedEntry) {
                                self.postMessage({ status: "100% Updating Entries" }) // End Data Status
                                await saveJSON(animeEntries, "animeEntries")
                                self.postMessage({ updateRecommendationList: true })

                                if (latestAiringUpdateAtDate instanceof Date &&
                                    !isNaN(latestAiringUpdateAtDate)) {
                                    lastAiringUpdateDate = latestAiringUpdateAtDate
                                    await saveJSON(lastAiringUpdateDate, "lastAiringUpdateDate")
                                }
                            }

                            let lastRunnedAutoUpdateDate = new Date();
                            await saveJSON(lastRunnedAutoUpdateDate, "lastRunnedAutoUpdateDate");
                            self.postMessage({ lastRunnedAutoUpdateDate: lastRunnedAutoUpdateDate })

                            // Call New
                            self.postMessage({ status: null })
                            updateNonRecentEntries(animeEntries, lastAnimeUpdate)
                            animeEntries = null
                        }
                    }
                })
                .catch((error) => {
                    if (!navigator.onLine) {
                        self.postMessage({ status: "Currently Offline..." })
                        self.postMessage({ message: 'Currently Offline...' })
                        return
                    }
                    let headers = error.headers;
                    let errorText = error.message;
                    if (errorText === 'User not found') {
                        // Handle the specific error here
                        self.postMessage({ status: null })
                        self.postMessage({ message: 'User not found' })
                    } else {
                        if (headers?.get('x-ratelimit-remaining') > 0) {
                            return recallUAA(page);
                        } else {
                            ++retryCount
                            if (retryCount >= 2) {
                                self.postMessage({ status: "Request Timeout" })
                            }
                            let rateLimitInterval;
                            if (retryCount < 2) {
                                let secondsPassed = 60
                                rateLimitInterval = setInterval(() => {
                                    self.postMessage({ progress: ((60 - secondsPassed) / 60) * 100 })
                                    self.postMessage({ status: `Rate Limit: ${msToTime(secondsPassed * 1000)}` })
                                    --secondsPassed
                                }, 1000)
                            }
                            setTimeout(() => {
                                if (rateLimitInterval) clearInterval(rateLimitInterval)
                                self.postMessage({ progress: 100 })
                                self.postMessage({ status: "Retrying..." })
                                return recallUAA(page);
                            }, 60000);
                        }
                    }
                    console.error(error)
                });
        }
        recallUAA(1)
    }

    // For Overall Updating
    // arrange by updated_at_desc
    // get results but first keep track of least updateAt Date in Media Recursion to see if we are past last Update
    // use results, and update local results
    // if the current track of Current least update gets less than Last Anime Update, then stop update and save new Last Anime Update Date
    async function updateNonRecentEntries(animeEntries, lastAnimeUpdate) {
        let recursingUpdatedAtDate;
        let latestUpdateAtDate;
        let lastUpdateAtDate = lastAnimeUpdate || new Date(1670770349 * 1000)
        let largestDif = -Infinity;

        self.postMessage({ status: "Checking Additional Entries..." }) // Init Data Status
        self.postMessage({ progress: 0 })

        function recallGOUD() {
            self.postMessage({ progress: 25 })
            fetch('https://graphql.anilist.co', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Cache-Control': 'max-age=31536000, immutable'
                },
                body: JSON.stringify({
                    query: `{
                        Page(page: 1, perPage: 1) {
                            media(
                                type: ANIME,
                                genre_not_in: ["Hentai"],
                                format_not_in:[MUSIC,MANGA,NOVEL,ONE_SHOT],
                                sort: [UPDATED_AT]
                                ) {
                                updatedAt
                            }
                        }
                    }
                `})
            })
                .then(async (response) => {
                    let headers = response.headers
                    let result = await response.json()
                    return { result, headers }
                })
                .then(async ({ result, headers }) => {
                    let error;
                    if (typeof (error = result?.errors?.[0]?.message) === "string") {
                        ++retryCount
                        if (retryCount >= 2) {
                            self.postMessage({ status: "Request Timeout" })
                        }
                        let rateLimitInterval;
                        if (retryCount < 2) {
                            let secondsPassed = 60
                            rateLimitInterval = setInterval(() => {
                                self.postMessage({ progress: ((60 - secondsPassed) / 60) * 100 })
                                self.postMessage({ status: (error ? (error + " ") : "") + `Rate Limit: ${msToTime(secondsPassed * 1000)}` })
                                --secondsPassed
                            }, 1000)
                        }
                        setTimeout(() => {
                            if (rateLimitInterval) clearInterval(rateLimitInterval)
                            self.postMessage({ progress: 100 })
                            self.postMessage({ status: "Retrying..." })
                            return recallGOUD();
                        }, 60000);
                    } else {
                        self.postMessage({ progress: 100 })
                        let currentOldestUpdateAtDate = new Date((result?.data?.Page?.media?.[0]?.updatedAt || 1670770349) * 1000)
                        if (currentOldestUpdateAtDate instanceof Date && !isNaN(currentOldestUpdateAtDate)) {
                            if (currentOldestUpdateAtDate.getTime() > lastUpdateAtDate.getTime()) {
                                lastUpdateAtDate = currentOldestUpdateAtDate
                            }
                        }
                        self.postMessage({ progress: 0 })
                        recallUNRE(1)
                    }
                })
                .catch(() => {
                    if (!navigator.onLine) {
                        self.postMessage({ status: "Currently Offline..." })
                        self.postMessage({ message: 'Currently Offline...' })
                        return
                    }
                    if (headers?.get('x-ratelimit-remaining') > 0) {
                        return recallGOUD();
                    } else {
                        ++retryCount
                        if (retryCount >= 2) {
                            self.postMessage({ status: "Request Timeout" })
                        }
                        let rateLimitInterval;
                        if (retryCount < 2) {
                            let secondsPassed = 60
                            rateLimitInterval = setInterval(() => {
                                self.postMessage({ progress: ((60 - secondsPassed) / 60) * 100 })
                                self.postMessage({ status: `Rate Limit: ${msToTime(secondsPassed * 1000)}` })
                                --secondsPassed
                            }, 1000)
                        }
                        setTimeout(() => {
                            if (rateLimitInterval) clearInterval(rateLimitInterval)
                            self.postMessage({ progress: 100 })
                            self.postMessage({ status: "Retrying..." })
                            return recallGOUD();
                        }, 60000);
                    }
                });
        }
        let percentage = 0, hasUpdatedEntry = false;
        function recallUNRE(page) {
            fetch('https://graphql.anilist.co', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Cache-Control': 'max-age=31536000, immutable'
                },
                body: JSON.stringify({
                    query: `{
                        Page(page: ${page}, perPage: ${maxAnimePerPage}) {
                            pageInfo{
                                hasNextPage
                            }
                            media(
                                type: ANIME,
                                genre_not_in: ["Hentai"],
                                format_not_in:[MUSIC,MANGA,NOVEL,ONE_SHOT],
                                sort: [UPDATED_AT_DESC]
                                ) {
                                id
                                updatedAt
                                title {
                                    romaji
                                    english
                                    userPreferred
                                }
                                relations {
                                    edges {
                                        relationType
                                        node{
                                            id
                                            popularity
                                        }
                                    }
                                }
                                description
                                siteUrl
                                averageScore
                                episodes
                                duration
                                trending
                                popularity
                                favourites
                                format
                                genres
                                status
                                coverImage {
                                    large
                                }
                                trailer {
                                    id
                                    thumbnail
                                    site
                                }
                                bannerImage
                                tags {
                                    name
                                    rank
                                    category
                                }
                                studios {
                                    nodes {
                                        name
                                        siteUrl
                                        isAnimationStudio
                                    }
                                }
                                seasonYear
                                season
                                staff(perPage:${maxStaffPerPage}, page:1, sort:[RELEVANCE]) {
                                    pageInfo{
                                        hasNextPage
                                    }
                                    edges {
                                        node {
                                            name {
                                                userPreferred
                                            }
                                            siteUrl
                                        }
                                        role
                                    }
                                }
                                nextAiringEpisode {
                                    episode
                                    airingAt
                                }
                            }
                        }
                    }`
                })
            })
                .then(async (response) => {
                    let headers = response.headers
                    let result = await response.json()
                    return { result, headers }
                })
                .then(async ({ result, headers }) => {
                    let error;
                    if (typeof (error = result?.errors?.[0]?.message) === "string") {
                        ++retryCount
                        if (retryCount >= 2) {
                            self.postMessage({ status: "Request Timeout" })
                        }
                        let rateLimitInterval;
                        if (retryCount < 2) {
                            let secondsPassed = 60
                            rateLimitInterval = setInterval(() => {
                                self.postMessage({ progress: ((60 - secondsPassed) / 60) * 100 })
                                self.postMessage({ status: (error ? (error + " ") : "") + `Rate Limit: ${msToTime(secondsPassed * 1000)}` })
                                --secondsPassed
                            }, 1000)
                        }
                        setTimeout(() => {
                            if (rateLimitInterval) clearInterval(rateLimitInterval)
                            self.postMessage({ progress: 100 })
                            self.postMessage({ status: "Retrying..." })
                            return recallUNRE(page);
                        }, 60000);
                    } else {
                        let Page = result?.data?.Page
                        let media = Page?.media || []
                        if (media instanceof Array) {
                            for (let anime of media) {
                                if (typeof anime?.id === "number") {
                                    // Handle Last Saved Update Date only in Media Recursion
                                    if (typeof anime.updatedAt === "number") {
                                        let currentAnimeUpdateDate = new Date(anime.updatedAt * 1000)
                                        if (
                                            currentAnimeUpdateDate instanceof Date &&
                                            !isNaN(currentAnimeUpdateDate)
                                        ) {
                                            if (latestUpdateAtDate === undefined ||
                                                currentAnimeUpdateDate > latestUpdateAtDate
                                            ) {
                                                latestUpdateAtDate = currentAnimeUpdateDate
                                                largestDif = Math.max(largestDif, latestUpdateAtDate.getTime() - lastUpdateAtDate.getTime())
                                            }
                                            if (recursingUpdatedAtDate instanceof Date &&
                                                !isNaN(recursingUpdatedAtDate) &&
                                                currentAnimeUpdateDate < recursingUpdatedAtDate
                                            ) {
                                                recursingUpdatedAtDate = currentAnimeUpdateDate
                                                if ((lastAnimeUpdate >= recursingUpdatedAtDate) &&
                                                    recursingUpdatedAtDate instanceof Date &&
                                                    !isNaN(recursingUpdatedAtDate) &&
                                                    lastAnimeUpdate instanceof Date &&
                                                    !isNaN(lastAnimeUpdate)
                                                ) {
                                                    // Early Exit
                                                    break
                                                } else if (
                                                    latestUpdateAtDate instanceof Date &&
                                                    !isNaN(latestUpdateAtDate) &&
                                                    lastUpdateAtDate <= recursingUpdatedAtDate &&
                                                    latestUpdateAtDate > recursingUpdatedAtDate
                                                ) {
                                                    let lastUpdateAtDateTime = lastUpdateAtDate.getTime()
                                                    let recursingUpdatedAtDateTime = recursingUpdatedAtDate.getTime()
                                                    percentage = ((largestDif - (recursingUpdatedAtDateTime - lastUpdateAtDateTime)) / largestDif) * 100
                                                }
                                            } else if (recursingUpdatedAtDate === undefined) {
                                                recursingUpdatedAtDate = currentAnimeUpdateDate
                                                if ((lastAnimeUpdate >= recursingUpdatedAtDate) &&
                                                    recursingUpdatedAtDate instanceof Date &&
                                                    !isNaN(recursingUpdatedAtDate) &&
                                                    lastAnimeUpdate instanceof Date &&
                                                    !isNaN(lastAnimeUpdate)
                                                ) {
                                                    // Early Exit
                                                    break
                                                } else if (
                                                    latestUpdateAtDate instanceof Date &&
                                                    !isNaN(latestUpdateAtDate) &&
                                                    lastUpdateAtDate <= recursingUpdatedAtDate &&
                                                    latestUpdateAtDate > recursingUpdatedAtDate
                                                ) {
                                                    let lastUpdateAtDateTime = lastUpdateAtDate.getTime()
                                                    let recursingUpdatedAtDateTime = recursingUpdatedAtDate.getTime()
                                                    percentage = ((largestDif - (recursingUpdatedAtDateTime - lastUpdateAtDateTime)) / largestDif) * 100
                                                }
                                            }
                                        }
                                    }
                                    // Handle Anime Entries Update
                                    if (anime?.genres instanceof Array) {
                                        let unique = {}
                                        anime.genres = anime.genres.filter((genre) => {
                                            if (genre && !unique[genre]) {
                                                unique[genre] = true
                                                return true
                                            } else {
                                                return false
                                            }
                                        })
                                    }
                                    if (anime?.tags instanceof Array) {
                                        let unique = {}
                                        anime.tags = anime.tags.filter((tag) => {
                                            let _tag = tag?.name
                                            if (_tag && !unique[_tag]) {
                                                unique[_tag] = true
                                                return true
                                            } else {
                                                return false
                                            }
                                        })
                                    }
                                    if (anime?.studios?.nodes instanceof Array) {
                                        let unique = {}
                                        anime.studios.nodes = anime.studios.nodes.filter((studio) => {
                                            let _studio = studio?.name
                                            if (_studio && !unique[_studio]) {
                                                unique[_studio] = true
                                                return true
                                            } else {
                                                return false
                                            }
                                        })
                                    }
                                    animeEntries[anime.id] = anime
                                    hasUpdatedEntry = true
                                }
                            }
                        }
                        let hasNextPage = Page?.pageInfo?.hasNextPage ?? true
                        // Handle the successful response here
                        if (hasNextPage && media.length > 0 &&
                            ((lastAnimeUpdate < recursingUpdatedAtDate) ||
                                !(recursingUpdatedAtDate instanceof Date) ||
                                isNaN(recursingUpdatedAtDate) ||
                                !(lastAnimeUpdate instanceof Date) ||
                                isNaN(lastAnimeUpdate))
                        ) {
                            if (percentage >= 0.01) {
                                self.postMessage({ status: `${percentage.toFixed(2)}% Updating Additional Entries` })
                            } else {
                                self.postMessage({ status: "Updating Additional Entries..." })
                            }
                            self.postMessage({ progress: percentage })
                            if (hasUpdatedEntry) {
                                saveJSON(animeEntries, "animeEntries")
                            }
                            // Media Recursion
                            if (headers?.get('x-ratelimit-remaining') > 0) {
                                return recallUNRE(++page);
                            } else {
                                let secondsPassed = 60
                                rateLimitInterval = setInterval(() => {
                                    self.postMessage({ progress: ((60 - secondsPassed) / 60) * 100 })
                                    self.postMessage({ status: (error ? (error + " ") : "") + `Rate Limit: ${msToTime(secondsPassed * 1000)}` })
                                    --secondsPassed
                                }, 1000)
                                setTimeout(() => {
                                    if (rateLimitInterval) clearInterval(rateLimitInterval)
                                    self.postMessage({ progress: 100 })
                                    self.postMessage({ status: "Retrying..." })
                                    return recallUNRE(++page);
                                }, 60000);
                            }
                        } else {
                            // Update User Recommendation List
                            self.postMessage({ progress: 100 })
                            if (hasUpdatedEntry) {
                                self.postMessage({ status: "100% Updating Additional Entries" })
                                await saveJSON(animeEntries, "animeEntries")
                                animeEntries = null

                                if (latestUpdateAtDate instanceof Date &&
                                    !isNaN(latestUpdateAtDate)) {
                                    lastAnimeUpdate = latestUpdateAtDate
                                    await saveJSON(lastAnimeUpdate, "lastAnimeUpdate")
                                }
                                self.postMessage({ updateRecommendationList: true })
                            } else {
                                animeEntries = null
                            }

                            self.postMessage({ status: null })
                            self.postMessage({ done: true })
                        }
                    }
                })
                .catch((error) => {
                    if (!navigator.onLine) {
                        self.postMessage({ status: "Currently Offline..." })
                        self.postMessage({ message: 'Currently Offline...' })
                        return
                    }
                    let headers = error.headers;
                    let errorText = error.message;
                    if (errorText === 'User not found') {
                        // Handle the specific error here
                        self.postMessage({ status: null })
                        self.postMessage({ message: 'User not found' })
                    } else {
                        if (headers?.get('x-ratelimit-remaining') > 0) {
                            return recallUNRE(page);
                        } else {
                            ++retryCount
                            if (retryCount >= 2) {
                                self.postMessage({ status: "Request Timeout" })
                            }
                            let rateLimitInterval;
                            if (retryCount < 2) {
                                let secondsPassed = 60
                                rateLimitInterval = setInterval(() => {
                                    self.postMessage({ progress: ((60 - secondsPassed) / 60) * 100 })
                                    self.postMessage({ status: `Rate Limit: ${msToTime(secondsPassed * 1000)}` })
                                    --secondsPassed
                                }, 1000)
                            }
                            setTimeout(() => {
                                if (rateLimitInterval) clearInterval(rateLimitInterval)
                                self.postMessage({ progress: 100 })
                                self.postMessage({ status: "Retrying..." })
                                return recallUNRE(page);
                            }, 60000);
                        }
                    }
                });
        }
        recallGOUD()
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

function msToTime(duration) {
    let seconds = Math.floor((duration / 1000) % 60),
        minutes = Math.floor((duration / (1000 * 60)) % 60),
        hours = Math.floor((duration / (1000 * 60 * 60)) % 24),
        days = Math.floor((duration / (1000 * 60 * 60 * 24)) % 7),
        weeks = Math.floor((duration / (1000 * 60 * 60 * 24 * 7)) % 4),
        months = Math.floor((duration / (1000 * 60 * 60 * 24 * 7 * 4)) % 12)
    years = Math.floor((duration / (1000 * 60 * 60 * 24 * 7 * 4 * 12)) % 10)
    decades = Math.floor((duration / (1000 * 60 * 60 * 24 * 7 * 4 * 12 * 10)) % 10)
    century = Math.floor((duration / (1000 * 60 * 60 * 24 * 7 * 4 * 12 * 10 * 10)) % 10)
    millenium = Math.floor((duration / (1000 * 60 * 60 * 24 * 7 * 4 * 12 * 10 * 10 * 10)) % 10)
    let time = []
    if (millenium <= 0 && century <= 0 && decades <= 0 && years <= 0 && months <= 0 && weeks <= 0 && days <= 0 && hours <= 0 && minutes <= 0 && seconds <= 0) return "0s"
    if (millenium > 0) time.push(millenium === 1 ? `${millenium}mil` : `${millenium}mils`)
    if (decades > 0) time.push(decades === 1 ? `${decades}de` : `${decades}des`)
    if (years > 0) time.push(`${years}y`)
    if (months > 0) time.push(months === 1 ? `${months}mo` : `${months}mos`)
    if (weeks > 0) time.push(`${weeks}w`)
    if (days > 0) time.push(`${days}d`)
    if (hours > 0) time.push(`${hours}h`)
    if (minutes > 0) time.push(`${minutes}m`)
    if (seconds > 0) time.push(`${seconds}s`)
    return time.join(" ")
}

function isJsonObject(obj) {
    return Object.prototype.toString.call(obj) === "[object Object]"
}

function jsonIsEmpty(obj) {
    for (const key in obj) {
        return false;
    }
    return true;
}

function ncsCompare(str1, str2) {
    if (typeof str1 !== "string" || typeof str2 !== "string") {
        return false;
    }
    return str1.toLowerCase() === str2.toLowerCase();
}
// function mergeArraysByUniqueProperties(array1, array2, uniqueProperties) {
//     try {
//         let mergedData = {};
//         array1.forEach(obj => {
//             const key = uniqueProperties.map(prop => obj[prop]).join("_");
//             mergedData[key] = obj;
//         });
//         array2.forEach(obj => {
//             const key = uniqueProperties.map(prop => obj[prop]).join("_");
//             mergedData[key] = obj;
//         });
//         let mergedArray = Object.values(mergedData);
//         return mergedArray;
//     } catch (ex) {
//         // console.error(ex)
//         return
//     }
// }  