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
        getMostVisibleElement,
        jsonIsEmpty,
        ncsCompare,
        dragScroll,
    } from "../../../js/others/helper.js";
    import { retrieveJSON, saveJSON } from "../../../js/indexedDB.js";
    import { animeLoader } from "../../../js/workerUtils.js";

    let isOnline = window.navigator.onLine;

    let date = new Date();
    let savedYtVolume = $android ? 100 : 50;

    (async () => {
        savedYtVolume = (await retrieveJSON("savedYtVolume")) || savedYtVolume;
    })();

    let animeGridParentEl,
        mostVisiblePopupHeader,
        currentHeaderIdx,
        currentYtPlayer,
        mainHome,
        popupWrapper,
        popupContainer,
        popupAnimeObserver,
        fullImagePopup,
        fullDescriptionPopup,
        windowWidth = window.visualViewport.width,
        windowHeight = window.visualViewport.height,
        videoLoops = {};

    function addPopupObserver() {
        popupAnimeObserver = new IntersectionObserver(
            () => {
                if (!$popupVisible) return;
                let visiblePopupHeader =
                    getMostVisibleElement(
                        popupContainer,
                        ".popup-header",
                        windowHeight > 360 ? 0.5 : 0
                    ) ||
                    getMostVisibleElement(
                        popupContainer,
                        ".popup-content",
                        0
                    )?.getElementsByClassName("popup-header")?.[0];
                mostVisiblePopupHeader = visiblePopupHeader;
                playMostVisibleTrailer();
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
            classList.contains("popup-container") ||
            target.closest(".popup-container")
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

    async function askToOpenYoutube(title) {
        let animeTitle;
        if (isJsonObject(title)) {
            animeTitle =
                title?.romaji ||
                title?.userPreferred ||
                title?.english ||
                title?.native;
        } else if (typeof title === "string") {
            animeTitle = title;
        }
        if (typeof animeTitle !== "string" || animeTitle === "") return;
        if (
            await $confirmPromise({
                title: "See Related Videos",
                text: "Are you sure you want see more related videos in YouTube?",
            })
        ) {
            handleMoreVideos(animeTitle);
        }
    }

    async function handleMoreVideos(title) {
        let animeTitle;
        if (isJsonObject(title)) {
            animeTitle =
                title?.romaji ||
                title?.userPreferred ||
                title?.english ||
                title?.native;
        } else if (typeof title === "string") {
            animeTitle = title;
        }
        if (typeof animeTitle !== "string" || animeTitle === "") return;
        window.open(
            `https://www.youtube.com/results?search_query=${animeTitle} Anime`,
            "_blank"
        );
    }

    function openInAnilist(animeUrl) {
        if (typeof animeUrl !== "string" || animeUrl === "") return;
        window.open(animeUrl, "_blank");
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
            if (windowWidth >= 641) {
                popupContainer.style.setProperty(
                    "--translateY",
                    windowHeight + "px"
                );
            } else {
                popupContainer.style.setProperty(
                    "--translateX",
                    windowWidth + "px"
                );
                mainHome.style.setProperty(
                    "--translateX",
                    "-" + windowWidth + "px"
                );
            }
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
                requestAnimationFrame(() => {
                    addClass(mainHome, "willChange");
                    addClass(popupWrapper, "willChange");
                    addClass(popupContainer, "willChange");

                    addClass(popupWrapper, "visible");
                    addClass(popupContainer, "show");
                    addClass(mainHome, "hide");
                    setTimeout(() => {
                        removeClass(mainHome, "willChange");
                        removeClass(popupWrapper, "willChange");
                        removeClass(popupContainer, "willChange");
                    }, 300);
                });
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
                requestAnimationFrame(() => {
                    addClass(mainHome, "willChange");
                    addClass(popupWrapper, "willChange");
                    addClass(popupContainer, "willChange");

                    addClass(popupWrapper, "visible");
                    addClass(popupContainer, "show");
                    addClass(mainHome, "hide");
                    setTimeout(() => {
                        removeClass(mainHome, "willChange");
                        removeClass(popupWrapper, "willChange");
                        removeClass(popupContainer, "willChange");
                    }, 300);
                });
            }
        } else if (val === false) {
            requestAnimationFrame(() => {
                addClass(mainHome, "willChange");
                addClass(popupWrapper, "willChange");
                addClass(popupContainer, "willChange");

                removeClass(popupContainer, "show");
                removeClass(mainHome, "hide");
                setTimeout(() => {
                    // Stop All Player
                    $ytPlayers?.forEach(({ ytPlayer }) =>
                        ytPlayer?.pauseVideo?.()
                    );
                    removeClass(popupWrapper, "visible");

                    removeClass(mainHome, "willChange");
                    removeClass(popupContainer, "willChange");
                    setTimeout(() => {
                        removeClass(popupWrapper, "willChange");
                    }, 300);
                }, 300);
            });
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
        mainHome = document.getElementById("main-home");
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
                document.documentElement.style.overflow = "hidden";
                document.documentElement.style.overflow = "";
                animeGridParentEl.style.overflow = "hidden";
                animeGridParentEl.style.overflow = "";
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
            removeClass(popupHeader, "loader");
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
        removeClass(popupImg, "display-none");
    }

    function onPlayerStateChange(event) {
        let _ytPlayer = event.target;
        if (!_ytPlayer || !_ytPlayer?.getPlayerState) return;
        let trailerEl = _ytPlayer?.g;
        let popupHeader = trailerEl?.parentElement;
        let popupImg = popupHeader?.querySelector?.(".popup-img");
        if (_ytPlayer?.getPlayerState?.() === 0) {
            _ytPlayer?.stopVideo?.();
            let popupContent = popupHeader?.closest?.(".popup-content");
            let loopedAnimeID =
                $finalAnimeList?.[getChildIndex(popupContent) ?? -1]?.id;
            if (loopedAnimeID != null) {
                if (videoLoops[loopedAnimeID]) {
                    clearTimeout(videoLoops[loopedAnimeID]);
                    videoLoops[loopedAnimeID] = null;
                }
                videoLoops[loopedAnimeID] = setTimeout(() => {
                    if (
                        mostVisiblePopupHeader === popupHeader &&
                        _ytPlayer?.getPlayerState?.() === 5 &&
                        _ytPlayer.g &&
                        $inApp &&
                        $popupVisible &&
                        $autoPlay
                    ) {
                        _ytPlayer?.playVideo?.();
                    }
                }, 8 * 1000); // Play Again after 8 seconds
            }
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
            if (anime?.id) {
                failingTrailers[anime.id] = true;
            }
            $ytPlayers = $ytPlayers.filter(
                (_ytPlayer) => _ytPlayer.ytPlayer !== ytPlayer
            );
            ytPlayer.destroy();
            addClass(trailerEl, "display-none");
            removeClass(popupHeader, "loader");
            let popupImg = popupHeader?.querySelector?.(".popup-img");
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
            if (anime?.id) {
                delete failingTrailers[anime.id];
            }
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
            return ""; // Default Unwatched Icon Color
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
                        tag: `<span>${tagName}${
                            tagRank ? "</span><span> " + tagRank + "%" : ""
                        }</span>`,
                        tagColor: "red",
                    });
                } else if (semiCaution[trimmedTag]) {
                    tagsRunnned[tagName] = true;
                    tagSemiCaution.push({
                        tag: `<span>${tagName}${
                            tagRank ? "</span><span> " + tagRank + "%" : ""
                        }</span>`,
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
                    tag: `<span>${tagName}${
                        tagRank ? "</span><span> " + tagRank + "%" : ""
                    }</span>`,
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
                tag: `<span>${tagName} (${formatNumber(e.score)})${
                    tagRank ? "</span><span> " + tagRank + "%" : ""
                }</span>`,
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
        // ONA · 12 · 24m · LOW SCORE
        let text = "";
        if (format) {
            text = `${format}`;
            let timeDifMS;
            let nextEpisode;
            let nextAiringDate;
            if (
                typeof nextAiringEpisode?.episode === "number" &&
                typeof nextAiringEpisode?.airingAt === "number"
            ) {
                nextAiringDate = new Date(nextAiringEpisode?.airingAt * 1000);
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
                text += ` · <span style="color:rgb(61, 180, 242);">${nextEpisode}/${episodes} in ${formatDateDifference(
                    nextAiringDate,
                    timeDifMS
                )}</span>`;
            } else if (timeDifMS > 0 && typeof nextEpisode === "number") {
                text += ` · <span style="color:rgb(61, 180, 242);">Ep ${nextEpisode} in ${formatDateDifference(
                    nextAiringDate,
                    timeDifMS
                )}</span>`;
            } else if (
                timeDifMS <= 0 &&
                typeof nextEpisode === "number" &&
                episodes > nextEpisode
            ) {
                text += ` · ${nextEpisode}/${episodes}`;
            } else if (episodes > 0) {
                text += ` · ${episodes}`;
            }
            if (duration > 0) {
                let time = msToTime(duration * 60 * 1000);
                text += ` · ${time ? time : ""}`;
            }
        }
        return text;
    }
    function formatDateDifference(endDate, timeDifference) {
        const oneMinute = 60 * 1000; // Number of milliseconds in one minute
        const oneHour = 60 * oneMinute; // Number of milliseconds in one hour
        const oneDay = 24 * oneHour; // Number of milliseconds in one day
        const oneWeek = 7 * oneDay; // Number of milliseconds in one day

        const formatYear = (date) =>
            date.toLocaleDateString(undefined, { year: "numeric" });
        const formatMonth = (date) =>
            date.toLocaleDateString(undefined, { month: "short" });
        const formatDay = (date) =>
            date.toLocaleDateString(undefined, { day: "numeric" });
        const formatTime = (date) =>
            date.toLocaleTimeString(undefined, {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
            });
        const formatWeekday = (date) =>
            date.toLocaleDateString(undefined, { weekday: "short" });

        if (timeDifference > oneWeek) {
            return `${msToTime(timeDifference, 1)}, ${formatMonth(
                endDate
            )} ${formatDay(endDate)} ${formatYear(endDate)}`;
        } else if (timeDifference <= oneWeek && timeDifference > oneDay) {
            return `${msToTime(timeDifference, 1)}, ${formatWeekday(
                endDate
            )}, ${formatTime(endDate).toLowerCase()}`;
        } else {
            return `${msToTime(timeDifference, 2)}, ${formatTime(
                endDate
            ).toLowerCase()}`;
        }
    }

    function getRecommendationRatingInfo({
        score,
        meanScoreAll,
        meanScoreAbove,
    }) {
        if (score < meanScoreAll) {
            // Very Low Score
            return `<i class="purple-color fa-solid fa-k"/>`;
        } else if (score < meanScoreAbove) {
            // Low Score
            return `<i class="purple-color fa-solid fa-k"/>`;
        } else {
            return `<i class="green-color fa-solid fa-k"/>`;
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
        reloadYoutube();
    });
    function reloadYoutube() {
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
    }
    window.reloadYoutube = reloadYoutube;
    window.addEventListener("offline", () => {
        if ($android) {
            try {
                JSBridge.isOnline(false);
            } catch (e) {}
        }
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

    let touchID, checkPointer, startX, endX, startY, endY, goBackPercent, itemIsScrolling, itemIsScrollingTimeout;

    function popupScroll() {
        $popupIsGoingBack = false;
        goBackPercent = 0;
    }
    function itemScroll() {
        itemIsScrolling = true;
        clearTimeout(itemIsScrollingTimeout)
        itemIsScrollingTimeout = setTimeout(()=>{
            itemIsScrolling = false;
        }, 500)
    }
    function handlePopupContainerDown(event) {
        if (itemIsScrolling) return;
        startX = event.touches[0].clientX;
        startY = event.touches[0].clientY;
        touchID = event.touches[0].identifier;
        let element = event.target;
        let classList = element.classList;
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
            if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 0) {
                $popupIsGoingBack = true;
            }
        } else if ($popupIsGoingBack) {
            endX = event.touches[0].clientX;
            const deltaX = endX - startX;
            if (deltaX > 0) {
                goBackPercent = Math.min((deltaX / 48) * 100, 100);
            } else {
                goBackPercent = 0;
            }
        }
    }
    function handlePopupContainerUp(event) {
        if ($popupIsGoingBack) {
            endX = Array.from(event.changedTouches)?.find(
                (touch) => touch.identifier === touchID
            )?.clientX;
            if (typeof endX === "number") {
                let xThreshold = 48;
                let deltaX = endX - startX;
                if ($popupIsGoingBack && deltaX >= xThreshold) {
                    $popupVisible = false;
                }
            }
            touchID = null;
            $popupIsGoingBack = false;
            goBackPercent = 0;
        } else {
            touchID = null;
            $popupIsGoingBack = false;
            goBackPercent = 0;
        }
    }
    function getTitle(title) {
        return (
            title?.english ||
            title?.userPreferred ||
            title?.romaji ||
            title?.native ||
            ""
        );
    }
    function handlePopupContainerCancel() {
        touchID = null;
        $popupIsGoingBack = false;
        goBackPercent = 0;
    }

    window.checkOpenFullScreenItem = () => {
        return fullImagePopup || fullDescriptionPopup;
    };
    window.closeFullScreenItem = () => {
        if (fullImagePopup) {
            fullImagePopup = null;
        } else {
            fullDescriptionPopup = null;
        }
    };
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
        style:--translateX={windowWidth + "px"}
        style:--translateY={windowHeight + "px"}
        bind:this={popupContainer}
        on:touchstart|passive={handlePopupContainerDown}
        on:touchmove|passive={handlePopupContainerMove}
        on:touchend|passive={handlePopupContainerUp}
        on:touchcancel={handlePopupContainerCancel}
        on:scroll={popupScroll}
    >
        {#if $finalAnimeList?.length}
            {#each $finalAnimeList || [] as anime, animeIdx (anime.id)}
                <div class="popup-content" bind:this={anime.popupContent}>
                    <div class="popup-main">
                        <div
                            class={"popup-header " +
                                (anime.trailerID ? "loader" : "")}
                            bind:this={anime.popupHeader}
                            on:click={() => askToOpenYoutube(anime.title)}
                            on:keydown={(e) =>
                                e.key === "Enter" &&
                                askToOpenYoutube(anime.title)}
                        >
                            <div class="popup-header-loading">
                                <i class="fa-solid fa-k fa-fade" />
                            </div>
                            {#if anime.trailerID}
                                <div class="trailer display-none" />
                            {/if}
                            <div class="popup-img">
                                {#if anime.bannerImageUrl}
                                    <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                                    <img
                                        loading="lazy"
                                        width="640px"
                                        height="360px"
                                        src={anime.bannerImageUrl}
                                        alt={(getTitle(anime?.title) || "") +
                                            " Banner"}
                                        class="bannerImg fade-out"
                                        tabindex="0"
                                        on:load={(e) => {
                                            removeClass(e.target, "fade-out");
                                            addClass(e.target, "fade-in");
                                        }}
                                        on:error={(e) => {
                                            removeClass(e.target, "fade-in");
                                            addClass(e.target, "fade-out");
                                            addClass(e.target, "display-none");
                                        }}
                                    />
                                {/if}
                            </div>
                        </div>
                        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                        <div class="popup-controls">
                            <div class="autoPlay-container">
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
                                <h3 class="autoplay-label">Auto Play</h3>
                            </div>
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
                                        {windowWidth >= 230
                                            ? "List Update"
                                            : windowWidth >= 205
                                            ? "Update"
                                            : windowWidth >= 180
                                            ? "List"
                                            : ""}
                                    </h3>
                                </div>
                            {/if}
                        </div>
                        <div class="popup-body">
                            <div
                                class={"popup-info" +
                                    (anime.isSeenMore ? " seenmore" : "")}
                                style:--windowWidth={windowWidth + "px"}
                                style:--windowHeight={windowHeight + "px"}
                            >
                                <div
                                    class="anime-title-container"
                                    style:overflow={$popupIsGoingBack
                                        ? "hidden"
                                        : ""}
                                    on:scroll={itemScroll}
                                >
                                    <a
                                        rel={anime.animeUrl
                                            ? "noopener noreferrer"
                                            : ""}
                                        target={anime.animeUrl ? "_blank" : ""}
                                        href={anime.animeUrl ||
                                            "javascript:void(0)"}
                                        class={getCautionColor(anime) +
                                            "-color anime-title copy"}
                                        copy-value={getTitle(anime?.title) ||
                                            ""}
                                        style:overflow={$popupIsGoingBack
                                            ? "hidden"
                                            : ""}
                                        on:scroll={itemScroll}
                                    >
                                        {getTitle(anime?.title) || "NA"}
                                    </a>
                                    <div
                                        class="info-rating-wrapper"
                                    >
                                        <i class="fa-regular fa-star" />
                                        <h3
                                            class="copy"
                                            copy-value={(anime.averageScore !=
                                            null
                                                ? formatNumber(
                                                      anime.averageScore * 0.1,
                                                      1
                                                  )
                                                : "NA") +
                                                "/10 · " +
                                                (anime.popularity != null
                                                    ? formatNumber(
                                                          anime.popularity,
                                                          1
                                                      )
                                                    : "NA")}
                                        >
                                            <b
                                                >{anime.averageScore != null
                                                    ? formatNumber(
                                                          anime.averageScore *
                                                              0.1,
                                                          1
                                                      )
                                                    : "NA"}</b
                                            >
                                            {"/10 · " +
                                                (anime.popularity != null
                                                    ? formatNumber(
                                                          anime.popularity,
                                                          1
                                                      )
                                                    : "NA")}
                                            {" · "}{@html getRecommendationRatingInfo(
                                                anime
                                            )}
                                        </h3>
                                    </div>
                                </div>
                                <div
                                    class="info-format"
                                    style:overflow={$popupIsGoingBack
                                        ? "hidden"
                                        : ""}
                                    on:scroll={itemScroll}
                                >
                                    {#if anime?.nextAiringEpisode?.airingAt}
                                        {#key date?.getSeconds?.() || 1}
                                            <h4
                                                class="copy"
                                                copy-value={htmlToString(
                                                    getFormattedAnimeFormat(
                                                        anime
                                                    )
                                                ) || ""}
                                            >
                                                {@html getFormattedAnimeFormat(
                                                    anime
                                                ) || "NA"}
                                            </h4>
                                        {/key}
                                    {:else}
                                        <h4
                                            class="copy"
                                            copy-value={htmlToString(
                                                getFormattedAnimeFormat(anime)
                                            ) || ""}
                                        >
                                            {@html getFormattedAnimeFormat(
                                                anime
                                            ) || "NA"}
                                        </h4>
                                    {/if}
                                    {#if anime?.season || anime?.year}
                                        <span
                                            style="text-align: right;"
                                            class="copy"
                                            copy-value={`${
                                                anime?.season || ""
                                            }${
                                                anime?.year
                                                    ? " " + anime.year
                                                    : ""
                                            }` || "NA"}
                                        >
                                            {`${anime?.season || ""}${
                                                anime?.year
                                                    ? " " + anime.year
                                                    : ""
                                            }` || "NA"}
                                        </span>
                                    {:else}
                                        <h4>NA</h4>
                                    {/if}
                                </div>
                                <div
                                    class="info-status"
                                    style:overflow={$popupIsGoingBack
                                        ? "hidden"
                                        : ""}
                                    on:scroll={itemScroll}
                                >
                                    <h4
                                        class="copy"
                                        copy-value={(anime.userStatus || "NA") +
                                            (anime.userScore != null
                                                ? " · " + anime.userScore
                                                : "")}
                                    >
                                        <a
                                            rel={anime.animeUrl
                                                ? "noopener noreferrer"
                                                : ""}
                                            target={anime.animeUrl
                                                ? "_blank"
                                                : ""}
                                            href={anime.animeUrl ||
                                                "javascript:void(0)"}
                                            ><span
                                                class={getUserStatusColor(
                                                    anime.userStatus
                                                ) + "-color"}
                                                >{anime.userStatus ||
                                                    "NA"}</span
                                            >
                                            {#if anime.userScore != null}
                                                {" · "}
                                                <i class="fa-regular fa-star" />
                                                {anime.userScore}
                                            {/if}
                                        </a>
                                    </h4>
                                    <h4
                                        style="text-align: right;"
                                        class="copy"
                                        copy-value={anime.status || ""}
                                    >
                                        {anime.status || "NA"}
                                    </h4>
                                </div>
                                <div class="info-contents">
                                    {#if Object.entries(anime?.studios || {}).length}
                                        <div>
                                            <div class="info-categ">
                                                Studios
                                            </div>
                                            <div
                                                class={"studio-popup info"}
                                                style:overflow={$popupIsGoingBack
                                                    ? "hidden"
                                                    : ""}
                                                on:scroll={itemScroll}
                                                on:mouseenter={(e) => {
                                                    if (
                                                        !anime?.hasStudioDragScroll
                                                    ) {
                                                        let info =
                                                            e?.target?.closest?.(
                                                                ".info"
                                                            ) || e?.target;
                                                        if (info) {
                                                            anime.hasStudioDragScroll = true;
                                                            dragScroll(
                                                                info,
                                                                "x"
                                                            );
                                                        }
                                                    }
                                                }}
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
                                                            rel={studio.studioUrl
                                                                ? "noopener noreferrer"
                                                                : ""}
                                                            target={studio.studioUrl
                                                                ? "_blank"
                                                                : ""}
                                                            href={studio.studioUrl ||
                                                                "javascript:void(0)"}
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
                                                class={"genres-popup info"}
                                                style:overflow={$popupIsGoingBack
                                                    ? "hidden"
                                                    : ""}
                                                on:scroll={itemScroll}
                                                on:mouseenter={(e) => {
                                                    if (
                                                        !anime?.hasGenreDragScroll
                                                    ) {
                                                        let info =
                                                            e?.target?.closest?.(
                                                                ".info"
                                                            ) || e?.target;
                                                        if (info) {
                                                            anime.hasGenreDragScroll = true;
                                                            dragScroll(
                                                                info,
                                                                "x"
                                                            );
                                                        }
                                                    }
                                                }}
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
                                        <div class="tag-info">
                                            <div
                                                class={"tags-info-content info"}
                                                style:overflow={$popupIsGoingBack
                                                    ? "hidden"
                                                    : ""}
                                                on:scroll={itemScroll}
                                                on:mouseenter={(e) => {
                                                    if (
                                                        !anime?.hasTagDragScroll
                                                    ) {
                                                        let info =
                                                            e?.target?.closest?.(
                                                                ".info"
                                                            ) || e?.target;
                                                        if (info) {
                                                            anime.hasTagDragScroll = true;
                                                            dragScroll(
                                                                info,
                                                                "x"
                                                            );
                                                        }
                                                    }
                                                }}
                                            >
                                                {#each getTags(anime.tags, anime?.favoriteContents?.tags, anime.contentCaution) as { tag, tagColor } (tag)}
                                                    <span
                                                        class={"copy " +
                                                            (tagColor
                                                                ? `${tagColor}-color`
                                                                : "")}
                                                        copy-value={htmlToString(
                                                            tag
                                                        ) || ""}
                                                        >{@html tag || "N/A"}
                                                    </span>
                                                {/each}
                                            </div>
                                        </div>
                                    {/if}
                                </div>
                                <div class="info-profile">
                                    <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                                    <img
                                        loading="lazy"
                                        width="150px"
                                        height="210px"
                                        src={anime.coverImageUrl ||
                                            anime.bannerImageUrl ||
                                            ""}
                                        alt={(getTitle(anime?.title) || "") +
                                            (!anime.coverImageUrl &&
                                            anime.bannerImageUrl
                                                ? " Banner"
                                                : " Cover")}
                                        tabindex={anime.isSeenMore ? "0" : "-1"}
                                        class={"coverImg" + (!anime.coverImageUrl&&!anime.bannerImageUrl?" display-none":"")}
                                        on:error={(e) => {
                                            addClass(e.target, "display-none");
                                        }}
                                        on:click={() => {
                                            window.setShouldGoBack(false);
                                            fullImagePopup =
                                                anime.coverImageUrl;
                                        }}
                                        on:keydown={(e) => {
                                            window.setShouldGoBack(false);
                                            if (e.key === "Enter")
                                                fullImagePopup =
                                                    anime.coverImageUrl;
                                        }}
                                    />
                                    {#if anime?.description}
                                        <div
                                            class="anime-description-wrapper"
                                            on:click={() => {
                                                window.setShouldGoBack(false);
                                                fullDescriptionPopup =
                                                    editHTMLString(
                                                        anime?.description
                                                    );
                                            }}
                                            on:keydown={(e) => {
                                                window.setShouldGoBack(false);
                                                if (e.key === "Enter")
                                                    fullDescriptionPopup =
                                                        editHTMLString(
                                                            anime?.description
                                                        );
                                            }}
                                        >
                                            <h3>Description</h3>
                                            <div
                                                class="anime-description copy"
                                                copy-value={htmlToString(
                                                    anime?.description
                                                ) || ""}
                                            >
                                                {@html editHTMLString(
                                                    anime?.description
                                                )}
                                            </div>
                                        </div>
                                    {/if}
                                    <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                                    <img
                                        loading="lazy"
                                        width="440px"
                                        height="210px"
                                        src={anime.bannerImageUrl || ""}
                                        alt={(getTitle(anime?.title) || "") +
                                            " Banner"}
                                        tabindex="0"
                                        class={"extra-bannerImg" + (!anime.bannerImageUrl||!anime.coverImageUrl?" display-none":"")}
                                        on:error={(e) => {
                                            addClass(e.target, "display-none");
                                        }}
                                        on:click={() => {
                                            window.setShouldGoBack(false);
                                            fullImagePopup =
                                                anime.bannerImageUrl;
                                        }}
                                        on:keydown={(e) => {
                                            window.setShouldGoBack(false);
                                            if (e.key === "Enter")
                                                fullImagePopup =
                                                    anime.bannerImageUrl;
                                        }}
                                    />
                                </div>
                            </div>
                            <div class="footer">
                                <button
                                    class="hideshowbtn"
                                    style:overflow={$popupIsGoingBack
                                        ? "hidden"
                                        : ""}
                                    on:click={handleHideShow(anime.id)}
                                    on:keydown={(e) =>
                                        e.key === "Enter" &&
                                        handleHideShow(anime.id)}
                                    >
                                        <i class="fa-solid fa-circle-minus hideshow"/>
                                        {" " +
                                            (getHiddenStatus(anime.id) ||
                                                "")}</button
                                >
                                <button
                                    class="morevideos"
                                    style:overflow={$popupIsGoingBack
                                        ? "hidden"
                                        : ""}
                                    on:click={handleMoreVideos(anime.title)}
                                    on:keydown={(e) =>
                                        e.key === "Enter" &&
                                        handleMoreVideos(anime.title)}
                                    ><i class="fa-brands fa-youtube" /> YouTube</button
                                >
                                <button
                                    class={anime.isSeenMore
                                        ? "openanilist"
                                        : "expand"}
                                    style:overflow={$popupIsGoingBack
                                        ? "hidden"
                                        : ""}
                                    on:click={() => {
                                        if (anime.isSeenMore) {
                                            openInAnilist(anime.animeUrl);
                                        } else {
                                            anime.isSeenMore = true;
                                        }
                                    }}
                                    on:keydown={(e) => {
                                        if (e.key === "Enter") {
                                            if (anime.isSeenMore) {
                                                openInAnilist(anime.animeUrl);
                                            } else {
                                                anime.isSeenMore = true;
                                            }
                                        }
                                    }}
                                >
                                    <i class={"fa-solid fa-chevron-down"+(anime.isSeenMore?" display-none":"")}/>
                                    <img
                                        loading="lazy"
                                        class={"anilist-icon"+(anime.isSeenMore?"":" display-none")}
                                        src="./images/Anilist-Logo.svg"
                                        alt="Anilist Logo"
                                        width="23px"
                                        height="23px"
                                    />
                                    {anime.isSeenMore?" Anilist":" See More"}</button
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
{#if fullImagePopup}
    <div
        class="fullPopupWrapper"
        on:click={() => (fullImagePopup = null)}
        on:keydown={(e) => e.key === "Enter" && (fullImagePopup = null)}
        on:pointerup={() => (fullImagePopup = null)}
    >
        <div class="fullPopup">
            <img
                class="fullPopupImage"
                loading="lazy"
                src={fullImagePopup}
                alt="Full View"
                transition:fly={{ y: 20, duration: 300 }}
                on:error={(e) => {
                    addClass(e.target, "display-none");
                }}
            />
        </div>
    </div>
{/if}
{#if fullDescriptionPopup}
    <div
        class="fullPopupWrapper"
        on:click={() => (fullDescriptionPopup = null)}
        on:keydown={(e) => e.key === "Enter" && (fullDescriptionPopup = null)}
        on:pointerup={() => (fullDescriptionPopup = null)}
    >
        <div class="fullPopup">
            <div class="fullPopupDescriptionWrapper">
                <div
                    class="fullPopupDescription"
                    transition:fly={{ y: 20, duration: 300 }}
                >
                    {@html fullDescriptionPopup}
                </div>
            </div>
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
        background-color: transparent;
        display: flex;
        justify-content: center;
        overflow: hidden;
        transform: translateY(-99999px) translateZ(0);
        -webkit-transform: translateY(-99999px) translateZ(0);
        -ms-transform: translateY(-99999px) translateZ(0);
        -moz-transform: translateY(-99999px) translateZ(0);
        -o-transform: translateY(-99999px) translateZ(0);
    }

    .popup-wrapper.willChange {
        will-change: transform;
    }

    .popup-wrapper.visible {
        transform: translateY(0) translateZ(0);
        -webkit-transform: translateY(0) translateZ(0);
        -ms-transform: translateY(0) translateZ(0);
        -moz-transform: translateY(0) translateZ(0);
        -o-transform: translateY(0) translateZ(0);
    }

    .popup-container {
        width: 100%;
        max-width: 640px;
        overflow-y: auto;
        overflow-x: hidden;
        overscroll-behavior: contain;
        background-color: #151f2e;
        transition: transform 0.3s ease;
        margin-top: 55px;
        -ms-overflow-style: none;
        scrollbar-width: none;
        transform: translateX(var(--translateX)) translateZ(0);
        -webkit-transform: translateX(var(--translateX)) translateZ(0);
        -ms-transform: translateX(var(--translateX)) translateZ(0);
        -moz-transform: translateX(var(--translateX)) translateZ(0);
        -o-transform: translateX(var(--translateX)) translateZ(0);
    }

    .popup-container.willChange {
        will-change: transform;
    }

    :global(#main-home.hide) {
        transform: translateX(var(--translateX)) translateZ(0);
        -webkit-transform: translateX(var(--translateX)) translateZ(0);
        -ms-transform: translateX(var(--translateX)) translateZ(0);
        -moz-transform: translateX(var(--translateX)) translateZ(0);
        -o-transform: translateX(var(--translateX)) translateZ(0);
    }

    .popup-container.show {
        transform: translateZ(0);
        -webkit-transform: translateZ(0);
        -ms-transform: translateZ(0);
        -moz-transform: translateZ(0);
        -o-transform: translateZ(0);
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
        transform: translateY(-50%) translateX(var(--position)) translateZ(0);
        -webkit-transform: translateY(-50%) translateX(var(--position))
            translateZ(0);
        -ms-transform: translateY(-50%) translateX(var(--position))
            translateZ(0);
        -moz-transform: translateY(-50%) translateX(var(--position))
            translateZ(0);
        -o-transform: translateY(-50%) translateX(var(--position)) translateZ(0);
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
        transform: translateZ(0);
        -webkit-transform: translateZ(0);
        -ms-transform: translateZ(0);
        -moz-transform: translateZ(0);
        -o-transform: translateZ(0);
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
        width: 100%;
        height: 100%;
        transform: translateZ(0);
        -webkit-transform: translateZ(0);
        -ms-transform: translateZ(0);
        -moz-transform: translateZ(0);
        -o-transform: translateZ(0);
        position: absolute;
        object-fit: cover;
        -o-object-fit: cover;
        object-position: center;
        background-color: black;
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

    .popup-body {
        overflow: hidden;
        touch-action: pan-y;
        margin: 1em 1em 0 1em;
    }

    .popup-info {
        max-height: max(
            calc(
                var(--windowHeight) -
                    calc(
                        (calc(360 * min(var(--windowWidth), 640px)) / 640) +
                            55px + 30px + 1em  + 1em + 4.4em
                    )
            ),
            249px
        );
        overflow: hidden;
        margin-bottom: 1em;
    }

    .popup-info.seenmore {
        max-height: unset !important;
    }

    .popup-body a {
        color: rgb(61, 180, 242);
        text-decoration: none;
    }

    .anime-title-container {
        padding: 8px 0 5px 0;
        width: 100%;
        overflow-x: auto;
        overflow-y: hidden;
        white-space: nowrap;
        align-items: center;
        display: flex;
        flex-wrap: nowrap;
        grid-column-gap: 2em;
        justify-content: space-between;
        -ms-overflow-style: none;
        scrollbar-width: none;
    }

    .anime-title-container::-webkit-scrollbar {
        display: none;
    }

    .anime-title-container i {
        font-size: 2em;
    }

    .info-rating-wrapper {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 0.2em;
        white-space: nowrap;
    }

    .info-rating-wrapper > i {
        font-size: 1.5em;
        color: rgb(245, 197, 24);
    }

    .info-rating-wrapper > h3 {
        white-space: nowrap;
    }

    .info-rating-wrapper b {
        font-size: 1.5rem;
    }

    .info-format {
        padding-bottom: 5px;
        display: flex;
        flex-wrap: nowrap;
        justify-content: space-between;
        gap: 1em;
        overflow-x: auto;
        overflow-y: hidden;
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
    .info-format::-webkit-scrollbar {
        display: none;
    }
    .info-format > span,
    .info-format > h4 {
        white-space: nowrap;
    }

    .info-status {
        display: flex;
        flex-wrap: nowrap;
        justify-content: space-between;
        gap: 1em;
        overflow-x: auto;
        overflow-y: hidden;
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
    .info-status::-webkit-scrollbar {
        display: none;
    }
    .info-status > h4 {
        white-space: nowrap;
    }

    .info-status i {
        font-size: 1em;
        color: rgb(245, 197, 24);
    }

    .info-status a {
        color: unset;
    }

    .info-contents {
        margin: 1em 0;
        width: 100%;
        display: flex;
        flex-wrap: wrap;
        gap: 0.5em;
    }

    .info-contents > div {
        width: 100%;
        display: grid;
        grid-template-columns: 37px auto;
        align-items: center;
        gap: 0.5em;
    }

    .info-contents > div.tag-info {
        width: 100%;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.5em;
    }

    .info-profile {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: 1em;
        width: 100%;
    }

    .coverImg {
        height: 210px;
        object-fit: cover;
        -o-object-fit: cover;
        transform: translateZ(0);
        -webkit-transform: translateZ(0);
        -ms-transform: translateZ(0);
        -moz-transform: translateZ(0);
        -o-transform: translateZ(0);
        border-radius: 6px;
        background-color: #000;
    }
    .extra-bannerImg {
        width: 100%;
        object-fit: cover;
        -o-object-fit: cover;
        transform: translateZ(0);
        -webkit-transform: translateZ(0);
        -ms-transform: translateZ(0);
        -moz-transform: translateZ(0);
        -o-transform: translateZ(0);
        border-radius: 6px;
        user-select: none;
        cursor: pointer;
        background-color: #000;
    }
    .coverImg.display-none + .anime-description-wrapper {
        height: unset;
        max-height: 210px;
        width: 100%;
    }

    .coverImg {
        width: min(40% - 1em, 150px);
        user-select: none;
        cursor: pointer;
        background-color: black;
        margin: 0 auto;
    }

    .coverImg.display-none + .anime-description-wrapper {
        width: 100%;
        min-width: 100%;
    }

    .anime-description-wrapper {
        background-color: #0b1622;
        border-radius: 6px;
        padding: 1em 1.5em;
        flex: 1;
        width: max(60% - 1em, 160px);
        min-width: max(60% - 1em, 160px);
        height: 210px;
        cursor: pointer;
    }

    .anime-description {
        letter-spacing: 0.05rem;
        line-height: 2.5rem;
        -ms-overflow-style: none;
        scrollbar-width: none;
        font-size: 1.1rem !important;
        width: calc(100% - 1em);
        display: -webkit-box;
        max-width: calc(100% - 1em);
        -webkit-line-clamp: 7;
        -webkit-box-orient: vertical;
        overflow: hidden;
        margin: 0.25em 0.5em;
    }

    :global(.anime-description *) {
        font-size: 1.1rem !important;
    }
    :global(.anime-description a) {
        color: rgb(0 168 255) !important;
        text-decoration: none !important;
    }

    .anime-description::-webkit-scrollbar {
        display: none;
    }

    .anime-title {
        cursor: pointer;
        font-size: clamp(1.6309rem, 1.76545rem, 1.9rem);
        overflow-x: auto;
        overflow-y: hidden;
        width: min-content;
        max-width: 100%;
        white-space: nowrap;
        -ms-overflow-style: none;
        scrollbar-width: none;
    }

    .anime-title::-webkit-scrollbar {
        display: none;
    }

    .anime-title {
        text-decoration: none;
    }

    .footer {
        justify-content: space-around;
        gap: 6px;
        display: grid;
        grid-template-columns: repeat(3,auto);
        align-items: center;
        user-select: none !important;
        width: 100%;
        height: 4.4em;
        margin: auto;
        border-top: 1px solid #9ba0b2;
    }

    .footer i {
        font-size: 2.5rem;
    }

    .footer i.hideshow {
        font-size: 2rem;
    }

    .footer img {
        width: 23px;
        height: 23px;
        border-radius: 6px;
        margin-left: auto;
    }

    .hideshowbtn,
    .openanilist,
    .expand,
    .morevideos {
        border: 0;
        background-color: transparent !important;
        cursor: pointer;
        color: #9ba0b2;
        overflow: hidden;
        display: grid;
        grid-template-columns: 2em auto;
        align-items: center;
        justify-content: start;
        gap: 5px;
        white-space: nowrap;
    }

    @media screen and (max-width: 425px) {
        .footer {
            justify-content: space-between;
        }
        .popup-info {
            max-height: max(
                calc(
                    var(--windowHeight) -
                        calc(
                            (calc(360 * min(var(--windowWidth), 640px)) / 640) +
                                55px + 30px + 1em  + 1em + 4.4em
                        )
                ),
                249px
            ) !important;
            overflow: hidden;
            margin-bottom: 1em;
        }
        .info-contents {
            margin: 1em 0;
            width: 100% !important;
            display: flex;
            flex-wrap: wrap;
            gap: 0.5em;
        }
    }

    @media screen and (min-width: 641px) {
        :global(#main-home.hide) {
            transform: translateZ(0) !important;
            -webkit-transform: translateZ(0) !important;
            -ms-transform: translateZ(0) !important;
            -moz-transform: translateZ(0) !important;
            -o-transform: translateZ(0) !important;
        }
        .popup-wrapper {
            background-color: rgba(0, 0, 0, 0.7) !important;
        }
        .popup-container {
            transform: translateY(var(--translateY)) translateZ(0);
            -webkit-transform: translateY(var(--translateY)) translateZ(0);
            -ms-transform: translateY(var(--translateY)) translateZ(0);
            -moz-transform: translateY(var(--translateY)) translateZ(0);
            -o-transform: translateY(var(--translateY)) translateZ(0);
        }

        .popup-container.show {
            transform: translateY(0px) translateZ(0);
            -webkit-transform: translateY(0px) translateZ(0);
            -ms-transform: translateY(0px) translateZ(0);
            -moz-transform: translateY(0px) translateZ(0);
            -o-transform: translateY(0px) translateZ(0);
        }

        .fullPopupDescription {
            font-size: 1.5rem !important;
        }
        :global(.fullPopupDescription *) {
            font-size: 1.5rem !important;
        }
        .fullPopupImage {
            max-width: min(90%, 1000px) !important;
        }
    }

    @media screen and (max-width: 319px) {
        .info-profile {
            flex-wrap: wrap;
        }
        .coverImg {
            width: min(100%, 150px);
            margin: 0 auto;
        }
        .anime-description-wrapper {
            height: unset;
        }
    }
    @media screen and (min-width: 750px) {
        .popup-container {
            margin-top: 0 !important;
        }
        .popup-info {
            max-height: max(
                calc(
                    var(--windowHeight) -
                        calc(
                            (calc(360 * min(var(--windowWidth), 640px)) / 640) +
                            30px + 1em  + 1em + 4.4em
                        )
                ),
                249px
            ) !important;
            overflow: hidden;
            margin-bottom: 1em;
        }
    }

    @media screen and (min-width: 640px) {
        .popup-info {
            padding: 0 1em;
        }
    }

    .info-categ {
        font-size: clamp(1.0631rem, 1.15155rem, 1.24rem);
        user-select: none !important;
    }

    .info {
        -ms-overflow-style: none;
        scrollbar-width: none;
        font-size: clamp(1.018rem, 1.099rem, 1.18rem);
        text-transform: capitalize;
        overflow-y: hidden;
        overflow-x: auto;
        display: flex;
        gap: 8px;
        width: 100%;
        user-select: none !important;
    }

    .tags-info-content {
        flex-wrap: wrap;
        flex-direction: column;
        max-height: 6em;
    }

    .tags-info-content > span {
        display: flex;
        justify-content: space-between;
        gap: 2rem;
        flex: 1;
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
        flex: 1;
        -ms-overflow-style: none;
        scrollbar-width: none;
    }

    .info span::-webkit-scrollbar {
        display: none;
    }

    .popup-controls {
        background: #0b1622 !important;
        display: flex;
        padding: 5px 1em;
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
        margin-right: auto;
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
        width: 4rem;
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
        background-color: #0b1622;
        -webkit-transition: 0.4s transform;
        transition: 0.4s transform;
        border: 2px solid #9ba0b2;
    }

    .slider:before {
        position: absolute;
        content: "";
        height: 14px;
        width: 14px;
        left: 2px;
        bottom: 0.1rem;
        background-color: #9ba0b2;
        -webkit-transition: 0.3s transform;
        transition: 0.3s transform;
    }

    .autoplayToggle:checked + .slider:before {
        background-color: #0b1622;
    }

    .autoplayToggle:checked + .slider {
        background-color: #9ba0b2;
        border: 2px solid #757575;
    }

    .autoplayToggle:focus + .slider {
        box-shadow: 0 0 1px #9ba0b2;
    }

    .autoplayToggle:checked + .slider:before {
        -webkit-transform: translateX(20px) translateZ(0);
        -ms-transform: translateX(20px) translateZ(0);
        transform: translateX(20px) translateZ(0);
        -moz-transform: translateX(20px) translateZ(0);
        -o-transform: translateX(20px) translateZ(0);
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

    .fullPopupWrapper {
        transform: translateZ(0);
        -webkit-transform: translateZ(0);
        -ms-transform: translateZ(0);
        -moz-transform: translateZ(0);
        -o-transform: translateZ(0);
        position: fixed;
        z-index: 999;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.4);
        overscroll-behavior: contain;
        user-select: none;
        -ms-overflow-style: none;
        scrollbar-width: none;
        cursor: pointer;
        touch-action: none;
    }
    .fullPopupWrapper::-webkit-scrollbar {
        display: none;
    }
    .fullPopup {
        width: 100%;
        height: 100%;
        justify-content: center;
        align-items: center;
        display: flex;
        -ms-overflow-style: none;
        scrollbar-width: none;
        cursor: pointer;
    }

    .fullPopup::-webkit-scrollbar {
        display: none;
    }

    .fullPopupImage {
        max-width: min(100%, 1000px);
        max-height: 90%;
        object-fit: cover;
        -o-object-fit: cover;
        transform: translateZ(0);
        -webkit-transform: translateZ(0);
        -ms-transform: translateZ(0);
        -moz-transform: translateZ(0);
        -o-transform: translateZ(0);
        border-radius: 6px;
        box-shadow: 0 14px 28px rgba(0, 0, 0, 0.25),
            0 10px 10px rgba(0, 0, 0, 0.22);
        user-select: none;
        cursor: pointer;
        background-color: #000 !important;
    }
    .fullPopupDescriptionWrapper {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        cursor: pointer;
    }
    .fullPopupDescription {
        letter-spacing: 0.05rem;
        line-height: 2.5rem;
        font-size: 1.3rem;
        overflow-y: auto;
        overflow-x: hidden;
        max-width: min(90%, 576px);
        max-height: 68%;
        -ms-overflow-style: none;
        scrollbar-width: none;
        overscroll-behavior: contain;
        user-select: none;
        cursor: pointer;
        color: white;
    }
    .fullPopupDescription::-webkit-scrollbar {
        display: none;
    }
    :global(.fullPopupDescription *) {
        font-size: 1.3rem !important;
        color: white;
    }
    :global(.fullPopupDescription a) {
        color: rgb(0 168 255) !important;
        text-decoration: none !important;
    }
</style>
