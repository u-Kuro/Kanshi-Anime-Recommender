<script>
    import { onMount, tick } from "svelte";
    import { fly } from "svelte/transition";
    import {
        finalAnimeList,
        animeLoaderWorker,
        hiddenEntries,
        ytPlayers,
        autoPlay,
        animeObserver,
        popupVisible,
        openedAnimePopupIdx,
        android,
        inApp,
        confirmPromise,
        animeIdxRemoved,
        shownAllInList,
        dataStatus,
        initData,
        updateRecommendationList,
        listUpdateAvailable,
        searchedAnimeKeyword,
        checkAnimeLoaderStatus,
        hasWheel,
        numberOfNextLoadedGrid,
        popupIsGoingBack,
    } from "../../../js/globalValues.js";
    import {
        isJsonObject,
        formatNumber,
        scrollToElement,
        getChildIndex,
        msToTime,
        isElementVisible,
        addClass,
        removeClass,
        getMostVisibleElementFromArray,
        jsonIsEmpty,
        ncsCompare,
    } from "../../../js/others/helper.js";
    import { retrieveJSON, saveJSON } from "../../../js/indexedDB.js";
    import { animeLoader } from "../../../js/workerUtils.js";

    let isOnline = window.navigator.onLine;

    let date;
    let savedYtVolume = $android ? 100 : 50;

    (async () => {
        savedYtVolume = (await retrieveJSON("savedYtVolume")) || savedYtVolume;
    })();

    let animeGridParentEl,
        mostVisiblePopupHeader,
        currentHeaderIdx,
        currentYtPlayer,
        popupWrapper,
        popupContainer,
        popupAnimeObserver,
        windowWidth = window.visualViewport.width,
        windowHeight = window.visualViewport.height;

    let count = 0;
    function addPopupObserver() {
        popupAnimeObserver = new IntersectionObserver(
            (entries) => {
                ++count;
                if (!$popupVisible) return;
                let intersectingPopupHeaders = [];
                entries.forEach((entry) => {
                    if (!$popupVisible) return;
                    let popupHeader = entry.target;
                    if (entry.isIntersecting) {
                        if (entry.intersectionRatio >= 0.5) {
                            intersectingPopupHeaders.push(popupHeader);
                        } else if (
                            windowHeight <= 360 &&
                            entry.intersectionRatio > 0
                        ) {
                            intersectingPopupHeaders.push(popupHeader);
                        }
                    }
                });
                if (intersectingPopupHeaders.length) {
                    let visiblePopupHeader =
                        getMostVisibleElementFromArray(
                            popupContainer,
                            intersectingPopupHeaders,
                            windowHeight > 360 ? 0.5 : 0
                        ) ||
                        getMostVisibleElementFromArray(
                            popupContainer,
                            popupContainer.children,
                            0
                        )?.getElementsByClassName("popup-header")?.[0];
                    mostVisiblePopupHeader = visiblePopupHeader;
                    playMostVisibleTrailer();
                }
            },
            {
                root: null,
                rootMargin: "100%",
                threshold: [0.5, 0],
            }
        );
    }

    function handlePopupVisibility(e) {
        let target = e.target;
        let classList = target.classList;
        if (
            target.closest(".popup-container") ||
            classList.contains("popup-container")
        )
            return;
        $popupVisible = false;
    }

    function getHiddenStatus(animeID) {
        if (!$hiddenEntries) {
            return "N/A";
        } else if ($hiddenEntries[animeID]) {
            return "Show";
        } else {
            return "Hide";
        }
    }

    async function handleHideShow(animeID) {
        let isHidden = $hiddenEntries[animeID];
        if (isHidden) {
            if (
                await $confirmPromise(
                    "Are you sure you want to show the anime?"
                )
            ) {
                delete $hiddenEntries[animeID];
                $hiddenEntries = $hiddenEntries;
                if ($finalAnimeList.length) {
                    if ($animeLoaderWorker instanceof Worker) {
                        $checkAnimeLoaderStatus().then(() => {
                            $animeLoaderWorker.postMessage({
                                removeID: animeID,
                            });
                        });
                    }
                }
            }
        } else {
            if (
                await $confirmPromise(
                    "Are you sure you want to hide the anime?"
                )
            ) {
                $hiddenEntries[animeID] = true;
                if ($finalAnimeList.length) {
                    if ($animeLoaderWorker instanceof Worker) {
                        $checkAnimeLoaderStatus().then(() => {
                            $animeLoaderWorker.postMessage({
                                removeID: animeID,
                            });
                        });
                    }
                }
            }
        }
    }

    animeIdxRemoved.subscribe(async (removedIdx) => {
        if ($popupVisible && removedIdx >= 0) {
            await tick();
            let newPopupContent = popupContainer?.children[removedIdx];
            if (
                newPopupContent instanceof Element &&
                popupContainer instanceof Element
            ) {
                scrollToElement(popupContainer, newPopupContent, "top");
            }
        }
    });

    async function handleSeeMore(anime, animeIdx) {
        if ($finalAnimeList[animeIdx]) {
            $finalAnimeList[animeIdx].isSeenMore =
                !$finalAnimeList[animeIdx].isSeenMore;
            await tick();
            let targetEl =
                anime.popupContent || popupContainer.children?.[animeIdx];
            let targetPopupHeader =
                targetEl?.getElementsByClassName?.("popup-header")[0];
            if (targetEl instanceof Element) {
                scrollToElement(popupContainer, targetEl, "bottom", "instant");
                mostVisiblePopupHeader = targetPopupHeader;
                playMostVisibleTrailer();
            }
        }
    }

    function getContentCaution({
        contentCaution,
        meanScoreAll,
        meanScoreAbove,
        score,
    }) {
        let _contentCaution = [];
        if (score < meanScoreAll) {
            // Very Low Score
            _contentCaution.push({
                caution: `Very Low Score (mean: ${formatNumber(meanScoreAll)})`,
                cautionColor: "purple",
            });
        } else if (score < meanScoreAbove) {
            // Low Score
            _contentCaution.push({
                caution: `Low Score (mean: ${formatNumber(meanScoreAbove)})`,
                cautionColor: "orange",
            });
        }
        if (contentCaution?.caution?.length) {
            // Caution
            _contentCaution = _contentCaution.concat(
                contentCaution?.caution.map((caution) => {
                    return {
                        caution: caution,
                        cautionColor: "red",
                    };
                })
            );
        }
        if (contentCaution?.semiCaution?.length) {
            // Semi Caution
            _contentCaution = _contentCaution.concat(
                contentCaution?.semiCaution.map((caution) => {
                    return {
                        caution: caution,
                        cautionColor: "teal",
                    };
                })
            );
        }
        return _contentCaution;
    }

    function getCautionColor({
        contentCaution,
        meanScoreAll,
        meanScoreAbove,
        score,
    }) {
        if (contentCaution?.caution?.length) {
            // Caution
            return "red";
        } else if (contentCaution?.semiCaution?.length) {
            // Semi Caution
            return "teal";
        } else if (score < meanScoreAll) {
            // Very Low Score
            return "purple";
        } else if (score < meanScoreAbove) {
            // Low Score
            return "orange";
        } else {
            return "green";
        }
    }

    hiddenEntries.subscribe(async (val) => {
        if (isJsonObject(val)) {
            await saveJSON(val, "hiddenEntries");
        }
    });

    popupVisible.subscribe(async (val) => {
        if (
            !(popupWrapper instanceof Element) ||
            !(popupContainer instanceof Element)
        )
            return;
        if (val === true) {
            // Init Height
            popupContainer.style.setProperty(
                "--translateY",
                windowHeight + "px"
            );
            // Scroll To Opened Anime
            let openedAnimePopupEl =
                popupContainer?.children[
                    $openedAnimePopupIdx ?? currentHeaderIdx ?? 0
                ];
            if (openedAnimePopupEl instanceof Element) {
                scrollToElement(
                    popupContainer,
                    openedAnimePopupEl,
                    "top",
                    "instant"
                );
                // Animate Opening
                addClass(popupWrapper, "visible");
                addClass(popupContainer, "show");
                // Try to Add YT player
                currentHeaderIdx = $openedAnimePopupIdx;
                let openedAnimes = [
                    [
                        $finalAnimeList[$openedAnimePopupIdx],
                        $openedAnimePopupIdx,
                    ],
                    [
                        $finalAnimeList[$openedAnimePopupIdx + 1],
                        $openedAnimePopupIdx + 1,
                    ],
                    [
                        $finalAnimeList[$openedAnimePopupIdx - 1],
                        $openedAnimePopupIdx - 1,
                    ],
                ];
                let trailerEl =
                    openedAnimes[0][0]?.popupHeader?.querySelector?.(
                        ".trailer"
                    ) ||
                    popupContainer?.children?.[
                        $openedAnimePopupIdx
                    ]?.querySelector?.(".trailer");
                let haveTrailer;
                for (let i = 0; i < $ytPlayers.length; i++) {
                    if ($ytPlayers[i].ytPlayer.g === trailerEl) {
                        haveTrailer = true;
                        if ($autoPlay) {
                            await tick();
                            if (
                                popupWrapper?.classList?.contains?.(
                                    "visible"
                                ) &&
                                $inApp
                            ) {
                                prePlayYtPlayer($ytPlayers[i].ytPlayer);
                                $ytPlayers[i].ytPlayer?.playVideo?.();
                            }
                            break;
                        }
                    }
                }
                openedAnimes.forEach(([openedAnime, openedAnimeIdx], idx) => {
                    if (haveTrailer && openedAnime && idx === 0) return;
                    else if (openedAnime)
                        createPopupYTPlayer(openedAnime, openedAnimeIdx);
                });
                $openedAnimePopupIdx = null;
            } else {
                // Animate Opening
                addClass(popupWrapper, "visible");
                addClass(popupContainer, "show");
            }
        } else if (val === false) {
            removeClass(popupContainer, "show");
            addClass(popupContainer, "hide");
            setTimeout(() => {
                // Stop All Player
                $ytPlayers?.forEach(({ ytPlayer }) => ytPlayer?.pauseVideo?.());
                removeClass(popupWrapper, "visible");
            }, 300);
        }
    });

    finalAnimeList.subscribe(async (val) => {
        if (val instanceof Array && val.length) {
            if (popupAnimeObserver) {
                popupAnimeObserver?.disconnect?.();
                popupAnimeObserver = null;
            }
            await tick();
            addPopupObserver();
            val.forEach(async (anime, animeIdx) => {
                let popupHeader =
                    anime.popupHeader ||
                    popupContainer.children?.[animeIdx]?.querySelector?.(
                        ".popup-header"
                    );
                if (popupHeader instanceof Element) {
                    popupAnimeObserver?.observe?.(popupHeader);
                }
            });
            let lastAnimeContent = $finalAnimeList[$finalAnimeList.length - 1];
            let lastPopupContent =
                lastAnimeContent.popupContent ||
                popupContainer.children?.[$finalAnimeList.length - 1];
            if ($animeObserver && lastPopupContent instanceof Element) {
                // Popup Observed
                $animeObserver.observe(lastPopupContent);
            }
            playMostVisibleTrailer();
        } else if (val instanceof Array && val.length < 1) {
            $popupVisible = false;
        }
    });

    autoPlay.subscribe(async (val) => {
        if (typeof val === "boolean") {
            await saveJSON(val, "autoPlay");
            if (val === true) {
                await tick();
                let visibleTrailer =
                    mostVisiblePopupHeader?.querySelector?.(".trailer");
                for (let i = 0; i < $ytPlayers.length; i++) {
                    if ($ytPlayers[i].ytPlayer.g === visibleTrailer && $inApp) {
                        prePlayYtPlayer($ytPlayers[i].ytPlayer);
                        $ytPlayers[i].ytPlayer?.playVideo?.();
                    } else {
                        $ytPlayers[i].ytPlayer?.pauseVideo?.();
                    }
                }
            } else {
                $ytPlayers.forEach(({ ytPlayer }) => {
                    ytPlayer?.pauseVideo?.();
                });
            }
        }
    });

    onMount(() => {
        setInterval(() => {
            date = new Date();
        }, 1000);
        popupWrapper = popupWrapper || document.getElementById("popup-wrapper");
        popupContainer =
            popupContainer || popupWrapper.querySelector("#popup-container");
        animeGridParentEl = document.getElementById("anime-grid");
        window.addEventListener("resize", () => {
            if (
                document.fullScreen ||
                document.mozFullScreen ||
                document.webkitIsFullScreen ||
                document.msFullscreenElement
            )
                return;
            windowWidth = window.visualViewport.width;
            windowHeight = window.visualViewport.height;
        });

        document.addEventListener("keydown", async (e) => {
            if (e.key === " " && $popupVisible) {
                e.preventDefault();
                let visibleTrailer =
                    mostVisiblePopupHeader?.querySelector?.(".trailer");
                let isPlaying = $ytPlayers?.some(
                    ({ ytPlayer }) =>
                        visibleTrailer === ytPlayer.g &&
                        ytPlayer?.getPlayerState?.() === 1
                );
                $ytPlayers.forEach(({ ytPlayer }) => {
                    ytPlayer?.pauseVideo?.();
                });
                if (!isPlaying) {
                    await tick();
                    for (let i = 0; i < $ytPlayers.length; i++) {
                        if (
                            $ytPlayers[i].ytPlayer.g === visibleTrailer &&
                            $inApp
                        ) {
                            prePlayYtPlayer($ytPlayers[i].ytPlayer);
                            $ytPlayers[i].ytPlayer?.playVideo?.();
                            break;
                        }
                    }
                }
            } else if (e.ctrlKey && e.key?.toLowerCase?.() === "x") {
                e.preventDefault();
                $popupVisible = !$popupVisible;
            } else if (e.ctrlKey && e.key?.toLowerCase?.() === "k") {
                e.preventDefault();
                $autoPlay = !$autoPlay;
            }
        });
    });

    let scrollToGridTimeout, createPopupPlayersTimeout;
    async function playMostVisibleTrailer() {
        if (!$popupVisible) return;
        await tick();
        let visibleTrailer =
            mostVisiblePopupHeader?.querySelector?.(".trailer");
        // Scroll in Grid
        let visibleTrailerIdx =
            getChildIndex(
                mostVisiblePopupHeader?.closest?.(".popup-content")
            ) ?? -1;
        if (scrollToGridTimeout) clearTimeout(scrollToGridTimeout);
        scrollToGridTimeout = setTimeout(() => {
            if (!$popupVisible) return;
            let animeGrid =
                $finalAnimeList?.[visibleTrailerIdx]?.gridElement ||
                animeGridParentEl.children?.[visibleTrailerIdx];
            if (
                $popupVisible &&
                animeGrid instanceof Element &&
                !isElementVisible(animeGridParentEl, animeGrid, 0.5)
            ) {
                window.scrollY = window.scrollY;
                window.scrollX = window.scrollX; // Stop Current Scroll
                animeGrid.scrollIntoView({
                    behavior: "smooth",
                    block: "nearest",
                });
            }
        }, 300);
        let haveTrailer;
        if (visibleTrailer instanceof Element) {
            haveTrailer = $ytPlayers?.some(
                ({ ytPlayer }) => ytPlayer.g === visibleTrailer
            );
        }
        if (haveTrailer) {
            // Recheck Trailer
            if (visibleTrailerIdx >= 0) {
                currentHeaderIdx = visibleTrailerIdx;
                let nearAnimes = [
                    [
                        $finalAnimeList?.[visibleTrailerIdx + 1],
                        visibleTrailerIdx + 1,
                    ],
                    [
                        $finalAnimeList?.[visibleTrailerIdx - 1],
                        visibleTrailerIdx - 1,
                    ],
                ];
                if (createPopupPlayersTimeout)
                    clearTimeout(createPopupPlayersTimeout);
                createPopupPlayersTimeout = setTimeout(async () => {
                    if (!$popupVisible) return;
                    nearAnimes.forEach(([nearAnime, nearAnimeIdx]) => {
                        if (nearAnime)
                            createPopupYTPlayer(nearAnime, nearAnimeIdx);
                    });
                }, 300);
            }
            // Replay Most Visible Trailer
            for (let i = 0; i < $ytPlayers.length; i++) {
                if (
                    $ytPlayers[i].ytPlayer.g === visibleTrailer &&
                    $ytPlayers[i].ytPlayer?.getPlayerState?.() !== 1 &&
                    $autoPlay
                ) {
                    await tick();
                    if (
                        popupWrapper?.classList?.contains?.("visible") &&
                        $inApp
                    ) {
                        prePlayYtPlayer($ytPlayers[i].ytPlayer);
                        $ytPlayers[i].ytPlayer?.playVideo?.();
                    }
                } else if ($ytPlayers[i].ytPlayer.g !== visibleTrailer) {
                    $ytPlayers[i].ytPlayer?.pauseVideo?.();
                }
            }
        } else {
            // Pause All Players
            $ytPlayers?.forEach(({ ytPlayer }) => ytPlayer?.pauseVideo?.());
            // Recheck Trailer
            if (visibleTrailerIdx >= 0) {
                currentHeaderIdx = visibleTrailerIdx;
                let nearAnimes = [
                    [$finalAnimeList?.[visibleTrailerIdx], visibleTrailerIdx],
                    [
                        $finalAnimeList?.[visibleTrailerIdx + 1],
                        visibleTrailerIdx + 1,
                    ],
                    [
                        $finalAnimeList?.[visibleTrailerIdx - 1],
                        visibleTrailerIdx - 1,
                    ],
                ];
                if (createPopupPlayersTimeout)
                    clearTimeout(createPopupPlayersTimeout);
                createPopupPlayersTimeout = setTimeout(async () => {
                    if (!$popupVisible) return;
                    nearAnimes.forEach(([nearAnime, nearAnimeIdx]) => {
                        if (nearAnime)
                            createPopupYTPlayer(nearAnime, nearAnimeIdx);
                    });
                }, 300);
            }
        }
    }

    let failingTrailers = {};
    function createPopupYTPlayer(openedAnime, headerIdx) {
        let popupHeader =
            openedAnime?.popupHeader ||
            popupContainer.children?.[headerIdx]?.querySelector(
                ".popup-header"
            );
        let ytPlayerEl =
            popupHeader?.querySelector?.(".trailer") ||
            popupHeader?.querySelector?.(".trailer");
        let youtubeID = openedAnime?.trailerID;
        if (
            ytPlayerEl instanceof Element &&
            youtubeID &&
            typeof YT !== "undefined"
        ) {
            if ($ytPlayers.some(({ ytPlayer }) => ytPlayer.g === ytPlayerEl))
                return;
            addClass(popupHeader, "loader");
            let popupImg = popupHeader?.querySelector?.(".popup-img");
            if (
                openedAnime?.bannerImageUrl &&
                !failingTrailers[openedAnime.id]
            ) {
                let animeCoverImgEl = popupImg.querySelector(".coverImg");
                addClass(animeCoverImgEl, "display-none");
                addClass(animeCoverImgEl, "fade-out");
            }
            if ($ytPlayers.length >= 3) {
                let destroyedPlayerIdx = 0;
                let furthestDistance = -Infinity;
                $ytPlayers.forEach((_ytPlayer, index) => {
                    if (_ytPlayer.headerIdx === -1) return;
                    let distance = Math.abs(
                        _ytPlayer.headerIdx - currentHeaderIdx
                    );
                    if (distance > furthestDistance) {
                        furthestDistance = distance;
                        destroyedPlayerIdx = index;
                    }
                });
                let destroyedPlayer = $ytPlayers?.splice?.(
                    destroyedPlayerIdx,
                    1
                )?.[0]?.ytPlayer;
                let destroyedPopupHeader =
                    destroyedPlayer?.g?.closest?.(".popup-header");
                destroyedPlayer?.destroy?.();
                let destroyedPopupImg =
                    destroyedPopupHeader?.querySelector?.(".popup-img");
                if (destroyedPopupImg instanceof Element) {
                    removeClass(destroyedPopupImg, "display-none");
                }
                let newYtPlayerEl = document.createElement("div");
                newYtPlayerEl.className = "trailer";
                addClass(ytPlayerEl, "display-none");
                removeClass(popupImg, "display-none");
                popupHeader.replaceChild(newYtPlayerEl, ytPlayerEl);
                addClass(ytPlayerEl, "display-none");
                ytPlayerEl = popupHeader.querySelector(".trailer"); // Get new YT player
            } else {
                addClass(ytPlayerEl, "display-none");
            }
            removeClass(popupImg, "display-none");
            // Add a Unique ID
            ytPlayerEl.setAttribute(
                "id",
                "yt-player" + Date.now() + Math.random()
            );
            let ytPlayer = new YT.Player(ytPlayerEl, {
                playerVars: {
                    cc_lang_pref: "en", // Set preferred caption language to English
                    cc_load_policy: 1, // Set on by default
                    enablejsapi: 1, // Enable the JavaScript API
                    modestbranding: 1, // Enable modest branding (hide the YouTube logo)
                    playsinline: 1, // Enable inline video playback
                    playlist: youtubeID,
                    rel: 0,
                },
                events: {
                    onReady: (event) => {
                        onPlayerReady(event);
                    },
                    onStateChange: (event) => {
                        onPlayerStateChange(event);
                    },
                    onError: (event) => {
                        onPlayerError(event);
                    },
                },
            });
            // Add Trailer to Iframe
            let trailerUrl = `https://www.youtube.com/embed/${youtubeID}`;
            ytPlayerEl.setAttribute("src", trailerUrl);
            $ytPlayers.push({ ytPlayer, headerIdx });
        } else {
            let popupImg = popupHeader?.querySelector?.(".popup-img");
            let animeCoverImgEl = popupImg.querySelector(".coverImg");
            removeClass(popupHeader, "loader");
            removeClass(animeCoverImgEl, "display-none");
            removeClass(popupImg, "display-none");
        }
    }

    function onPlayerError(event) {
        let ytPlayer = event.target;
        let trailerEl = ytPlayer?.g;
        let popupHeader = trailerEl?.parentElement;
        let popupImg = popupHeader?.querySelector?.(".popup-img");
        $ytPlayers = $ytPlayers.filter(
            (_ytPlayer) => _ytPlayer.ytPlayer !== ytPlayer
        );
        ytPlayer.destroy();
        addClass(trailerEl, "display-none");
        removeClass(popupHeader, "loader");
        let animeCoverImgEl = popupImg.querySelector(".coverImg");
        addClass(animeCoverImgEl, "fade-out");
        removeClass(animeCoverImgEl, "fade-in");
        addClass(animeCoverImgEl, "fade-in");
        removeClass(animeCoverImgEl, "display-none");
        removeClass(animeCoverImgEl, "fade-out");
        removeClass(popupImg, "display-none");
    }

    function onPlayerStateChange(event) {
        let _ytPlayer = event.target;
        if (!_ytPlayer || !_ytPlayer?.getPlayerState) return;
        let trailerEl = _ytPlayer?.g;
        let popupHeader = trailerEl?.parentElement;
        let popupImg = popupHeader?.querySelector?.(".popup-img");
        if (_ytPlayer?.getPlayerState?.() === 0) {
            _ytPlayer?.seekTo?.(0, true);
        }
        if (
            _ytPlayer?.getPlayerState?.() === 1 &&
            (trailerEl?.classList?.contains?.("display-none") ||
                !popupImg?.classList?.contains?.("display-none"))
        ) {
            $ytPlayers?.forEach(
                ({ ytPlayer }) =>
                    ytPlayer?.g !== _ytPlayer?.g && ytPlayer?.pauseVideo?.()
            );
            currentYtPlayer = _ytPlayer;
            addClass(popupImg, "fade-out");
            removeClass(popupHeader, "loader");
            removeClass(trailerEl, "display-none");
            setTimeout(() => {
                addClass(popupImg, "display-none");
                removeClass(popupImg, "fade-out");
            }, 300);
        }
    }

    async function onPlayerReady(event) {
        let ytPlayer = event.target;
        let trailerEl = ytPlayer?.g;
        let popupHeader = trailerEl?.parentElement;
        let popupContent = popupHeader?.closest?.(".popup-content");
        let anime = $finalAnimeList?.[getChildIndex(popupContent) ?? -1];
        if (
            ytPlayer.getPlayerState() === -1 ||
            trailerEl.tagName !== "IFRAME" ||
            !isOnline
        ) {
            failingTrailers[anime.id] = true;
            $ytPlayers = $ytPlayers.filter(
                (_ytPlayer) => _ytPlayer.ytPlayer !== ytPlayer
            );
            ytPlayer.destroy();
            addClass(trailerEl, "display-none");
            removeClass(popupHeader, "loader");
            let popupImg = popupHeader?.querySelector?.(".popup-img");
            let animeCoverImgEl = popupImg.querySelector(".coverImg");
            addClass(animeCoverImgEl, "fade-out");
            removeClass(animeCoverImgEl, "fade-in");
            addClass(animeCoverImgEl, "fade-in");
            removeClass(animeCoverImgEl, "display-none");
            removeClass(animeCoverImgEl, "fade-out");
            removeClass(popupImg, "display-none");
        } else {
            // Play Most Visible when 1 Succeed
            trailerEl?.setAttribute?.("loading", "lazy");
            if (!$autoPlay) {
                let popupImg = popupHeader?.querySelector?.(".popup-img");
                addClass(popupImg, "fade-out");
                removeClass(popupHeader, "loader");
                removeClass(trailerEl, "display-none");
                setTimeout(() => {
                    addClass(popupImg, "display-none");
                    removeClass(popupImg, "fade-out");
                }, 300);
            }
            playMostVisibleTrailer();
            delete failingTrailers[anime.id];
        }
    }
    function prePlayYtPlayer(ytPlayer) {
        if (currentYtPlayer?.isMuted && currentYtPlayer?.getVolume) {
            let isMuted = currentYtPlayer?.isMuted?.();
            let ytVolume = currentYtPlayer?.getVolume?.();
            if (typeof isMuted == "boolean") {
                if (isMuted) {
                    ytPlayer?.mute?.();
                } else {
                    ytPlayer?.unMute?.();
                }
            }
            if (typeof ytVolume === "number") {
                if (savedYtVolume !== ytVolume) {
                    savedYtVolume = ytVolume;
                    saveJSON(savedYtVolume, "savedYtVolume");
                }
                ytPlayer?.setVolume?.(savedYtVolume);
            }
        }
    }

    let updateListIconSpinningTimeout;
    async function updateList(event) {
        if (
            await $confirmPromise({
                title: "List update is available",
                text: "Are you sure you want to refresh the list?",
            })
        ) {
            let element = event.target;
            let classList = element.classList;
            let updateIcon;
            if (classList.contains("list-update-container")) {
                updateIcon = element.querySelector?.(".list-update-icon");
            } else {
                updateIcon = element
                    ?.closest(".list-update-container")
                    ?.querySelector?.(".list-update-icon");
            }
            if (updateListIconSpinningTimeout)
                clearTimeout(updateListIconSpinningTimeout);
            addClass(updateIcon, "fa-spin");
            if ($animeLoaderWorker) {
                $animeLoaderWorker.terminate();
                $animeLoaderWorker = null;
            }
            animeLoader()
                .then(async (data) => {
                    $listUpdateAvailable = false;
                    updateListIconSpinningTimeout = setTimeout(() => {
                        removeClass(updateIcon, "fa-spin");
                    }, 300);
                    $animeLoaderWorker = data.animeLoaderWorker;
                    $searchedAnimeKeyword = "";
                    if (data?.isNew) {
                        $finalAnimeList = data.finalAnimeList;
                        $hiddenEntries = data.hiddenEntries;
                        $numberOfNextLoadedGrid = data.numberOfNextLoadedGrid;
                    }
                    $dataStatus = null;
                    return;
                })
                .catch((error) => {
                    throw error;
                });
        }
    }

    function getUserStatusColor(userStatus) {
        if (ncsCompare(userStatus, "completed")) {
            return "green";
        } else if (
            ncsCompare(userStatus, "current") ||
            ncsCompare(userStatus, "repeating")
        ) {
            return "blue";
        } else if (ncsCompare(userStatus, "planning")) {
            return "orange";
        } else if (ncsCompare(userStatus, "paused")) {
            return "peach";
        } else if (ncsCompare(userStatus, "dropped")) {
            return "red";
        } else {
            return "lightgrey"; // Default Unwatched Icon Color
        }
    }

    function getTags(tags, favouriteTags, contentCaution) {
        if (!tags?.length) return tags;
        let haveFavorite =
                isJsonObject(favouriteTags) && !jsonIsEmpty(favouriteTags),
            haveCaution =
                isJsonObject(contentCaution) && !jsonIsEmpty(contentCaution);
        let caution = {},
            semiCaution = {};
        if (haveCaution) {
            contentCaution?.caution.forEach((tag) => {
                caution[tag.trim().toLowerCase()] = true;
            });
            contentCaution?.semiCaution.forEach((tag) => {
                semiCaution[tag.trim().toLowerCase()] = true;
            });
        }
        let _favouriteTags = [],
            tagCaution = [],
            tagSemiCaution = [],
            otherTags = [];
        let tagsRunnned = {};
        tags.sort((a, b) => {
            return b?.rank - a?.rank;
        });
        tags.forEach((tag) => {
            let tagName = tag?.name || tag;
            let tagRank = tag?.rank;
            if (!tagName) return;
            let trimmedTag = tagName?.trim?.().toLowerCase?.();
            if (haveCaution) {
                if (caution[trimmedTag]) {
                    tagsRunnned[tagName] = true;
                    tagCaution.push({
                        tag: `${tagName}${
                            tagRank ? " | " + tagRank + "%" : ""
                        }`,
                        tagColor: "red",
                    });
                } else if (semiCaution[trimmedTag]) {
                    tagsRunnned[tagName] = true;
                    tagSemiCaution.push({
                        tag: `${tagName}${
                            tagRank ? " | " + tagRank + "%" : ""
                        }`,
                        tagColor: "teal",
                    });
                }
            }
            if (haveFavorite && !tagsRunnned[tagName]) {
                if (favouriteTags[trimmedTag]) {
                    tagsRunnned[tagName] = true;
                    _favouriteTags.push({
                        tag: tag,
                        score: favouriteTags[trimmedTag],
                    });
                }
            }
            if (!tagsRunnned[tagName]) {
                otherTags.push({
                    tag: `${tagName}${tagRank ? " | " + tagRank + "%" : ""}`,
                    tagColor: null,
                });
            }
        });
        _favouriteTags.sort((a, b) => {
            return b.score - a.score;
        });
        _favouriteTags = _favouriteTags.map((e) => {
            let tagName = e?.tag?.name || e?.tag;
            let tagRank = e?.tag?.rank;
            return {
                tag: `${tagName} (${formatNumber(e.score)})${
                    tagRank ? " | " + tagRank + "%" : ""
                }`,
                tagColor: "green",
            };
        });

        return tagCaution
            .concat(tagSemiCaution)
            .concat(_favouriteTags)
            .concat(otherTags);
    }

    function getStudios(studios, favouriteStudios) {
        if (!studios?.length) return studios;
        let haveFavorite =
            isJsonObject(favouriteStudios) && !jsonIsEmpty(favouriteStudios);
        let _favouriteStudios = [],
            otherStudios = [];
        studios.forEach(([studio, studioUrl]) => {
            if (haveFavorite) {
                let trimmedStudio = studio?.trim?.().toLowerCase?.();
                if (favouriteStudios[trimmedStudio]) {
                    _favouriteStudios.push({
                        studio: [studio, studioUrl],
                        score: favouriteStudios[trimmedStudio],
                    });
                } else {
                    otherStudios.push({
                        studio: {
                            studioName: studio,
                            studioUrl: studioUrl,
                        },
                        studioColor: null,
                    });
                }
            } else {
                otherStudios.push({
                    studio: {
                        studioName: studio,
                        studioUrl: studioUrl,
                    },
                    studioColor: null,
                });
            }
        });
        _favouriteStudios.sort((a, b) => {
            return b.score - a.score;
        });
        _favouriteStudios = _favouriteStudios.map((e) => {
            return {
                studio: {
                    studioName: `${e.studio[0]} (${formatNumber(e.score)})`,
                    studioUrl: e.studio[1],
                },
                studioColor: "green",
            };
        });
        return _favouriteStudios.concat(otherStudios);
    }

    function getGenres(genres, favouriteGenres, contentCaution) {
        if (!genres?.length) return genres;
        let haveFavorite =
                isJsonObject(favouriteGenres) && !jsonIsEmpty(favouriteGenres),
            haveCaution =
                isJsonObject(contentCaution) && !jsonIsEmpty(contentCaution);
        let caution = {},
            semiCaution = {};
        if (haveCaution) {
            contentCaution?.caution.forEach((genre) => {
                caution[genre.trim().toLowerCase()] = true;
            });
            contentCaution?.semiCaution.forEach((genre) => {
                semiCaution[genre.trim().toLowerCase()] = true;
            });
        }
        let _favouriteGenres = [],
            genreCaution = [],
            genreSemiCaution = [],
            otherGenres = [];
        let genresRunnned = {};
        genres.forEach((genre) => {
            let trimmedGenre = genre?.trim?.().toLowerCase?.();
            if (haveCaution) {
                if (caution[trimmedGenre]) {
                    genresRunnned[genre] = true;
                    genreCaution.push({ genre: genre, genreColor: "red" });
                } else if (semiCaution[trimmedGenre]) {
                    genresRunnned[genre] = true;
                    genreSemiCaution.push({ genre: genre, genreColor: "teal" });
                }
            }
            if (haveFavorite && !genresRunnned[genre]) {
                if (favouriteGenres[trimmedGenre]) {
                    genresRunnned[genre] = true;
                    _favouriteGenres.push({
                        genre: genre,
                        score: favouriteGenres[trimmedGenre],
                    });
                }
            }
            if (!genresRunnned[genre]) {
                otherGenres.push({ genre: genre, genreColor: null });
            }
        });
        _favouriteGenres.sort((a, b) => {
            return b.score - a.score;
        });
        _favouriteGenres = _favouriteGenres.map((e) => {
            return {
                genre: `${e.genre} (${formatNumber(e.score)})`,
                genreColor: "green",
            };
        });

        return _favouriteGenres
            .concat(genreCaution)
            .concat(genreSemiCaution)
            .concat(otherGenres);
    }

    function getFormattedAnimeFormat({
        episodes,
        format,
        duration,
        nextAiringEpisode,
    }) {
        let _format = format;
        if (format) {
            _format = `${format}`;
            let timeDifMS;
            let nextEpisode;
            let nextAiringDate
            if (
                typeof nextAiringEpisode?.episode === "number" &&
                typeof nextAiringEpisode?.airingAt === "number"
            ) {
                nextAiringDate = new Date(
                    nextAiringEpisode?.airingAt * 1000
                );
                nextEpisode = nextAiringEpisode?.episode;
                if (nextAiringDate instanceof Date && !isNaN(nextAiringDate)) {
                    timeDifMS = nextAiringDate.getTime() - new Date().getTime();
                }
            }
            if (
                timeDifMS > 0 &&
                typeof nextEpisode === "number" &&
                episodes > nextEpisode
            ) {
                _format += ` (${nextEpisode}/${episodes} in ${formatDateDifference(
                    nextAiringDate,
                    timeDifMS
                )})`;
            } else if (
                timeDifMS > 0 &&
                typeof nextEpisode === "number"
            ) {
                _format += ` (Ep ${nextEpisode} in ${formatDateDifference(nextAiringDate, timeDifMS)})`;
            } else if (
                timeDifMS <= 0 &&
                typeof nextEpisode === "number" &&
                episodes > nextEpisode
            ) {
                _format += ` (${nextEpisode}/${episodes})`;
            } else if (episodes > 0) {
                _format += ` (${episodes})`;
            }
            if (duration > 0) {
                let time = msToTime(duration * 60 * 1000);
                _format += ` | ${time ? time : ""}`;
            }
        }
        return _format;
    }
    function formatDateDifference(endDate, timeDifference) {
        const oneMinute = 60 * 1000; // Number of milliseconds in one minute
        const oneHour = 60 * oneMinute; // Number of milliseconds in one hour
        const oneDay = 24 * oneHour; // Number of milliseconds in one day
        const oneWeek = 7 * oneDay; // Number of milliseconds in one day

        const formatYear = (date) => date.toLocaleDateString(undefined, { year: 'numeric' });
        const formatMonth = (date) => date.toLocaleDateString(undefined, { month: 'short' });
        const formatDay = (date) => date.toLocaleDateString(undefined, { day: 'numeric' });
        const formatTime = (date) => date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
        const formatWeekday = (date) => date.toLocaleDateString(undefined, { weekday: 'short' });

        if (timeDifference>oneWeek) {
            return `${msToTime(timeDifference, 1)}, ${formatMonth(endDate)} ${formatDay(endDate)} ${formatYear(endDate)}`;
        } else if (timeDifference<=oneWeek && timeDifference>oneDay) {
            return `${msToTime(timeDifference, 1)}, ${formatWeekday(endDate)}, ${formatTime(endDate).toLowerCase()}`;
        } else {
            return `${msToTime(timeDifference, 2)}, ${formatTime(endDate).toLowerCase()}`;
        }
    }

    // Global Function For Android
    let isCurrentlyPlaying = false;
    window.returnedAppIsVisible = (inAndroidApp) => {
        // Only For Android, and workaround for Alert visibility
        if (!$android) return;
        $inApp = inAndroidApp;
        if (!$popupVisible || $initData) return;
        let visibleTrailer =
            mostVisiblePopupHeader?.querySelector?.(".trailer");
        if (!visibleTrailer) return;
        if ($inApp) {
            for (let i = 0; i < $ytPlayers.length; i++) {
                if (
                    $ytPlayers[i]?.ytPlayer.g === visibleTrailer &&
                    ($autoPlay ||
                        ($ytPlayers[i]?.ytPlayer?.getPlayerState?.() === 2 &&
                            isCurrentlyPlaying))
                ) {
                    prePlayYtPlayer($ytPlayers[i]?.ytPlayer);
                    $ytPlayers[i]?.ytPlayer?.playVideo?.();
                } else {
                    $ytPlayers[i]?.ytPlayer?.pauseVideo?.();
                }
            }
        } else {
            isCurrentlyPlaying = false;
            for (let i = 0; i < $ytPlayers.length; i++) {
                if (
                    $ytPlayers[i]?.ytPlayer.g === visibleTrailer &&
                    $ytPlayers[i]?.ytPlayer?.getPlayerState?.() === 1
                ) {
                    isCurrentlyPlaying = true;
                }
                $ytPlayers[i]?.ytPlayer?.pauseVideo?.();
            }
        }
    };
    document.addEventListener("visibilitychange", () => {
        // Only for Browsers
        if ($android) return;
        $inApp = document.visibilityState === "visible";
        if (!$popupVisible || $initData) return;
        let visibleTrailer =
            mostVisiblePopupHeader?.querySelector?.(".trailer");
        if (!visibleTrailer) return;
        if ($inApp) {
            for (let i = 0; i < $ytPlayers.length; i++) {
                if (
                    $ytPlayers[i]?.ytPlayer.g === visibleTrailer &&
                    ($autoPlay ||
                        ($ytPlayers[i]?.ytPlayer?.getPlayerState?.() === 2 &&
                            isCurrentlyPlaying))
                ) {
                    prePlayYtPlayer($ytPlayers[i]?.ytPlayer);
                    $ytPlayers[i]?.ytPlayer?.playVideo?.();
                } else {
                    $ytPlayers[i]?.ytPlayer?.pauseVideo?.();
                }
            }
        } else {
            isCurrentlyPlaying = false;
            for (let i = 0; i < $ytPlayers.length; i++) {
                if (
                    $ytPlayers[i]?.ytPlayer.g === visibleTrailer &&
                    $ytPlayers[i]?.ytPlayer?.getPlayerState?.() === 1
                ) {
                    isCurrentlyPlaying = true;
                }
                $ytPlayers[i]?.ytPlayer?.pauseVideo?.();
            }
        }
    });

    window.addEventListener("online", () => {
        if ($android) {
            try {
                JSBridge.isOnline(true);
            } catch (e) {}
        }
        $dataStatus = "Reconnected Successfully";
        if ($initData) {
            $initData = false;
        }
        if (!$finalAnimeList?.length) {
            $updateRecommendationList = !$updateRecommendationList;
        }
        isOnline = true;
        document.querySelectorAll("link")?.forEach((link) => {
            if (link.href) {
                link.href = link.href;
            }
        });
        document.querySelectorAll("script")?.forEach((script) => {
            if (
                script.src &&
                script.src !== "https://www.youtube.com/iframe_api?v=16"
            ) {
                script.src = script.src;
            }
        });
        document.querySelectorAll("img")?.forEach((image) => {
            if (!image.naturalHeight) {
                image.src = image.src;
            }
        });
        loadYouTubeAPI().then(() => {
            $ytPlayers = $ytPlayers.filter(({ ytPlayer }) => {
                if (
                    typeof ytPlayer?.playVideo === "function" &&
                    ytPlayer.getPlayerState() !== -1 &&
                    !isNaN(ytPlayer.getPlayerState())
                ) {
                    return true;
                } else {
                    ytPlayer.destroy();
                    let popupImg = ytPlayer?.g
                        ?.closest?.(".popup-header")
                        ?.querySelector?.(".popup-img");
                    if (popupImg instanceof Element) {
                        removeClass(popupImg, "display-none");
                    }
                    return false;
                }
            });
            playMostVisibleTrailer();
        });
    });
    window.addEventListener("offline", () => {
        $dataStatus = "Currently Offline...";
        isOnline = false;
    });
    function loadYouTubeAPI() {
        return new Promise((resolve) => {
            let existingScript = document.getElementById(
                "www-widgetapi-script"
            );
            if (existingScript) {
                existingScript.parentElement.removeChild(existingScript);
            }
            let tag = document.createElement("script");
            tag.src = "https://www.youtube.com/iframe_api?v=16";
            tag.onerror = () => {
                resolve();
            };
            tag.onload = () => {
                window?.onYouTubeIframeAPIReady?.();
                resolve();
            };
            let firstScriptTag = document.getElementsByTagName("script")[0];
            firstScriptTag.parentElement.insertBefore(tag, firstScriptTag);
        });
    }
    function openDescription(event) {
        let popupMain = event.target.closest(".popup-main");
        let descriptionEl = popupMain?.querySelector?.(
            ".anime-description-container"
        );
        if (descriptionEl) {
            event.stopPropagation();
            let classList = descriptionEl?.classList;
            if (classList.contains("display-none")) {
                removeClass(descriptionEl, "display-none");
                removeClass(descriptionEl, "fade-out");
                addClass(descriptionEl, "fade-in");
            } else {
                removeClass(descriptionEl, "fade-in");
                addClass(descriptionEl, "fade-out");
                setTimeout(() => {
                    addClass(descriptionEl, "display-none");
                }, 300);
            }
        }
    }
    function closeDescription(event) {
        let descriptionEl = event.target;
        let classList = descriptionEl?.classList;
        if (!classList.contains("anime-description-container")) {
            descriptionEl = descriptionEl.closest(
                ".anime-description-container"
            );
        }
        if (descriptionEl) {
            event.stopPropagation();
            removeClass(descriptionEl, "fade-in");
            addClass(descriptionEl, "fade-out");
            setTimeout(() => {
                addClass(descriptionEl, "display-none");
            }, 300);
        }
    }

    function horizontalWheel(event, parentClass) {
        let element = event.target;
        let classList = element.classList;
        if (!classList.contains(parentClass)) {
            element = element.closest("." + parentClass);
        }
        if (element.scrollWidth <= element.clientWidth) return;
        if (event.deltaY !== 0 && event.deltaX === 0) {
            event.preventDefault();
            element.scrollLeft = Math.max(0, element.scrollLeft + event.deltaY);
        }
    }
    function htmlToString(s) {
        let span = document.createElement("span");
        span.innerHTML = s;
        return span.textContent || span.innerText;
    }
    function editHTMLString(s) {
        let span = document.createElement("span");
        span.innerHTML = s;
        let links = span.querySelectorAll("a");
        Array.from(links).forEach((linkEl) => {
            linkEl?.setAttribute("rel", "noopener noreferrer");
            linkEl?.setAttribute("target", "_blank");
        });
        return span.innerHTML;
    }
    window.addEventListener("click", (event) => {
        let element = event.target;
        let classList = element.classList;

        let parentElement;
        if (classList?.contains?.("popup-main")) {
            parentElement = element;
        } else {
            parentElement = element?.closest?.(".popup-main");
        }
        if (parentElement) {
            let descriptionEl = parentElement.querySelector(
                ".anime-description-container"
            );
            if (
                descriptionEl &&
                !descriptionEl?.classList?.contains?.("fade-out")
            ) {
                removeClass(descriptionEl, "fade-in");
                addClass(descriptionEl, "fade-out");
                setTimeout(() => {
                    addClass(descriptionEl, "display-none");
                }, 300);
            }
        }
    });

    let willHandleDescription,
        isOpeningDesc,
        willCloseDescRight,
        touchID,
        checkPointer,
        startX,
        endX,
        startY,
        endY,
        goBackPercent,
        showDescPercent;
    function itemScroll() {
        $popupIsGoingBack = willHandleDescription = willCloseDescRight = false;
        goBackPercent = 0;
    }
    function handlePopupContainerDown(event) {
        startX = event.touches[0].clientX;
        startY = event.touches[0].clientY;
        touchID = event.touches[0].identifier;
        let element = event.target;
        let closestScrollableLeftElement = element;
        let hasScrollableLeftElement = false;
        while (
            closestScrollableLeftElement &&
            closestScrollableLeftElement !== document.body
        ) {
            const isScrollableLeft =
                closestScrollableLeftElement.scrollWidth >
                    closestScrollableLeftElement.clientWidth &&
                closestScrollableLeftElement.scrollLeft > 0;
            if (isScrollableLeft) {
                if (closestScrollableLeftElement.id === "popup-container") {
                    hasScrollableLeftElement = false;
                } else {
                    hasScrollableLeftElement = true;
                }
                break;
            }
            closestScrollableLeftElement =
                closestScrollableLeftElement.parentElement;
        }
        if (hasScrollableLeftElement) return;
        checkPointer = true;
    }
    function handlePopupContainerMove(event) {
        if (checkPointer) {
            checkPointer = false;
            endX = event.touches[0].clientX;
            endY = event.touches[0].clientY;
            const deltaX = endX - startX;
            const deltaY = endY - startY;
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                if (deltaX > 0) {
                    event.stopImmediatePropagation();
                    let popupMain = event.target.closest(".popup-main");
                    let descriptionEl = popupMain?.querySelector?.(
                        ".anime-description-container"
                    );
                    if (
                        descriptionEl &&
                        !descriptionEl?.classList.contains("display-none")
                    ) {
                        willHandleDescription = willCloseDescRight = true;
                        removeClass(descriptionEl, "fade-out");
                        removeClass(descriptionEl, "fade-in");
                        removeClass(descriptionEl, "display-none");
                    } else {
                        $popupIsGoingBack = true;
                    }
                } else if (deltaX < 0) {
                    let hasScrollableXElement;
                    let closestScrollableXElement = event.target;
                    while (
                        closestScrollableXElement &&
                        closestScrollableXElement !== document.body
                    ) {
                        const isScrollableX =
                            closestScrollableXElement.scrollWidth >
                            closestScrollableXElement.clientWidth;
                        if (isScrollableX) {
                            hasScrollableXElement = true;
                            break;
                        }
                        closestScrollableXElement =
                            closestScrollableXElement.parentElement;
                    }
                    if (!hasScrollableXElement) {
                        let popupMain = event.target.closest(".popup-main");
                        let descriptionEl = popupMain?.querySelector?.(
                            ".anime-description-container"
                        );
                        if (descriptionEl) {
                            event.stopImmediatePropagation();
                            willHandleDescription = true;
                            let classList = descriptionEl?.classList;
                            if (classList.contains("display-none")) {
                                isOpeningDesc = true
                            } else {
                                isOpeningDesc = false
                            }
                            removeClass(descriptionEl, "fade-in");
                            removeClass(descriptionEl, "fade-out");
                            removeClass(descriptionEl, "display-none");
                        }
                    }
                }
            }
        } else if ($popupIsGoingBack) {
            endX = event.touches[0].clientX;
            const deltaX = endX - startX;
            if (deltaX > 0) {
                goBackPercent = Math.min((deltaX / 48) * 100, 100);
            } else {
                goBackPercent = 0;
            }
        } else if (willHandleDescription) {
            endX = event.touches[0].clientX;
            const deltaX = endX - startX;
            if (willCloseDescRight) {
                if (deltaX > 0) {
                    showDescPercent = Math.max(1 - deltaX / 48, 0);
                } else {
                    showDescPercent = 1;
                }
            } else {
                if (isOpeningDesc) {
                    if (deltaX < 0) {
                        showDescPercent = Math.min(Math.abs(deltaX) / 48, 1);
                    } else {
                        showDescPercent = 0;
                    }
                } else {
                    if (deltaX < 0) {
                        showDescPercent = Math.max(1 - (Math.abs(deltaX) / 48), 0);
                    } else {
                        showDescPercent = 1;
                    }
                }
            }
        }
    }
    function handlePopupContainerUp(event) {
        if ($popupIsGoingBack || willHandleDescription) {
            endX = Array.from(event.changedTouches).find(
                (touch) => touch.identifier === touchID
            ).clientX;
            let xThreshold = 48;
            let deltaX = endX - startX;
            if ($popupIsGoingBack && deltaX >= xThreshold) {
                $popupVisible = false
            } else if (willCloseDescRight) {
                if (deltaX >= xThreshold) {
                    let popupMain = event.target.closest(".popup-main");
                    let descriptionEl = popupMain?.querySelector?.(
                        ".anime-description-container"
                    );
                    if (descriptionEl) {
                        event.stopPropagation();
                        showDescPercent = 0;
                        setTimeout(() => {
                            addClass(descriptionEl, "display-none");
                        }, 300);
                    }
                } else {
                    let popupMain = event.target.closest(".popup-main");
                    let descriptionEl = popupMain?.querySelector?.(
                        ".anime-description-container"
                    );
                    if (descriptionEl) {
                        showDescPercent = 1;
                        setTimeout(() => {
                            removeClass(descriptionEl, "display-none");
                        }, 300);
                    }
                }
            } else if (willHandleDescription) {
                let popupMain = event.target.closest(".popup-main");
                let descriptionEl = popupMain?.querySelector?.(
                    ".anime-description-container"
                );
                if (descriptionEl) {
                    event.stopPropagation();
                    if (isOpeningDesc) {
                        if (deltaX <= -xThreshold) {
                            showDescPercent = 1;
                            setTimeout(() => {
                                removeClass(descriptionEl, "display-none");
                            }, 300);
                        } else {
                            showDescPercent = 0;
                            setTimeout(() => {
                                addClass(descriptionEl, "display-none");
                            }, 300);
                        }
                    } else {
                        if (deltaX <= -xThreshold) {
                            showDescPercent = 0;
                            setTimeout(() => {
                                addClass(descriptionEl, "display-none");
                            }, 300);
                        } else {
                            showDescPercent = 1;
                            setTimeout(() => {
                                removeClass(descriptionEl, "display-none");
                            }, 300);
                        }
                    }
                }
            }
            touchID = null;
            $popupIsGoingBack =
                willHandleDescription =
                willCloseDescRight =
                    false;
            goBackPercent = 0;
        } else {
            touchID = null;
            $popupIsGoingBack =
                willHandleDescription =
                willCloseDescRight =
                    false;
            goBackPercent = 0;
        }
    }
    function handlePopupContainerCancel() {
        touchID = null;
        $popupIsGoingBack = willHandleDescription = willCloseDescRight = false;
        goBackPercent = 0;
    }
