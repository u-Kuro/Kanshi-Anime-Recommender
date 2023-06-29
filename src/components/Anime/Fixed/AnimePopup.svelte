<script>
    import { onMount, tick } from "svelte";
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
        androidInApp,
        confirmPromise,
        animeIdxRemoved,
        shownAllInList,
        dataStatus,
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
    } from "../../../js/others/helper.js";
    import { retrieveJSON, saveJSON } from "../../../js/indexedDB.js";

    let isOnline = window.navigator.onLine;

    let savedYtVolume = 50;
    (async () => {
        savedYtVolume = (await retrieveJSON("savedYtVolume")) || 50;
    })();

    let animeGridParentEl,
        mostVisiblePopupHeader,
        currentHeaderIdx,
        currentYtPlayer,
        popupWrapper,
        popupContainer,
        popupAnimeObserver;

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
                            window.innerHeight < 180 &&
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
                            window.innerHeight >= 180 ? 0.5 : 0
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
                if (
                    $finalAnimeList.length &&
                    $animeLoaderWorker instanceof Worker
                ) {
                    $animeLoaderWorker.postMessage({ removeID: animeID });
                }
            }
        } else {
            if (
                await $confirmPromise(
                    "Are you sure you want to hide the anime?"
                )
            ) {
                $hiddenEntries[animeID] = true;
                if (
                    $finalAnimeList.length &&
                    $animeLoaderWorker instanceof Worker
                ) {
                    $animeLoaderWorker.postMessage({ removeID: animeID });
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
                scrollToElement(
                    popupContainer,
                    targetEl,
                    "bottom",
                    "instant",
                    55
                );
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
        let _contentCaution = (contentCaution?.caution || []).concat(
            contentCaution?.semiCaution || []
        );
        if (score < meanScoreAll) {
            // Very Low Score
            _contentCaution.push(
                `Very Low Score (mean: ${formatNumber(meanScoreAll)})`
            );
        } else if (score < meanScoreAbove) {
            // Low Score
            _contentCaution.push(
                `Low Score (mean: ${formatNumber(meanScoreAbove)})`
            );
        }
        return _contentCaution.join(", ") || "";
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
        } else if (score < meanScoreAll) {
            // Very Low Score
            return "purple";
        } else if (score < meanScoreAbove) {
            // Low Score
            return "orange";
        } else if (contentCaution?.semiCaution?.length) {
            // Semi Caution
            return "teal";
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
                window.innerHeight + "px"
            );
            // Scroll To Opened Anime
            let openedAnimePopupEl =
                popupContainer?.children[$openedAnimePopupIdx ?? 0];
            if (openedAnimePopupEl instanceof Element) {
                scrollToElement(popupContainer, openedAnimePopupEl);
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
                                ($androidInApp || !$android)
                            ) {
                                prePlayYtPlayer($ytPlayers[i].ytPlayer);
                                $ytPlayers[i].ytPlayer?.playVideo?.();
                                currentYtPlayer = $ytPlayers[i].ytPlayer;
                            }
                        }
                        break;
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
                    if (
                        $ytPlayers[i].ytPlayer.g === visibleTrailer &&
                        ($androidInApp || !$android)
                    ) {
                        prePlayYtPlayer($ytPlayers[i].ytPlayer);
                        $ytPlayers[i].ytPlayer?.playVideo?.();
                        currentYtPlayer = $ytPlayers[i].ytPlayer;
                        break;
                    }
                }
            } else {
                $ytPlayers?.forEach(({ ytPlayer }) => ytPlayer?.pauseVideo?.());
            }
        }
    });

    onMount(() => {
        popupWrapper = popupWrapper || document.getElementById("popup-wrapper");
        popupContainer =
            popupContainer || popupWrapper.querySelector("#popup-container");
        animeGridParentEl = document.getElementById("anime-grid");
        document.addEventListener("keydown", async (e) => {
            if (e.key === " " && $popupVisible) {
                e.preventDefault();
                let isPlaying = $ytPlayers?.some(
                    ({ ytPlayer }) =>
                        ytPlayer?.getPlayerState?.() === YT.PlayerState.PLAYING
                );
                if (isPlaying) {
                    $ytPlayers.forEach(({ ytPlayer }) => {
                        ytPlayer?.pauseVideo?.();
                    });
                } else {
                    await tick();
                    let visibleTrailer =
                        mostVisiblePopupHeader?.querySelector?.(".trailer");
                    for (let i = 0; i < $ytPlayers.length; i++) {
                        if (
                            $ytPlayers[i].ytPlayer.g === visibleTrailer &&
                            ($androidInApp || !$android)
                        ) {
                            prePlayYtPlayer($ytPlayers[i].ytPlayer);
                            $ytPlayers[i].ytPlayer?.playVideo?.();
                            currentYtPlayer = $ytPlayers[i].ytPlayer;
                            break;
                        }
                    }
                }
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
            // // Replay Most Visible Trailer
            $ytPlayers?.forEach(async ({ ytPlayer }) => {
                if (
                    ytPlayer.g === visibleTrailer &&
                    ytPlayer?.getPlayerState?.() !== 1 &&
                    $autoPlay
                ) {
                    await tick();
                    if (
                        popupWrapper?.classList?.contains?.("visible") &&
                        ($androidInApp || !$android)
                    ) {
                        prePlayYtPlayer(ytPlayer);
                        ytPlayer?.playVideo?.();
                        currentYtPlayer = ytPlayer;
                    }
                } else if (ytPlayer.g !== visibleTrailer) {
                    ytPlayer?.pauseVideo?.();
                }
            });
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
        if (ytPlayerEl instanceof Element && youtubeID) {
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
            }
            if ($ytPlayers.length >= 8) {
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
                    loop: 1, // Enable video looping
                    modestbranding: 1, // Enable modest branding (hide the YouTube logo)
                    playsinline: 1, // Enable inline video playback
                    playlist: youtubeID,
                },
                events: {
                    onReady: (event) => {
                        onPlayerReady(event);
                    },
                },
            });
            // Add Trailer to Iframe
            let trailerUrl = `https://www.youtube.com/embed/${youtubeID}?playlist=${youtubeID}&cc_load_policy=1&cc_lang_pref=en&enablejsapi=1&loop=1&modestbranding=1&playsinline=1`;
            ytPlayerEl.setAttribute("src", trailerUrl);
            $ytPlayers.push({ ytPlayer, headerIdx });
        } else {
            let popupImg = popupHeader?.querySelector?.(".popup-img");
            let animeCoverImgEl = popupImg.querySelector(".coverImg");
            removeClass(animeCoverImgEl, "display-none");
            if (popupImg instanceof Element) {
                removeClass(popupImg, "display-none");
            }
        }
    }

    async function onPlayerReady(event) {
        let ytPlayer = event.target;
        let trailerEl = ytPlayer?.g;
        trailerEl?.setAttribute?.("loading", "lazy");
        let popupHeader = trailerEl?.parentElement;
        let popupImg = popupHeader?.querySelector?.(".popup-img");
        let popupContent = popupHeader?.closest?.(".popup-content");
        let anime = $finalAnimeList?.[getChildIndex(popupContent) ?? -1];
        if (
            !anime ||
            !(trailerEl instanceof Element) ||
            !(popupImg instanceof Element)
        )
            return;
        if (
            ytPlayer.getPlayerState() === -1 ||
            trailerEl.tagName !== "IFRAME" ||
            !isOnline
        ) {
            failingTrailers[anime.id] = true;
            $ytPlayers = $ytPlayers.filter(
                (_ytPlayer) => _ytPlayer.ytPlayer !== ytPlayer
            );
            let animeBannerImg = anime?.bannerImageUrl;
            let animeBannerImgEl = popupImg.querySelector(".bannerImg");
            if (
                animeBannerImg &&
                (animeBannerImgEl?.naturalHeight === 0 ||
                    animeBannerImgEl?.naturalWidth === 0)
            ) {
                animeBannerImgEl.src = animeBannerImg;
            }
            let animeCoverImg = anime.coverImageUrl;
            let animeCoverImgEl = popupImg.querySelector(".coverImg");
            if (
                animeCoverImg &&
                (animeCoverImgEl?.naturalHeight === 0 ||
                    animeCoverImgEl?.naturalWidth === 0)
            ) {
                animeCoverImgEl.src = animeCoverImg;
            }
            ytPlayer.destroy();
            addClass(trailerEl, "display-none");
            removeClass(popupHeader, "loader");
            removeClass(animeCoverImgEl, "display-none");
            removeClass(popupImg, "display-none");
        } else {
            addClass(popupImg, "fade-out");
            setTimeout(() => {
                removeClass(popupHeader, "loader");
                removeClass(trailerEl, "display-none");
                setTimeout(() => {
                    addClass(popupImg, "display-none");
                    removeClass(popupImg, "fade-out");
                }, 300);
            }, 1000);
            // Play Most Visible when 1 Succeed
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

    function getFormattedAnimeFormat({ episodes, format, duration }) {
        let _format = format;
        if (episodes > 0 && format) {
            _format = `${format} [${episodes}]`;
            if (duration > 0) {
                let time = msToTime(duration * 60 * 1000);
                _format = `${_format} | ${time ? time : ""}`;
            }
        }
        return _format;
    }

    // Global Function For Android
    let isCurrentlyPlaying = false;
    window.returnedAppIsVisible = (inApp) => {
        // Only For Android, and workaround for Alert visibility
        if (!$popupVisible || !$android) return;
        $androidInApp = inApp;
        let visibleTrailer =
            mostVisiblePopupHeader?.querySelector?.(".trailer");
        if (!visibleTrailer) return;
        if ($popupVisible) {
            if (inApp) {
                for (var { ytPlayer } of $ytPlayers) {
                    if (
                        ytPlayer.g === visibleTrailer &&
                        ((ytPlayer?.getPlayerState?.() === 2 &&
                            isCurrentlyPlaying) ||
                            $autoPlay)
                    ) {
                        prePlayYtPlayer(ytPlayer);
                        ytPlayer?.playVideo?.();
                        currentYtPlayer = ytPlayer;
                        break;
                    }
                }
            } else if (!inApp) {
                isCurrentlyPlaying = false;
                for (var { ytPlayer } of $ytPlayers) {
                    if (
                        ytPlayer.g === visibleTrailer &&
                        ytPlayer?.getPlayerState?.() === 1
                    ) {
                        isCurrentlyPlaying = true;
                    }
                    ytPlayer?.pauseVideo?.();
                }
            }
        }
    };
    window.addEventListener("online", () => {
        if ($android) {
            try {
                JSBridge.isOnline(true);
            } catch (e) {}
        }
        $dataStatus = "Reconnected Successfully";
        isOnline = true;
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
            var existingScript = document.getElementById(
                "www-widgetapi-script"
            );
            if (existingScript) {
                existingScript.parentElement.removeChild(existingScript);
            }
            var tag = document.createElement("script");
            tag.src = "https://www.youtube.com/iframe_api?v=16";
            tag.onerror = () => {
                resolve();
            };
            tag.onload = () => {
                window?.onYouTubeIframeAPIReady?.();
                resolve();
            };
            var firstScriptTag = document.getElementsByTagName("script")[0];
            firstScriptTag.parentElement.insertBefore(tag, firstScriptTag);
        });
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
        style:--translateY={window.innerHeight + "px"}
        bind:this={popupContainer}
    >
        {#if $finalAnimeList?.length}
            {#each $finalAnimeList || [] as anime, animeIdx (anime.id)}
                <div class="popup-content" bind:this={anime.popupContent}>
                    <div class="popup-main">
                        <div
                            class={"popup-header " +
                                (anime.trailerID ? "loader" : "")}
                            bind:this={anime.popupHeader}
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
                                        class="bannerImg"
                                        on:load={(e) =>
                                            addClass(e.target, "fade-in")}
                                    />
                                {/if}
                                {#if anime.coverImageUrl}
                                    {#if anime.bannerImageUrl}
                                        <img
                                            loading="lazy"
                                            src={anime.coverImageUrl}
                                            alt="coverImg"
                                            class="coverImg display-none fade-in"
                                        />
                                    {:else}
                                        <img
                                            loading="lazy"
                                            src={anime.coverImageUrl}
                                            alt="coverImg"
                                            class="coverImg"
                                            on:load={(e) =>
                                                addClass(e.target, "fade-in")}
                                        />
                                    {/if}
                                {/if}
                            </div>
                        </div>

                        <div class="button-container">
                            <h3 class="autoplay-label">Auto Play</h3>
                            <label class="switch">
                                <input
                                    type="checkbox"
                                    class="autoplayToggle"
                                    bind:checked={$autoPlay}
                                />
                                <span class="slider round" />
                            </label>
                        </div>
                        <div class="popup-body">
                            <div class="anime-title-container">
                                <a
                                    rel="noopener noreferrer"
                                    target="_blank"
                                    href={anime.animeUrl || ""}
                                    class={getCautionColor(anime) +
                                        "-color anime-title copy"}
                                    copy-value={anime.title || ""}
                                    >{anime?.title || "N/A"}</a
                                >
                            </div>
                            <div
                                class="info-list"
                                style:max-height={anime.isSeenMore
                                    ? "none"
                                    : ""}
                            >
                                <div class="info-list-wrapper">
                                    <div class="info-categ">Format</div>
                                    <div
                                        class="format-popup info copy"
                                        copy-value={getFormattedAnimeFormat(
                                            anime
                                        ) || ""}
                                    >
                                        {getFormattedAnimeFormat(anime) ||
                                            "N/A"}
                                    </div>
                                </div>
                                <div>
                                    <div class="info-categ">Studio</div>
                                    <div class="studio-popup info">
                                        {#if Object.entries(anime?.studios || {}).length}
                                            {#each Object.entries(anime.studios || {}) as [studio, studioUrl], studioIdx (studio)}
                                                {#if studio}
                                                    <a
                                                        class="copy"
                                                        copy-value={studio ||
                                                            ""}
                                                        rel="noopener noreferrer"
                                                        target="_blank"
                                                        href={studioUrl || ""}
                                                        >{studio +
                                                            (Object.entries(
                                                                anime?.studios ||
                                                                    {}
                                                            ).length -
                                                                1 >
                                                            studioIdx
                                                                ? ", "
                                                                : "")}</a
                                                    >
                                                {/if}
                                            {/each}
                                        {:else}
                                            N/A
                                        {/if}
                                    </div>
                                </div>
                                <div>
                                    <div class="info-categ">Genres</div>
                                    <div class="genres-popup info">
                                        {#if anime.genres.length}
                                            {#each anime.genres as genre, idx (genre)}
                                                <span
                                                    class="copy"
                                                    copy-value={genre || ""}
                                                    >{idx <
                                                    anime.genres.length - 1
                                                        ? genre + ", "
                                                        : genre}
                                                </span>
                                            {/each}
                                        {:else}
                                            N/A
                                        {/if}
                                    </div>
                                </div>
                                <div>
                                    <div class="info-categ">Score</div>
                                    <div
                                        class="score-popup info copy"
                                        copy-value={anime.score ?? ""}
                                    >
                                        {formatNumber(anime.score) || "N/A"}
                                    </div>
                                </div>
                                <div>
                                    <div class="info-categ">
                                        Favorite Contents
                                    </div>
                                    <div class="top-similarities-popup info">
                                        {#if anime.favoriteContents?.length}
                                            {#each anime.favoriteContents || [] as favoriteContent, idx (favoriteContent)}
                                                {#if isJsonObject(favoriteContent)}
                                                    {#each Object.entries(favoriteContent) || [] as [studio, studioUrl] (studio)}
                                                        <a
                                                            class="copy"
                                                            copy-value={studio ||
                                                                ""}
                                                            rel="noopener noreferrer"
                                                            target="_blank"
                                                            href={studioUrl}
                                                            >{studio}</a
                                                        >{idx <
                                                        anime.favoriteContents
                                                            .length -
                                                            1
                                                            ? ", "
                                                            : ""}
                                                    {/each}
                                                {:else if typeof favoriteContent === "string"}
                                                    <span
                                                        class="copy"
                                                        copy-value={favoriteContent ||
                                                            ""}
                                                        >{favoriteContent +
                                                            (idx <
                                                            anime
                                                                .favoriteContents
                                                                .length -
                                                                1
                                                                ? ", "
                                                                : "")}
                                                    </span>
                                                {/if}
                                            {/each}
                                        {:else}
                                            N/A
                                        {/if}
                                    </div>
                                </div>
                                <div>
                                    <div class="info-categ">
                                        Content Cautions
                                    </div>
                                    <div
                                        class="content-caution-popup info copy"
                                        copy-value={getContentCaution(anime) ||
                                            ""}
                                    >
                                        {getContentCaution(anime) || "N/A"}
                                    </div>
                                </div>
                                <div>
                                    <div class="info-categ">User Status</div>
                                    <div
                                        class="user-status-popup info copy"
                                        copy-value={anime.userStatus || ""}
                                    >
                                        {anime.userStatus || "N/A"}
                                    </div>
                                </div>
                                <div>
                                    <div class="info-categ">Status</div>
                                    <div
                                        class="status-popup info copy"
                                        copy-value={anime.status || ""}
                                    >
                                        {anime.status || "N/A"}
                                    </div>
                                </div>
                                <div>
                                    <div class="info-categ">Tags</div>
                                    <div class="tags-popup info">
                                        {#if anime.tags.length}
                                            {#each anime.tags as tag, idx (tag)}
                                                <span
                                                    class="copy"
                                                    copy-value={tag || ""}
                                                    >{idx <
                                                    anime.tags.length - 1
                                                        ? tag + ", "
                                                        : tag}
                                                </span>
                                            {/each}
                                        {:else}
                                            N/A
                                        {/if}
                                    </div>
                                </div>
                                <div>
                                    <div class="info-categ">Average Score</div>
                                    <div
                                        class="average-score-popup info copy"
                                        copy-value={anime.averageScore ?? ""}
                                    >
                                        {anime.averageScore || "N/A"}
                                    </div>
                                </div>
                                <div>
                                    <div class="info-categ">Season Year</div>
                                    <div
                                        class="season-year-popup info copy"
                                        copy-value={`${anime?.season || ""}${
                                            anime?.year ? " " + anime.year : ""
                                        }` || ""}
                                    >
                                        {`${anime?.season || ""}${
                                            anime?.year ? " " + anime.year : ""
                                        }` || "N/A"}
                                    </div>
                                </div>
                                <div>
                                    <div class="info-categ">User Score</div>
                                    <div
                                        class="user-score-popup info copy"
                                        copy-value={anime.userScore ?? ""}
                                    >
                                        {anime.userScore || "N/A"}
                                    </div>
                                </div>
                                <div>
                                    <div class="info-categ">Popularity</div>
                                    <div
                                        class="popularity-popup info copy"
                                        copy-value={anime.popularity ?? ""}
                                    >
                                        {anime.popularity || "N/A"}
                                    </div>
                                </div>
                                <div>
                                    <div class="info-categ">Wscore</div>
                                    <div
                                        class="wscore-popup info copy"
                                        copy-value={anime.weightedScore ?? ""}
                                    >
                                        {formatNumber(anime.weightedScore) ||
                                            "N/A"}
                                    </div>
                                </div>
                            </div>
                            <div class="footer">
                                <button
                                    class="seemoreless"
                                    on:click={handleSeeMore(anime, animeIdx)}
                                    on:keydown={(e) =>
                                        e.key === "Enter" &&
                                        handleSeeMore(anime, animeIdx)}
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
        transform: translateY(55px);
    }

    .popup-container {
        will-change: transform;
        width: 100%;
        max-width: 640px;
        overflow: auto;
        overscroll-behavior: contain;
        background-color: #151f2e;
        transition: transform 0.3s ease;
    }

    .popup-container.hide {
        transform: translateY(var(--translateY));
    }

    .popup-container.show {
        transform: translateY(0);
    }

    .popup-container::-webkit-scrollbar {
        display: none;
    }

    .popup-content {
        display: grid;
        grid-template-columns: 100%;
        color: #909cb8;
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
    }

    .popup-img {
        transition: opacity 0.3s ease 1s;
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
    }
    .bannerImg.fade-in {
        animation: fadeIn 0.3s ease forwards;
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
    }
    .coverImg.fade-in {
        animation: fadeIn 0.3s ease forwards;
    }

    .popup-body {
        overflow: hidden;
        touch-action: pan-y;
        margin: 2em 2.4em;
    }

    .popup-body a {
        color: #0055c8;
        text-decoration: none;
    }

    .anime-title-container {
        width: 100%;
        overflow-x: auto;
        white-space: nowrap;
        align-items: center;
        display: flex;
    }

    .anime-title-container::-webkit-scrollbar {
        display: none;
    }

    .anime-title {
        padding: 0.5em;
        border-radius: 6px;
        cursor: pointer;
        font-size: clamp(1.6309rem, 1.76545rem, 1.9rem);
    }

    .anime-title:hover {
        background-color: rgba(0, 0, 0, 0.5);
    }

    .anime-title {
        text-decoration: none;
    }

    .footer {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        align-items: center;
        gap: 1em;
        user-select: none !important;
    }

    .hideshowbtn,
    .seemoreless {
        padding: 0.5em 1.5em 0.5em 1.5em;
        border-radius: 0.1em;
        outline: 0;
        border: 0;
        background-color: #0b1622 !important;
        cursor: pointer;
        color: #798695 !important;
        white-space: nowrap;
        max-width: 95px;
        flex: 1;
    }

    .info-list {
        max-height: 220px;
        overflow: hidden;
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        grid-gap: 0.8em;
        padding: 0 0.8em !important;
        margin: 0.5em 0 1.6em 0;
    }

    @media screen and (orientation: portrait) {
        .info-list {
            max-height: 410px;
            grid-template-columns: repeat(1, 1fr);
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
        max-width: fit-content;
        text-transform: capitalize;
    }

    .button-container {
        background-color: #000 !important;
        display: flex;
        justify-content: right;
        padding: 5px 2.4em;
        align-items: center;
        z-index: 1;
        position: relative;
        user-select: none;
        gap: 6px;
    }

    .autoplay-label {
        height: 14px;
        line-height: 11px;
        font-weight: 500;
        color: #8d9abb;
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
        background-color: rgb(40 69 102);
    }

    .autoplayToggle:focus + .slider {
        box-shadow: 0 0 1px #2196f3;
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
</style>
