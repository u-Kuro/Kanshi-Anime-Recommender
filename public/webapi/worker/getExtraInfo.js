let request, db;

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
    if (!db) {
        await IDBInit();
    }
    if (data?.number === 0) {
        const currentDate = new Date
        const currentYear = (currentDate).getFullYear()
        let currentSeason
        const seasons = {
            Winter: new Date(parseInt(currentYear), 0, 1),  // January 1
            Spring: new Date(parseInt(currentYear), 3, 1),  // April 1
            Summer: new Date(parseInt(currentYear), 6, 1),  // July 1
            Fall: new Date(parseInt(currentYear), 9, 1),    // October 1
        };
        if (currentDate >= seasons.Winter && currentDate < seasons.Spring) {
            currentSeason = "Winter"
        } else if (currentDate >= seasons.Spring && currentDate < seasons.Summer) {
            currentSeason = "Spring"
        } else if (currentDate >= seasons.Summer && currentDate < seasons.Fall) {
            currentSeason = "Summer"
        } else {
            currentSeason = "Fall"
        }
        let {
            recommendedMediaEntries,
            hiddenMediaEntries,
        } = await getIDBRecords([
            "recommendedMediaEntries",
            "hiddenMediaEntries"
        ])
        recommendedMediaEntries = Object.values(recommendedMediaEntries || {})
        hiddenMediaEntries = hiddenMediaEntries || {}
        const mediaEntries = recommendedMediaEntries.filter((media) => {
            if (hiddenMediaEntries[media.id]) return false
            let format = media?.format
            if (!format || format === "Manga" || format === "One Shot" || format === "Novel") return false
            return parseInt(media?.year) === parseInt(currentYear) && media?.season === currentSeason && (media?.weightedScore || 0) > 1
        })
        let userEntryCount = mediaEntries.filter((media) => media?.userStatus !== "Unseen").length,
            mediaEntryCount = mediaEntries.length
        if (userEntryCount && mediaEntryCount) {
            userEntryCount = formatNumber(userEntryCount, userEntryCount > 1000 ? 1 : 0)
            mediaEntryCount = formatNumber(mediaEntryCount, mediaEntryCount > 1000 ? 1 : 0)
            let formattedAniText
            if (mediaEntryCount === userEntryCount) {
                formattedAniText = "All"
            } else {
                formattedAniText = `${userEntryCount} / ${mediaEntryCount}`
            }
            self.postMessage({ message: `${formattedAniText} Seasonal anime are in your List`, key: 0 })
        } else {
            self.postMessage({ message: null })
        }
    } else if (data?.number === 1) {
        let userMediaEntries = await getIDBData("userMediaEntries") || []
        userMediaEntries = userMediaEntries.filter((entry) => {
            let userStatus = entry?.status
            return userStatus?.trim?.()?.toLowerCase?.() === "planning"
        })
        let userFinishedEntryCount = userMediaEntries.filter((entry) => {
            let media = entry?.media;
            let mediaStatus = media?.status
            return mediaStatus?.trim?.()?.toLowerCase?.() === "finished"
        }).length
        let userEntryCount = userMediaEntries.length
        if (userEntryCount && userFinishedEntryCount) {
            userEntryCount = formatNumber(userEntryCount, userEntryCount > 1000 ? 1 : 0)
            userFinishedEntryCount = formatNumber(userFinishedEntryCount, userFinishedEntryCount > 1000 ? 1 : 0)
            let formattedAniText
            if (userEntryCount === userFinishedEntryCount) {
                formattedAniText = "All"
            } else {
                formattedAniText = `${userFinishedEntryCount} / ${userEntryCount}`
            }
            self.postMessage({ message: `${formattedAniText} Planned entries are Finished`, key: 1 })
        } else {
            self.postMessage({ message: null })
        }
    } else if (data?.number === 2) {
        let {
            recommendedMediaEntries,
            hiddenMediaEntries,
        } = await getIDBRecords([
            "recommendedMediaEntries",
            "hiddenMediaEntries"
        ])
        recommendedMediaEntries = Object.values(recommendedMediaEntries || {})
        hiddenMediaEntries = hiddenMediaEntries || {}
        const unseenSeries = recommendedMediaEntries.filter((media) => {
            if (hiddenMediaEntries[media.id]) return false
            let mediaRelations = media?.mediaRelations
            if (mediaRelations instanceof Array) {
                let userStatus = media?.userStatus
                // Is Unseen and Prequel is in User List
                let isNotUserMediaUnseenSequel =
                    // If media is watched
                    (userStatus === "Completed" || userStatus === "Repeating" || userStatus === "Dropped")
                    // if prequel is not watched
                    || !mediaRelations.some((e) => {
                        let mediaRelationType = e?.relationType?.trim?.()?.toLowerCase?.();
                        let mediaRelationID = e?.node?.id;
                        if (
                            typeof mediaRelationType === "string" &&
                            mediaRelationType === "prequel" &&
                            typeof mediaRelationID === "number" &&
                            !isNaN(mediaRelationID)
                        ) {
                            let relationMedia = recommendedMediaEntries?.find?.((media) => media?.id === mediaRelationID)
                            let relationStatus = relationMedia?.userStatus
                            return relationStatus === "Completed" || relationStatus === "Repeating"
                        }
                    });
                // if media is in franchise and Unseen
                return !isNotUserMediaUnseenSequel
            }
            return false
        })
        let myUnseenSeriesCount = unseenSeries.filter((media) => media?.userStatus !== "Unseen")?.length
        let UnseenSeriesCount = unseenSeries.length
        if (UnseenSeriesCount && myUnseenSeriesCount) {
            UnseenSeriesCount = formatNumber(UnseenSeriesCount, UnseenSeriesCount > 1000 ? 1 : 0)
            myUnseenSeriesCount = formatNumber(myUnseenSeriesCount, myUnseenSeriesCount > 1000 ? 1 : 0)
            let formattedAniText
            if (myUnseenSeriesCount === UnseenSeriesCount) {
                formattedAniText = "All"
            } else {
                formattedAniText = `${myUnseenSeriesCount} / ${UnseenSeriesCount}`
            }
            self.postMessage({ message: `${formattedAniText} Sequels are in your List`, key: 2 })
        } else {
            self.postMessage({ message: null })
        }
    } else if (data?.number === 3) {
        const airingMedia = Object.values(await getIDBData("recommendedMediaEntries") || {}).map((media) => {
            let format = media?.format
            if (!format || format === "Manga" || format === "One Shot" || format === "Novel") return null
            if (typeof media?.nextAiringEpisode?.episode === "number"
                && !isNaN(media?.nextAiringEpisode?.episode)
                && !(
                    media?.userStatus === "Completed"
                    || media?.userStatus === "Dropped"
                    || media?.userStatus === "Repeating"
                    || media?.userStatus === "Unseen"
                )
                && typeof media?.episodes === "number"
                && !isNaN(media?.episodes)
                && media?.episodes >= media?.nextAiringEpisode?.episode
                && typeof media?.nextAiringEpisode?.airingAt === "number"
                && !isNaN(media?.nextAiringEpisode?.airingAt)
                && new Date(media?.nextAiringEpisode?.airingAt * 1000) > new Date
            ) {
                let nextEp = media.nextAiringEpisode.episode
                let fullEp = media.episodes
                let remainingTimeAfterNextEp = 1000 * 60 * 60 * 24 * 7 * (fullEp - nextEp)
                let endDate = new Date((media.nextAiringEpisode.airingAt * 1000) + remainingTimeAfterNextEp)
                if (endDate > new Date) {
                    return {
                        endDate: endDate
                    }
                } else {
                    return null
                }
            }
        }).filter(Boolean)
        airingMedia.sort((a, b) => {
            // Sort by endDate Time (ascending), place falsy values at last
            let x = a?.endDate?.getTime?.() ? a?.endDate?.getTime?.() : Number.MAX_SAFE_INTEGER;
            let y = b?.endDate?.getTime?.() ? b?.endDate?.getTime?.() : Number.MAX_SAFE_INTEGER;
            if (x !== y) return x - y;
            return x - y;
        })
        const closestAiringMedia = airingMedia[0]
        if (
            closestAiringMedia?.endDate instanceof Date
            && !isNaN(closestAiringMedia?.endDate)
            && closestAiringMedia?.endDate > new Date
        ) {
            self.postMessage({ 
                message: `${msToTime(closestAiringMedia.endDate.getTime() - (new Date).getTime(), 1)} until nearest anime Completion`,
                key: 3
            })
        } else {
            self.postMessage({ message: null })
        }
    } else if (data?.number === 4) {
        const airingMedia = Object.values(await getIDBData("recommendedMediaEntries") || {}).map((media) => {
            let format = media?.format
            if (!format || format === "Manga" || format === "One Shot" || format === "Novel") return null
            if (typeof media?.nextAiringEpisode?.episode === "number"
                && !isNaN(media?.nextAiringEpisode?.episode)
                && !(
                    media?.userStatus === "Completed"
                    || media?.userStatus === "Dropped"
                    || media?.userStatus === "Repeating"
                    || media?.userStatus === "Unseen"
                )
                && typeof media?.nextAiringEpisode?.airingAt === "number"
                && !isNaN(media?.nextAiringEpisode?.airingAt)
                && new Date(media?.nextAiringEpisode?.airingAt * 1000) > new Date
            ) {
                let nextEp = media.nextAiringEpisode.episode
                let fullEp = media?.episodes
                let endDate = new Date((media.nextAiringEpisode.airingAt * 1000))
                if (endDate > new Date) {
                    return {
                        nextEp: nextEp,
                        fullEp: fullEp,
                        endDate: endDate
                    }
                } else {
                    return null
                }
            }
        }).filter(Boolean)
        airingMedia.sort((a, b) => {
            // Sort by endDate Time (ascending), place falsy values at last
            let x = a?.endDate?.getTime?.() ? a?.endDate?.getTime?.() : Number.MAX_SAFE_INTEGER;
            let y = b?.endDate?.getTime?.() ? b?.endDate?.getTime?.() : Number.MAX_SAFE_INTEGER;
            if (x !== y) return x - y;
            return x - y;
        })
        const closestAiringMedia = airingMedia[0]
        if (
            closestAiringMedia?.endDate instanceof Date
            && !isNaN(closestAiringMedia?.endDate)
            && closestAiringMedia?.endDate > new Date
            && typeof closestAiringMedia?.nextEp === "number"
            && !isNaN(closestAiringMedia?.nextEp)
        ) {
            self.postMessage({
                message: `${msToTime(closestAiringMedia.endDate.getTime() - (new Date).getTime(), 1)} until nearest anime Release`,
                key: 4
            })
        } else {
            self.postMessage({ message: null })
        }
    } else {
        const currentDate = new Date
        const currentYear = (currentDate).getFullYear()
        const seasons = {
            winter: new Date(parseInt(currentYear), 0, 1),  // January 1
            spring: new Date(parseInt(currentYear), 3, 1),  // April 1
            summer: new Date(parseInt(currentYear), 6, 1),  // July 1
            fall: new Date(parseInt(currentYear), 9, 1),    // October 1
        };
        let dateEnd, dateEndTime, seasonName
        if (currentDate >= seasons.winter && currentDate < seasons.spring) {
            dateEndTime = seasons.spring.getTime() - 1
            dateEnd = new Date(dateEndTime)
            seasonName = "Winter"
        } else if (currentDate >= seasons.spring && currentDate < seasons.summer) {
            dateEndTime = seasons.summer.getTime() - 1
            dateEnd = new Date(dateEndTime)
            seasonName = "Spring"
        } else if (currentDate >= seasons.summer && currentDate < seasons.fall) {
            dateEndTime = seasons.fall.getTime() - 1
            dateEnd = new Date(dateEndTime)
            seasonName = "Summer"
        } else {
            let nextYearDate = new Date(parseInt(currentYear + 1), 0, 1)
            dateEndTime = nextYearDate.getTime() - 1
            dateEnd = new Date(dateEndTime)
            seasonName = "Fall"
        }
        self.postMessage({
            message: `${msToTime(dateEnd.getTime() - (new Date).getTime(), 1)} until ${seasonName} Season Ends`,
            key: 5
        })
    }
};
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
        let time = [];
        let maxUnit = millenium > 0 ? "mil" : century > 0 ? "cen" : decades > 0 ? "dec" : years > 0 ? "y" : months > 0 ? "mon" : weeks > 0 ? "w" : days > 0 ? "d" : hours > 0 ? "h" : minutes > 0 ? "m" : "s";
        if (limit <= 1) {
            switch (maxUnit) {
                case "mil": {
                    if (century > 0) {
                        millenium += century * .1;
                        millenium = roundToNearestTenth(millenium)
                    }
                    break
                }
                case "cen": {
                    if (decades > 0) {
                        century += decades * .1;
                        century = roundToNearestTenth(century)
                    }
                    break
                }
                case "dec": {
                    if (years > 0) {
                        decades += years * .1;
                        decades = roundToNearestTenth(decades)
                    }
                    break
                }
                case "y": {
                    if (months > 0) {
                        years += months * .0833333333
                        years = roundToNearestTenth(years)
                    }
                    break
                }
                case "mon": {
                    if (weeks > 0) {
                        months += weeks * .229984378;
                        months = roundToNearestTenth(months)
                    }
                    break
                }
                case "w": {
                    if (days > 0) {
                        weeks += days * .142857143;
                        weeks = roundToNearestTenth(weeks)
                    }
                    break
                }
                case "d": {
                    if (hours > 0) {
                        days += hours * .0416666667;
                        days = roundToNearestTenth(days)
                    }
                    break
                }
                case "h": {
                    if (minutes > 0) {
                        hours += minutes * .0166666667;
                        hours = roundToNearestTenth(hours)
                    }
                    break
                }
                case "m": {
                    if (seconds > 0) {
                        minutes += seconds * .0166666667;
                        minutes = roundToNearestTenth(minutes)
                    }
                    break
                }
            }
        }
        if (millenium > 0) time.push(`${millenium} ${millenium > 1 ? "millennia" : "millennium"}`);
        if (century > 0) time.push(`${century} centur${century > 1 ? "ies" : "y"}`);
        if (decades > 0) time.push(`${decades} decade${millenium > 1 ? "s" : ""}`);
        if (years > 0) time.push(`${years} year${years > 1 ? "s" : ""}`);
        if (months > 0) time.push(`${months} month${months > 1 ? "s" : ""}`);
        if (weeks > 0) time.push(`${weeks} week${weeks > 1 ? "s" : ""}`);
        if (days > 0) time.push(`${days} day${days > 1 ? "s" : ""}`);
        if (hours > 0) time.push(`${hours} hour${hours > 1 ? "s" : ""}`);
        if (minutes > 0) time.push(`${minutes} minute${minutes > 1 ? "s" : ""}`);
        if (seconds > 0) time.push(`${seconds} second${seconds > 1 ? "s" : ""}`);
        if (limit > 0) {
            time = time.slice(0, limit)
        }
        return time.join(" ") || "0s"
    } catch (e) {
        return
    }
}
function roundToNearestTenth(number) {
    return Math.round(number * 10) / 10;
}
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