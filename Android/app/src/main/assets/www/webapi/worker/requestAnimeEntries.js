let db;
self.onmessage = async ({ data }) => {
    if (!db) await IDBinit()
    let maxAnimePerPage = 50;
    let maxStaffPerPage = 25;
    let currentYear = (new Date()).getFullYear();
    let lastAnimeUpdate = await retrieveJSON("lastAnimeUpdate") || 0
    let animeEntries = await retrieveJSON("animeEntries") || {}

    getNewEntries() // Start Call
    // For Getting new Entries
    // Get all Existing IDs
    // set id_not_in the Existing IDs
    // add results to local list
    function getNewEntries() {
        let currentAnimeIDs = Object.keys(animeEntries).join(',')
        let chunkCount = 0
        function recallGNE(page) {
            self.postMessage({ status: "Getting New Entries: " + (++chunkCount) }) // Update Data Status
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
                        self.postMessage({ status: error })
                        self.postMessage({ message: error })
                    } else {
                        let Page = result?.data?.Page
                        let media = Page?.media || []
                        if (media instanceof Array && media.length) {
                            media.forEach((anime) => {
                                if (typeof anime.id === "number" && animeEntries[anime.id] === undefined) {
                                    animeEntries[anime.id] = anime
                                }
                            })
                        }
                        let hasNextPage = Page?.pageInfo?.hasNextPage ?? true
                        if (hasNextPage && media.length > 0) {
                            saveJSON(animeEntries, "animeEntries")
                            // Handle the successful response here
                            if (headers?.get('x-ratelimit-remaining') > 0) {
                                return recallGNE(++page);
                            } else {
                                let secondsPassed = 60
                                let rateLimitInterval = setInterval(() => {
                                    self.postMessage({ status: `Rate Limit: ${msToTime(secondsPassed * 1000)}` })
                                    --secondsPassed
                                }, 1000)
                                setTimeout(() => {
                                    clearInterval(rateLimitInterval)
                                    return recallGNE(++page);
                                }, 60000);
                            }
                        } else {
                            await saveJSON(animeEntries, "animeEntries")
                            // Update User Recommendation List
                            self.postMessage({ updateRecommendationList: true })
                            self.postMessage({ status: null })
                            // Call Next
                            updateAiringAnime()
                        }
                    }
                })
                .catch((error) => {
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
                            let secondsPassed = 60
                            let rateLimitInterval = setInterval(() => {
                                self.postMessage({ status: `Rate Limit: ${msToTime(secondsPassed * 1000)}` })
                                --secondsPassed
                            }, 1000)
                            setTimeout(() => {
                                clearInterval(rateLimitInterval)
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
    function updateAiringAnime() {
        let airingAnimeIDs = Object.values(animeEntries).filter(({ seasonYear, status }) => {
            // Either Currently Releasing or Not Yet Released but Its Release Year is >= Current Year
            return ncsCompare(status, 'releasing') || (ncsCompare(status, 'not_yet_released') && parseInt(seasonYear) >= currentYear)
        }).map(({ id }) => id)

        let animeLength = airingAnimeIDs.length
        let currentNonProcessedLength = animeLength

        let airingAnimeIDsString = airingAnimeIDs.join(',') // Get IDs

        self.postMessage({ status: "Updating Entries 0.00%" }) // Init Data Status

        function recallUAA(page, staffPage, isStaffRecursion = false) {
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
                                id_in: [${airingAnimeIDsString || ''}]
                                ) {
                                id
                                ${isStaffRecursion // remove unnecessary data for staff recursion
                            ? ""
                            : `
                                  updatedAt
                                  title {
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
                                  season`
                        }
                                  staff(perPage:${maxStaffPerPage}, page:${staffPage}, sort:[RELEVANCE]) {
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
                        self.postMessage({ status: error })
                        self.postMessage({ message: error })
                    } else {
                        let Page = result?.data?.Page
                        let media = Page?.media || []
                        let _staffHasNextPage = false
                        if (media instanceof Array) {
                            media.forEach((anime) => {
                                if (typeof anime.id === "number" && animeEntries[anime.id] !== undefined) {
                                    if (anime?.staff?.pageInfo?.hasNextPage ?? false) {
                                        _staffHasNextPage = true
                                    } else {
                                        airingAnimeIDs = airingAnimeIDs.filter(_id => _id !== anime.id)
                                        if (currentNonProcessedLength > airingAnimeIDs.length) {
                                            currentNonProcessedLength = airingAnimeIDs.length // Only Send when its done processing 1 anime

                                            let processedLength = Math.max(animeLength - airingAnimeIDs.length, 0)
                                            let percentage = (100 * (processedLength / animeLength))
                                            percentage = percentage >= 0 ? percentage : 0
                                            self.postMessage({ status: "Updating Entries " + (percentage.toFixed(2)) + "%" }) // Update Data Status
                                        }
                                    }
                                    let currentStaff = animeEntries[anime.id]?.staff?.edges
                                    if (currentStaff instanceof Array && currentStaff.length && (anime?.staff?.edges instanceof Array)) {
                                        let newStaff = anime.staff.edges
                                        let mergedArray = mergeArraysByUniqueProperties(currentStaff, newStaff, ["node.name.userPreferred", "role"]);
                                        if (mergedArray instanceof Array) {
                                            if (!isStaffRecursion && typeof anime?.title === "string") {
                                                // Allow only in Media Recursion
                                                animeEntries[anime.id] = anime
                                            }
                                            animeEntries[anime.id].staff.edges = mergedArray
                                        }
                                    } else if (!isStaffRecursion && (!currentStaff || (currentStaff instanceof Array && currentStaff.length < 1))) {
                                        // Allow only in Media Recursion and if there is no Current Staff
                                        animeEntries[anime.id] = anime
                                    }
                                } else if (typeof anime.id === "number") {
                                    // If in any case a bug occured
                                    animeEntries[anime.id] = anime
                                }
                            })
                        }
                        let hasNextPage = Page?.pageInfo?.hasNextPage ?? true
                        // Handle the successful response here
                        if (_staffHasNextPage) {
                            // Staff Recursion
                            if (headers?.get('x-ratelimit-remaining') > 0) {
                                return recallUAA(page, ++staffPage, true);
                            } else {
                                let secondsPassed = 60
                                let rateLimitInterval = setInterval(() => {
                                    self.postMessage({ status: `Rate Limit: ${msToTime(secondsPassed * 1000)}` })
                                    --secondsPassed
                                }, 1000)
                                setTimeout(() => {
                                    clearInterval(rateLimitInterval)
                                    return recallUAA(page, ++staffPage, true);
                                }, 60000);
                            }
                        } else if (hasNextPage && media.length > 0) {
                            saveJSON(animeEntries, "animeEntries")
                            // Media Recursion
                            if (headers?.get('x-ratelimit-remaining') > 0) {
                                return recallUAA(++page, 1, false);
                            } else {
                                let secondsPassed = 60
                                let rateLimitInterval = setInterval(() => {
                                    self.postMessage({ status: `Rate Limit: ${msToTime(secondsPassed * 1000)}` })
                                    --secondsPassed
                                }, 1000)
                                setTimeout(() => {
                                    clearInterval(rateLimitInterval)
                                    return recallUAA(++page, 1, false);
                                }, 60000);
                            }
                        } else {
                            self.postMessage({ status: "Updating Entries 100%" }) // End Data Status
                            await saveJSON(animeEntries, "animeEntries")
                            // Update User Recommendation List
                            self.postMessage({ status: null })
                            self.postMessage({ updateRecommendationList: true })
                            // Call New
                            updateNonRecentEntries()
                        }
                    }
                })
                .catch((error) => {
                    let headers = error.headers;
                    let errorText = error.message;
                    if (errorText === 'User not found') {
                        // Handle the specific error here
                        self.postMessage({ status: null })
                        self.postMessage({ message: 'User not found' })
                    } else {
                        if (headers?.get('x-ratelimit-remaining') > 0) {
                            return recallUAA(page, staffPage, isStaffRecursion);
                        } else {
                            let secondsPassed = 60
                            let rateLimitInterval = setInterval(() => {
                                self.postMessage({ status: `Rate Limit: ${msToTime(secondsPassed * 1000)}` })
                                --secondsPassed
                            }, 1000)
                            setTimeout(() => {
                                clearInterval(rateLimitInterval)
                                return recallUAA(page, staffPage, isStaffRecursion);
                            }, 60000);
                        }
                    }
                    console.error(error)
                });
        }
        recallUAA(1, 1, false)
    }

    // For Overall Updating
    // arrange by updated_at_desc
    // get results but first keep track of least updateAt Date in Media Recursion to see if we are past last Update
    // use results, and update local results
    // if the current track of Current least update gets less than Last Anime Update, then stop update and save new Last Anime Update Date
    function updateNonRecentEntries() {
        let recursingUpdatedAtDate;
        function recallUNRE(page, staffPage, isStaffRecursion = false) {
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
                                ${isStaffRecursion // remove unnecessary data for staff recursion
                            ? ""
                            : `
                                  updatedAt
                                  title {
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
                                  season`
                        }
                                  staff(perPage:${maxStaffPerPage}, page:${staffPage}, sort:[RELEVANCE]) {
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
                        self.postMessage({ status: error })
                        self.postMessage({ message: error })
                    } else {
                        let Page = result?.data?.Page
                        let media = Page?.media || []
                        let _staffHasNextPage = false
                        if (media instanceof Array) {
                            media.forEach((anime) => {
                                if (typeof anime.id === "number" && animeEntries[anime.id] !== undefined) {
                                    // Handle Last Saved Update Date only in Media Recursion
                                    if (!isStaffRecursion && typeof anime.updatedAt === "number") {
                                        let currentAnimeUpdateDate = new Date(anime.updatedAt * 1000)
                                        if (
                                            currentAnimeUpdateDate instanceof Date &&
                                            !isNaN(currentAnimeUpdateDate)
                                        ) {
                                            if (recursingUpdatedAtDate instanceof Date &&
                                                !isNaN(recursingUpdatedAtDate) &&
                                                currentAnimeUpdateDate < recursingUpdatedAtDate
                                            ) {
                                                recursingUpdatedAtDate = currentAnimeUpdateDate
                                            } else if (recursingUpdatedAtDate === undefined) {
                                                recursingUpdatedAtDate = currentAnimeUpdateDate
                                            }
                                        }
                                    }
                                    // Handle Anime Entries Update
                                    if (anime?.staff?.pageInfo?.hasNextPage ?? false) _staffHasNextPage = true
                                    let currentStaff = animeEntries[anime.id]?.staff?.edges
                                    if (currentStaff instanceof Array && currentStaff.length && (anime?.staff?.edges instanceof Array)) {
                                        let newStaff = anime.staff.edges
                                        let mergedArray = mergeArraysByUniqueProperties(currentStaff, newStaff, ["node.name.userPreferred", "role"]);
                                        if (mergedArray instanceof Array) {
                                            if (!isStaffRecursion && typeof anime?.title === "string") {
                                                // Allow only in Media Recursion
                                                animeEntries[anime.id] = anime
                                            }
                                            animeEntries[anime.id].staff.edges = mergedArray
                                        }
                                    } else if (!isStaffRecursion && (!currentStaff || (currentStaff instanceof Array && currentStaff.length < 1))) {
                                        // Allow only in Media Recursion and if there is no Current Staff
                                        animeEntries[anime.id] = anime
                                    }
                                } else if (typeof anime.id === "number") {
                                    animeEntries[anime.id] = anime
                                }
                            })
                        }
                        let hasNextPage = Page?.pageInfo?.hasNextPage ?? true
                        // Handle the successful response here
                        if (_staffHasNextPage) {
                            // Staff Recursion
                            if (headers?.get('x-ratelimit-remaining') > 0) {
                                return recallUNRE(page, ++staffPage, true);
                            } else {
                                let secondsPassed = 60
                                let rateLimitInterval = setInterval(() => {
                                    self.postMessage({ status: `Rate Limit: ${msToTime(secondsPassed * 1000)}` })
                                    --secondsPassed
                                }, 1000)
                                setTimeout(() => {
                                    clearInterval(rateLimitInterval)
                                    return recallUNRE(page, ++staffPage, true);
                                }, 60000);
                            }
                        } else if (hasNextPage && media.length > 0 && lastAnimeUpdate > recursingUpdatedAtDate) {
                            saveJSON(animeEntries, "animeEntries")
                            // Media Recursion
                            if (headers?.get('x-ratelimit-remaining') > 0) {
                                return recallUNRE(++page, 1, false);
                            } else {
                                let secondsPassed = 60
                                let rateLimitInterval = setInterval(() => {
                                    self.postMessage({ status: `Rate Limit: ${msToTime(secondsPassed * 1000)}` })
                                    --secondsPassed
                                }, 1000)
                                setTimeout(() => {
                                    clearInterval(rateLimitInterval)
                                    return recallUNRE(++page, 1, false);
                                }, 60000);
                            }
                        } else {
                            await saveJSON(animeEntries, "animeEntries")
                            if (recursingUpdatedAtDate instanceof Date &&
                                !isNaN(recursingUpdatedAtDate)) {
                                await saveJSON(lastAnimeUpdate, "lastAnimeUpdate")
                            }
                            // Update User Recommendation List
                            self.postMessage({ status: null })
                            self.postMessage({ updateRecommendationList: true })
                            self.postMessage({ message: 'success' })
                        }
                    }
                })
                .catch((error) => {
                    let headers = error.headers;
                    let errorText = error.message;
                    if (errorText === 'User not found') {
                        // Handle the specific error here
                        self.postMessage({ status: null })
                        self.postMessage({ message: 'User not found' })
                    } else {
                        if (headers?.get('x-ratelimit-remaining') > 0) {
                            return recallUNRE(page, staffPage, isStaffRecursion);
                        } else {
                            let secondsPassed = 60
                            let rateLimitInterval = setInterval(() => {
                                self.postMessage({ status: `Rate Limit: ${msToTime(secondsPassed * 1000)}` })
                                --secondsPassed
                            }, 1000)
                            setTimeout(() => {
                                clearInterval(rateLimitInterval)
                                return recallUNRE(page, staffPage, isStaffRecursion);
                            }, 60000);
                        }
                    }
                });
        }
        recallUNRE(1, 1, false)
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
function mergeArraysByUniqueProperties(array1, array2, uniqueProperties) {
    try {
        let mergedData = {};
        array1.forEach(obj => {
            const key = uniqueProperties.map(prop => obj[prop]).join("_");
            mergedData[key] = obj;
        });
        array2.forEach(obj => {
            const key = uniqueProperties.map(prop => obj[prop]).join("_");
            mergedData[key] = obj;
        });
        let mergedArray = Object.values(mergedData);
        return mergedArray;
    } catch (ex) {
        console.error(ex)
        return
    }
}  