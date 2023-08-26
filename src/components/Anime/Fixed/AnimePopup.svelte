<script>
    import { onMount, tick } from "svelte";
    import { fade } from "svelte/transition";
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
        popupIsGoingBack,
        earlisetReleaseDate,
    } from "../../../js/globalValues.js";
    import {
        isJsonObject,
        scrollToElement,
        getChildIndex,
        msToTime,
        isElementVisible,
        addClass,
        removeClass,
        getMostVisibleElement,
        dragScroll
    } from "../../../js/others/helper.js";
    import { retrieveJSON, saveJSON } from "../../../js/indexedDB.js";
    import { animeLoader } from "../../../js/workerUtils.js";

    let isOnline = window.navigator.onLine;

    let animeGridParentEl,
        mostVisiblePopupHeader,
        currentHeaderIdx,
        currentYtPlayer,
        popupWrapper,
        popupContainer,
        popupAnimeObserver,
        fullImagePopup,
        fullDescriptionPopup,
        windowWidth = Math.max(window.visualViewport.width, window.innerWidth),
        windowHeight = Math.max(
            window.visualViewport.height,
            window.innerHeight
        ),
        videoLoops = {};

    let savedYtVolume =
        !$android && matchMedia("(hover:hover)").matches ? 50 : 100;

    (async () => {
        savedYtVolume = (await retrieveJSON("savedYtVolume")) || savedYtVolume;
    })();

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

    async function handleHideShow(animeID, title) {
        let isHidden = $hiddenEntries[animeID];
        title = title ? `<b>${title}</b>` : "this anime";
        if (isHidden) {
            if (
                await $confirmPromise(
                    `Are you sure you want to show ${title} in your recommendation list?`
                )
            ) {
                $checkAnimeLoaderStatus()
                    .then(() => {
                        delete $hiddenEntries[animeID];
                        $hiddenEntries = $hiddenEntries;
                        if ($finalAnimeList.length) {
                            if ($animeLoaderWorker instanceof Worker) {
                                $animeLoaderWorker?.postMessage?.({
                                    removeID: animeID,
                                });
                            }
                        }
                    })
                    .catch(() => {
                        $confirmPromise({
                            isAlert: true,
                            title: "Something went wrong",
                            text: "Showing anime has failed, please try again.",
                        });
                    });
            }
        } else {
            if (
                await $confirmPromise(
                    `Are you sure you want to hide ${title} in your recommendation list?`
                )
            ) {
                $checkAnimeLoaderStatus()
                    .then(() => {
                        $hiddenEntries[animeID] = true;
                        if ($finalAnimeList.length) {
                            if ($animeLoaderWorker instanceof Worker) {
                                $animeLoaderWorker?.postMessage?.({
                                    removeID: animeID,
                                });
                            }
                        }
                    })
                    .catch(() => {
                        $confirmPromise({
                            isAlert: true,
                            title: "Something went wrong",
                            text: "Hiding anime has failed, please try again.",
                        });
                    });
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
        if ($popupVisible && removedIdx != null && removedIdx >= 0) {
            await tick();
            let newPopupContent = popupContainer?.children?.[removedIdx];
            if (
                newPopupContent instanceof Element &&
                popupContainer instanceof Element
            ) {
                scrollToElement(popupContainer, newPopupContent, "top");
            }
        }
    });

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
                    addClass(popupWrapper, "willChange");
                    addClass(popupContainer, "willChange");

                    addClass(popupWrapper, "visible");
                    addClass(popupContainer, "show");
                    setTimeout(() => {
                        removeClass(popupWrapper, "willChange");
                        removeClass(popupContainer, "willChange");
                    }, 200);
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
                        if ($inApp && $autoPlay) {
                            await tick();
                            prePlayYtPlayer($ytPlayers[i].ytPlayer);
                            $ytPlayers[i].ytPlayer?.playVideo?.();
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
                    addClass(popupWrapper, "willChange");
                    addClass(popupContainer, "willChange");

                    addClass(popupWrapper, "visible");
                    addClass(popupContainer, "show");
                    setTimeout(() => {
                        removeClass(popupWrapper, "willChange");
                        removeClass(popupContainer, "willChange");
                    }, 200);
                });
            }
        } else if (val === false) {
            requestAnimationFrame(() => {
                addClass(popupWrapper, "willChange");
                addClass(popupContainer, "willChange");

                removeClass(popupContainer, "show");
                setTimeout(() => {
                    // Stop All Player
                    $ytPlayers.forEach(({ ytPlayer }) => {
                        ytPlayer?.pauseVideo?.();
                    });
                    removeClass(popupWrapper, "visible");

                    removeClass(popupContainer, "willChange");
                    setTimeout(() => {
                        removeClass(popupWrapper, "willChange");
                    }, 200);
                }, 200);
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
            }
        }
    });

    onMount(() => {
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
            windowWidth = Math.max(
                window.visualViewport.width,
                window.innerWidth
            );
            windowHeight = Math.max(
                window.visualViewport.height,
                window.innerHeight
            );
        });

        document.addEventListener("keydown", async (e) => {
            if (e.key === "Escape" && !document.fullscreenElement) {
                e.preventDefault();
                window.backPressed?.();
            }
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
                    $ytPlayers[i].ytPlayer?.getPlayerState?.() !== 1
                ) {
                    await tick();
                    if (
                        $popupVisible &&
                        $inApp &&
                        ($autoPlay ||
                            $ytPlayers[i].ytPlayer?.getPlayerState?.() === 2)
                    ) {
                        prePlayYtPlayer($ytPlayers[i].ytPlayer);
                        $ytPlayers[i].ytPlayer?.playVideo?.();
                    } else {
                        if (!$autoPlay) {
                            let ytPlayer = $ytPlayers?.[i]?.ytPlayer;
                            let trailerEl = ytPlayer?.g;
                            if (
                                trailerEl &&
                                ytPlayer?.getPlayerState?.() != null &&
                                ytPlayer?.getPlayerState?.() !== -1
                            ) {
                                let popupHeader = trailerEl?.parentElement;
                                let popupImg =
                                    popupHeader?.querySelector?.(".popup-img");
                                addClass(popupImg, "fade-out");
                                removeClass(popupHeader, "loader");
                                removeClass(trailerEl, "display-none");
                                setTimeout(() => {
                                    addClass(popupImg, "display-none");
                                    removeClass(popupImg, "fade-out");
                                }, 200);
                            }
                        }
                        $ytPlayers[i].ytPlayer?.pauseVideo?.();
                    }
                } else if ($ytPlayers[i].ytPlayer.g !== visibleTrailer) {
                    if (!$autoPlay) {
                        let ytPlayer = $ytPlayers?.[i]?.ytPlayer;
                        let trailerEl = ytPlayer?.g;
                        if (
                            trailerEl &&
                            ytPlayer?.getPlayerState?.() != null &&
                            ytPlayer?.getPlayerState?.() !== -1
                        ) {
                            let popupHeader = trailerEl?.parentElement;
                            let popupImg =
                                popupHeader?.querySelector?.(".popup-img");
                            addClass(popupImg, "fade-out");
                            removeClass(popupHeader, "loader");
                            removeClass(trailerEl, "display-none");
                            setTimeout(() => {
                                addClass(popupImg, "display-none");
                                removeClass(popupImg, "fade-out");
                            }, 200);
                        }
                    }
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
        let popupContent = popupHeader?.closest?.(".popup-content");
        let loopedAnimeID =
            $finalAnimeList?.[getChildIndex(popupContent) ?? -1]?.id;
        if (_ytPlayer?.getPlayerState?.() === 0) {
            if (loopedAnimeID != null) {
                if (videoLoops[loopedAnimeID]) {
                    clearTimeout(videoLoops[loopedAnimeID]);
                    videoLoops[loopedAnimeID] = null;
                }
                videoLoops[loopedAnimeID] = setTimeout(() => {
                    _ytPlayer?.stopVideo?.();
                    setTimeout(() => {
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
                    }, 5000);
                }, 7 * 1000); // Play Again after 8 seconds
            }
        } else if (videoLoops[loopedAnimeID]) {
            clearTimeout(videoLoops[loopedAnimeID]);
            videoLoops[loopedAnimeID] = null;
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
            }, 200);
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
                }, 200);
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
                    }, 200);
                    $animeLoaderWorker = data.animeLoaderWorker;
                    $searchedAnimeKeyword = "";
                    if (data?.isNew) {
                        $finalAnimeList = data.finalAnimeList;
                        $hiddenEntries = data.hiddenEntries;
                    }
                    $dataStatus = null;
                    return;
                })
                .catch((error) => {
                    throw error;
                });
        }
    }

    function getFormattedAnimeFormat({ episodes, nextAiringEpisode }) {
        let text;
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
            text = ` · <span style="color:rgb(61, 180, 242);">${nextEpisode}/${episodes} in ${formatDateDifference(
                nextAiringDate,
                timeDifMS
            )}</span>`;
        } else if (timeDifMS > 0 && typeof nextEpisode === "number") {
            text = ` · <span style="color:rgb(61, 180, 242);">Ep ${nextEpisode} in ${formatDateDifference(
                nextAiringDate,
                timeDifMS
            )}</span>`;
        } else if (
            timeDifMS <= 0 &&
            typeof nextEpisode === "number" &&
            episodes > nextEpisode
        ) {
            text = ` · ${nextEpisode}/${episodes}`;
        } else if (episodes > 0) {
            text = ` · ${episodes}`;
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

    let touchID,
        checkPointer,
        startX,
        endX,
        startY,
        endY,
        goBackPercent,
        itemIsScrolling,
        itemIsScrollingTimeout;

    function popupScroll() {
        itemScroll();
        $popupIsGoingBack = false;
        goBackPercent = 0;
    }
    function itemScroll() {
        itemIsScrolling = true;
        clearTimeout(itemIsScrollingTimeout);
        itemIsScrollingTimeout = setTimeout(() => {
            itemIsScrolling = false;
        }, 50);
    }
    function handlePopupContainerDown(event) {
        if (itemIsScrolling) return;
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

    function handlePopupContainerCancel() {
        touchID = null;
        $popupIsGoingBack = false;
        goBackPercent = 0;
    }

    let fvTouchId,
        fvStartY,
        fvStartX,
        fvIsScrolled,
        fvIsScrolledTopMax,
        fvIsScrolledBottomMax;

    function fullViewScroll() {
        fvIsScrolled = true;
    }
    function fullViewTouchStart(e) {
        if (!popupContainer) return;
        let element = e.target;
        let closestScrollableYElement = element;
        while (
            closestScrollableYElement &&
            closestScrollableYElement !== document.body
        ) {
            fvIsScrolledTopMax = element.scrollTop < 1;
            fvIsScrolledBottomMax =
                Math.abs(
                    element.scrollHeight -
                        element.clientHeight -
                        element.scrollTop
                ) < 1;
            let isScrolledYMax = fvIsScrolledTopMax || fvIsScrolledBottomMax;
            if (isScrolledYMax) {
                break;
            }
            closestScrollableYElement =
                closestScrollableYElement?.parentElement;
        }
        fvTouchId = e?.touches?.[0]?.identifier;
        fvStartY = e?.touches?.[0]?.clientY;
        fvStartX = e?.touches?.[0]?.clientX;
    }

    function fullViewTouchEnd(e) {
        if (!fvIsScrolled) {
            let endY = Array.from(e?.changedTouches || [])?.find(
                (touch) => touch?.identifier === fvTouchId
            )?.clientY;
            let endX = Array.from(e?.changedTouches || [])?.find(
                (touch) => touch?.identifier === fvTouchId
            )?.clientX;
            let deltaY = endY - fvStartY;
            let deltaX = endX - fvStartX;
            if (
                typeof deltaY === "number" &&
                !isNaN(deltaY) &&
                typeof deltaX === "number" &&
                !isNaN(deltaX)
            ) {
                let canGoBack =
                    Math.abs(deltaX) > Math.abs(deltaY) ||
                    (deltaY < 0 && fvIsScrolledBottomMax) ||
                    (deltaY > 0 && fvIsScrolledTopMax);
                if (canGoBack) {
                    fullDescriptionPopup = fullImagePopup = null;
                }
            }
        }
        fullViewTouchCancel();
    }

    function fullViewTouchCancel() {
        fvTouchId =
            fvStartY =
            fvStartX =
            fvIsScrolled =
            fvIsScrolledTopMax =
            fvIsScrolledBottomMax =
                false;
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

    $: {
        if ($android || !matchMedia("(hover:hover)").matches) {
            fullDescriptionPopup || fullImagePopup
                ? addClass(document.documentElement, "overflow-hidden")
                : removeClass(document.documentElement, "overflow-hidden");
        }
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
        bind:this={popupContainer}
        on:touchstart|passive={handlePopupContainerDown}
        on:touchmove|passive={handlePopupContainerMove}
        on:touchend|passive={handlePopupContainerUp}
        on:touchcancel={handlePopupContainerCancel}
        on:scroll={popupScroll}
    >
        {#if $finalAnimeList?.length}
            {#each $finalAnimeList || [] as anime (anime?.id||{})}
                <div class="popup-content" bind:this={anime.popupContent}>
                    <div class="popup-main">
                        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                        <div
                            class={"popup-header " +
                                (anime.trailerID ? "loader" : "")}
                            bind:this={anime.popupHeader}
                            tabindex="0"
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
                                {#if anime.bannerImageUrl || anime.trailerThumbnailUrl}
                                    <img
                                        loading="lazy"
                                        width="640px"
                                        height="360px"
                                        src={anime.bannerImageUrl ||
                                            anime.trailerThumbnailUrl}
                                        alt={(anime?.shownTitle || "") +
                                            (anime.bannerImageUrl
                                                ? " Banner"
                                                : " Thumbnail")}
                                        class="bannerImg fade-out"
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
                                    <label class="disable-interaction" for={"auto-play-"+anime?.id}>
                                        Auto Play
                                    </label>
                                    <input
                                        id={"auto-play-"+anime?.id}
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
                                <h3
                                    class="autoplay-label"
                                    on:click={() => {
                                        $autoPlay = !$autoPlay;
                                    }}
                                    on:keydown={(e) => {
                                        if (e.key === "Enter") {
                                            $autoPlay = !$autoPlay;
                                        }
                                    }}
                                >
                                    {#if windowWidth >= 290}
                                        Auto Play
                                    {:else if windowWidth >= 260}
                                        Auto
                                    {/if}
                                </h3>
                            </div>
                            {#if $listUpdateAvailable}
                                <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                                <div
                                    class="list-update-container"
                                    tabindex="0"
                                    on:click={updateList}
                                    on:keydown={(e) =>
                                        e.key === "Enter" && updateList(e)}
                                >
                                    <i
                                        class="list-update-icon fa-solid fa-arrows-rotate"
                                    />
                                    <h3 class="list-update-label">
                                        {windowWidth >= 320
                                            ? "List Update"
                                            : windowWidth >= 205
                                            ? "Update"
                                            : windowWidth >= 180
                                            ? "List"
                                            : ""}
                                    </h3>
                                </div>
                            {/if}
                            {#if anime.bannerImageUrl || anime.trailerThumbnailUrl}
                                <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                                <div
                                    class="banner-image-button"
                                    tabindex="0"
                                    on:click={() => {
                                        window.setShouldGoBack(false);
                                        fullImagePopup =
                                            anime.bannerImageUrl ||
                                            anime.trailerThumbnailUrl;
                                        fullDescriptionPopup = null;
                                    }}
                                    on:keydown={(e) => {
                                        if (e.key === "Enter") {
                                            window.setShouldGoBack(false);
                                            fullImagePopup =
                                                anime.bannerImageUrl ||
                                                anime.trailerThumbnailUrl;
                                            fullDescriptionPopup = null;
                                        }
                                    }}
                                >
                                    <i
                                        class="banner-image-icon fa-solid fa-image"
                                    />
                                    <h3 class="banner-image-label">
                                        {anime.bannerImageUrl
                                            ? "Banner"
                                            : "Thumbnail"}
                                    </h3>
                                </div>
                            {/if}
                        </div>
                        <div class="popup-body">
                            <div
                                bind:this={anime.popupInfo}
                                class="popup-info"
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
                                        class={anime?.contentCautionColor +
                                            "-color anime-title copy"}
                                        copy-value={anime?.shownTitle || ""}
                                        style:overflow={$popupIsGoingBack
                                            ? "hidden"
                                            : ""}
                                        on:scroll={itemScroll}
                                    >
                                        {anime?.shownTitle || "NA"}
                                    </a>
                                    <div class="info-rating-wrapper">
                                        <i class="fa-regular fa-star" />
                                        <h3
                                            class="copy"
                                            copy-value={(anime.averageScore !=
                                            null
                                                ? anime.formattedAverageScore ||
                                                  "NA"
                                                : "NA") +
                                                "/10 · " +
                                                (anime.popularity != null
                                                    ? anime.formattedPopularity ||
                                                      "NA"
                                                    : "NA")}
                                        >
                                            <b
                                                >{anime.averageScore != null
                                                    ? anime.formattedAverageScore ||
                                                      "NA"
                                                    : "NA"}</b
                                            >
                                            {"/10 · " +
                                                (anime.popularity != null
                                                    ? anime.formattedPopularity ||
                                                      "NA"
                                                    : "NA")}
                                            {" · "}{@html anime?.recommendedRatingInfo ||
                                                ""}
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
                                        <h4>
                                            {anime?.format || "NA"}
                                            {#key $earlisetReleaseDate || 1}
                                                {@html getFormattedAnimeFormat(
                                                    anime
                                                ) || " · NA"}
                                            {/key}
                                            {anime?.formattedDuration ||
                                                " · NA"}
                                        </h4>
                                    {:else}
                                        <h4>
                                            {anime?.format || "NA"}
                                            {@html getFormattedAnimeFormat(
                                                anime
                                            ) || " · NA"}
                                            {anime?.formattedDuration ||
                                                " · NA"}
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
                                                class={anime.userStatusColor +
                                                    "-color"}
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
                                        class="copy year-season"
                                        copy-value={anime.status || ""}
                                    >
                                        {anime.status || "NA"}
                                    </h4>
                                </div>
                                <div class="info-contents">
                                    {#if anime.studios?.length}
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
                                                {#each anime.studios as studios (studios?.studio || {})}
                                                    <a
                                                        class={"copy" +
                                                            (studios?.studioColor
                                                                ? ` ${studios?.studioColor}-color`
                                                                : "")}
                                                        rel={studios?.studio
                                                            ?.studioUrl
                                                            ? "noopener noreferrer"
                                                            : ""}
                                                        target={studios?.studio
                                                            ?.studioUrl
                                                            ? "_blank"
                                                            : ""}
                                                        href={studios?.studio
                                                            ?.studioUrl ||
                                                            "javascript:void(0)"}
                                                        copy-value={studios
                                                            ?.studio
                                                            ?.studioName || ""}
                                                    >
                                                        {studios?.studio
                                                            ?.studioName ||
                                                            "N/A"}
                                                    </a>
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
                                                {#each anime.genres as genres (genres?.genre || {})}
                                                    <span
                                                        class={"copy " +
                                                            (genres?.genreColor
                                                                ? `${genres?.genreColor}-color`
                                                                : "")}
                                                        copy-value={genres?.genre ||
                                                            ""}
                                                        >{genres?.genre ||
                                                            "N/A"}
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
                                                {#each anime.tags as tags (tags?.tag || {})}
                                                    <span
                                                        class={"copy " +
                                                            (tags?.tagColor
                                                                ? `${tags?.tagColor}-color`
                                                                : "")}
                                                        copy-value={tags?.copyValue ||
                                                            ""}
                                                        >{@html tags?.tag ||
                                                            "N/A"}
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
                                            anime.trailerThumbnailUrl ||
                                            ""}
                                        alt={(anime?.shownTitle || "") +
                                            (anime.coverImageUrl
                                                ? " Cover"
                                                : anime.bannerImageUrl
                                                ? " Banner"
                                                : " Thumbnail")}
                                        tabindex="0"
                                        class={"coverImg" +
                                            (!anime.coverImageUrl &&
                                            !anime.bannerImageUrl &&
                                            !anime.trailerThumbnailUrl
                                                ? " display-none"
                                                : "")}
                                        on:error={(e) => {
                                            addClass(e.target, "display-none");
                                        }}
                                        on:click={() => {
                                            window.setShouldGoBack(false);
                                            fullImagePopup =
                                                anime.coverImageUrl;
                                            fullDescriptionPopup = null;
                                        }}
                                        on:keydown={(e) => {
                                            window.setShouldGoBack(false);
                                            if (e.key === "Enter") {
                                                fullImagePopup =
                                                    anime.coverImageUrl;
                                                fullDescriptionPopup = null;
                                            }
                                        }}
                                    />
                                    {#if anime?.description}
                                        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                                        <div
                                            class="anime-description-wrapper"
                                            tabindex="0"
                                            on:click={() => {
                                                window.setShouldGoBack(false);
                                                fullDescriptionPopup =
                                                    editHTMLString(
                                                        anime?.description
                                                    );
                                                fullImagePopup = null;
                                            }}
                                            on:keydown={(e) => {
                                                window.setShouldGoBack(false);
                                                if (e.key === "Enter") {
                                                    fullDescriptionPopup =
                                                        editHTMLString(
                                                            anime?.description
                                                        );
                                                    fullImagePopup = null;
                                                }
                                            }}
                                        >
                                            <h3>Description</h3>
                                            <div class="anime-description">
                                                {@html editHTMLString(
                                                    anime?.description
                                                )}
                                            </div>
                                        </div>
                                    {/if}
                                </div>
                            </div>
                            <div class="footer">
                                <button
                                    class="hideshowbtn"
                                    style:overflow={$popupIsGoingBack
                                        ? "hidden"
                                        : ""}
                                    on:click={handleHideShow(
                                        anime.id,
                                        anime?.title?.english
                                    )}
                                    on:keydown={(e) =>
                                        e.key === "Enter" &&
                                        handleHideShow(
                                            anime.id,
                                            anime?.title?.english
                                        )}
                                >
                                    <i
                                        class="fa-solid fa-circle-minus hideshow"
                                    />
                                    {#if $hiddenEntries}
                                        {" " +
                                            ($hiddenEntries[anime?.id]
                                                ? "Show"
                                                : "Hide")}
                                    {:else}
                                        N/A
                                    {/if}
                                </button>
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
                                    class="openanilist"
                                    style:overflow={$popupIsGoingBack
                                        ? "hidden"
                                        : ""}
                                    on:click={() => {
                                        openInAnilist(anime.animeUrl);
                                    }}
                                    on:keydown={(e) =>
                                        e.key === "Enter" &&
                                        openInAnilist(anime.animeUrl)}
                                >
                                    <img
                                        loading="lazy"
                                        class="anilist-icon"
                                        src="./images/Anilist-Logo.svg"
                                        alt="Anilist Logo"
                                        width="23px"
                                        height="23px"
                                    /> Anilist</button
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
        out:fade={{ duration: 200 }}
    >
        <div
            class={"go-back-grid" + (goBackPercent >= 100 ? " willGoBack" : "")}
        >
            <i class="fa-solid fa-arrow-left" />
        </div>
    </div>
{/if}
{#if fullDescriptionPopup}
    <div
        class="fullPopupWrapper"
        on:click={() => (fullDescriptionPopup = fullImagePopup = null)}
        on:keydown={(e) =>
            e.key === "Enter" && (fullDescriptionPopup = fullImagePopup = null)}
        on:touchstart|passive={fullViewTouchStart}
        on:touchend|passive={fullViewTouchEnd}
        on:touchcancel={fullViewTouchCancel}
    >
        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
        <div class="fullPopup" id="fullPopup">
            <div class="fullPopupDescriptionWrapper">
                <div
                    on:keydown={(e) =>
                        e.key === "Enter" &&
                        (fullDescriptionPopup = fullImagePopup = null)}
                    tabindex="0"
                    class="fullPopupDescription"
                    out:fade={{ duration: 200 }}
                    on:scroll={fullViewScroll}
                >
                    {@html fullDescriptionPopup}
                </div>
            </div>
        </div>
    </div>
{/if}
{#if fullImagePopup}
    <div
        class="fullPopupWrapper"
        on:click={() => (fullDescriptionPopup = fullImagePopup = null)}
        on:keydown={(e) =>
            e.key === "Enter" && (fullDescriptionPopup = fullImagePopup = null)}
        on:touchstart|passive={fullViewTouchStart}
        on:touchend|passive={fullViewTouchEnd}
        on:touchcancel={fullViewTouchCancel}
    >
        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
        <div class="fullPopup" id="fullPopup">
            <img
                tabindex="0"
                class="fullPopupImage"
                loading="lazy"
                src={fullImagePopup}
                alt="Full View"
                on:keydown={(e) =>
                    e.key === "Enter" &&
                    (fullDescriptionPopup = fullImagePopup = null)}
                out:fade={{ duration: 200 }}
                on:error={(e) => {
                    addClass(e.target, "display-none");
                }}
            />
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
        transition: opacity 0.2s ease;
        margin-top: 55px;
        -ms-overflow-style: none;
        scrollbar-width: none;
        opacity: 0;
        scroll-behavior: auto;
    }

    .popup-container.willChange {
        will-change: opacity;
    }

    .popup-container.show {
        opacity: 1;
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
        transition: opacity 0.2s ease;
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
        animation: fadeOut 0.2s ease forwards;
        opacity: 0;
    }
    .bannerImg.fade-in {
        animation: fadeIn 0.2s ease forwards;
        opacity: 1;
    }

    .popup-body {
        overflow: hidden;
        touch-action: pan-y;
        margin: 1em 1em 0 1em;
    }

    .popup-info {
        overflow: hidden;
        margin-bottom: 1em;
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
        cursor: text;
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
        cursor: text;
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

    .info-status > .year-season {
        cursor: text;
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

    .anime-description-wrapper > h3 {
        cursor: pointer;
    }

    .anime-description {
        letter-spacing: 0.05rem;
        line-height: 2.5rem;
        -ms-overflow-style: none;
        scrollbar-width: none;
        font-size: 1.2rem !important;
        width: calc(100% - 1em);
        display: -webkit-box;
        max-width: calc(100% - 1em);
        -webkit-line-clamp: 7;
        -webkit-box-orient: vertical;
        overflow: hidden;
        margin: 0.25em 0.5em;
    }

    :global(.anime-description *) {
        font-size: 1.2rem !important;
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
        grid-template-columns: repeat(3, auto);
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
        .info-contents {
            margin: 1em 0;
            width: 100% !important;
            display: flex;
            flex-wrap: wrap;
            gap: 0.5em;
        }
    }

    @media screen and (min-width: 641px) {
        .popup-wrapper {
            background-color: rgba(0, 0, 0, 0.7) !important;
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

    @media screen and (max-width: 225px) {
        .autoplay-label,
        .list-update-label,
        .banner-image-label {
            display: none !important;
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

    .info > span,
    .info > a {
        color: #9ba0b2;
        background: #0b1622;
        padding: 8px 10px;
        border-radius: 6px;
        white-space: nowrap;
        -ms-overflow-style: none;
        scrollbar-width: none;
    }

    .info > a {
        color: rgb(61, 180, 242) !important;
    }

    .info a::-webkit-scrollbar,
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

    .list-update-container,
    .banner-image-button {
        display: flex;
        align-items: center;
        gap: 6px;
        color: #9ba0b2;
        cursor: pointer;
    }
    .list-update-icon,
    .banner-image-icon {
        font-size: 1.4rem;
        max-height: 0.9em;
        cursor: pointer;
    }

    .list-update-label,
    .banner-image-label {
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
        cursor: pointer;
    }

    .switch {
        position: relative;
        display: inline-block;
        width: 4rem;
        min-width: 4rem;
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
        left: 0.15em;
        bottom: 0.0772em;
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
        -webkit-transform: translateX(19px) translateZ(0);
        -ms-transform: translateX(19px) translateZ(0);
        transform: translateX(19px) translateZ(0);
        -moz-transform: translateX(19px) translateZ(0);
        -o-transform: translateX(19px) translateZ(0);
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
        animation: fadeIn 0.2s ease;
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
        animation: fadeIn 0.2s ease;
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
    .disable-interaction {
        pointer-events: none !important;
        position: fixed !important;
        transform: translateY(-99999px) translateZ(0) !important;
        -webkit-transform: translateY(-99999px) translateZ(0) !important;
        -ms-transform: translateY(-99999px) translateZ(0) !important;
        -moz-transform: translateY(-99999px) translateZ(0) !important;
        -o-transform: translateY(-99999px) translateZ(0) !important;
        user-select: none !important;
        touch-action: none !important;
        cursor: not-allowed !important;
        -webkit-user-drag: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        height: 0 !important;
        width: 0 !important;
        max-width: 0 !important;
        max-height: 0 !important;
        min-width: 0 !important;
        min-height: 0 !important;
        overflow: hidden !important;
    }
</style>
