let db, server, connected, isShowingProgress, isShowingProgressTimeout;

self.addEventListener("unhandledrejection", (event) => {
    const reason = event?.reason
    console.error(reason)
    let error = reason?.stack || reason?.message
    if (typeof error !== "string" || !error) {
        error = "Something went wrong"
    }
    self.postMessage({ error })
});

self.onmessage = async ({
    data
}) => {
    if (data?.connected != null) {
        connected = data?.connected
        return
    }
    if (server == null && data?.server != null) {
        server = data.server
    }

    if (!db) await IDBInit();
    const {
        username,
        userMediaUpdateAt
    } = await getIDBRecords([
        "username",
        "userMediaUpdateAt"
    ])
    const newUsername = data?.username;
    const visibilityChange = data?.visibilityChange;
    const reload = data?.reload
    if (typeof newUsername === "string" && newUsername !== username) {
        getUserEntries(newUsername)
    } else if (typeof username === "string" && reload) {
        getUserEntries(username)
    } else if (typeof username === "string") {
        recallUE(username)
    } else {
        self.postMessage({
            message: "No Anilist Username Found"
        })
    }

    function recallUE(username) {
        if (typeof userMediaUpdateAt === "number" 
            && !isNaN(userMediaUpdateAt) 
            && isFinite(userMediaUpdateAt) 
            && userMediaUpdateAt <= Number.MAX_SAFE_INTEGER
        ) {
            if (!visibilityChange) {
                self.postMessage({
                    status: "Checking Latest User Entries"
                })
            }
            fetch("https://graphql.anilist.co", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    "Cache-Control": "max-age=31536000, immutable"
                },
                body: JSON.stringify({
                    query: `{User(name:"${username}"){updatedAt}}`
                })
            }).then(async response => {
                return await response.json()
            }).then(result => {
                let error;
                if (typeof (error = result?.errors?.[0]?.message) === "string") {
                    error = error || "Failed to check entries"
                    self.postMessage({
                        status: error
                    });
                    self.postMessage({
                        error
                    })
                } else {
                    const currentUserMediaUpdateAt = result?.data?.User?.updatedAt;
                    if (
                        typeof currentUserMediaUpdateAt === "number" 
                        && !isNaN(currentUserMediaUpdateAt) 
                        && isFinite(currentUserMediaUpdateAt) 
                        && currentUserMediaUpdateAt <= Number.MAX_SAFE_INTEGER
                    ) {
                        if (currentUserMediaUpdateAt !== userMediaUpdateAt) {
                            self.postMessage({
                                status: "Found latest User Entries"
                            });
                            getUserEntries(username)
                        } else {
                            self.postMessage({
                                status: null
                            });
                            self.postMessage({
                                message: "User Entries is Up to Date"
                            })
                        }
                    }
                }
            }).catch(async error => {
                if (!await isConnected()) {
                    self.postMessage({
                        status: "Server unreachable"
                    });
                    self.postMessage({
                        error: "Server unreachable"
                    });
                    return
                }
                let headers = error.headers;
                let errorText = error.message;
                if (errorText === "User not found" || errorText === "Private User") {
                    self.postMessage({
                        status: errorText
                    });
                    self.postMessage({
                        error: errorText
                    })
                } else {
                    if (headers?.get("x-ratelimit-remaining") > 0) {
                        return recallUE(username)
                    } else {
                        let secondsPassed = 60;
                        let rateLimitInterval = setInterval(() => {
                            self.postMessage({
                                status: `Rate Limit: ${msToTime(secondsPassed * 1e3)}`
                            });
                            --secondsPassed
                        }, 1e3)
                        setTimeout(() => {
                            clearInterval(rateLimitInterval);
                            self.postMessage({
                                status: "Retrying"
                            });
                            return recallUE(username)
                        }, 6e4)
                    }
                }
                console.error(error)
            })
        } else {
            getUserEntries(username)
        }
    }

    function getUserEntries(username) {
        let userMediaEntries = [];
        let maxMediaPerChunk = 500;
        let currentUserMediaUpdate;

        self.postMessage({
            status: "Getting User Entries"
        })

        function recallAV(chunk) {
            fetch("https://graphql.anilist.co", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    "Cache-Control": "max-age=31536000, immutable"
                },
                body: JSON.stringify({
                    query: `{MediaListCollection(userName:"${username}",${chunk > 1 ? "chunk:" + chunk + ",perChunk:" + maxMediaPerChunk + "," : ""}forceSingleCompletedList:true,type:ANIME){hasNextChunk lists{entries{status media{id}score progress}}user{updatedAt}}m:MediaListCollection(userName:"${username}",${chunk > 1 ? "chunk:" + chunk + ",perChunk:" + maxMediaPerChunk + "," : ""}forceSingleCompletedList:true,type:MANGA){hasNextChunk lists{entries{status media{id}score progress progressVolumes}}user{updatedAt}}}`
                })
            }).then(async response => {
                let headers = response.headers;
                let result = await response.json();
                return {
                    result: result,
                    headers: headers
                }
            }).then(async ({
                result,
                headers
            }) => {
                let error;
                if (typeof (error = result?.errors?.[0]?.message) === "string") {
                    error = error || "Failed to retrieve entries."
                    self.postMessage({
                        status: error
                    });
                    self.postMessage({
                        error
                    })
                } else {
                    const animeCollection = result?.data?.MediaListCollection;
                    const mangaCollection = result?.data?.m;

                    const newUserMediaAnimeUpdate = animeCollection?.user?.updatedAt
                    if (typeof newUserMediaAnimeUpdate === "number" 
                        && !isNaN(newUserMediaAnimeUpdate) 
                        && isFinite(newUserMediaAnimeUpdate)
                        && newUserMediaAnimeUpdate <= Number.MAX_SAFE_INTEGER
                    ) {
                        if (newUserMediaAnimeUpdate > currentUserMediaUpdate
                            || typeof currentUserMediaUpdate !== "number"
                            || isNaN(currentUserMediaUpdate) 
                            || !isFinite(currentUserMediaUpdate)
                            || !(currentUserMediaUpdate <= Number.MAX_SAFE_INTEGER)
                        ) {
                            currentUserMediaUpdate = newUserMediaAnimeUpdate
                        }
                    }

                    const newUserMediaMangaUpdate = mangaCollection?.user?.updatedAt
                    if (typeof newUserMediaMangaUpdate === "number" 
                        && !isNaN(newUserMediaMangaUpdate) 
                        && isFinite(newUserMediaMangaUpdate)
                        && newUserMediaMangaUpdate <= Number.MAX_SAFE_INTEGER
                    ) {
                        if (newUserMediaMangaUpdate > currentUserMediaUpdate
                            || typeof currentUserMediaUpdate !== "number"
                            || isNaN(currentUserMediaUpdate) 
                            || !isFinite(currentUserMediaUpdate)
                            || !(currentUserMediaUpdate <= Number.MAX_SAFE_INTEGER)
                        ) {
                            currentUserMediaUpdate = newUserMediaMangaUpdate
                        }
                    }

                    let userEntries = [];
                    if (animeCollection?.lists instanceof Array) {
                        userEntries = animeCollection.lists
                    }
                    if (mangaCollection?.lists instanceof Array) {
                        userEntries = userEntries.concat(mangaCollection.lists)
                    }
                    for (let i = 0; i < userEntries.length; i++) {
                        if (userEntries[i]?.entries instanceof Array) {
                            userMediaEntries = userMediaEntries.concat(userEntries[i].entries)
                        }
                    }

                    const hasNextChunk = animeCollection?.hasNextChunk || mangaCollection?.hasNextChunk;
                    if (hasNextChunk && (userEntries?.length ?? 0) > 0) {
                        if (!isShowingProgress) {
                            isShowingProgress = true;
                            isShowingProgressTimeout = setTimeout(() => {
                                self.postMessage({
                                    status: `${userMediaEntries.length} User ${userMediaEntries.length > 1 ? "Entries" : "Entry"} has been added`
                                });
                                isShowingProgress = false
                            }, 17)
                        }
                        if (headers?.get("x-ratelimit-remaining") > 0) {
                            return recallAV(++chunk)
                        } else {
                            let secondsPassed = 60;
                            let rateLimitInterval = setInterval(() => {
                                self.postMessage({
                                    status: `Rate Limit: ${msToTime(secondsPassed * 1e3)}`
                                });
                                --secondsPassed
                            }, 1e3);
                            setTimeout(() => {
                                clearInterval(rateLimitInterval);
                                self.postMessage({
                                    status: "Retrying"
                                });
                                return recallAV(++chunk)
                            }, 6e4)
                        }
                    } else {
                        clearTimeout(isShowingProgressTimeout);
                        isShowingProgress = false;
                        self.postMessage({
                            status: `${userMediaEntries.length} User ${userMediaEntries.length > 1 ? "Entries" : "Entry"} has been added`
                        });
                        isShowingProgress = false;
                        const mediaEntries = await getIDBData("mediaEntries");
                        const recordsToSet = {
                            shouldProcessRecommendedEntries: true,
                            username,
                            userMediaEntries: userMediaEntries.reduce((result, entry) => {
                                const userMediaID = entry?.media?.id;
                                const userEntry = {};
                                if (userMediaID && mediaEntries[userMediaID]) {
                                    userEntry.media = mediaEntries[userMediaID];
                                    userEntry.status = entry?.status;
                                    userEntry.score = entry?.score;
                                    userEntry.progress = entry?.progress;
                                    userEntry.progressVolumes = entry?.progressVolumes;
                                    result.push(userEntry)
                                }
                                return result
                            }, [])
                        }
                        if (typeof currentUserMediaUpdate === "number" 
                            && !isNaN(currentUserMediaUpdate)
                            && isFinite(currentUserMediaUpdate)
                            && currentUserMediaUpdate <= Number.MAX_SAFE_INTEGER
                        ) {
                            recordsToSet.userMediaUpdateAt = currentUserMediaUpdate
                        }
                        await setIDBRecords(recordsToSet)
                        self.postMessage({
                            status: null
                        });
                        self.postMessage({
                            updateRecommendationList: true
                        });
                        self.postMessage({
                            newusername: username
                        })
                    }
                }
            }).catch(async error => {
                clearTimeout(isShowingProgressTimeout);
                isShowingProgress = false;
                if (!await isConnected()) {
                    self.postMessage({
                        status: "Server unreachable"
                    });
                    self.postMessage({
                        error: "Server unreachable",
                        showToUser: true
                    });
                    return
                }
                let headers = error.headers;
                let errorText = error.message;
                if (errorText === "User not found" || errorText === "Private User") {
                    self.postMessage({
                        status: errorText
                    });
                    self.postMessage({
                        error: errorText
                    })
                } else {
                    if (headers?.get("x-ratelimit-remaining") > 0) {
                        return recallAV(chunk)
                    } else {
                        let secondsPassed = 60;
                        let rateLimitInterval = setInterval(() => {
                            self.postMessage({
                                status: `Rate Limit: ${msToTime(secondsPassed * 1e3)}`
                            });
                            --secondsPassed
                        }, 1e3)
                        setTimeout(() => {
                            clearInterval(rateLimitInterval);
                            self.postMessage({
                                status: "Retrying"
                            });
                            return recallAV(chunk)
                        }, 6e4)
                    }
                }
                console.error(error)
            })
        }
        recallAV(1)
    }
};
function IDBInit() {
    return new Promise((resolve, reject) => {
        try {
            const request = indexedDB.open(
                "Kanshi.Media.Recommendations.Anilist.W~uPtWCq=vG$TR:Zl^#t<vdS]I~N70",
                2
            );
            request.onsuccess = ({ target }) => {
                db = target.result;
                resolve()
            };
            request.onupgradeneeded = ({ target }) => {
                try {
                    const { result, transaction } = target
                    const stores = [
                        // All Media
                        "mediaEntries", "excludedMediaIds", "mediaUpdateAt",
                        // Media Options
                        "mediaOptions", "orderedMediaOptions",
                        // Tag Category and Descriptions
                        "tagInfo", "tagInfoUpdateAt",
                        // User Data From AniList
                        "username", "userMediaEntries", "userMediaUpdateAt",
                        // All Recommended Media
                        "recommendedMediaEntries",
                        // User Data In App
                        "algorithmFilters", "mediaCautions", "hiddenMediaEntries",
                        "categories", "selectedCategory",
                        // User Configs In App
                        "autoPlay", "gridFullView", "showRateLimit", "showStatus",
                        "autoUpdate", "autoExport",
                        "runnedAutoUpdateAt", "runnedAutoExportAt",
                        "exportPathIsAvailable",
                        // User Configs In App
                        "shouldManageMedia", "shouldProcessRecommendedEntries",
                        // Other Info / Flags
                        "nearestMediaReleaseAiringAt",
                        "recommendationError",
                        "visited",
                        "others",
                    ]
                    for (const store of stores) {
                        result.createObjectStore(store);
                    }
                    transaction.oncomplete = () => {
                        db = result;
                        resolve();
                    }
                } catch (ex) {
                    console.error(ex);
                    reject(ex);
                    transaction.abort();
                }
            }
            request.onerror = (ex) => {
                console.error(ex);
                reject(ex);
            };
        } catch (ex) {
            console.error(ex);
            reject(ex);
        }
    })
}
function setIDBRecords(records) {
    return new Promise(async (resolve, reject) => {
        try {
            for (const key in records) {
                if (isJsonObject(records[key]) || records[key] instanceof Array) {
                    records[key] = await new Response(
                        new Blob([JSON.stringify(records[key])])
                        .stream()
                        .pipeThrough(new CompressionStream("gzip"))
                    ).blob()
                } else if (records[key] instanceof Blob) {
                    records[key] = await new Response(
                        records[key]
                        .stream()
                        .pipeThrough(new CompressionStream("gzip"))
                    ).blob()
                }
            }
            const transaction = db.transaction(Object.keys(records), "readwrite");
            for (const key in records) {
                const put = transaction
                    .objectStore(key)
                    .put(records[key], key);
                put.onerror = (ex) => {
                    console.error(ex);
                    reject(ex);
                    transaction.abort();
                };
            }
            transaction.oncomplete = () => resolve()
        } catch (ex) {
            console.error(ex);
            reject(ex);
        }
    });
}
function getIDBData(key) {
    return new Promise((resolve) => {
        try {
            const get = db.transaction(key, "readonly")
                .objectStore(key)
                .get(key)
            get.onsuccess = async () => {
                let value = get.result;
                if (value instanceof Blob) {
                    value = await new Response(
                        value
                        .stream()
                        .pipeThrough(new DecompressionStream("gzip"))
                    ).json()
                }
                resolve(value);
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
function getIDBRecords(recordKeys) {
    return new Promise(async (resolve) => {
        try {
            const transaction = db.transaction(recordKeys, "readonly")
            resolve(Object.fromEntries(
                await Promise.all(
                    recordKeys.map((key) => {
                        return new Promise((resolve) => {
                            const get = transaction
                                .objectStore(key)
                                .get(key)
                            get.onsuccess = async () => {
                                let value = get.result;
                                if (value instanceof Blob) {
                                    value = await new Response(
                                        value
                                        .stream()
                                        .pipeThrough(new DecompressionStream("gzip"))
                                    ).json()
                                }
                                resolve([key, value]);
                            };
                            get.onerror = (ex) => {
                                console.error(ex);
                                resolve([key]);
                            };
                        })
                    })
                )
            ))
        } catch (ex) {
            console.error(ex);
            resolve();
        }
    });
}
function isJsonObject(obj) {
    return Object.prototype.toString.call(obj) === "[object Object]"
}
function msToTime(duration, limit) {
    try {
        if (duration < 1e3) {
            return "0s"
        }
        let seconds = Math.floor(duration / 1e3 % 60),
            minutes = Math.floor(duration / 6e4 % 60),
            hours = Math.floor(duration / 36e5 % 24),
            days = Math.floor(duration / 864e5 % 7),
            weeks = Math.floor(duration / 6048e5 % 4),
            months = Math.floor(duration / 24192e5 % 12),
            years = Math.floor(duration / 290304e5 % 10),
            decades = Math.floor(duration / 290304e6 % 10),
            century = Math.floor(duration / 290304e7 % 10),
            millenium = Math.floor(duration / 290304e8 % 10);
        let time = [];
        if (millenium > 0) time.push(`${millenium}mil`);
        if (century > 0) time.push(`${century}cen`);
        if (decades > 0) time.push(`${decades}dec`);
        if (years > 0) time.push(`${years}y`);
        if (months > 0) time.push(`${months}mon`);
        if (weeks > 0) time.push(`${weeks}w`);
        if (days > 0) time.push(`${days}d`);
        if (hours > 0) time.push(`${hours}h`);
        if (minutes > 0) time.push(`${minutes}m`);
        if (seconds > 0) time.push(`${seconds}s`);
        if (limit > 0) {
            time = time.slice(0, limit)
        }
        return time.join(" ") || "0s"
    } catch (e) {
        return ""
    }
}
function isConnected(url = server) {
    if (typeof url !== "string" || url === "") {
        // when web worker does not allow server connection
        // then check it in the main thread
        const $connected = connected
        if (typeof $connected === "boolean") {
            connected = null
            return $connected
        } else {
            self.postMessage({ getConnectionState: true })
            return true
        }
    } else {
        return new Promise(async (resolve) => {
            if (await checkConnection(url)) return resolve(true)
            else await new Promise((r) => setTimeout(r, 5000))
            return resolve(await checkConnection(url));
        })
    }
}
async function checkConnection(url) {
    try {
        if (navigator?.onLine !== false) {
            const response = await fetch(url, {
                method: "HEAD",
                cache: "no-store"
            });
            return response?.ok
        }
    } catch {}
    return false
}