</script>

<div
    id="popup-wrapper"
    class="popup-wrapper"
    on:click={handlePopupVisibility}
    on:keydown={(e) => e.key === "Enter" && handlePopupVisibility(e)}
    bind:this={popupWrapper}
>
    <div
        id="popup-container"
        class="popup-container hide"
        style:--translateY={windowHeight + "px"}
        bind:this={popupContainer}
        on:touchstart={handlePopupContainerDown}
        on:touchmove={handlePopupContainerMove}
        on:touchend={handlePopupContainerUp}
        on:touchcancel={handlePopupContainerCancel}
        on:scroll={itemScroll}
    >
        {#if $finalAnimeList?.length}
            {#each $finalAnimeList || [] as anime, animeIdx (anime.id)}
                <div class="popup-content" bind:this={anime.popupContent}>
                    <div class="popup-main">
                        <div
                            class={"popup-header " +
                                (anime.trailerID ? "loader" : "")}
                            bind:this={anime.popupHeader}
                            on:click={openDescription}
                            on:keydown={(e) =>
                                e.key === "Enter" && openDescription(e)}
                        >
                            <div class="popup-header-loading">
                                <i class="fa-solid fa-k fa-fade" />
                            </div>
                            {#if anime.trailerID}
                                <div class="trailer display-none" />
                            {/if}
                            <div class="popup-img">
                                {#if anime.bannerImageUrl}
                                    <img
                                        loading="lazy"
                                        src={anime.bannerImageUrl}
                                        alt="bannerImg"
                                        class="bannerImg fade-out"
                                        on:load={(e) => {
                                            removeClass(e.target, "fade-out");
                                            addClass(e.target, "fade-in");
                                        }}
                                    />
                                {/if}
                                {#if anime.coverImageUrl}
                                    {#if anime.bannerImageUrl}
                                        <img
                                            loading="lazy"
                                            src={anime.coverImageUrl}
                                            alt="coverImg"
                                            class="coverImg display-none fade-out"
                                            on:load={(e) => {
                                                removeClass(
                                                    e.target,
                                                    "fade-out"
                                                );
                                                addClass(e.target, "fade-in");
                                            }}
                                        />
                                    {:else}
                                        <img
                                            loading="lazy"
                                            src={anime.coverImageUrl}
                                            alt="coverImg"
                                            class="coverImg fade-out"
                                            on:load={(e) => {
                                                removeClass(
                                                    e.target,
                                                    "fade-out"
                                                );
                                                addClass(e.target, "fade-in");
                                            }}
                                        />
                                    {/if}
                                {/if}
                            </div>
                            {#if anime?.description}
                                <div
                                    class="anime-description-container copy display-none fade-out"
                                    copy-value={htmlToString(
                                        anime?.description
                                    )}
                                    on:click={closeDescription}
                                    on:keydown={(e) =>
                                        e.key === "Enter" &&
                                        closeDescription(e)}
                                    style:--showDescPercent={showDescPercent}
                                >
                                    <div class="anime-description">
                                        {@html editHTMLString(
                                            anime?.description
                                        )}
                                    </div>
                                </div>
                            {/if}
                        </div>
                        <div class="popup-controls">
                            {#if $listUpdateAvailable}
                                <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                                <div
                                    class="list-update-container"
                                    tabindex="0"
                                    on:click={updateList}
                                    on:keydown={(e) =>
                                        e.key === "Enter" && updateList(e)}
                                    transition:fly={{ x: -50, duration: 300 }}
                                >
                                    <i
                                        class="list-update-icon fa-solid fa-arrows-rotate"
                                    />
                                    <h3 class="list-update-label">
                                        {windowWidth >= 350
                                            ? "List Update Available"
                                            : windowWidth >= 283
                                            ? "Update Available"
                                            : windowWidth >= 236
                                            ? "Available"
                                            : ""}
                                    </h3>
                                </div>
                            {/if}
                            <div class="autoPlay-container">
                                <h3 class="autoplay-label">Auto Play</h3>
                                <label class="switch">
                                    <input
                                        type="checkbox"
                                        class="autoplayToggle"
                                        bind:checked={$autoPlay}
                                    />
                                    <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                                    <span
                                        class="slider round"
                                        tabindex="0"
                                        on:keydown={(e) =>
                                            e.key === "Enter" &&
                                            (() => ($autoPlay = !$autoPlay))()}
                                    />
                                </label>
                            </div>
                        </div>
                        <div class="popup-body">
                            <div
                                class="anime-title-container"
                                style:overflow={$popupIsGoingBack
                                    ? "hidden"
                                    : ""}
                            >
                                <a
                                    rel="noopener noreferrer"
                                    target="_blank"
                                    href={anime.animeUrl || ""}
                                    class={getCautionColor(anime) +
                                        "-color anime-title copy"}
                                    copy-value={anime?.title?.userPreferred ||
                                        ""}
                                    style:overflow={$popupIsGoingBack
                                        ? "hidden"
                                        : ""}
                                    >{anime?.title?.userPreferred || "N/A"}</a
                                >
                                <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                                {#if anime?.description}
                                    <i
                                        class={"fa-solid fa-circle-info "+(getUserStatusColor(
                                            anime.userStatus
                                        ) +
                                            "-color")}
                                        tabindex="0"
                                        on:click={openDescription}
                                        on:keydown={(e) =>
                                            e.key === "Enter" &&
                                            openDescription(e)}
                                    />
                                {:else}
                                    <i
                                        class={"cursor-default fa-solid fa-circle "+(getUserStatusColor(
                                            anime.userStatus
                                        ) +
                                            "-color")}
                                    />
                                {/if}
                            </div>
                            <div
                                class={"info-list " +
                                    (anime.isSeenMore ? "seenmore" : "")}
                                style:--windowWidth={windowWidth + "px"}
                                style:--windowHeight={windowHeight + "px"}
                            >
                                {#if getFormattedAnimeFormat(anime)}
                                    <div>
                                        <div class="info-categ">Format</div>
                                        <div
                                            class={"format-popup info not-capitalize" +
                                                ($hasWheel ? " hasWheel" : "")}
                                            on:wheel={(e) =>
                                                horizontalWheel(e, "info")}
                                            style:overflow={$popupIsGoingBack
                                                ? "hidden"
                                                : ""}
                                        >
                                            {#if anime?.nextAiringEpisode?.airingAt}
                                                {#key date.getSeconds()}
                                                    <span
                                                        class="copy"
                                                        copy-value={getFormattedAnimeFormat(
                                                            anime
                                                        ) || ""}
                                                    >
                                                        {getFormattedAnimeFormat(
                                                            anime
                                                        ) || "N/A"}
                                                    </span>
                                                {/key}
                                            {:else}
                                                <span
                                                    class="copy"
                                                    copy-value={getFormattedAnimeFormat(
                                                        anime
                                                    ) || ""}
                                                >
                                                    {getFormattedAnimeFormat(
                                                        anime
                                                    ) || "N/A"}
                                                </span>
                                            {/if}
                                        </div>
                                    </div>
                                {/if}
                                {#if Object.entries(anime?.studios || {}).length}
                                    <div>
                                        <div class="info-categ">Studio</div>
                                        <div
                                            class={"studio-popup info" +
                                                ($hasWheel ? " hasWheel" : "")}
                                            on:wheel={(e) =>
                                                horizontalWheel(e, "info")}
                                            style:overflow={$popupIsGoingBack
                                                ? "hidden"
                                                : ""}
                                        >
                                            {#each getStudios(Object.entries(anime.studios || {}), anime?.favoriteContents?.studios) as { studio, studioColor } (studio)}
                                                <span
                                                    class={"copy"}
                                                    copy-value={studio.studioName ||
                                                        ""}
                                                >
                                                    <a
                                                        class={studioColor
                                                            ? `${studioColor}-color`
                                                            : ""}
                                                        rel="noopener noreferrer"
                                                        target="_blank"
                                                        href={studio.studioUrl ||
                                                            ""}
                                                        >{studio.studioName ||
                                                            "N/A"}</a
                                                    >
                                                </span>
                                            {/each}
                                        </div>
                                    </div>
                                {/if}
                                {#if anime.genres.length}
                                    <div>
                                        <div class="info-categ">Genres</div>
                                        <div
                                            class={"genres-popup info" +
                                                ($hasWheel ? " hasWheel" : "")}
                                            on:wheel={(e) =>
                                                horizontalWheel(e, "info")}
                                            style:overflow={$popupIsGoingBack
                                                ? "hidden"
                                                : ""}
                                        >
                                            {#each getGenres(anime.genres, anime?.favoriteContents?.genres, anime.contentCaution) as { genre, genreColor } (genre)}
                                                <span
                                                    class={"copy " +
                                                        (genreColor
                                                            ? `${genreColor}-color`
                                                            : "")}
                                                    copy-value={genre || ""}
                                                    >{genre || "N/A"}
                                                </span>
                                            {/each}
                                        </div>
                                    </div>
                                {/if}
                                {#if anime?.tags?.length}
                                    <div>
                                        <div class="info-categ">Tags</div>
                                        <div
                                            class={"tags-popup info" +
                                                ($hasWheel ? " hasWheel" : "")}
                                            on:wheel={(e) =>
                                                horizontalWheel(e, "info")}
                                            style:overflow={$popupIsGoingBack
                                                ? "hidden"
                                                : ""}
                                        >
                                            {#each getTags(anime.tags, anime?.favoriteContents?.tags, anime.contentCaution) as { tag, tagColor } (tag)}
                                                <span
                                                    class={"copy " +
                                                        (tagColor
                                                            ? `${tagColor}-color`
                                                            : "")}
                                                    copy-value={tag || ""}
                                                    >{tag || "N/A"}
                                                </span>
                                            {/each}
                                        </div>
                                    </div>
                                {/if}
                                {#if getContentCaution(anime).length}
                                    <div>
                                        <div class="info-categ">
                                            Content Cautions
                                        </div>
                                        <div
                                            class={"content-caution-popup info" +
                                                ($hasWheel ? " hasWheel" : "")}
                                            on:wheel={(e) =>
                                                horizontalWheel(e, "info")}
                                            style:overflow={$popupIsGoingBack
                                                ? "hidden"
                                                : ""}
                                        >
                                            {#each getContentCaution(anime) || [] as { caution, cautionColor } (caution)}
                                                <span
                                                    class={cautionColor +
                                                        "-color copy"}
                                                    copy-value={caution || ""}
                                                >
                                                    {caution || "N/A"}
                                                </span>
                                            {/each}
                                        </div>
                                    </div>
                                {/if}
                                {#if anime.averageScore != null}
                                    <div>
                                        <div class="info-categ">
                                            Average Score
                                        </div>
                                        <div
                                            class={"average-score-popup info" +
                                                ($hasWheel ? " hasWheel" : "")}
                                            on:wheel={(e) =>
                                                horizontalWheel(e, "info")}
                                            style:overflow={$popupIsGoingBack
                                                ? "hidden"
                                                : ""}
                                        >
                                            <span
                                                class="copy"
                                                copy-value={anime.averageScore ??
                                                    ""}
                                            >
                                                {anime.averageScore ?? "N/A"}
                                            </span>
                                        </div>
                                    </div>
                                {/if}
                                {#if anime.popularity != null}
                                    <div>
                                        <div class="info-categ">Popularity</div>
                                        <div
                                            class={"popularity-popup info" +
                                                ($hasWheel ? " hasWheel" : "")}
                                            on:wheel={(e) =>
                                                horizontalWheel(e, "info")}
                                            style:overflow={$popupIsGoingBack
                                                ? "hidden"
                                                : ""}
                                        >
                                            <span
                                                class="copy"
                                                copy-value={anime.popularity ??
                                                    ""}
                                            >
                                                {anime.popularity || "N/A"}
                                            </span>
                                        </div>
                                    </div>
                                {/if}
                                {#if anime?.season || anime?.year}
                                    <div>
                                        <div class="info-categ">
                                            Season Year
                                        </div>
                                        <div
                                            class={"season-year-popup info" +
                                                ($hasWheel ? " hasWheel" : "")}
                                            on:wheel={(e) =>
                                                horizontalWheel(e, "info")}
                                            style:overflow={$popupIsGoingBack
                                                ? "hidden"
                                                : ""}
                                        >
                                            <span
                                                class="copy"
                                                copy-value={`${
                                                    anime?.season || ""
                                                }${
                                                    anime?.year
                                                        ? " " + anime.year
                                                        : ""
                                                }` || ""}
                                            >
                                                {`${anime?.season || ""}${
                                                    anime?.year
                                                        ? " " + anime.year
                                                        : ""
                                                }` || "N/A"}
                                            </span>
                                        </div>
                                    </div>
                                {/if}
                                {#if anime.status}
                                    <div>
                                        <div class="info-categ">
                                            Airing Status
                                        </div>
                                        <div
                                            class={"status-popup info" +
                                                ($hasWheel ? " hasWheel" : "")}
                                            on:wheel={(e) =>
                                                horizontalWheel(e, "info")}
                                            style:overflow={$popupIsGoingBack
                                                ? "hidden"
                                                : ""}
                                        >
                                            <span
                                                class="copy"
                                                copy-value={anime.status || ""}
                                            >
                                                {anime.status || "N/A"}
                                            </span>
                                        </div>
                                    </div>
                                {/if}
                                {#if anime.userStatus}
                                    <div>
                                        <div class="info-categ">
                                            User Status
                                        </div>
                                        <div
                                            class={"user-status-popup info" +
                                                ($hasWheel ? " hasWheel" : "")}
                                            on:wheel={(e) =>
                                                horizontalWheel(e, "info")}
                                            style:overflow={$popupIsGoingBack
                                                ? "hidden"
                                                : ""}
                                        >
                                            <span
                                                class={"copy " +
                                                    (getUserStatusColor(
                                                        anime.userStatus
                                                    ) +
                                                        "-color")}
                                                copy-value={anime.userStatus ||
                                                    ""}
                                            >
                                                {anime.userStatus || "N/A"}
                                            </span>
                                        </div>
                                    </div>
                                {/if}
                                {#if anime.userScore != null}
                                    <div>
                                        <div class="info-categ">User Score</div>
                                        <div
                                            class={"user-score-popup info" +
                                                ($hasWheel ? " hasWheel" : "")}
                                            on:wheel={(e) =>
                                                horizontalWheel(e, "info")}
                                            style:overflow={$popupIsGoingBack
                                                ? "hidden"
                                                : ""}
                                        >
                                            <span
                                                class="copy"
                                                copy-value={anime.userScore ??
                                                    ""}
                                            >
                                                {anime.userScore ?? "N/A"}
                                            </span>
                                        </div>
                                    </div>
                                {/if}
                                {#if formatNumber(anime.score) != null}
                                    <div>
                                        <div class="info-categ">Score</div>
                                        <div
                                            class={"score-popup info" +
                                                ($hasWheel ? " hasWheel" : "")}
                                            on:wheel={(e) =>
                                                horizontalWheel(e, "info")}
                                            style:overflow={$popupIsGoingBack
                                                ? "hidden"
                                                : ""}
                                        >
                                            <span
                                                class="copy"
                                                copy-value={anime.score ?? ""}
                                            >
                                                {formatNumber(anime.score) ??
                                                    "N/A"}
                                            </span>
                                        </div>
                                    </div>
                                {/if}
                            </div>
                            <div class="footer">
                                <button
                                    class="seemoreless"
                                    on:click={handleSeeMore(anime, animeIdx)}
                                    on:keydown={(e) => e.key === "Enter"}
                                    style:overflow={$popupIsGoingBack
                                        ? "hidden"
                                        : ""}
                                    >{"See " +
                                        (anime.isSeenMore
                                            ? "Less"
                                            : "More")}</button
                                >
                                <button
                                    class="hideshowbtn"
                                    on:click={handleHideShow(anime.id)}
                                    on:keydown={(e) =>
                                        e.key === "Enter" &&
                                        handleHideShow(anime.id)}
                                    >{getHiddenStatus(anime.id) ||
                                        "N/A"}</button
                                >
                            </div>
                        </div>
                    </div>
                </div>
            {/each}
            {#if $finalAnimeList?.length && !$shownAllInList}
                <div class="popup-content-loading">
                    <i
                        class="popup-content-loading-icon fa-solid fa-k fa-fade"
                    />
                </div>
            {/if}
        {/if}
    </div>
</div>
{#if $popupVisible && $popupIsGoingBack}
    <div
        class="go-back-grid-highlight"
        style:--scale={Math.max(1, (goBackPercent ?? 1) * 0.01 * 2)}
        style:--position={"-" + (100 - (goBackPercent ?? 0)) + "%"}
        out:fly={{ x: -176, duration: 1000 }}
    >
        <div
            class={"go-back-grid" + (goBackPercent >= 100 ? " willGoBack" : "")}
        >
            <i class="fa-solid fa-arrow-left" />
        </div>
    </div>
{/if}

<style>
    .popup-wrapper {
        position: fixed;
        z-index: 995;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        overflow: hidden;
        transform: translateY(-99999px);
        will-change: transform;
    }

    .popup-wrapper.visible {
        transform: translateY(0);
    }

    .popup-container {
        will-change: transform;
        width: 100%;
        max-width: 640px;
        overflow-y: auto;
        overflow-x: hidden;
        overscroll-behavior: contain;
        background-color: #151f2e;
        transition: transform 0.3s ease;
        margin-top: 55px;
    }

    .popup-container.hide {
        transform: translateY(var(--translateY));
    }

    .popup-container.show {
        transform: translateY(0px);
    }

    .popup-container::-webkit-scrollbar {
        display: none;
    }

    .go-back-grid-highlight {
        position: fixed;
        display: flex;
        justify-content: center;
        align-items: center;
        top: 50%;
        left: 0;
        transform: translateY(-50%) translateX(var(--position));
        background-color: rgb(103, 187, 254, 0.5);
        width: calc(44px * var(--scale));
        height: calc(44px * var(--scale));
        border-radius: 50%;
        z-index: 9000;
    }

    .go-back-grid {
        position: absolute;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 6px;
        background-color: white;
        color: black;
        cursor: pointer;
        border-radius: 50%;
        max-width: 44px;
        max-height: 44px;
        min-width: 44px;
        min-height: 44px;
    }

    .go-back-grid.willGoBack {
        background-color: black;
        color: white;
    }

    .go-back-grid i {
        font-size: 2em;
    }

    .popup-content {
        display: grid;
        grid-template-columns: 100%;
        color: #a2a8bd;
        background-color: #151f2e;
        max-width: 640px;
    }
    .popup-content.hidden {
        height: var(--popup-content-height);
    }

    .popup-main {
        display: initial;
    }
    :global(.popup-content.hidden > .popup-main) {
        display: none !important;
    }

    .popup-header {
        width: 100%;
        position: relative;
        padding-bottom: 56.25%;
        background: #000;
        user-select: none !important;
        cursor: pointer;
    }

    .popup-header-loading {
        display: none;
    }

    :global(.popup-header.loader .popup-header-loading) {
        display: flex !important;
        justify-content: center;
        align-items: center;
        position: absolute;
        bottom: 1em;
        right: 1em;
        z-index: 3;
        background-color: #000;
        border-radius: 100%;
        width: 40px;
        height: 40px;
    }

    :global(.popup-header.loader i) {
        font-size: 20px;
        color: #fff;
    }

    .popup-content-loading {
        display: flex;
        justify-content: center;
        align-items: center;
        max-width: 640px;
        padding: 2em;
        background-color: #000;
    }

    .popup-content-loading-icon {
        font-size: 35px;
    }

    /* Need to add Globally, trailer Elements are Recreated */
    :global(.trailer) {
        z-index: 0;
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        cursor: unset;
    }

    .popup-img {
        transition: opacity 0.3s ease;
        width: 100%;
        background-color: #000 !important;
        z-index: 2;
    }

    .popup-img.fade-out {
        opacity: 0;
    }

    .bannerImg {
        height: 100%;
        width: 100%;
        position: absolute;
        object-fit: cover;
        object-position: center;
    }

    .bannerImg::after {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
    }
    .bannerImg.fade-out {
        animation: fadeOut 0.3s ease forwards;
        opacity: 0;
    }
    .bannerImg.fade-in {
        animation: fadeIn 0.3s ease forwards;
        opacity: 1;
    }

    .coverImg {
        height: 100%;
        max-height: clamp(1px, 70%, 20em);
        width: auto;
        object-fit: cover;
        position: absolute;
        left: 50%;
        bottom: 0;
        transform: translateX(-50%);
        border-radius: 2px 2px 0 0;
        box-shadow: 0 14px 28px rgba(0, 0, 0, 0.25),
            0 10px 10px rgba(0, 0, 0, 0.22);
    }
    .coverImg.fade-out {
        animation: fadeOut 0.3s ease forwards;
        opacity: 0;
    }
    .coverImg.fade-in {
        animation: fadeIn 0.3s ease forwards;
        opacity: 1;
    }

    .popup-body {
        overflow: hidden;
        touch-action: pan-y;
        margin: 2em 2.4em;
    }

    .popup-body a {
        color: rgb(61, 180, 242);
        text-decoration: none;
    }

    .anime-title-container {
        height: 38px;
        width: 100%;
        overflow-x: auto;
        overflow-y: hidden;
        white-space: nowrap;
        align-items: center;
        display: grid;
        grid-template-columns: calc(100% - 26px - 1em) 2em;
        grid-column-gap: 1em;
        padding-right: 1px;
    }

    .anime-title-container::-webkit-scrollbar {
        display: none;
    }

    .anime-title-container i {
        font-size: 2em;
        cursor: pointer;
    }

    .anime-description-container {
        position: absolute;
        background: linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0.8),
            rgba(0, 0, 0, 0.34)
        );
        width: 100%;
        height: 100%;
        font-size: 1.5rem;
        color: #fff;
        transition: opacity 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: var(--showDescPercent);
        transition: opacity 0.3s ease;
        z-index: 4;
    }
    .anime-description-container.fade-out {
        transition: unset !important;
        animation: fadeOut 0.3s ease forwards;
        opacity: 0;
    }
    .anime-description-container.fade-in {
        transition: unset !important;
        animation: fadeIn 0.3s ease forwards;
        opacity: 1;
    }

    .anime-description {
        margin: 1em;
        width: calc(100% - 2em);
        height: calc(100% - 2em);
        max-height: 240px;
        max-width: 580px;
        overflow-y: auto;
        overflow-x: hidden;
        letter-spacing: 0.05rem;
        line-height: 2.5rem;
    }

    :global(.anime-description *) {
        font-size: 1.5rem !important;
    }
    :global(.anime-description a) {
        color: rgb(0 168 255) !important;
        text-decoration: none !important;
    }

    .anime-description::-webkit-scrollbar {
        display: none;
    }

    .anime-title {
        margin: 0 0 0 0.2em;
        padding: 0.5em 0.3em 0.5em 0.3em;
        border-radius: 6px;
        cursor: pointer;
        font-size: clamp(1.6309rem, 1.76545rem, 1.9rem);
        overflow-x: auto;
        overflow-y: hidden;
        width: min-content;
        max-width: 100%;
    }

    .anime-title::-webkit-scrollbar {
        display: none;
    }

    .anime-title:hover {
        background-color: rgba(0, 0, 0, 0.5);
    }

    .anime-title {
        text-decoration: none;
    }

    .footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1em;
        user-select: none !important;
        width: 100%;
    }

    .hideshowbtn,
    .seemoreless {
        padding: 0.5em 1.5em 0.5em 1.5em;
        border-radius: 0.1em;
        border: 0;
        background-color: #0b1622 !important;
        cursor: pointer;
        color: #9ba0b2;
        white-space: nowrap;
        max-width: 95px;
        flex: 1;
        overflow-x: auto;
        overflow-y: hidden;
    }

    .seemoreless::-webkit-scrollbar,
    .hideshowbtn::-webkit-scrollbar {
        display: none;
    }

    .info-list {
        max-height: max(
            calc(
                var(--windowHeight) -
                    calc(
                        (calc(360 * min(var(--windowWidth), 640px)) / 640) +
                            55px + 30px + 4em + 38px + 2.1em + 30px
                    )
            ),
            120px
        );
        overflow: hidden;
        display: grid;
        grid-template-columns: repeat(2, calc(50% - 2em));
        column-gap: 2em;
        padding: 0 0.8em !important;
        margin: 0.5em 0 1.6em 0;
    }

    .info-list.seenmore {
        max-height: unset !important;
    }

    @media screen and (max-width: 425px) {
        .info-list {
            max-height: max(
                calc(
                    var(--windowHeight) -
                        calc(
                            (calc(360 * min(var(--windowWidth), 640px)) / 640) +
                                55px + 30px + 4em + 38px + 2.1em + 30px
                        )
                ),
                240px
            ) !important;
            grid-template-columns: 100% !important;
        }
    }

    .info-list-wrapper,
    .info-categ,
    .info {
        margin-bottom: 0.8em;
    }

    .info-categ {
        font-size: clamp(1.0631rem, 1.15155rem, 1.24rem);
        font-weight: 500;
        user-select: none !important;
    }

    .info {
        font-size: clamp(1.018rem, 1.099rem, 1.18rem);
        text-transform: capitalize;
        max-height: 30px;
        overflow-y: hidden;
        overflow-x: auto;
        display: flex;
        gap: 8px;
        width: 100%;
    }

    .not-capitalize {
        text-transform: none !important;
    }

    .info::-webkit-scrollbar {
        display: none;
    }

    .info span {
        color: #9ba0b2;
        background: #0b1622;
        padding: 8px 10px;
        border-radius: 6px;
        white-space: nowrap;
    }

    .info span::-webkit-scrollbar {
        display: none;
    }

    .popup-controls {
        background: #0b1622 !important;
        display: flex;
        padding: 5px 2.4em;
        user-select: none;
        justify-content: space-between;
        gap: 1em;
    }

    .list-update-container {
        display: flex;
        align-items: center;
        gap: 6px;
        color: #9ba0b2;
        cursor: pointer;
    }
    .list-update-icon {
        font-size: 1.4rem;
        cursor: pointer;
    }

    .list-update-label {
        height: 14px;
        line-height: 14px;
        font-weight: 500;
        color: #9ba0b2;
        white-space: nowrap;
        cursor: pointer;
    }

    .autoPlay-container {
        display: flex;
        margin-left: auto;
        align-items: center;
        gap: 6px;
    }

    .autoplay-label {
        height: 14px;
        line-height: 14px;
        font-weight: 500;
        color: #9ba0b2;
        white-space: nowrap;
    }

    .switch {
        position: relative;
        display: inline-block;
        width: 43px;
        height: 20px;
    }

    .autoplayToggle {
        display: none;
    }

    .slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #767284;
        -webkit-transition: 0.4s transform;
        transition: 0.4s transform;
    }

    .slider:before {
        position: absolute;
        content: "";
        height: 16px;
        width: 16px;
        left: 2px;
        bottom: 2px;
        background-color: #fff;
        -webkit-transition: 0.4s transform;
        transition: 0.4s transform;
    }

    .autoplayToggle:checked + .slider {
        background-color: #596373;
    }

    .autoplayToggle:focus + .slider {
        box-shadow: 0 0 1px #767284;
    }

    .autoplayToggle:checked + .slider:before {
        -webkit-transform: translateX(22px);
        -ms-transform: translateX(22px);
        transform: translateX(22px);
    }

    .slider {
        border-radius: 34px;
    }

    .slider:before {
        border-radius: 50%;
    }

    .cursor-default {
        cursor: default !important;
    }
</style>
