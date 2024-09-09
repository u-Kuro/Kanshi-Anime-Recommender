<script>
    import { onMount, tick } from "svelte";
    import { fade } from "svelte/transition";
    import { sineOut } from "svelte/easing";
    import { cacheImage } from "../../../js/caching.js";
    import { mediaLoader, mediaManager, saveIDBdata, getIDBdata } from "../../../js/workerUtils.js";
    import {
        scrollToElement,
        getChildIndex,
        msToTime,
        addClass,
        removeClass,
        getMostVisibleElement,
        dragScroll,
        formatYear,
        formatMonth,
        formatDay,
        formatTime,
        formatWeekday,
        setLocalStorage,
        removeLocalStorage,
        requestImmediate,
        ncsCompare,
    } from "../../../js/others/helper.js";
    import {
        hiddenEntries,
        ytPlayers,
        autoPlay,
        popupVisible,
        openedMediaPopupIdx,
        android,
        inApp,
        confirmPromise,
        shownAllInList,
        dataStatus,
        listUpdateAvailable,
        popupIsGoingBack,
        earlisetReleaseDate,
        confirmIsVisible,
        isBackgroundUpdateKey,
        menuVisible,
        selectedCategory,
        loadedMediaLists,
        searchedWord,
        selectedMediaGridEl,
        gridFullView,
        windowHeight,
        windowWidth,
        documentScrollTop,
        loadingCategory,
    } from "../../../js/globalValues.js";

    const emptyImage = "data:image/png;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";

    let mostVisiblePopupHeader,
        currentHeaderIdx,
        lastYTPlayer,
        popupWrapper,
        popupContainer,
        navContainerEl,
        popupMediaObserver,
        fullImagePopup,
        fullDescriptionPopup,
        videoLoops = {},
        manuallyPausedTrailers = {},
        autoPausedTrailers = {},
        deletingTrailers = {};

    let checkMostVisiblePopupMediaFrame;
    function checkMostVisiblePopupMedia() {
        cancelAnimationFrame(checkMostVisiblePopupMediaFrame);
        if (!$popupVisible) return;
        checkMostVisiblePopupMediaFrame = requestAnimationFrame(() => {
            if (!$popupVisible) return;
            let visiblePopupHeader =
                getMostVisibleElement(
                    popupContainer,
                    ".popup-header",
                    $windowHeight > 360 ? 0.5 : 0,
                ) ||
                getMostVisibleElement(
                    popupContainer,
                    ".popup-content",
                    0,
                )?.getElementsByClassName("popup-header")?.[0];
            mostVisiblePopupHeader = visiblePopupHeader;
            playMostVisibleTrailer();
        });
    }

    function addPopupObserver() {
        popupMediaObserver?.disconnect?.();
        popupMediaObserver = null;
        popupMediaObserver = new IntersectionObserver(
            () => {
                checkMostVisiblePopupMedia();
            },
            {
                root: null,
                rootMargin: "100%",
                threshold: [0.5, 0],
            },
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

    async function handleHideShow(mediaID, title) {
        if (!$hiddenEntries) return pleaseWaitAlert();
        let isHidden = $hiddenEntries[mediaID];
        title = title
            ? `<span style="color:hsl(var(--ac-color));">${title}</span>`
            : "this entry";
        if (isHidden) {
            if (
                await $confirmPromise(
                    `Do you want to unhide ${title} in your recommendation list?`,
                )
            ) {
                mediaManager({
                    showId: mediaID,
                });
                delete $hiddenEntries?.[mediaID];
                $hiddenEntries = $hiddenEntries
            }
        } else {
            if (
                await $confirmPromise(
                    `Do you want to hide ${title} in your recommendation list?`,
                )
            ) {
                mediaManager({
                    removeId: mediaID,
                });
                $hiddenEntries[mediaID] = 1;
            }
        }
    }

    async function pleaseWaitAlert() {
        return await $confirmPromise({
            isAlert: true,
            title: "Initializing resources",
            text: "Please wait a moment...",
        });
    }

    async function handleMoreVideos(titles, format, askFirst) {
        let youtubeSearchTitle, hasMoreThanOne, ytTitles = {}
        try {
            for (let key of ["english", "romaji", "native"]) {
                let title = titles?.[key]?.trim?.(), loweredTitle
                if (typeof title !== "string" || title === "" || ytTitles[loweredTitle = title.toLowerCase()]) continue
                ytTitles[loweredTitle] = true
                if (youtubeSearchTitle) {
                    hasMoreThanOne = true
                    youtubeSearchTitle += " | " + title
                } else {
                    youtubeSearchTitle = title
                }
            }
        } catch {}
        if (typeof youtubeSearchTitle !== "string" || youtubeSearchTitle === "") return
        if (hasMoreThanOne) {
            youtubeSearchTitle = `(${youtubeSearchTitle})`
        }
        if (
            askFirst
            && !(await $confirmPromise({
                title: "See related videos",
                text: "Do you want to see more related videos in YouTube?",
                isImportant: true,
            }))
        ) {
            return
        }
        let mediaType = format === "Manga" || format === "One Shot" || format === "Novel" ? format : "Anime"
        window.open(
            `https://www.youtube.com/results?search_query=${encodeURIComponent(
                youtubeSearchTitle + " " + mediaType,
            )}`,
            "_blank",
        );
    }

    function openInAnilist(mediaUrl) {
        if (typeof mediaUrl !== "string" || mediaUrl === "") return;
        window.open(mediaUrl, "_blank");
    }

    function getYTPlayerState(state) {
        try {
            return YT.PlayerState[state]
        } catch {}
    }

    let afterImmediateScrollUponPopupVisible;
    popupVisible.subscribe(async (val) => {
        if (
            !(popupWrapper instanceof Element) ||
            !(popupContainer instanceof Element)
        )
            return;
        if (val === true) {
            // Scroll To Opened Media
            let openedMediaPopupEl =
                popupContainer?.children[
                    $openedMediaPopupIdx ?? currentHeaderIdx ?? 0
                ];
            if (openedMediaPopupEl instanceof Element) {
                // Animate Opening
                if ($documentScrollTop <= 0 || $menuVisible) {
                    removeClass(navContainerEl, "hide");
                    addClass(popupWrapper, "visible");
                    addClass(popupContainer, "show");
                } else {
                    requestAnimationFrame(() => {
                        addClass(navContainerEl, "stop-transition");
                        addClass(navContainerEl, "hide");
                        requestAnimationFrame(() => {
                            removeClass(navContainerEl, "stop-transition");
                            removeClass(navContainerEl, "hide");
                            addClass(popupWrapper, "visible");
                            addClass(popupContainer, "show");
                        });
                    });
                }
                // Try to Add YT player
                currentHeaderIdx = $openedMediaPopupIdx;
                let mediaList = $loadedMediaLists[$selectedCategory].mediaList;
                let openedMedias = [
                    [mediaList[$openedMediaPopupIdx], $openedMediaPopupIdx],
                    [
                        mediaList[$openedMediaPopupIdx + 1],
                        $openedMediaPopupIdx + 1,
                    ],
                    [
                        mediaList[$openedMediaPopupIdx - 1],
                        $openedMediaPopupIdx - 1,
                    ],
                ];
                await tick();
                scrollToElement(
                    popupContainer,
                    openedMediaPopupEl,
                    "top",
                    "instant",
                );
                afterImmediateScrollUponPopupVisible = true;
                let openedPopupHeader =
                    mediaList?.[$openedMediaPopupIdx]?.popupHeader ||
                    popupContainer?.children?.[
                        $openedMediaPopupIdx
                    ]?.querySelector?.(".popup-header");
                mostVisiblePopupHeader = openedPopupHeader;
                let trailerEl =
                    openedPopupHeader?.querySelector?.(".trailer") ||
                    popupContainer?.children?.[
                        $openedMediaPopupIdx
                    ]?.querySelector?.(".trailer");
                let haveTrailer;
                for (let i = 0, l = $ytPlayers?.length; i < l; i++) {
                    if ($ytPlayers[i]?.ytPlayer?.g === trailerEl) {
                        haveTrailer = true;
                        let ytId = $ytPlayers[i]?.ytPlayer?.g?.id;
                        if (
                            $inApp &&
                            !manuallyPausedTrailers?.[ytId] &&
                            ($ytPlayers[i]?.ytPlayer?.getPlayerState?.() !== (getYTPlayerState("ENDED")??0) ||
                                $ytPlayers[i]?.ytPlayer?.getPlayerState?.() === (getYTPlayerState("PAUSED")??2))
                        ) {
                            await tick();
                            prePlayYtPlayer($ytPlayers[i]?.ytPlayer);
                            $ytPlayers[i]?.ytPlayer?.playVideo?.();
                            break;
                        }
                    }
                }
                openedMedias.forEach(([openedMedia, openedMediaIdx], idx) => {
                    if (haveTrailer && openedMedia && idx === 0) return;
                    else if (openedMedia)
                        createPopupYTPlayer(openedMedia, openedMediaIdx);
                });
                $openedMediaPopupIdx = null;

                window.addHistory?.();
            } else {
                afterImmediateScrollUponPopupVisible = false;
                // Animate Opening
                if ($documentScrollTop <= 0) {
                    removeClass(navContainerEl, "hide");
                    addClass(popupWrapper, "visible");
                    addClass(popupContainer, "show");
                } else {
                    requestAnimationFrame(() => {
                        addClass(navContainerEl, "stop-transition");
                        addClass(navContainerEl, "hide");
                        requestAnimationFrame(() => {
                            removeClass(navContainerEl, "stop-transition");
                            removeClass(navContainerEl, "hide");
                            addClass(popupWrapper, "visible");
                            addClass(popupContainer, "show");
                        });
                    });
                }
            }
        } else if (val === false) {
            window.closeFullScreenItem?.();
            window.handleConfirmationCancelled?.();
            $confirmIsVisible = false;
            if (!$menuVisible && $documentScrollTop > 0) {
                addClass(navContainerEl, "hide");
            }
            removeClass(popupContainer, "show");
            requestImmediate(() => {
                // Stop All Player
                $ytPlayers.forEach(({ ytPlayer }) => {
                    let ytId = ytPlayer?.g?.id;
                    if (ytId && !deletingTrailers?.[ytId]) {
                        autoPausedTrailers[ytId] = true;
                        ytPlayer?.pauseVideo?.();
                    }
                });
                removeClass(navContainerEl, "hide");
                removeClass(popupWrapper, "visible");
            }, 200);

            if ($listUpdateAvailable) {
                updateList(true);
            }
        }
    });

    const newPopupMediaObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    mediaLoader({
                        loadMore: true,
                        selectedCategory: $selectedCategory,
                        searchedWord: $searchedWord,
                    });
                }
            });
        },
        {
            root: null,
            rootMargin: "100%",
            threshold: [0.5, 0],
        },
    );

    let observedGrid;
    $: {
        if (observedGrid instanceof Element) {
            newPopupMediaObserver.observe(observedGrid);
        }
    }

    async function reloadPopupContentObserver() {
        let mediaList = $loadedMediaLists?.[$selectedCategory || ""]?.mediaList;
        if (mediaList instanceof Array && mediaList.length) {
            if (popupMediaObserver) {
                popupMediaObserver?.disconnect?.();
                popupMediaObserver = null;
            }
            await tick();
            addPopupObserver();
            mediaList.forEach(async (media, mediaIdx) => {
                let popupHeader =
                    media.popupHeader ||
                    popupContainer.children?.[mediaIdx]?.querySelector?.(
                        ".popup-header",
                    );
                if (popupHeader instanceof Element) {
                    popupMediaObserver?.observe?.(popupHeader);
                }
            });
            playMostVisibleTrailer();
        } else if (mediaList instanceof Array && mediaList.length < 1) {
            $popupVisible = false;
        }
    }
    selectedCategory.subscribe(reloadPopupContentObserver);
    loadedMediaLists.subscribe(reloadPopupContentObserver);

    function changeAutoPlay() {
        $autoPlay = !$autoPlay;
    }

    autoPlay.subscribe(async (val) => {
        if (typeof val === "boolean") {
            saveIDBdata(val, "autoPlay");
            setLocalStorage("autoPlay", val).catch(() => {
                removeLocalStorage("autoPlay");
            });
            await tick();
            if (!$popupVisible) return;
            let visibleTrailer = mostVisiblePopupHeader?.querySelector?.(".trailer");
            for (let i = 0, l = $ytPlayers?.length; i < l; i++) {
                delete $ytPlayers?.[i]?.ytPlayer?.KanshiIsMuteApplied
                let ytId = $ytPlayers[i]?.ytPlayer?.g?.id;
                if (
                    $ytPlayers[i]?.ytPlayer?.g === visibleTrailer &&
                    $inApp &&
                    !manuallyPausedTrailers?.[ytId] &&
                    $ytPlayers[i]?.ytPlayer?.getPlayerState?.() !== (getYTPlayerState("ENDED")??0)
                ) {
                    if (val === true) {
                        const isMuted = $ytPlayers[i]?.ytPlayer?.isMuted?.()
                        if (isMuted === true) {
                            $ytPlayers[i]?.ytPlayer?.seekTo?.(0, true)
                        }
                        prePlayYtPlayer($ytPlayers[i]?.ytPlayer);
                        $ytPlayers[i]?.ytPlayer?.playVideo?.();
                    } else {
                        $ytPlayers[i]?.ytPlayer?.mute?.()
                    }
                } else {
                    let ytId = $ytPlayers[i]?.ytPlayer?.g?.id;
                    if (ytId && !deletingTrailers?.[ytId]) {
                        autoPausedTrailers[ytId] = true;
                        $ytPlayers[i]?.ytPlayer?.pauseVideo?.();
                    }
                    if (val === true) {
                        $ytPlayers[i]?.ytPlayer?.unMute?.();
                    } else {
                        $ytPlayers[i]?.ytPlayer?.mute?.()
                    }
                }
            }
        }
    });

    let scrollToGridTimeout, createPopupPlayersTimeout;
    async function playMostVisibleTrailer() {
        if (
            !$popupVisible ||
            document.fullScreen ||
            document.mozFullScreen ||
            document.webkitIsFullScreen ||
            document.msFullscreenElement
        )
            return;
        await tick();
        let visibleTrailer =
            mostVisiblePopupHeader?.querySelector?.(".trailer");
        // Scroll in Grid
        let visibleTrailerIdx =
            getChildIndex(
                mostVisiblePopupHeader?.closest?.(".popup-content"),
            ) ?? -1;
        let previousCategory = $selectedCategory;
        clearTimeout(scrollToGridTimeout);
        scrollToGridTimeout = setTimeout(() => {
            if (!$popupVisible || previousCategory !== $selectedCategory)
                return;
            let mediaList = $loadedMediaLists[$selectedCategory].mediaList;
            let mediaGrid =
                mediaList?.[visibleTrailerIdx]?.gridElement ||
                $selectedMediaGridEl?.children?.[visibleTrailerIdx];
            if ($popupVisible && mediaGrid instanceof Element) {
                if ($gridFullView) {
                    mediaGrid.scrollIntoView({
                        behavior: "smooth",
                        inline: "nearest",
                    });
                } else {
                    let top = mediaGrid.getBoundingClientRect().top;
                    let clientHeight = mediaGrid.clientHeight;
                    let newScrollTop;
                    if (top < 0) {
                        newScrollTop = $documentScrollTop + (top - 5);
                    } else if (top > $windowHeight - 65 - clientHeight) {
                        newScrollTop = $documentScrollTop + top - $windowHeight + clientHeight + 70;
                    }
                    if (newScrollTop) {
                        const documentEl = document.documentElement;
                        documentEl.style.overflow = "hidden";
                        documentEl.style.overflow = "";
                        documentEl.scrollTo({
                            behavior: "smooth",
                            top: newScrollTop,
                        });
                    }
                }
            }
        }, 300);
        let haveTrailer;
        if (visibleTrailer instanceof Element) {
            haveTrailer = $ytPlayers?.some(
                ({ ytPlayer }) => ytPlayer?.g === visibleTrailer,
            );
        }
        if (haveTrailer) {
            // Recheck Trailer
            if (visibleTrailerIdx >= 0) {
                let mediaList = $loadedMediaLists[$selectedCategory].mediaList;
                currentHeaderIdx = visibleTrailerIdx;
                let nearMedias = [
                    [mediaList?.[visibleTrailerIdx + 1], visibleTrailerIdx + 1],
                    [mediaList?.[visibleTrailerIdx - 1], visibleTrailerIdx - 1],
                ];
                createPopupPlayersTimeout?.();
                createPopupPlayersTimeout = requestImmediate(async () => {
                    if (!$popupVisible) return;
                    nearMedias.forEach(([nearMedia, nearMediaIdx]) => {
                        if (nearMedia)
                            createPopupYTPlayer(nearMedia, nearMediaIdx);
                    });
                }, 300);
            }
            // Replay Most Visible Trailer
            for (let i = 0, l = $ytPlayers?.length; i < l; i++) {
                if ($ytPlayers[i]?.ytPlayer?.g === visibleTrailer) {
                    if ($ytPlayers[i]?.ytPlayer?.getPlayerState?.() !== (getYTPlayerState("PLAYING")??1)) {
                        await tick();
                        let ytId = $ytPlayers[i]?.ytPlayer?.g?.id;
                        if (
                            $popupVisible &&
                            $inApp &&
                            !manuallyPausedTrailers?.[ytId] &&
                            (($ytPlayers[i]?.ytPlayer?.getPlayerState?.() !== (getYTPlayerState("ENDED")??0)) ||
                                $ytPlayers[i]?.ytPlayer?.getPlayerState?.() === (getYTPlayerState("PAUSED")??2))
                        ) {
                            prePlayYtPlayer($ytPlayers[i]?.ytPlayer);
                            $ytPlayers[i]?.ytPlayer?.playVideo?.();
                        }
                    }
                } else {
                    let ytId = $ytPlayers[i]?.ytPlayer?.g?.id;
                    if (ytId && !deletingTrailers?.[ytId]) {
                        autoPausedTrailers[ytId] = true;
                        $ytPlayers[i]?.ytPlayer?.pauseVideo?.();
                    }
                }
            }
        } else {
            // Pause All Players
            $ytPlayers?.forEach(({ ytPlayer }) => {
                let ytId = ytPlayer?.g?.id;
                if (ytId && !deletingTrailers?.[ytId]) {
                    autoPausedTrailers[ytId] = true;
                    ytPlayer?.pauseVideo?.();
                }
            });
            // Recheck Trailer
            if (visibleTrailerIdx >= 0) {
                currentHeaderIdx = visibleTrailerIdx;
                let mediaList = $loadedMediaLists[$selectedCategory].mediaList;
                let nearMedias = [
                    [mediaList?.[visibleTrailerIdx], visibleTrailerIdx],
                    [mediaList?.[visibleTrailerIdx + 1], visibleTrailerIdx + 1],
                    [mediaList?.[visibleTrailerIdx - 1], visibleTrailerIdx - 1],
                ];
                createPopupPlayersTimeout?.();
                createPopupPlayersTimeout = requestImmediate(async () => {
                    if (!$popupVisible) return;
                    nearMedias.forEach(([nearMedia, nearMediaIdx]) => {
                        if (nearMedia)
                            createPopupYTPlayer(nearMedia, nearMediaIdx);
                    });
                }, 300);
            }
        }
    }

    let failingTrailers = {};
    function createPopupYTPlayer(openedMedia, headerIdx) {
        let popupHeader =
            openedMedia?.popupHeader ||
            popupContainer.children?.[headerIdx]?.querySelector(
                ".popup-header",
            );
        let ytPlayerEl =
            popupHeader?.querySelector?.(".trailer") ||
            popupHeader?.querySelector?.(".trailer");
        let youtubeID = openedMedia?.trailerID;
        if (
            ytPlayerEl instanceof Element &&
            youtubeID &&
            typeof YT !== "undefined" &&
            typeof YT?.Player === "function"
        ) {
            if ($ytPlayers.some(({ ytPlayer }) => ytPlayer?.g === ytPlayerEl))
                return;
            addClass(popupHeader, "loader");
            let popupImg = popupHeader?.querySelector?.(".popup-img");
            if ($ytPlayers.length >= 3) {
                let destroyedPlayerIdx = 0;
                let furthestDistance = -Infinity;
                $ytPlayers.forEach((_ytPlayer, index) => {
                    if (_ytPlayer?.headerIdx === -1) return;
                    let distance = Math.abs(
                        _ytPlayer?.headerIdx - currentHeaderIdx,
                    );
                    if (distance > furthestDistance) {
                        furthestDistance = distance;
                        destroyedPlayerIdx = index;
                    }
                });
                let destroyedPlayer = $ytPlayers?.splice?.(
                    destroyedPlayerIdx,
                    1,
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
                "yt-player" + Date.now() + Math.random(),
            );
            let ytPlayer = new YT.Player(ytPlayerEl, {
                videoId: youtubeID,
                playerVars: {
                    cc_lang_pref: "en", // Set preferred caption language to English
                    cc_load_policy: 1, // Set on by default
                    enablejsapi: 1, // Enable the JavaScript API
                    modestbranding: 1, // Enable modest branding (hide the YouTube logo)
                    playsinline: 1, // Enable inline video playback
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
        $ytPlayers =
            $ytPlayers?.filter?.(
                (_ytPlayer) => _ytPlayer?.ytPlayer !== ytPlayer,
            ) || [];
        ytPlayer?.destroy?.();
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
        let mediaList = $loadedMediaLists[$selectedCategory].mediaList;
        let loopedMediaID = mediaList?.[getChildIndex(popupContent) ?? -1]?.id;
        let ytId = trailerEl?.id;
        const playerState = _ytPlayer?.getPlayerState?.()
        if (
            ytId &&
            !deletingTrailers?.[ytId] &&
            playerState === (getYTPlayerState("PAUSED")??2)
        ) {
            if (
                mostVisiblePopupHeader === popupHeader
                && !autoPausedTrailers?.[ytId]
            ) {
                manuallyPausedTrailers[ytId] = true
            }
        } else {
            delete manuallyPausedTrailers?.[ytId];
            delete autoPausedTrailers?.[ytId];
        }
        
        if (playerState === (getYTPlayerState("ENDED")??0)) {
            if (loopedMediaID != null) {
                if (videoLoops[loopedMediaID]) {
                    clearTimeout(videoLoops[loopedMediaID]);
                    videoLoops[loopedMediaID] = null;
                }
                videoLoops[loopedMediaID] = setTimeout(() => {
                    _ytPlayer?.stopVideo?.();
                    let currentPlayerState = _ytPlayer?.getPlayerState?.();
                    let canReplay = currentPlayerState === (getYTPlayerState("CUED")??5) || currentPlayerState === (getYTPlayerState("ENDED")??0);
                    if (
                        mostVisiblePopupHeader === popupHeader &&
                        canReplay &&
                        _ytPlayer?.g &&
                        $inApp &&
                        $popupVisible
                    ) {
                        prePlayYtPlayer(_ytPlayer);
                        _ytPlayer?.playVideo?.();
                    }
                }, 30000); // Play Again after 30 seconds
            }
        } else if (videoLoops[loopedMediaID]) {
            clearTimeout(videoLoops[loopedMediaID]);
            videoLoops[loopedMediaID] = null;
        }
        if (playerState === (getYTPlayerState("PLAYING")??1)) {
            if (
                trailerEl?.classList?.contains?.("display-none") ||
                !popupImg?.classList?.contains?.("display-none")
            ) {
                $ytPlayers?.forEach(({ ytPlayer }) => {
                    if (ytPlayer?.g !== _ytPlayer?.g) {
                        let ytId = ytPlayer?.g?.id;
                        if (ytId && !deletingTrailers?.[ytId]) {
                            autoPausedTrailers[ytId] = true;
                            ytPlayer?.pauseVideo?.();
                        }
                    }
                });
                addClass(popupImg, "fade-out");
                removeClass(popupHeader, "loader");
                removeClass(trailerEl, "display-none");
                requestImmediate(() => {
                    addClass(popupImg, "display-none");
                    removeClass(popupImg, "fade-out");
                }, 200);
            }
        }
    }

    async function onPlayerReady(event) {
        let ytPlayer = event.target;
        let trailerEl = ytPlayer?.g;
        let popupHeader = trailerEl?.parentElement;
        let popupContent = popupHeader?.closest?.(".popup-content");
        let mediaList = $loadedMediaLists[$selectedCategory].mediaList;
        let media = mediaList?.[getChildIndex(popupContent) ?? -1];
        if (
            ytPlayer?.getPlayerState?.() === (getYTPlayerState("UNSTARTED")??-1) ||
            trailerEl.tagName !== "IFRAME" ||
            window.navigator?.onLine === false
        ) {
            if (media?.id != null) {
                failingTrailers[media.id] = true;
            }
            $ytPlayers =
                $ytPlayers?.filter?.(
                    (_ytPlayer) => _ytPlayer?.ytPlayer !== ytPlayer,
                ) || [];
            ytPlayer?.destroy?.();
            addClass(trailerEl, "display-none");
            removeClass(popupHeader, "loader");
            let popupImg = popupHeader?.querySelector?.(".popup-img");
            removeClass(popupImg, "display-none");
        } else {
            if (media?.id != null) {
                delete failingTrailers[media.id];
                failingTrailers = failingTrailers
            }
            // Play Most Visible when 1 Succeed
            // then Mute/Buffer other players
            let mostVisibleTrailerEl = mostVisiblePopupHeader?.querySelector?.(".trailer")
            let ytId = trailerEl?.id;
            if (ytId && mostVisibleTrailerEl && mostVisibleTrailerEl !== trailerEl) {
                trailerEl?.setAttribute?.("loading", "lazy");
                ytPlayer?.mute?.()
                ytPlayer?.playVideo?.()
                autoPausedTrailers[ytId] = true;
                ytPlayer?.pauseVideo?.()
            }
            playMostVisibleTrailer();
        }
    }

    let savedYtVolume
    function prePlayYtPlayer(ytPlayer) {
        const ytVolume = lastYTPlayer?.getVolume?.();
        if (typeof ytVolume === "number") {
            if (!savedYtVolume) {
                (async () => {
                    savedYtVolume = (await getIDBdata("savedYtVolume")) || savedYtVolume;
                    if (!savedYtVolume) {
                        savedYtVolume = !$android && matchMedia("(hover:hover)").matches ? 50 : 100;
                    }
                    if (savedYtVolume !== ytVolume) {
                        savedYtVolume = ytVolume;
                        saveIDBdata(savedYtVolume, "savedYtVolume");
                    }
                    ytPlayer?.setVolume?.(savedYtVolume);
                })()
            } else {
                if (savedYtVolume !== ytVolume) {
                    savedYtVolume = ytVolume;
                    saveIDBdata(savedYtVolume, "savedYtVolume");
                }    
                ytPlayer?.setVolume?.(savedYtVolume);
            }
        }
        
        const isMuted = ytPlayer?.isMuted?.()
        if (typeof isMuted==="boolean" 
            && ytPlayer?.KanshiIsMuteApplied !== true
        ) {
            if ($autoPlay) {
                if (isMuted) {
                    ytPlayer?.unMute?.();
                } else {
                    try {
                        ytPlayer.KanshiIsMuteApplied = true
                    } catch {}
                }
            } else {
                if (isMuted) {
                    try {
                        ytPlayer.KanshiIsMuteApplied = true
                    } catch {}
                } else {
                    ytPlayer?.mute?.();
                }
            }
        }
    }

    async function openMoreInfo(
        mediaID, 
        trailerID, 
        image, 
        title, 
        format
    ) {
        if (image) {
            fullImagePopup = image;
            fullDescriptionPopup = null;
        } else if (trailerID && !failingTrailers[mediaID]) {
            if (
                await $confirmPromise({
                    title: "Open trailer",
                    text: "Do you want to open the trailer in YouTube?",
                    isImportant: true,
                })
            ) {
                openTrailer(trailerID)
            }
        } else {
            handleMoreVideos(title, format, true);
        }
    }

    function openTrailer(trailerID) {
        if (trailerID) {
            window.open(
                `https://www.youtube.com/watch?v=${trailerID}`,
                "_blank",
            );
        }
    }

    async function updateList(skipConfirm) {
        if ($android && window[$isBackgroundUpdateKey] === true) return;
        if (
            skipConfirm ||
            (await $confirmPromise({
                title: "Reload List",
                text: "Do you want to refresh your list to sync changes?",
            }))
        ) {
            $listUpdateAvailable = false;
            mediaManager({ updateRecommendedMediaList: true });
        }
    }

    function getFormattedMediaFormat(
        { episodes, chapters, nextAiringEpisode, episodeProgress },
        isManga,
        isNovel,
    ) {
        let text;
        let timeDifMS;
        let nextEpisode;
        let nextAiringDate;
        if (
            !isManga &&
            !isNovel &&
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
            text = ` · <span style="color:hsl(var(--ac-color));">${nextEpisode}/${episodes} in ${formatDateDifference(
                nextAiringDate,
                timeDifMS,
            )}</span>`;
        } else if (timeDifMS > 0 && typeof nextEpisode === "number") {
            let episodeFormat = "";
            if (episodes != null && nextEpisode === episodes) {
                episodeFormat = `Fin ${nextEpisode}`;
            } else {
                episodeFormat = `Ep ${nextEpisode}`;
            }
            text = ` · <span style="color:hsl(var(--ac-color));">${episodeFormat} in ${formatDateDifference(
                nextAiringDate,
                timeDifMS,
            )}</span>`;
        } else if (
            timeDifMS <= 0 &&
            typeof nextEpisode === "number" &&
            episodes > nextEpisode
        ) {
            text = ` · ${nextEpisode}/${episodes}`;
        } else if (episodes > 0 && !isManga && !isNovel) {
            text = ` · ${episodes} Ep${episodes > 1 ? "s" : ""}`;
        } else if (chapters > 0 && (isManga || isNovel)) {
            text = ` · ${chapters} Ch${chapters > 1 ? "s" : ""}`;
        } else if (episodeProgress > 0) {
            text = ` · Seen ${episodeProgress} ${isManga || isNovel ? "Ch" : "Ep"}${episodeProgress > 1 ? "s" : ""}`;
        }
        return text;
    }
    const oneMinute = 60 * 1000;
    const oneHour = 60 * oneMinute;
    const oneDay = 24 * oneHour;
    const oneWeek = 7 * oneDay;

    function formatDateDifference(endDate, timeDifference) {
        if (timeDifference > oneWeek) {
            return `${msToTime(timeDifference, 1)}, ${formatMonth(
                endDate,
            )} ${formatDay(endDate)} ${formatYear(endDate)}`;
        } else if (timeDifference <= oneWeek && timeDifference > oneDay) {
            return `${msToTime(timeDifference, 1)}, ${formatWeekday(
                endDate,
            )}, ${formatTime(endDate).toLowerCase()}`;
        } else {
            return `${msToTime(timeDifference, 2)}, ${formatTime(
                endDate,
            ).toLowerCase()}`;
        }
    }

    // Global Function For Android
    window.returnedAppIsVisible = (inAndroidApp) => {
        // Only For Android, and workaround for Alert visibility
        if (!$android) return;
        if (!$popupVisible) return;
        if ($inApp === inAndroidApp) return;
        $inApp = inAndroidApp;
        let visibleTrailer = mostVisiblePopupHeader?.querySelector?.(".trailer");
        if (!visibleTrailer) return;
        if ($inApp) {
            for (let i = 0, l = $ytPlayers?.length; i < l; i++) {
                let ytId = $ytPlayers[i]?.ytPlayer?.g?.id;
                if (
                    $ytPlayers[i]?.ytPlayer?.g === visibleTrailer &&
                    !manuallyPausedTrailers?.[ytId] &&
                    ($ytPlayers[i]?.ytPlayer?.getPlayerState?.() !== (getYTPlayerState("ENDED")??0) ||
                        $ytPlayers[i]?.ytPlayer?.getPlayerState?.() === (getYTPlayerState("PAUSED")??2))
                ) {
                    prePlayYtPlayer($ytPlayers[i]?.ytPlayer);
                    $ytPlayers[i]?.ytPlayer?.playVideo?.();
                } else {
                    let ytId = $ytPlayers[i]?.ytPlayer?.g?.id;
                    if (ytId && !deletingTrailers?.[ytId]) {
                        autoPausedTrailers[ytId] = true;
                        $ytPlayers[i]?.ytPlayer?.pauseVideo?.();
                    }
                }
            }
        } else {
            for (let i = 0, l = $ytPlayers?.length; i < l; i++) {
                let ytId = $ytPlayers[i]?.ytPlayer?.g?.id;
                if (ytId && !deletingTrailers?.[ytId]) {
                    autoPausedTrailers[ytId] = true;
                    $ytPlayers[i]?.ytPlayer?.pauseVideo?.();
                }
            }
        }
    };
    document.addEventListener("visibilitychange", () => {
        // Only for Browsers
        if ($android) return;
        $inApp = document.visibilityState === "visible";
        if (!$popupVisible) return;
        let visibleTrailer = mostVisiblePopupHeader?.querySelector?.(".trailer");
        if (!visibleTrailer) return;
        if ($inApp) {
            for (let i = 0, l = $ytPlayers?.length; i < l; i++) {
                let ytId = $ytPlayers[i]?.ytPlayer?.g?.id;
                if (
                    $ytPlayers[i]?.ytPlayer?.g === visibleTrailer &&
                    !manuallyPausedTrailers?.[ytId] &&
                    ($ytPlayers[i]?.ytPlayer?.getPlayerState?.() !== (getYTPlayerState("ENDED")??0) ||
                        $ytPlayers[i]?.ytPlayer?.getPlayerState?.() === (getYTPlayerState("PAUSED")??2))
                ) {
                    prePlayYtPlayer($ytPlayers[i]?.ytPlayer);
                    $ytPlayers[i]?.ytPlayer?.playVideo?.();
                } else {
                    let ytId = $ytPlayers[i]?.ytPlayer?.g?.id;
                    if (ytId && !deletingTrailers?.[ytId]) {
                        autoPausedTrailers[ytId] = true;
                        $ytPlayers[i]?.ytPlayer?.pauseVideo?.();
                    }
                }
            }
        } else {
            for (let i = 0, l = $ytPlayers?.length; i < l; i++) {
                let ytId = $ytPlayers[i]?.ytPlayer?.g?.id;
                if (ytId && !deletingTrailers?.[ytId]) {
                    autoPausedTrailers[ytId] = true;
                    $ytPlayers[i]?.ytPlayer?.pauseVideo?.();
                }
            }
        }
    });

    window.addEventListener("online", () => {
        if (window[$isBackgroundUpdateKey] === true) return
        if ($android) {
            try {
                JSBridge.isOnline(true);
            } catch (ex) { console.error(ex) }
        } else {
            $dataStatus = "Reconnected Successfully";
        }
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
            $ytPlayers =
                $ytPlayers?.filter?.(({ ytPlayer }) => {
                    if (
                        typeof ytPlayer?.playVideo === "function" &&
                        ytPlayer?.getPlayerState?.() !== (getYTPlayerState("UNSTARTED")??-1) &&
                        !isNaN(ytPlayer?.getPlayerState?.())
                    ) {
                        return true;
                    } else {
                        ytPlayer?.destroy?.();
                        let popupImg = ytPlayer?.g
                            ?.closest?.(".popup-header")
                            ?.querySelector?.(".popup-img");
                        if (popupImg instanceof Element) {
                            removeClass(popupImg, "display-none");
                        }
                        return false;
                    }
                }) || [];
            playMostVisibleTrailer();
        });
    }
    window.playMostVisibleTrailer = playMostVisibleTrailer;
    window.reloadYoutube = reloadYoutube;
    window.addEventListener("offline", () => {
        if (window[$isBackgroundUpdateKey] === true) return
        if ($android) {
            try {
                JSBridge.isOnline(false);
            } catch (ex) { console.error(ex) }
        } else {
            $dataStatus = "Currently Offline";
        }
    });
    function loadYouTubeAPI() {
        return new Promise((resolve) => {
            let src = "https://www.youtube.com/iframe_api?v=16";
            let existingScript = document.querySelector(
                `#www-widgetapi-script[src="${src}"]`,
            );
            if (!existingScript) {
                existingScript = document.querySelector(`script[src="${src}"]`);
            }
            if (existingScript) {
                existingScript.parentElement.removeChild(existingScript);
            }
            let tag = document.createElement("script");
            tag.src = src;
            tag.id = "www-widgetapi-script";
            tag.onerror = () => {
                resolve();
            };
            tag.onload = () => {
                window.onYouTubeIframeAPIReady?.();
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
        willGoBack,
        itemIsScrolling,
        itemIsScrollingTimeout;

    function popupScroll() {
        let element = this 
        if (!(element instanceof Element)) {
            element = popupContainer
        }
        if (afterImmediateScrollUponPopupVisible) {
            let isScrolledDownMax = element.scrollHeight >= element.scrollTop + element.clientHeight - 50;
            let isScrolledUpMax = element.scrollTop <= 50;
            if (isScrolledUpMax || isScrolledDownMax) {
                checkMostVisiblePopupMedia();
            }
        }
        itemIsScrolling = true;
        clearTimeout(itemIsScrollingTimeout);
        itemIsScrollingTimeout = setTimeout(() => {
            itemIsScrolling = false;
        }, 50);
        touchID = null;
        willGoBack = checkPointer = $popupIsGoingBack = false;
    }
    function itemScroll() {
        itemIsScrolling = true;
        clearTimeout(itemIsScrollingTimeout);
        itemIsScrollingTimeout = setTimeout(() => {
            itemIsScrolling = false;
        }, 500);
    }
    function popupContainerTouchStart(event) {
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
    function popupContainerTouchMove(event) {
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
            if (deltaX > 48) {
                willGoBack = true;
            } else {
                willGoBack = false;
            }
        }
    }
    function popupContainerTouchEnd(event) {
        if ($popupIsGoingBack) {
            endX = Array.from(event.changedTouches)?.find(
                (touch) => touch.identifier === touchID,
            )?.clientX;
            if (typeof endX === "number") {
                let deltaX = endX - startX;
                if ($popupIsGoingBack && deltaX >= 48) {
                    $popupVisible = false;
                }
            }
            touchID = null;
            willGoBack = checkPointer = $popupIsGoingBack = false;
        } else {
            touchID = null;
            willGoBack = checkPointer = $popupIsGoingBack = false;
        }
    }

    function popupContainerTouchCancel() {
        touchID = null;
        willGoBack = checkPointer = $popupIsGoingBack = false;
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
                        element.scrollTop,
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

    let fullPopupDescriptionEl;
    async function isDescriptionScrollable(node) {
        await tick();
        fullPopupDescriptionEl = node || fullPopupDescriptionEl;
        if (fullPopupDescriptionEl instanceof Element) {
            if (
                fullPopupDescriptionEl?.scrollHeight >
                fullPopupDescriptionEl?.clientHeight
            ) {
                addClass(fullPopupDescriptionEl, "scrollable");
            } else {
                removeClass(fullPopupDescriptionEl, "scrollable");
            }
        } else {
            addClass(fullPopupDescriptionEl, "scrollable");
        }
    }

    function fullViewTouchEnd(e) {
        if (!fvIsScrolled) {
            let endY = Array.from(e?.changedTouches || [])?.find(
                (touch) => touch?.identifier === fvTouchId,
            )?.clientY;
            let endX = Array.from(e?.changedTouches || [])?.find(
                (touch) => touch?.identifier === fvTouchId,
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

    function showFullScreenEditedHTMLInfo(editedHTMLString) {
        if (!editedHTMLString) return;
        let newFullDescriptionPopup = editedHTMLString || '';
        if (fullDescriptionPopup === newFullDescriptionPopup) {
            fullDescriptionPopup = null;
        } else {
            fullDescriptionPopup = newFullDescriptionPopup;
        }
        fullImagePopup = null;
    }
    function showFullScreenInfo(info) {
        if (!info) return;
        let newFullDescriptionPopup = editHTMLString(info) || '';
        if (fullDescriptionPopup === newFullDescriptionPopup) {
            fullDescriptionPopup = null;
        } else {
            fullDescriptionPopup = newFullDescriptionPopup;
        }
        fullImagePopup = null;
    }
    window.showFullScreenInfo = showFullScreenInfo;
    function showFullScreenImage(image) {
        if (!image) return;
        if (fullImagePopup === image) {
            fullImagePopup = null;
        } else {
            fullImagePopup = image;
        }
        fullDescriptionPopup = null;
    }

    $: fullDescriptionPopup, isDescriptionScrollable();
    $: if (fullDescriptionPopup || fullImagePopup) {
        window.addHistory?.();
    }

    window.checkOpenFullScreenItem = () => {
        return fullImagePopup || fullDescriptionPopup;
    };
    window.closeFullScreenItem = () => {
        fullDescriptionPopup = fullImagePopup = null;
    };

    async function addImage(node, imageUrl) {
        if (imageUrl && imageUrl !== emptyImage) {
            node.src = imageUrl;
            let newImageUrl = await cacheImage(imageUrl);
            if (newImageUrl) {
                node.src = newImageUrl;
            }
        } else {
            node.src = emptyImage;
        }
    }
    function reloadImage(e) {
        try {
            let element = this
            if (element?.tagName!=="IMG") {
                element = e?.target
            }
            const src = element?.src;
            if (src && src !== emptyImage)
            element.src = src
        } catch {}
    }

    let topPopupVisibleCount = $windowHeight >= 1000 ? 2 : 1,
        bottomPopupVisibleCount = Math.floor(Math.max(1, $windowHeight / 640)) || 1
    windowHeight.subscribe((val) => {
        topPopupVisibleCount = val >= 1000 ? 2 : 1
        bottomPopupVisibleCount = Math.floor(Math.max(1, val / 640)) || 1
    })

    function popupMainEl(node) {
        return {
            destroy() {
                let trailerEl = node?.querySelector?.(".trailer");
                let ytId = trailerEl?.id;
                if (ytId && !deletingTrailers?.[ytId]) {
                    deletingTrailers[ytId] = true;
                    $ytPlayers =
                        $ytPlayers?.filter?.((e) => {
                            let recTrailerEl = e?.ytPlayer?.g
                            if (
                                recTrailerEl === trailerEl ||
                                recTrailerEl?.id === ytId
                            ) {
                                e?.ytPlayer?.destroy?.();
                                return false
                            } else {
                                return true;
                            }
                        }) || [];
                    delete manuallyPausedTrailers?.[ytId];
                    delete autoPausedTrailers?.[ytId];
                    delete deletingTrailers?.[ytId];
                }
            },
        };
    }

    let hasDragScroll
    const addInfoDragScroll = (e) => {
        try {
            if (matchMedia("(hover:hover)").matches !== true) return
            let info = e.target;
            info.removeEventListener(e.type, addInfoDragScroll);
            if (info.addedCustomDragScroll) return;
            info.addedCustomDragScroll = true;
            dragScroll(info, 'x');
            if (hasDragScroll == null) {
                hasDragScroll = true
            }
        } catch {}
    }

    onMount(async () => {
        popupWrapper = popupWrapper || document.getElementById("popup-wrapper");
        popupContainer =
            popupContainer || popupWrapper.querySelector("#popup-container");
        navContainerEl = document.getElementById("nav-container");
        const fullScreenExitHandler = () => {
            if (
                !(
                    document.fullScreen ||
                    document.mozFullScreen ||
                    document.webkitIsFullScreen ||
                    document.msFullscreenElement
                )
            ) {
                playMostVisibleTrailer();
            }
        };
        document.addEventListener(
            "fullscreenchange",
            fullScreenExitHandler,
            false,
        );
        document.addEventListener(
            "mozfullscreenchange",
            fullScreenExitHandler,
            false,
        );
        document.addEventListener(
            "MSFullscreenChange",
            fullScreenExitHandler,
            false,
        );
        document.addEventListener(
            "webkitfullscreenchange",
            fullScreenExitHandler,
            false,
        );
        document.addEventListener("keydown", async (e) => {
            if (
                (e.key === "Escape" && !document.fullscreenElement) ||
                (e.key === " " && $popupVisible)
            ) {
                e.preventDefault();
            }
        });
        document.addEventListener("keyup", async (e) => {
            if (e.key === "Escape" && !document.fullscreenElement) {
                e.preventDefault();
                window.backPressed?.();
            }
            if (e.key === " " && $popupVisible) {
                e.preventDefault();
                let visibleTrailer =
                    mostVisiblePopupHeader?.querySelector?.(".trailer");
                $ytPlayers?.forEach(({ ytPlayer }) => {
                    let trailerEl = ytPlayer?.g;
                    let ytId = trailerEl?.id;
                    if (ytId && !deletingTrailers?.[ytId]) {
                        if (visibleTrailer === trailerEl) {
                            if (ytPlayer?.getPlayerState?.() === (getYTPlayerState("PLAYING")??1)) {
                                manuallyPausedTrailers[ytId] = true;
                                ytPlayer?.pauseVideo?.();
                            } else if ($inApp) {
                                prePlayYtPlayer(ytPlayer);
                                ytPlayer?.playVideo?.();
                            }
                        } else {
                            autoPausedTrailers[ytId] = true;
                            ytPlayer?.pauseVideo?.();
                        }
                    }
                });
            }
        });
        new MutationObserver((mutationsList) => {
            for (let mutation of mutationsList) {
                if (mutation.type === "childList") {
                    for (let node of mutation.removedNodes) {
                        if (node?.matches?.("iframe.trailer")) {
                            let ytId = node?.id;
                            if (ytId && !deletingTrailers?.[ytId]) {
                                deletingTrailers[ytId] = true;
                                $ytPlayers =
                                    $ytPlayers?.filter?.((e) => {
                                        const recTrailerEl = e?.ytPlayer?.g;
                                        if (
                                            recTrailerEl === node ||
                                            recTrailerEl?.id === ytId
                                        ) {
                                            e?.ytPlayer?.destroy?.();
                                            return false
                                        } else {
                                            return true
                                        }
                                    }) || [];
                                delete manuallyPausedTrailers?.[ytId];
                                delete autoPausedTrailers?.[ytId];
                                delete deletingTrailers?.[ytId];
                            }
                        }
                    }
                }
            }
        }).observe(popupContainer, { childList: true, subtree: true });

        $autoPlay = $autoPlay ?? (await getIDBdata("autoPlay"));
        if ($autoPlay == null) {
            setLocalStorage("autoPlay", $autoPlay = false)
            .catch(() => removeLocalStorage("autoPlay"))
            .finally(() => saveIDBdata(false, "autoPlay"));
        }
    });
    
	// COPY TEXT ABSTRACTION
	let cancelCopyTimeout;
    function popupContainerPointerDown(e) {
        if (e?.pointerType === "mouse") return;
		let target = e?.target;
		const classList = target?.classList;
		if (classList && !classList?.contains?.("copy")) target = target.closest(".copy");
		if (!target) return
		
		cancelCopyTimeout?.()
		cancelCopyTimeout = requestImmediate(() => {
			let text = target.dataset.copy;
			if (text) {
				target.style.pointerEvents = "none";
				requestImmediate(() => {
					target.style.pointerEvents = "";
				}, 500);
				let text2 = target.dataset.secondcopy;
				if (text2 && !ncsCompare(text2, text)) {
					window.copyToClipBoard?.(text2);
					requestImmediate(() => {
						window.copyToClipBoard?.(text);
					}, 1000);
				} else {
					window.copyToClipBoard?.(text);
				}
			}
		}, 500);
    }
    function popupContainerPointerEnd(e) {
        if (e?.pointerType === "mouse") return;
        let target = e?.target;
		const classList = target?.classList;
		if (classList && !classList?.contains?.("copy")) target = target.closest(".copy");
		if (!target) return
        
        cancelCopyTimeout?.()
    }
</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<div
    id="popup-wrapper"
    class="popup-wrapper"
    on:click="{handlePopupVisibility}"
    on:keyup="{(e) => e.key === 'Enter' && handlePopupVisibility(e)}"
    bind:this="{popupWrapper}"
    tabindex="{!$menuVisible && $popupVisible ? '0' : '-1'}"
>
    <div
        id="popup-container"
        class="popup-container hide"
        bind:this="{popupContainer}"
        on:touchstart|passive="{popupContainerTouchStart}"
        on:touchmove|passive="{popupContainerTouchMove}"
        on:touchend|passive="{popupContainerTouchEnd}"
        on:touchcancel="{popupContainerTouchCancel}"
        on:pointerdown="{popupContainerPointerDown}"
        on:pointerup="{popupContainerPointerEnd}"
        on:pointercancel="{popupContainerPointerEnd}"
        on:scroll="{popupScroll}"
    >
        {#if $loadedMediaLists}
            {@const mediaList = $loadedMediaLists[$selectedCategory]?.mediaList}
            {#each mediaList || [] as media, mediaIndex ((media?.id != null ? media.id + " " + mediaIndex : {}) ?? {})}
                <div class="popup-content">
                    {#if mediaIndex <= currentHeaderIdx + bottomPopupVisibleCount && mediaIndex >= currentHeaderIdx - topPopupVisibleCount}
                        {@const format = media.format}
                        {@const isManga = format === "Manga" || format === "One Shot"}
                        {@const isNovel = format === "Novel"}
                        <div class="popup-main" use:popupMainEl>
                            <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                            <div
                                class="{'popup-header ' +
                                    (media.trailerID ? 'loader' : '')}"
                                bind:this="{media.popupHeader}"
                                tabindex="{!$menuVisible && $popupVisible
                                    ? '0'
                                    : '-1'}"
                                on:click="{() => {
                                    if (!$popupVisible) return;
                                    openMoreInfo(
                                        media.id,
                                        media.trailerID,
                                        media.bannerImageUrl || media.trailerThumbnailUrl,
                                        media.title,
                                        media.format,
                                    )
                                }}"
                                on:keyup="{(e) => {
                                    if (!$popupVisible) return;
                                    if (e.key === 'Enter') {
                                        openMoreInfo(
                                            media.id,
                                            media.trailerID,
                                            media.bannerImageUrl || media.trailerThumbnailUrl,
                                            media.title,
                                            media.format,
                                        )
                                    }
                                }}"
                            >
                                <div class="popup-header-loading">
                                    <!-- k icon -->
                                    <svg viewBox="0 0 320 512">
                                        <path
                                            d="M311 86a32 32 0 1 0-46-44L110 202l-46 47V64a32 32 0 1 0-64 0v384a32 32 0 1 0 64 0V341l65-67 133 192c10 15 30 18 44 8s18-30 8-44L174 227 311 86z"
                                        ></path>
                                    </svg>
                                </div>
                                {#if media.trailerID}
                                    <div class="trailer display-none"></div>
                                {/if}
                                <div class="popup-img">
                                    {#if media.bannerImageUrl || media.trailerThumbnailUrl}
                                        {#key media.bannerImageUrl || media.trailerThumbnailUrl}
                                            <img
                                                use:addImage="{media.bannerImageUrl ||
                                                    media.trailerThumbnailUrl ||
                                                    emptyImage}"
                                                on:pointerdown="{reloadImage}"
                                                loading="lazy"
                                                width="640px"
                                                height="360px"
                                                alt="{(media?.shownTitle ||
                                                    '') +
                                                    (media.bannerImageUrl
                                                        ? ' Banner'
                                                        : ' Thumbnail')}"
                                                class="banner-img fade-out"
                                                on:load="{(e) => {
                                                    removeClass(
                                                        e.target,
                                                        'fade-out',
                                                    );
                                                    addClass(
                                                        e.target,
                                                        'fade-in',
                                                    );
                                                }}"
                                                on:error="{(e) => {
                                                    removeClass(
                                                        e.target,
                                                        'fade-in',
                                                    );
                                                    addClass(
                                                        e.target,
                                                        'fade-out',
                                                    );
                                                    addClass(
                                                        e.target,
                                                        'display-none',
                                                    );
                                                }}"
                                            />
                                        {/key}
                                    {/if}
                                </div>
                            </div>
                            <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                            <div class="popup-body">
                                <div class="popup-controls">
                                    <div class="auto-play-container">
                                        <label 
                                            class="switch"
                                            tabindex="{!$menuVisible && $popupVisible ? '0' : '-1'}"
                                            on:keyup="{(e) => e.key === 'Enter' && changeAutoPlay(e)}"
                                        >
                                            <label
                                                class="disable-interaction"
                                                for="{'auto-play-' + media?.id}"
                                            >
                                                Auto Play
                                            </label>
                                            <input
                                                id="{'auto-play-' + media?.id}"
                                                type="checkbox"
                                                class="auto-play-toggle"
                                                bind:checked="{$autoPlay}"
                                            />
                                            <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                                            <span class="slider round"></span>
                                        </label>
                                        <h3
                                            class="auto-play-label"
                                            on:click="{changeAutoPlay}"
                                            on:keyup="{(e) =>
                                                e.key === 'Enter' &&
                                                changeAutoPlay(e)}"
                                        >
                                            {#if $windowWidth >= 290}
                                                Auto Play
                                            {:else if $windowWidth >= 260}
                                                Auto
                                            {/if}
                                        </h3>
                                    </div>
                                    {#if $listUpdateAvailable || $loadingCategory[""] || $loadingCategory[$selectedCategory]}
                                        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                                        <div
                                            class="list-update-container"
                                            tabindex="{!$menuVisible &&
                                            $popupVisible
                                                ? '0'
                                                : '-1'}"
                                            on:click="{() => updateList()}"
                                            on:keyup="{(e) =>
                                                e.key === 'Enter' &&
                                                updateList()}"
                                        >
                                            <!-- arrows rotate -->
                                            <svg
                                                viewBox="0 0 512 512"
                                                class="small-icon"
                                            >
                                                <path
                                                    d="M105 203a160 160 0 0 1 264-60l17 17h-50a32 32 0 1 0 0 64h128c18 0 32-14 32-32V64a32 32 0 1 0-64 0v51l-18-17a224 224 0 0 0-369 83 32 32 0 0 0 60 22zm-66 86a32 32 0 0 0-23 31v128a32 32 0 1 0 64 0v-51l18 17a224 224 0 0 0 369-83 32 32 0 0 0-60-22 160 160 0 0 1-264 60l-17-17h50a32 32 0 1 0 0-64H48a39 39 0 0 0-9 1z"
                                                ></path>
                                            </svg>
                                            <h3 class="small-icon-label">
                                                {$windowWidth >= 320
                                                    ? "Reload List"
                                                    : $windowWidth >= 205
                                                      ? "Reload"
                                                      : ""}
                                            </h3>
                                        </div>
                                    {/if}
                                    {#if media.trailerID && failingTrailers[media.id]}
                                        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                                        <div
                                            class="icon-button"
                                            tabindex="{!$menuVisible &&
                                            $popupVisible
                                                ? '0'
                                                : '-1'}"
                                            on:click="{() => {
                                                if (!$popupVisible) return;
                                                openTrailer(media.trailerID)
                                            }}"
                                            on:keyup="{(e) => {
                                                if (!$popupVisible) return;
                                                if (e.key === 'Enter') {
                                                    openTrailer(media.trailerID)
                                                }
                                            }}"
                                        >
                                            <!-- youtube logo -->
                                            <svg viewBox="0 0 576 512" class="yt-small-icon">
                                                <path
                                                    d="M550 124c-7-24-25-42-49-49-42-11-213-11-213-11S117 64 75 75c-24 7-42 25-49 49-11 43-11 132-11 132s0 90 11 133c7 23 25 41 49 48 42 11 213 11 213 11s171 0 213-11c24-7 42-25 49-48 11-43 11-133 11-133s0-89-11-132zM232 338V175l143 81-143 82z"
                                                ></path>
                                            </svg>
                                            <h3 class="small-icon-label">Trailer</h3>
                                        </div>
                                    {:else if media.bannerImageUrl || media.trailerThumbnailUrl}
                                        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                                        <div
                                            class="icon-button"
                                            tabindex="{!$menuVisible &&
                                            $popupVisible
                                                ? '0'
                                                : '-1'}"
                                            on:click="{() => {
                                                if (!$popupVisible) return;
                                                showFullScreenImage(media.bannerImageUrl || media.trailerThumbnailUrl)
                                            }}"
                                            on:keyup="{(e) => {
                                                if (!$popupVisible) return;
                                                if (e.key === 'Enter') {
                                                    showFullScreenImage(media.bannerImageUrl || media.trailerThumbnailUrl)
                                                }
                                            }}"
                                        >
                                            <!-- image icon -->
                                            <svg
                                                viewBox="0 0 512 512"
                                                class="small-icon"
                                            >
                                                <path
                                                    d="M0 96c0-35 29-64 64-64h384c35 0 64 29 64 64v320c0 35-29 64-64 64H64c-35 0-64-29-64-64V96zm324 107a24 24 0 0 0-40 0l-87 127-26-33a24 24 0 0 0-37 0l-65 80a24 24 0 0 0 19 39h336c9 0 17-5 21-13s4-17-1-25L324 204zm-212-11a48 48 0 1 0 0-96 48 48 0 1 0 0 96z"
                                                ></path>
                                            </svg>
                                            <h3 class="small-icon-label">
                                                {media.bannerImageUrl
                                                    ? "Banner"
                                                    : "Thumbnail"}
                                            </h3>
                                        </div>
                                    {/if}
                                </div>
                                <div class="popup-info">
                                    <div
                                        class="media-title-container"
                                        style:overflow="{$popupIsGoingBack
                                            ? "hidden"
                                            : ""}"
                                        on:scroll="{itemScroll}"
                                    >
                                        <a
                                            tabindex="{!$menuVisible &&
                                            $popupVisible
                                                ? ''
                                                : '-1'}"
                                            rel="{media.mediaUrl
                                                ? 'noopener noreferrer'
                                                : ''}"
                                            target="{media.mediaUrl
                                                ? '_blank'
                                                : ''}"
                                            href="{media.mediaUrl ||
                                                'javascript:void(0)'}"
                                            class="{media?.contentCautionColor +
                                                '-color media-title copy'}"
                                            title="{media?.shownTitle || ''}"
                                            data-copy="{media?.shownTitle ||
                                                ''}"
                                            data-secondcopy="{media?.copiedTitle ||
                                                ''}"
                                            style:overflow="{$popupIsGoingBack
                                                ? "hidden"
                                                : ""}"
                                            on:scroll="{itemScroll}"
                                        >
                                            {media?.shownTitle || "N/A"}
                                        </a>
                                        <div class="info-rating-wrapper">
                                            <!-- star regular -->
                                            <svg viewBox="0 0 576 512"
                                                ><path
                                                    d="M288 0c9 0 17 5 21 14l69 141 153 22c9 2 17 8 20 17s0 18-6 24L434 328l26 156c1 9-2 18-10 24s-17 6-25 1l-137-73-137 73c-8 4-18 4-25-2s-11-14-10-23l26-156L31 218a24 24 0 0 1 14-41l153-22 68-141c4-9 13-14 22-14zm0 79-53 108c-3 7-10 12-18 13L99 219l86 85c5 6 8 13 7 21l-21 120 106-57c7-3 15-3 22 1l105 56-20-120c-1-8 1-15 7-21l86-85-118-17c-8-2-15-7-18-14L288 79z"
                                                ></path></svg
                                            >
                                            <h4>
                                                {#if media.formattedAverageScore != null && media.formattedAverageScore}
                                                    <b
                                                        >{parseFloat(
                                                            media.formattedAverageScore,
                                                        ) > 0
                                                            ? media.formattedAverageScore
                                                            : "?"}</b
                                                    >{"/10"}
                                                {/if}
                                                {#if media.formattedPopularity != null && media.formattedPopularity}
                                                    {" · " +
                                                        media.formattedPopularity}
                                                {/if}
                                                {#if media?.recommendedRatingInfo}
                                                    {" · "}{@html media?.recommendedRatingInfo ||
                                                        ""}
                                                {/if}
                                            </h4>
                                        </div>
                                    </div>
                                    <div
                                        class="info-format"
                                        style:overflow="{$popupIsGoingBack
                                            ? "hidden"
                                            : ""}"
                                        on:scroll="{itemScroll}"
                                    >
                                        {#if media?.nextAiringEpisode?.airingAt}
                                            {@const formattedMediaFormat =
                                                getFormattedMediaFormat(
                                                    media,
                                                    isManga,
                                                    isNovel,
                                                )}
                                            {@const volOrDur =
                                                (isManga || isNovel
                                                    ? media?.volumes > 0
                                                        ? ` · ${media?.volumes} Vol${media?.volumes > 1 ? "s" : ""}`
                                                        : media?.volumeProgress >
                                                            0
                                                          ? ` · Seen ${media?.volumeProgress} Vol${media?.volumeProgress > 1 ? "s" : ""}`
                                                          : ""
                                                    : media?.formattedDuration) ||
                                                ""}
                                            <h4>
                                                {(media?.format || "N/A") +
                                                    (media?.countryOfOrigin
                                                        ? ` (${media.countryOfOrigin})`
                                                        : "")}
                                                {#if formattedMediaFormat}
                                                    {#key $earlisetReleaseDate || 1}
                                                        {@html formattedMediaFormat}
                                                    {/key}
                                                {/if}
                                                {volOrDur || ""}
                                            </h4>
                                        {:else}
                                            {@const formattedMediaFormat =
                                                getFormattedMediaFormat(
                                                    media,
                                                    isManga,
                                                    isNovel,
                                                )}
                                            {@const volOrDur =
                                                (isManga || isNovel
                                                    ? media?.volumes > 0
                                                        ? ` · ${media?.volumes} Vol${media?.volumes > 1 ? "s" : ""}`
                                                        : media?.volumeProgress >
                                                            0
                                                          ? ` · Seen ${media?.volumeProgress} Vol${media?.volumeProgress > 1 ? "s" : ""}`
                                                          : ""
                                                    : media?.formattedDuration) ||
                                                ""}
                                            <h4>
                                                {(media?.format || "N/A") +
                                                    (media?.countryOfOrigin
                                                        ? ` (${media.countryOfOrigin})`
                                                        : "")}
                                                {#if formattedMediaFormat}
                                                    {@html formattedMediaFormat}
                                                {/if}
                                                {volOrDur || ""}
                                            </h4>
                                        {/if}
                                        {#if media?.season || media?.year}
                                            <h4 style="text-align: right;">
                                                {`${media?.season || ""}${
                                                    media?.season && media?.year
                                                        ? " " + media?.year
                                                        : media?.year || ""
                                                }` || "N/A"}
                                            </h4>
                                        {:else}
                                            <h4 style="text-align: right;">
                                                N/A
                                            </h4>
                                        {/if}
                                    </div>
                                    <div
                                        class="info-status"
                                        style:overflow="{$popupIsGoingBack
                                            ? "hidden"
                                            : ""}"
                                        on:scroll="{itemScroll}"
                                    >
                                        <h4>
                                            <a
                                                tabindex="-1"
                                                rel="{media.mediaUrl
                                                    ? 'noopener noreferrer'
                                                    : ''}"
                                                target="{media.mediaUrl
                                                    ? '_blank'
                                                    : ''}"
                                                href="{media.mediaUrl ||
                                                    'javascript:void(0)'}"
                                                ><span
                                                    class="{
                                                        media?.userStatusColor
                                                        ? media.userStatusColor+'-color' : ''}"
                                                    >{media.userStatus ||
                                                        "N/A"}</span
                                                >
                                                {#if true}
                                                    {@const isFinishedAiring =
                                                        media.status?.toLowerCase?.() ===
                                                        "Finished"}
                                                    {@const userStatus = media.userStatus}
                                                    {#if userStatus === "Current"
                                                      || userStatus === "Planning"
                                                      || userStatus === "Paused"
                                                      || userStatus === "Repeating"
                                                    }
                                                        {@const nextAiringEpisode =
                                                            media.nextAiringEpisode}
                                                        {@const nextEpisode =
                                                            nextAiringEpisode?.episode}
                                                        {@const airingAt =
                                                            nextAiringEpisode?.airingAt *
                                                            1000}
                                                        {#if !isManga && !isNovel && ((airingAt > 0 && nextEpisode > 0) || media.episodes > 0)}
                                                            {@const nextEpisodeIsAired =
                                                                airingAt <=
                                                                new Date().getTime()}
                                                            {@const releasedEps =
                                                                nextEpisode >
                                                                    0 &&
                                                                !isFinishedAiring
                                                                    ? nextEpisodeIsAired
                                                                        ? nextEpisode
                                                                        : nextEpisode -
                                                                          1
                                                                    : isFinishedAiring
                                                                      ? media.episodes
                                                                      : null}
                                                            {@const epsWatched =
                                                                media.episodeProgress >
                                                                0
                                                                    ? media.episodeProgress
                                                                    : 0}
                                                            {@const epsBehind =
                                                                parseInt(
                                                                    releasedEps,
                                                                ) -
                                                                parseInt(
                                                                    epsWatched,
                                                                )}
                                                            {#if epsBehind >= 1}{" · "}
                                                                <span
                                                                    style:color="{"hsl(var(--ac-color))"}"
                                                                    >{`${epsBehind} Ep${epsBehind > 1 ? "s" : ""} Behind`}</span
                                                                >
                                                            {/if}
                                                        {:else if isFinishedAiring && (media.chapters > 0 || media.volumes > 0)}
                                                            {#if isNovel}
                                                                {#if media.volumes > 0}
                                                                    {@const volSeen =
                                                                        media.volumeProgress >
                                                                        0
                                                                            ? media.volumeProgress
                                                                            : 0}
                                                                    {@const volBehind =
                                                                        parseInt(
                                                                            media.volumes,
                                                                        ) -
                                                                        parseInt(
                                                                            volSeen,
                                                                        )}
                                                                    {#if volBehind >= 1}{" · "}
                                                                        <span
                                                                            style:color="{"hsl(var(--ac-color))"}"
                                                                            >{`${volBehind} Vol${volBehind > 1 ? "s" : ""} Behind`}</span
                                                                        >
                                                                    {/if}
                                                                {:else}
                                                                    {@const chapSeen =
                                                                        media.episodeProgress >
                                                                        0
                                                                            ? media.episodeProgress
                                                                            : 0}
                                                                    {@const chapBehind =
                                                                        parseInt(
                                                                            media.chapters,
                                                                        ) -
                                                                        parseInt(
                                                                            chapSeen,
                                                                        )}
                                                                    {#if chapBehind >= 1}{" · "}
                                                                        <span
                                                                            style:color="{"hsl(var(--ac-color))"}"
                                                                            >{`${chapBehind} Ch${chapBehind > 1 ? "s" : ""} Behind`}</span
                                                                        >
                                                                    {/if}
                                                                {/if}
                                                            {:else if media.chapters > 0}
                                                                {@const chapSeen =
                                                                    media.episodeProgress >
                                                                    0
                                                                        ? media.episodeProgress
                                                                        : 0}
                                                                {@const chapBehind =
                                                                    parseInt(
                                                                        media.chapters,
                                                                    ) -
                                                                    parseInt(
                                                                        chapSeen,
                                                                    )}
                                                                {#if chapBehind >= 1}{" · "}
                                                                    <span
                                                                        style:color="{"hsl(var(--ac-color))"}"
                                                                        >{`${chapBehind} Ch${chapBehind > 1 ? "s" : ""} Behind`}</span
                                                                    >
                                                                {/if}
                                                            {:else}
                                                                {@const volSeen =
                                                                    media.volumeProgress >
                                                                    0
                                                                        ? media.volumeProgress
                                                                        : 0}
                                                                {@const volBehind =
                                                                    parseInt(
                                                                        media.volumes,
                                                                    ) -
                                                                    parseInt(
                                                                        volSeen,
                                                                    )}
                                                                {#if volBehind >= 1}{" · "}
                                                                    <span
                                                                        style:color="{"hsl(var(--ac-color))"}"
                                                                        >{`${volBehind} Vol${volBehind > 1 ? "s" : ""} Behind`}</span
                                                                    >
                                                                {/if}
                                                            {/if}
                                                        {/if}
                                                    {/if}
                                                {/if}
                                                {#if media.userScore != null}
                                                    {" · "}
                                                    <!-- star regular -->
                                                    <svg viewBox="0 0 576 512"
                                                        ><path
                                                            d="M288 0c9 0 17 5 21 14l69 141 153 22c9 2 17 8 20 17s0 18-6 24L434 328l26 156c1 9-2 18-10 24s-17 6-25 1l-137-73-137 73c-8 4-18 4-25-2s-11-14-10-23l26-156L31 218a24 24 0 0 1 14-41l153-22 68-141c4-9 13-14 22-14zm0 79-53 108c-3 7-10 12-18 13L99 219l86 85c5 6 8 13 7 21l-21 120 106-57c7-3 15-3 22 1l105 56-20-120c-1-8 1-15 7-21l86-85-118-17c-8-2-15-7-18-14L288 79z"
                                                        ></path></svg
                                                    >
                                                    {media.userScore}
                                                {/if}
                                            </a>
                                        </h4>
                                        {#if !isManga && !isNovel && media?.nextAiringEpisode && media?.status !== "Finished"}
                                            {@const nextAiringEpisode =
                                                media.nextAiringEpisode}
                                            {@const airingAt =
                                                nextAiringEpisode?.airingAt}
                                            {@const nextEpisode =
                                                nextAiringEpisode?.episode}
                                            {@const totalEpisodes =
                                                media?.episodes}
                                            {@const isValid =
                                                nextEpisode >= totalEpisodes &&
                                                nextEpisode > 0 &&
                                                airingAt > 0 &&
                                                totalEpisodes > 0}
                                            {#if isValid}
                                                {#key isValid ? $earlisetReleaseDate || 1 : 1}
                                                    {#if airingAt * 1000 <= new Date().getTime()}
                                                        <h4
                                                            style="text-align: right;"
                                                            class="year-season"
                                                        >
                                                            Finished
                                                        </h4>
                                                    {:else}
                                                        <h4
                                                            style="text-align: right;"
                                                            class="year-season"
                                                        >
                                                            {media.status ||
                                                                "N/A"}
                                                        </h4>
                                                    {/if}
                                                {/key}
                                            {:else}
                                                <h4
                                                    style="text-align: right;"
                                                    class="year-season"
                                                >
                                                    {media.status || "N/A"}
                                                </h4>
                                            {/if}
                                        {:else}
                                            <h4
                                                style="text-align: right;"
                                                class="year-season"
                                            >
                                                {media.status || "N/A"}
                                            </h4>
                                        {/if}
                                    </div>
                                    <div class="info-contents">
                                        {#if media?.shownStudios?.length}
                                            <div>
                                                <div class="info-categ">
                                                    Studio
                                                </div>
                                                <div
                                                    class="{'studio-popup info'}"
                                                    on:scroll="{itemScroll}"
                                                    on:mouseenter="{addInfoDragScroll}"
                                                >
                                                    {#each media.shownStudios as studios (studios?.studio || {})}
                                                        <a
                                                            tabindex="{!$menuVisible &&
                                                            $popupVisible
                                                                ? ''
                                                                : '-1'}"
                                                            class="{studios?.studioColor
                                                                ? `${studios?.studioColor}-color`
                                                                : ''}"
                                                            rel="{studios
                                                                ?.studio
                                                                ?.studioUrl
                                                                ? 'noopener noreferrer'
                                                                : ''}"
                                                            target="{studios
                                                                ?.studio
                                                                ?.studioUrl
                                                                ? '_blank'
                                                                : ''}"
                                                            href="{studios
                                                                ?.studio
                                                                ?.studioUrl ||
                                                                'javascript:void(0)'}"
                                                        >
                                                            {studios?.studio
                                                                ?.studioName ||
                                                                "N/A"}
                                                        </a>
                                                    {/each}
                                                </div>
                                            </div>
                                        {/if}
                                        {#if media?.shownGenres?.length}
                                            <div>
                                                <div class="info-categ">
                                                    Genre
                                                </div>
                                                <div
                                                    class="{'genres-popup info'}"
                                                    on:scroll="{itemScroll}"
                                                    on:mouseenter="{addInfoDragScroll}"
                                                >
                                                    {#each media.shownGenres as genres (genres?.genre || {})}
                                                        <span
                                                            class="{genres?.genreColor
                                                                ? `${genres?.genreColor}-color`
                                                                : ''}"
                                                            >{genres?.genre ||
                                                                "N/A"}
                                                        </span>
                                                    {/each}
                                                </div>
                                            </div>
                                        {/if}
                                        {#if media?.shownTags?.length}
                                            <div class="tag-info">
                                                <div
                                                    class="{'tags-info-content info'}"
                                                    on:scroll="{itemScroll}"
                                                    on:mouseenter="{addInfoDragScroll}"
                                                >
                                                    {#each media.shownTags as tags (tags?.tag || {})}
                                                        <span
                                                            tabindex="{!$menuVisible &&
                                                            $popupVisible
                                                                ? '0'
                                                                : ''}"
                                                            on:click="{() => {
                                                                if (!$popupVisible) return;
                                                                if (hasDragScroll == null || !itemIsScrolling) {
                                                                    showFullScreenInfo(
                                                                        window.getTagInfoHTML?.(
                                                                            tags?.tagName,
                                                                        ),
                                                                    );
                                                                }
                                                            }}"
                                                            on:keyup="{(e) => {
                                                                if (
                                                                    !$popupVisible
                                                                )
                                                                    return;
                                                                if (e.key === 'Enter' &&
                                                                   (hasDragScroll == null || !itemIsScrolling)
                                                                ) {
                                                                    showFullScreenInfo(
                                                                        window.getTagInfoHTML?.(
                                                                            tags?.tagName,
                                                                        ),
                                                                    );
                                                                }
                                                            }}"
                                                            class="{tags?.tagColor
                                                                ? `${tags?.tagColor}-color`
                                                                : ''}"
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
                                        {#key media.coverImageUrl || media.bannerImageUrl || media.trailerThumbnailUrl || emptyImage}
                                            <img
                                                use:addImage="{media.coverImageUrl ||
                                                    media.bannerImageUrl ||
                                                    media.trailerThumbnailUrl ||
                                                    emptyImage}"
                                                on:pointerdown="{reloadImage}"
                                                loading="lazy"
                                                width="150px"
                                                height="210px"
                                                alt="{(media?.shownTitle ||
                                                    '') +
                                                    (media.coverImageUrl
                                                        ? ' Cover'
                                                        : media.bannerImageUrl
                                                          ? ' Banner'
                                                          : ' Thumbnail')}"
                                                tabindex="{!$menuVisible &&
                                                $popupVisible
                                                    ? '0'
                                                    : '-1'}"
                                                class="{'cover-img' +
                                                    (!media.coverImageUrl &&
                                                    !media.bannerImageUrl &&
                                                    !media.trailerThumbnailUrl
                                                        ? ' display-none'
                                                        : '')}"
                                                on:error="{(e) => {
                                                    addClass(
                                                        e.target,
                                                        'display-none',
                                                    );
                                                }}"
                                                on:click="{() => {
                                                    if (!$popupVisible) return;
                                                    showFullScreenImage(
                                                        media.coverImageUrl ||
                                                        media.bannerImageUrl ||
                                                        media.trailerThumbnailUrl ||
                                                        emptyImage
                                                    )
                                                }}"
                                                on:keyup="{(e) => {
                                                    if (!$popupVisible) return;
                                                    if (e.key === 'Enter') {
                                                        showFullScreenImage(
                                                            media.coverImageUrl ||
                                                            media.bannerImageUrl ||
                                                            media.trailerThumbnailUrl ||
                                                            emptyImage
                                                        )
                                                    }
                                                }}"
                                            />
                                        {/key}
                                        {#if media?.description}
                                            {@const editedHTMLString = editHTMLString(media?.description) || ''}
                                            <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                                            <div
                                                class="media-description-wrapper"
                                                tabindex="{!$menuVisible &&
                                                $popupVisible
                                                    ? '0'
                                                    : '-1'}"
                                                on:click="{() => {
                                                    if (!$popupVisible) return;
                                                    showFullScreenEditedHTMLInfo(editedHTMLString);
                                                }}"
                                                on:keyup="{(e) => {
                                                    if (!$popupVisible) return;
                                                    if (e.key === 'Enter') {
                                                        showFullScreenEditedHTMLInfo(editedHTMLString);
                                                    }
                                                }}"
                                            >
                                                <div
                                                    class="media-description"
                                                >
                                                    {@html editedHTMLString || ''}
                                                </div>
                                            </div>
                                        {/if}
                                    </div>
                                </div>
                            </div>
                            <div class="popup-footer">
                                <button
                                    tabindex="{!$menuVisible && $popupVisible
                                        ? ''
                                        : '-1'}"
                                    class="hide-show-btn"
                                    style:overflow="{$popupIsGoingBack
                                        ? "hidden"
                                        : ""}"
                                    on:click="{() => {
                                        if (!$popupVisible) return;
                                        handleHideShow(
                                            media.id,
                                            media?.shownTitle,
                                        );
                                    }}"
                                    on:keyup="{(e) => {
                                        if (!$popupVisible) return;
                                        if (e.key === 'Enter') {
                                            e.stopImmediatePropagation();
                                            handleHideShow(
                                                media.id,
                                                media?.shownTitle,
                                            );
                                            e.stopImmediatePropagation();
                                        }
                                    }}"
                                >
                                    <!-- circle minus -->
                                    <svg class="hide-show" viewBox="0 0 512 512"
                                        ><path
                                            d="M256 512a256 256 0 1 0 0-512 256 256 0 1 0 0 512zm-72-280h144a24 24 0 1 1 0 48H184a24 24 0 1 1 0-48z"
                                        ></path></svg
                                    >
                                    {#if $hiddenEntries}
                                        {" " +
                                            ($hiddenEntries[media?.id]
                                                ? "Show"
                                                : "Hide")}
                                    {:else}
                                        Loading...
                                    {/if}
                                </button>
                                <button
                                    tabindex="{!$menuVisible && $popupVisible
                                        ? ''
                                        : '-1'}"
                                    class="more-videos"
                                    style:overflow="{$popupIsGoingBack
                                        ? "hidden"
                                        : ""}"
                                    on:click="{handleMoreVideos(
                                        media.title,
                                        media.format,
                                    )}"
                                    on:keyup="{(e) =>
                                        e.key === 'Enter' &&
                                        handleMoreVideos(
                                            media.title,
                                            media.format,
                                        )}"
                                >
                                    <!-- youtube logo -->
                                    <svg viewBox="0 0 576 512">
                                        <path
                                            d="M550 124c-7-24-25-42-49-49-42-11-213-11-213-11S117 64 75 75c-24 7-42 25-49 49-11 43-11 132-11 132s0 90 11 133c7 23 25 41 49 48 42 11 213 11 213 11s171 0 213-11c24-7 42-25 49-48 11-43 11-133 11-133s0-89-11-132zM232 338V175l143 81-143 82z"
                                        ></path>
                                    </svg> YouTube</button
                                >
                                <button
                                    tabindex="{!$menuVisible && $popupVisible
                                        ? ''
                                        : '-1'}"
                                    class="open-anilist"
                                    style:overflow="{$popupIsGoingBack
                                        ? "hidden"
                                        : ""}"
                                    on:click="{() => {
                                        openInAnilist(media.mediaUrl);
                                    }}"
                                    on:keyup="{(e) =>
                                        e.key === 'Enter' &&
                                        openInAnilist(media.mediaUrl)}"
                                >
                                    <!-- anilist logo -->
                                    <svg viewBox="0 0 172 172">
                                        <path
                                            fill="#3a5a7e"
                                            d="M111 111V41c0-4-2-6-6-6H91c-4 0-6 2-6 6v5l32 91h31c4 0 6-2 6-6v-14c0-4-2-6-6-6h-37z"
                                        ></path>
                                        <path
                                            d="M54 35 18 137h28l6-17h31l6 17h28L81 35H54zm5 62 9-29 9 29H59z"
                                        ></path>
                                    </svg> Anilist
                                </button>
                            </div>
                        </div>
                    {:else}
                        <div class="popup-header dummy"></div>
                    {/if}
                </div>
            {/each}
            {#if mediaList?.length && !$shownAllInList?.[$selectedCategory]}
                <div class="popup-content-loading">
                    <!-- k icon -->
                    <svg
                        class="popup-content-loading-icon"
                        viewBox="0 0 320 512"
                        ><path
                            d="M311 86a32 32 0 1 0-46-44L110 202l-46 47V64a32 32 0 1 0-64 0v384a32 32 0 1 0 64 0V341l65-67 133 192c10 15 30 18 44 8s18-30 8-44L174 227 311 86z"
                        ></path></svg
                    >
                    {#key mediaList}
                        <div
                            class="observed-grid"
                            bind:this="{observedGrid}"
                        ></div>
                    {/key}
                </div>
            {/if}
        {/if}
    </div>
</div>
{#if $popupVisible && $popupIsGoingBack}
    <div
        class="{'go-back-grid-highlight' + (willGoBack ? ' will-go-back' : '')}"
        in:fade="{{ duration: 200, easing: sineOut }}"
        out:fade="{{ duration: 200, easing: sineOut }}"
    >
        <div class="go-back-grid">
            <!-- angle left -->
            <svg viewBox="0 0 320 512"
                ><path
                    d="M41 233a32 32 0 0 0 0 46l160 160a32 32 0 0 0 46-46L109 256l138-137a32 32 0 0 0-46-46L41 233z"
                ></path></svg
            >
        </div>
    </div>
{/if}
{#if fullDescriptionPopup}
    <div
        class="full-popup-wrapper"
        on:click="{() => (fullImagePopup = fullDescriptionPopup = null)}"
        on:keyup="{(e) =>
            e.key === 'Enter' &&
            (fullImagePopup = fullDescriptionPopup = null)}"
        on:touchstart|passive="{fullViewTouchStart}"
        on:touchend|passive="{fullViewTouchEnd}"
        on:touchcancel="{fullViewTouchCancel}"
        in:fade="{{ duration: 200, easing: sineOut }}"
        out:fade="{{ duration: 200, easing: sineOut }}"
    >
        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
        <div class="full-popup">
            <div class="full-popup-description-wrapper">
                <div
                    use:isDescriptionScrollable
                    on:keyup="{(e) =>
                        e.key === 'Enter' &&
                        (fullImagePopup = fullDescriptionPopup = null)}"
                    tabindex="0"
                    class="full-popup-description"
                    on:scroll="{fullViewScroll}"
                >
                    {@html fullDescriptionPopup}
                </div>
            </div>
        </div>
    </div>
{:else if fullImagePopup}
    <div
        class="full-popup-wrapper"
        on:click="{() => (fullDescriptionPopup = fullImagePopup = null)}"
        on:keyup="{(e) =>
            e.key === 'Enter' &&
            (fullDescriptionPopup = fullImagePopup = null)}"
        on:touchstart|passive="{fullViewTouchStart}"
        on:touchend|passive="{fullViewTouchEnd}"
        on:touchcancel="{fullViewTouchCancel}"
        in:fade="{{ duration: 200, easing: sineOut }}"
        out:fade="{{ duration: 200, easing: sineOut }}"
    >
        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
        <div class="full-popup">
            {#key fullImagePopup}
                <img
                    use:addImage="{fullImagePopup}"
                    tabindex="0"
                    class="full-popup-image"
                    loading="lazy"
                    alt="Full View"
                    on:keyup="{(e) => e.key === 'Enter' && (fullDescriptionPopup = fullImagePopup = null)}"
                    on:error="{(e) => {
                        addClass(e.target, 'display-none');
                    }}"
                />
            {/key}
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
    }

    .popup-wrapper.visible {
        transform: translateY(0) translateZ(0);
    }

    .popup-wrapper svg {
        fill: var(--sfg-color) !important;
    }

    .popup-container {
        width: 100%;
        max-width: 640px;
        overflow-y: auto;
        overflow-x: hidden;
        overflow-anchor: visible;
        overscroll-behavior: contain;
        background: var(--bg-color);
        transition: opacity 0.2s ease-out;
        margin-top: 57px;
        -ms-overflow-style: none;
        scrollbar-width: none;
        opacity: 0;
        scroll-behavior: auto;
        box-shadow: 0 0 50px 50px var(--ol-color);
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
        transform: translateY(-50%) translateX(-100%) translateZ(0);
        background-color: hsl(var(--ac-color), 0.5);
        width: 88px;
        height: 88px;
        border-radius: 50%;
        transition: transform 0.1s ease-out;
        z-index: 9000;
    }

    .go-back-grid-highlight.will-go-back {
        transform: translateY(-50%) translateX(0) translateZ(0);
        background-color: hsl(var(--ac-color), 0.5);
        width: 88px;
        height: 88px;
    }

    .go-back-grid {
        position: absolute;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 6px;
        background-color: var(--bg-color);
        cursor: pointer;
        border-radius: 50%;
        max-width: 44px;
        max-height: 44px;
        min-width: 44px;
        min-height: 44px;
    }
    .go-back-grid svg {
        fill: var(--sfg-color);
        width: 20px;
        height: 20px;
    }

    .popup-content {
        display: grid;
        grid-template-columns: 100%;
        color: var(--sfg-color);
        background: var(--bg-color);
        max-width: 640px;
        min-height: 640px;
    }
    .popup-content.hidden {
        height: var(--popup-content-height);
    }

    .popup-main {
        display: grid;
        grid-template-rows: calc(min(100vw, 640px) / 16 * 9) auto;
    }
    :global(.popup-content.hidden > .popup-main) {
        display: none !important;
    }

    .popup-header {
        width: 100%;
        position: relative;
        padding-bottom: 56.25%;
        background: var(--bg-color);
        user-select: none !important;
        cursor: pointer;
    }

    .popup-header-loading {
        display: none;
    }

    :global(.popup-header.loader .popup-header-loading) {
        display: flex;
        justify-content: center;
        align-items: center;
        position: absolute;
        bottom: 10px;
        right: 10px;
        z-index: 3;
        background-color: var(--bg-color);
        border-radius: 100%;
        width: 40px;
        height: 40px;
    }

    :global(.popup-header.loader svg) {
        animation: fade-in-out 1s infinite;
        width: 20px;
        height: 20px;
        fill: var(--sfg-color);
    }

    .popup-content-loading {
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
        max-width: 640px;
        padding: 20px;
        background-color: var(--bg-color);
    }

    .popup-content-loading-icon {
        animation: fade-in-out 1s infinite linear;
        width: 35px;
        height: 35px;
    }

    .observed-grid {
        position: absolute !important;
        width: 100vw !important;
        min-width: 100vw !important;
        min-height: 200vh !important;
        left: 0 !important;
        bottom: 0 !important;
        top: unset !important;
        right: unset !important;
        z-index: -9 !important;
        pointer-events: none !important;
        touch-action: none !important;
        -webkit-user-drag: none !important;
        user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
    }

    /* Need to add Globally, trailer Elements are Recreated */
    :global(.trailer) {
        transform: translateZ(0);
        z-index: 0;
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        cursor: unset;
    }

    .popup-img {
        transition: opacity 0.2s ease-out;
        width: 100%;
        background-color: var(--bg-color) !important;
        z-index: 2;
    }

    .popup-img.fade-out {
        opacity: 0;
    }

    .banner-img {
        width: 100%;
        height: 100%;
        transform: translateZ(0);
        position: absolute;
        object-fit: cover;
        object-position: center;
        background-color: var(--bg-color);
    }

    .banner-img::after {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: var(--ol-color);
    }
    .banner-img.fade-out {
        animation: fade-out 0.2s ease-out forwards;
        opacity: 0;
    }
    .banner-img.fade-in {
        animation: fade-in 0.2s ease-out forwards;
        opacity: 1;
    }

    .popup-info {
        overflow: hidden;
        touch-action: pan-y;
        padding-bottom: 10px;
    }

    .popup-info a {
        color: hsl(var(--ac-color));
        text-decoration: none;
    }

    .media-title-container {
        padding: 5px 0;
        width: 100%;
        overflow-x: auto;
        overflow-y: hidden;
        white-space: nowrap;
        align-items: center;
        display: flex;
        flex-wrap: nowrap;
        grid-column-gap: 20px;
        justify-content: space-between;
        -ms-overflow-style: none;
        scrollbar-width: none;
    }

    .media-title-container::-webkit-scrollbar {
        display: none;
    }

    .info-rating-wrapper {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 2px;
        white-space: nowrap;
        user-select: none !important;
    }

    .info-rating-wrapper > svg {
        height: 15px;
        width: 15px;
        fill: rgb(245, 197, 24) !important;
    }

    .info-rating-wrapper > h4 {
        white-space: nowrap;
    }

    .info-rating-wrapper b {
        font-size: 15px;
        padding-right: 2px;
    }

    :global(.general-rating-icon) {
        height: 10px;
        width: 10px;
    }

    .info-format {
        padding-bottom: 5px;
        display: flex;
        flex-wrap: nowrap;
        justify-content: space-between;
        gap: 10px;
        overflow-x: auto;
        overflow-y: hidden;
        -ms-overflow-style: none;
        scrollbar-width: none;
        user-select: none !important;
    }
    .info-format::-webkit-scrollbar {
        display: none;
    }
    .info-format > h4 {
        white-space: nowrap;
    }

    .info-status {
        display: flex;
        flex-wrap: nowrap;
        justify-content: space-between;
        gap: 10px;
        overflow-x: auto;
        overflow-y: hidden;
        -ms-overflow-style: none;
        scrollbar-width: none;
        user-select: none !important;
    }
    .info-status::-webkit-scrollbar {
        display: none;
    }
    .info-status > h4 {
        white-space: nowrap;
    }

    .info-status svg {
        height: 11.5125px;
        width: 11.5125px;
        fill: rgb(245, 197, 24) !important;
    }

    .info-status a {
        color: unset;
    }

    .info-contents {
        margin: 10px 0;
        width: 100%;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
    }

    .info-contents > div {
        height: 32px;
        width: 100%;
        display: grid;
        grid-template-columns: 37px auto;
        align-items: center;
        gap: 5px;
    }

    .info-contents > div.tag-info {
        height: unset !important;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 5px;
    }

    .info-profile {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: 10px;
        width: 100%;
    }

    .cover-img {
        height: 210px;
        object-fit: cover;
        transform: translateZ(0);
        border-radius: 6px;
        background-color: var(--bg-color);
    }
    .cover-img.display-none + .media-description-wrapper {
        height: unset;
        max-height: 210px;
        width: 100%;
    }

    .cover-img {
        width: min(40% - 10px, 150px);
        user-select: none;
        cursor: pointer;
        background-color: var(--bg-color);
        margin: 0 auto;
    }

    .cover-img.display-none + .media-description-wrapper {
        width: 100%;
        min-width: 100%;
    }

    .media-description-wrapper {
        border: 1px solid var(--bd-color);
        border-radius: 6px;
        padding: 8px 16px;
        flex: 1;
        width: max(60% - 10px, 160px);
        min-width: max(60% - 10px, 160px);
        height: 210px;
        cursor: pointer;
        -ms-overflow-style: none !important;
        user-select: none !important;
        overflow: hidden !important;
    }

    .media-description {
        letter-spacing: 0.5px;
        line-height: 24px;
        -ms-overflow-style: none;
        scrollbar-width: none;
        font-size: 12px !important;
        width: calc(100% - 10px);
        display: -webkit-box;
        max-width: calc(100% - 10px);
        line-clamp: 8;
        -webkit-line-clamp: 8;
        -webkit-box-orient: vertical;
        overflow: hidden;
        position: relative;
        transform: translateY(-50%);
        top: 50%;
    }

    :global(.media-description *) {
        font-size: 12px !important;
    }
    :global(.media-description a) {
        color: hsl(var(--ac-color)) !important;
        text-decoration: none !important;
    }

    .media-description::-webkit-scrollbar {
        display: none;
    }

    .media-title {
        cursor: pointer;
        font-size: clamp(16.309px, 17.6545px, 19px);
        overflow-x: auto;
        overflow-y: hidden;
        width: min-content;
        max-width: 100%;
        white-space: nowrap;
        -ms-overflow-style: none;
        scrollbar-width: none;
        min-width: 12px;
    }

    .media-title::-webkit-scrollbar {
        display: none;
    }

    .media-title {
        text-decoration: none;
    }

    .popup-footer {
        justify-content: space-around;
        gap: 6px;
        display: grid;
        grid-template-columns: repeat(3, auto);
        align-items: center;
        user-select: none !important;
        width: 100%;
        height: 48px;
        margin: auto;
        padding: 0 10px;
        border-top: 1px solid var(--bd-color);
    }

    .popup-footer svg {
        height: 26.6625px;
        width: 26.6625px;
    }

    .popup-footer .hide-show {
        height: 20px;
        width: 20px;
    }

    .popup-footer img {
        width: 23px;
        height: 23px;
        border-radius: 6px;
        margin-left: auto;
    }

    .hide-show-btn,
    .open-anilist,
    .more-videos {
        border: 0;
        background-color: transparent !important;
        cursor: pointer;
        color: var(--sfg-color);
        overflow: hidden;
        display: grid;
        align-items: center;
        justify-content: start;
        gap: 5px;
        white-space: nowrap;
    }

    .hide-show-btn {
        grid-template-columns: 20px auto;
    }

    .open-anilist,
    .more-videos {
        grid-template-columns: 26.6625px auto;
    }

    @media screen and (max-width: 425px) {
        .popup-footer {
            justify-content: space-between;
        }
        .info-contents {
            margin: 10px 0;
            width: 100% !important;
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
        }
    }
    @media screen and (max-width: 225px) {
        .auto-play-label,
        .small-icon-label {
            display: none;
        }
    }
    @media screen and (max-width: 319px) {
        .info-profile {
            flex-wrap: wrap;
        }
        .cover-img {
            width: min(100%, 150px);
            margin: 0 auto;
        }
        .media-description-wrapper {
            height: unset;
        }
    }
    @media screen and (min-width: 750px) {
        .popup-container {
            margin-top: 0 !important;
        }
    }

    @media (pointer: fine) {
        .popup-container {
            overflow-y: overlay !important;
            scrollbar-gutter: stable !important;
        }
        .popup-container::-webkit-scrollbar {
            display: unset;
            width: 16px;
        }
        .popup-container::-webkit-scrollbar-track {
            background: transparent;
        }
        .popup-container::-webkit-scrollbar-thumb {
            height: 72px;
            border-radius: 10px;
            border: 5px solid transparent;
            background-clip: content-box;
            background-color: hsl(0, 0%, 50%);
        }
    }

    .popup-container.should-hide-address-bar {
        overflow-y: clip;
    }

    .info-categ {
        font-size: clamp(12px, 12px, 12.4px);
        user-select: none !important;
    }

    .info {
        -ms-overflow-style: none;
        scrollbar-width: none;
        font-size: 12px;
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
        max-height: 72px !important;
    }

    .tags-info-content > span {
        display: flex;
        justify-content: space-between;
        gap: 20px;
        flex: 1;
        cursor: pointer;
    }

    .info::-webkit-scrollbar {
        display: none;
    }

    .info > span,
    .info > a {
        color: var(--sfg-color);
        border: 1px solid var(--bd-color);
        padding: 8px 10px;
        border-radius: 6px;
        white-space: nowrap;
        -ms-overflow-style: none;
        scrollbar-width: none;
        height: 32px !important;
        max-height: 32px !important;
    }

    .info a::-webkit-scrollbar,
    .info span::-webkit-scrollbar {
        display: none;
    }

    .popup-body {
        display: grid;
        grid-template-rows: 30px auto;
        padding: 0 10px;
    }

    .popup-controls {
        display: flex;
        padding: 8px 0 2px 0;
        user-select: none;
        justify-content: space-between;
        gap: 10px;
    }

    @media screen and (min-width: 640px) {
        .popup-wrapper {
            background-color: var(--ol-color);
        }
        .popup-body {
            padding: 0 20px;
        }
    }

    .list-update-container,
    .icon-button {
        display: flex;
        align-items: center;
        gap: 6px;
        color: var(--sfg-color);
        cursor: pointer;
    }
    @keyframes soft-fade-in-out {
        0% {
            opacity: 1;
        }
        50% {
            opacity: 0.64;
        }
        100% {
            opacity: 1;
        }
    }
    .list-update-container.load {
        animation: soft-fade-in-out 1s infinite;
    }

    .yt-small-icon {
        height: 20px;
        width: 20px;
        cursor: pointer;
    }

    .small-icon {
        height: 14px;
        width: 14px;
        cursor: pointer;
    }

    .small-icon-label {
        height: 14px;
        line-height: 14px;
        font-weight: 500;
        color: var(--sfg-color);
        white-space: nowrap;
        cursor: pointer;
    }

    .auto-play-container {
        display: flex;
        margin-right: auto;
        align-items: center;
        gap: 6px;
    }

    .auto-play-label {
        height: 14px;
        line-height: 14px;
        font-weight: 500;
        color: var(--sfg-color);
        white-space: nowrap;
        cursor: pointer;
    }

    .switch {
        position: relative;
        display: inline-block;
        width: 40px;
        min-width: 40px;
        height: 20px;
    }

    .auto-play-toggle {
        display: none;
    }

    .slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: transparent;
        transition: 0.16s transform ease-out;
        border: 2px solid var(--sfg-color);
    }

    .slider:before {
        position: absolute;
        content: "";
        height: 14px;
        width: 14px;
        left: 1.5px;
        bottom: 0.772px;
        background-color: var(--sfg-color);
        transition: 0.16s transform ease-out;
    }

    .auto-play-toggle:checked + .slider:before {
        background-color: var(--bg-color);
    }

    .auto-play-toggle:checked + .slider {
        background-color: var(--sfg-color);
        border: 2px solid var(--sfg-color);
    }

    .auto-play-toggle:focus + .slider {
        box-shadow: 0 0 1px var(--sfg-color);
    }

    .auto-play-toggle:checked + .slider:before {
        transform: translateX(19px) translateZ(0);
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

    .full-popup-wrapper {
        transform: translateZ(0);
        position: fixed;
        z-index: 1001;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: var(--ol-color);
        overscroll-behavior: contain;
        user-select: none;
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
    .full-popup-wrapper:has(.full-popup-description > :not(.is-custom-table)) {
        background-color: hsla(0,0%,0%,.75);
    }
    .full-popup-wrapper::-webkit-scrollbar {
        display: none;
    }
    :global(#main.max-window-height.popupvisible .full-popup-wrapper) {
        touch-action: none;
    }
    .full-popup {
        width: 100%;
        height: 100%;
        justify-content: center;
        align-items: center;
        display: flex;
        -ms-overflow-style: none;
        scrollbar-width: none;
    }

    .full-popup::-webkit-scrollbar {
        display: none;
    }

    .full-popup-image {
        max-width: min(100%, 1000px);
        max-height: 90%;
        object-fit: cover;
        transform: translateZ(0);
        border-radius: 6px;
        box-shadow: 0 14px 28px rgba(0, 0, 0, 0.25), 0 10px 10px rgba(0, 0, 0, 0.2);
        user-select: none;
        background-color: var(--bg-color) !important;
    }
    .full-popup-description-wrapper {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100%;
        height: 100%;
    }
    .full-popup-description {
        letter-spacing: 0.5px;
        line-height: 25px;
        font-size: 13px !important;
        overflow-y: auto;
        overflow-x: hidden;
        max-width: min(90%, 576px);
        max-height: 68%;
        -ms-overflow-style: none;
        scrollbar-width: none;
        overscroll-behavior: contain;
        user-select: none;
        color: var(--fg-color);
    }
    .full-popup-description::-webkit-scrollbar {
        display: none;
    }
    :global(#main.max-window-height.popup-visible .full-popup-description:not(.scrollable)) {
        touch-action: none;
    }
    :global(.full-popup-description *) {
        font-size: 13px !important;
        color: var(--fg-color);
    }
    @media screen and (min-width: 641px) {
        .full-popup-description {
            font-size: 15px !important;
        }
        :global(.full-popup-description *) {
            font-size: 15px !important;
        }
        .full-popup-image {
            max-width: min(90%, 1000px) !important;
        }
    }
    :global(.full-popup-description a) {
        color: hsl(var(--ac-color)) !important;
        text-decoration: none !important;
    }
    :global(.full-popup-description:has(.is-custom-table)) {
        border: 1px solid var(--bd-color) !important;
        border-radius: 6px !important;
    }
    :global(.full-popup-description:has(.is-custom-table) *) {
        font-size: 13px !important;
    }
    :global(.full-popup-description > .is-custom-table) {
        width: min(90vw, 380px) !important;
        background-color: var(--bg-color) !important;
        padding: 13px 26px !important;
        display: flex;
        flex-wrap: wrap;
        gap: 6.5px !important;
    }
    :global(.full-popup-description .custom-header) {
        border-bottom: 1px solid var(--fg-color) !important;
        padding: 0 0 6.5px 0 !important;
        display: flex;
        flex-wrap: wrap;
        column-gap: 20px !important;
        align-items: center !important;
        justify-content: space-between !important;
        width: 100% !important;
    }
    :global(.full-popup-description .custom-h1) {
        text-transform: capitalize !important;
        font-size: 15px !important;
        font-weight: 500 !important;
        min-height: 23px !important;
    }
    :global(.full-popup-description .custom-extra) {
        text-transform: capitalize !important;
        min-height: 20px !important;
        width: fit-content !important;
        min-width: 62.4px !important;
        cursor: pointer !important;
        text-indent: 6.5px !important;
        text-align: end !important;
    }
    :global(.full-popup-description .custom-table-list) {
        list-style: none !important;
        display: grid;
        gap: 13px !important;
        padding: 6.5px 0 !important;
        width: 100% !important;
        min-width: 100% !important;
    }
    :global(.full-popup-description .custom-table-list > li) {
        text-transform: capitalize !important;
        width: fit-content !important;
        min-width: 50% !important;
        cursor: pointer !important;
    }
    :global(.full-popup-description .custom-description) {
        padding: 6.5px !important;
        text-indent: 20px !important;
    }
    .disable-interaction {
        pointer-events: none !important;
        position: fixed !important;
        transform: translateY(-99999px) translateZ(0) !important;
        user-select: none !important;
        touch-action: none !important;
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
        opacity: 0 !important;
    }
    .display-none {
        display: none !important;
    }
</style>
