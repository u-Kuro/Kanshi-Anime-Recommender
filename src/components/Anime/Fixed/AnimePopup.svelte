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
    } from "../../../js/globalValues.js";
    import {
        isJsonObject,
        formatNumber,
        scrollToElement,
        getMostVisibleElement,
        getChildIndex,
        msToTime,
        scrollToElementAmount,
    } from "../../../js/others/helper.js";
    import { saveJSON } from "../../../js/indexedDB.js";
    import captureSlideEvent from "../../../js/slideEvent.js";
    import alter from "../../../js/alter.js";

    let isOnline = window.navigator.onLine;
    let popupWrapper, popupContainer;

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

    function handleHideShow(animeID) {
        let isHidden = $hiddenEntries[animeID];
        if (isHidden) {
            if (confirm("Are you sure you want to show the anime?")) {
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
            if (confirm("Are you sure you want to hide the anime?")) {
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

    async function handleSeeMore(anime, animeIdx) {
        if ($finalAnimeList[animeIdx]) {
            $finalAnimeList[animeIdx].isSeenMore =
                !$finalAnimeList[animeIdx].isSeenMore;
            await tick();
            let targetEl = anime.popupContent;
            if (!popupContainer instanceof Element) return;
            if (!(targetEl instanceof Element)) {
                targetEl = anime?.popupHeader?.closest?.(".popup-content");
            }
            if (targetEl instanceof Element) {
                scrollToElement(popupContainer, targetEl, "bottom");
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
            Object.assign(popupContainer.style, {
                "--translateY": window.innerHeight + "px",
            });
            // Scroll To Opened Anime
            let openedAnimePopupEl =
                popupContainer?.children[$openedAnimePopupIdx ?? 0];
            if (openedAnimePopupEl instanceof Element) {
                scrollToElement(popupContainer, openedAnimePopupEl);
                // Animate Opening
                popupWrapper.classList.add("visible");
                popupContainer.classList.add("show");
                // Try to Add YT player
                let openedAnime = $finalAnimeList[$openedAnimePopupIdx];
                let trailerEl =
                    openedAnime?.popupHeader?.querySelector(".trailer");
                let haveNoTrailer = true;
                for (let i = 0; i < $ytPlayers?.length ?? -1; i++) {
                    if ($ytPlayers[i].g === trailerEl) {
                        if ($autoPlay) {
                            await tick();
                            if (
                                popupWrapper?.classList?.contains?.("visible")
                            ) {
                                $ytPlayers[i]?.playVideo?.();
                            }
                        }
                        haveNoTrailer = false;
                        break;
                    }
                }
                if (haveNoTrailer) {
                    createPopupYTPlayer(openedAnime);
                }
                $openedAnimePopupIdx = null;
            } else {
                // Animate Opening
                popupWrapper.classList.add("visible");
                popupContainer.classList.add("show");
            }
        } else if (val === false) {
            popupContainer.classList.remove("show");
            popupContainer.classList.add("hide");
            setTimeout(() => {
                // Stop All Player
                $ytPlayers?.forEach((ytPlayer) => ytPlayer?.pauseVideo?.());
                popupWrapper.classList.remove("visible");
            }, 300);
        }
    });

    finalAnimeList.subscribe(async (val) => {
        if (val instanceof Array && val.length) {
            await tick();
            try {
                if ($animeObserver) {
                    // Popup Observed
                    $animeObserver.observe(
                        $finalAnimeList[$finalAnimeList.length - 1].popupContent
                    );
                }
                playMostVisibleTrailer();
            } catch (ex) {}
        }
    });

    autoPlay.subscribe(async (val) => {
        if (typeof val === "boolean") {
            await saveJSON(val, "autoPlay");
            if (val === true) {
                playMostVisibleTrailer();
            } else {
                $ytPlayers?.forEach((ytPlayer) => ytPlayer?.pauseVideo?.());
            }
        }
    });

    let unsubSlideEvents;
    onMount(() => {
        document
            .getElementById("popup-container")
            .addEventListener("scroll", () => {
                playMostVisibleTrailer();
            });
        if (window.innerWidth <= 768) {
            unsubSlideEvents = captureSlideEvent(popupContainer, () => {
                return new Promise((resolve) => {
                    $popupVisible = false;
                    setTimeout(resolve, 300); // To return values
                });
            });
        }
        window.addEventListener("resize", () => {
            if (window.innerWidth <= 768 && !unsubSlideEvents) {
                unsubSlideEvents = captureSlideEvent(popupContainer, () => {
                    return new Promise((resolve) => {
                        $popupVisible = false;
                        setTimeout(resolve, 300); // To return values
                    });
                });
            } else if (unsubSlideEvents && window.innerWidth > 768) {
                if (unsubSlideEvents) unsubSlideEvents();
                unsubSlideEvents = null;
            }
        });
    });

    let lastProcessedTrailer;
    async function playMostVisibleTrailer(once = false) {
        if (!$popupVisible) return;
        await tick();
        let mostVisiblePopupHeader =
            getMostVisibleElement(popupContainer, ".popup-header", 0) ||
            getMostVisibleElement(
                popupContainer,
                ".popup-content",
                1
            )?.querySelector(".popup-header");
        let visibleTrailer =
            mostVisiblePopupHeader?.querySelector?.(".trailer");
        // Scroll in Grid
        let animeGrid =
            $finalAnimeList?.[getChildIndex(mostVisiblePopupHeader) ?? -1]
                ?.gridElement;
        if (animeGrid instanceof Element) {
            scrollToElement(window, animeGrid, "top", "smooth", -66); // Nav + GridGap
        }
        let haveTrailer;
        if (visibleTrailer instanceof Element) {
            haveTrailer = $ytPlayers?.some(
                (ytPlayer) => ytPlayer.g === visibleTrailer
            );
        }
        if (haveTrailer) {
            // Replay Most Visible Trailer
            $ytPlayers?.forEach(async (ytPlayer) => {
                if (
                    ytPlayer.g === visibleTrailer &&
                    ytPlayer?.getPlayerState?.() !== 1 &&
                    $autoPlay
                ) {
                    await tick();
                    if (popupWrapper?.classList?.contains?.("visible")) {
                        ytPlayer?.playVideo?.();
                    }
                } else if (ytPlayer.g !== visibleTrailer) {
                    ytPlayer?.pauseVideo?.();
                }
            });
        } else {
            // Pause All Players
            $ytPlayers?.forEach((ytPlayer) => ytPlayer?.pauseVideo?.());
            if (
                visibleTrailer instanceof Element &&
                lastProcessedTrailer !== visibleTrailer
            ) {
                lastProcessedTrailer = visibleTrailer;
                // Recheck Trailer
                let popupContent = visibleTrailer?.closest?.(".popup-content");
                let anime =
                    $finalAnimeList?.[getChildIndex(popupContent) ?? -1];
                if (anime && !once) createPopupYTPlayer(anime);
            }
        }
    }

    function createPopupYTPlayer(openedAnime) {
        let ytPlayerEl = openedAnime.popupHeader.querySelector(".trailer");
        if (!isOnline) {
            let popupHeader = ytPlayerEl?.parentNode;
            let popupImg = popupHeader?.querySelector?.(".popup-img");
            let hasPlayer = $ytPlayers?.some(({ g }) => g === ytPlayerEl);
            if (hasPlayer) return; // Keep Playing Available YTPlayers
            let animeBannerImg = openedAnime?.bannerImageUrl;
            let animeBannerImgEl = popupImg.querySelector(".bannerImg");
            if (
                animeBannerImg &&
                (animeBannerImgEl?.naturalHeight === 0 ||
                    animeBannerImgEl?.naturalWidth === 0)
            ) {
                animeBannerImgEl.src = animeBannerImg;
            }
            let animeCoverImg = openedAnime.coverImageUrl;
            let animeCoverImgEl = popupImg.querySelector(".coverImg");
            if (
                animeCoverImg &&
                (animeCoverImgEl?.naturalHeight === 0 ||
                    animeCoverImgEl?.naturalWidth === 0)
            ) {
                animeCoverImgEl.src = animeCoverImg;
            }
            popupImg.style.display = "";
            ytPlayerEl.style.display = "none";
        } else {
            if (
                !openedAnime ||
                !(openedAnime.popupHeader instanceof Element) ||
                !openedAnime.trailerID ||
                !popupWrapper?.classList?.contains("visible")
            )
                return; // Unavailable
            let youtubeID = openedAnime.trailerID;
            if (ytPlayerEl instanceof Element && youtubeID) {
                if ($ytPlayers.some((ytPlayer) => ytPlayer.g === ytPlayerEl))
                    return;
                if ($ytPlayers.length >= 8) {
                    let destroyedPlayer = $ytPlayers.shift();
                    // $ytPlayers = $ytPlayers
                    destroyedPlayer?.destroy?.();
                    let parentElement = ytPlayerEl.parentElement;
                    let newYtPlayerEl = document.createElement("div");
                    newYtPlayerEl.className = "trailer";
                    parentElement.replaceChild(newYtPlayerEl, ytPlayerEl);
                    ytPlayerEl = parentElement.querySelector(".trailer"); // Get new YT player
                }
            }
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
            $ytPlayers.push(ytPlayer);
        }
    }
    function onPlayerReady(event) {
        let ytPlayer = event.target;
        let trailerEl = ytPlayer?.g;

        let popupHeader = trailerEl?.parentNode;
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
            $ytPlayers = $ytPlayers.filter(
                (_ytPlayer) => _ytPlayer !== ytPlayer
            );
            ytPlayer.destroy();
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
            popupImg.style.display = "";
            trailerEl.style.display = "none";
            return;
        } else {
            trailerEl.style.display = "";
            popupImg.style.display = "none";
        }
        playMostVisibleTrailer(true);
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
    window.returnedAppIsVisible = (inApp) => {
        let visibleTrailer = getMostVisibleElement(popupContainer, ".trailer");
        if (!visibleTrailer) {
            visibleTrailer =
                getMostVisibleElement(popupContainer, ".popup-main", 0) ||
                getMostVisibleElement(popupContainer, ".popup-content", 0);
            if (visibleTrailer) {
                visibleTrailer = visibleTrailer.querySelector(".trailer");
            } else {
                visibleTrailer = undefined;
            }
        }
        if (!visibleTrailer) return;
        if ($popupVisible) {
            for (var ytPlayer of $ytPlayers) {
                if (ytPlayer.g === visibleTrailer) {
                    if (inApp) {
                        if (ytPlayer?.getPlayerState?.() === 2) {
                            ytPlayer?.playVideo?.();
                            break;
                        }
                    } else {
                        ytPlayer?.pauseVideo?.();
                        break;
                    }
                }
            }
        }
    };
    window.addEventListener("online", () => {
        isOnline = true;
        loadYouTubeAPI().then(() => {
            lastProcessedTrailer = undefined;
            playMostVisibleTrailer();
        });
    });
    window.addEventListener("offline", () => {
        isOnline = false;
    });
    function loadYouTubeAPI() {
        return new Promise((resolve) => {
            var existingScript = document.getElementById(
                "www-widgetapi-script"
            );
            if (existingScript) {
                existingScript.parentNode.removeChild(existingScript);
            }
            var tag = document.createElement("script");
            tag.src = "https://www.youtube.com/iframe_api?v=16";
            tag.onerror = () => {
                console.error("Failed to load YouTube API script.");
                resolve();
            };
            tag.onload = () => {
                window?.onYouTubeIframeAPIReady?.();
                resolve();
            };
            var firstScriptTag = document.getElementsByTagName("script")[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        });
    }
</script>

<div
    id="popup-wrapper"
    class="popup-wrapper"
    on:click={handlePopupVisibility}
    on:keydown={handlePopupVisibility}
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
                        <div class="popup-header" bind:this={anime.popupHeader}>
                            {#if anime.trailerID}
                                <div class="trailer" />
                            {/if}
                            <div
                                class="popup-img"
                                style:display={anime.trailerID ? "none" : ""}
                            >
                                <img
                                    src={anime.bannerImageUrl}
                                    alt="bannerImg"
                                    style:opacity="0"
                                    class="bannerImg"
                                    on:load={(e) =>
                                        (e.target.style.opacity = 0.75)}
                                />
                                <img
                                    src={anime.coverImageUrl}
                                    alt="coverImg"
                                    style:opacity="0"
                                    class="coverImg"
                                    on:load={(e) =>
                                        (e.target.style.opacity = 1)}
                                />
                            </div>
                        </div>

                        <div class="button-container">
                            <h3>Auto Play</h3>
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
                                <div>
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
                                    on:keydown={handleSeeMore(anime, animeIdx)}
                                    >{"See " +
                                        (anime.isSeenMore
                                            ? "Less"
                                            : "More")}</button
                                >
                                <button
                                    class="hideshowbtn"
                                    on:click={handleHideShow(anime.id)}
                                    on:keydown={handleHideShow(anime.id)}
                                    >{getHiddenStatus(anime.id) ||
                                        "N/A"}</button
                                >
                            </div>
                        </div>
                    </div>
                </div>
            {/each}
        {/if}
    </div>
    <div
        id="closing-x"
        class="closing-x"
        on:click={handlePopupVisibility}
        on:keydown={handlePopupVisibility}
    >
        &#215;
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
        background-color: rgba(0, 0, 0, 0.6);
        display: flex;
        justify-content: center;
        overflow: hidden;
        transform: translateY(99999px);
    }

    .popup-wrapper.visible {
        transform: translateY(0);
    }

    .popup-container {
        will-change: transform;
        display: flex;
        flex-direction: column;
        width: 100%;
        max-width: 640px;
        overflow: auto;
        overscroll-behavior: contain;
        transition: 0.3s ease transform;
    }

    .popup-container.hide {
        transform: translateY(var(--translateY));
    }

    .popup-container.show {
        transform: translateY(0);
        /* transform: translate3d(0, 0, 0); */
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

    .popup-main {
        display: initial;
        /* visibility: hidden; */
    }

    .popup-header {
        width: 100%;
        position: relative;
        padding-bottom: 56.25%;
        background: #000;
        user-select: none !important;
    }

    /* Need to add Globally, trailer Elements are Recreated */
    :global(.trailer) {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
    }

    .popup-img {
        width: 100%;
        background-color: #000 !important;
    }

    .popup-img .bannerImg {
        height: 100%;
        width: 100%;
        position: absolute;
        object-fit: cover;
        object-position: revert;
    }

    .popup-img .bannerImg::after {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
    }

    .popup-img .coverImg {
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

    .close-btn {
        position: absolute;
        top: 10px;
        right: 10px;
        font-size: 20px;
        background-color: transparent;
        border: none;
        cursor: pointer;
        color: #000;
    }

    .close-btn:hover {
        color: #999;
    }

    .popup-body {
        overflow: auto;
        min-height: 11em;
        flex: 0 1 auto;
        touch-action: pan-y;
        margin: 2em 2.4em;
    }

    .popup-body a {
        color: #0055c8;
        text-decoration: none;
    }

    .popup-body .anime-title-container {
        width: 100%;
        overflow-x: auto;
        white-space: nowrap;
        align-items: center;
        display: flex;
        position: relative;
        text-transform: capitalize;
    }

    .popup-body .anime-title-container::-webkit-scrollbar {
        display: none;
    }

    .anime-title-container .anime-title {
        padding: 0.5em;
        border-radius: 0.1em;
        width: max-content;
        cursor: pointer;
        font-size: clamp(1.6309rem, 1.76545rem, 1.9rem);
        font-weight: 400;
    }

    .anime-title-container .anime-title:hover {
        background-color: rgba(0, 0, 0, 0.5);
    }

    .anime-title-container a.anime-title {
        text-decoration: none;
    }

    .popup-body .footer {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        align-items: center;
        gap: 1em;
        user-select: none !important;
    }

    .popup-body .footer button {
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

    .popup-body .footer button.show {
        background-color: rgb(40 69 102) !important;
        color: #b8bfd1 !important;
    }

    .popup-body .footer button.hide:focus,
    .popup-body .footer button.hide:hover {
        background-color: #d75a72 !important;
        color: #fff !important;
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

        .image-grid__card {
            animation: fadeIn var(--transDur) ease-in;
            width: 47%;
        }

        .image-grid__card-title {
            display: flex;
            flex-wrap: wrap;
            padding: clamp(0.1em, 0.3em, 0.5em);
            font-size: clamp(1.2rem, 1.3rem, 1.4rem);
            background-color: transparent;
        }

        .image-grid__card-title i {
            font-size: 0.9rem;
        }

        .image-grid__card .image-grid__card-thumb {
            height: 210px !important;
        }
    }

    .image-grid__card-title i {
        font-size: 1rem;
    }

    .info-list div {
        margin-bottom: 0.8em;
    }

    .info-list .info-categ {
        font-size: clamp(1.0631rem, 1.15155rem, 1.24rem);
        font-weight: 500;
        max-width: fit-content;
        user-select: none !important;
    }

    .info-list .info {
        font-size: clamp(1.018rem, 1.099rem, 1.18rem);
        line-height: 1.3;
        max-width: fit-content;
        text-transform: capitalize;
    }

    .popup-body a.darkMode {
        color: #0055c8;
    }

    .popup-content .button-container {
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

    .popup-container .button-container h3 {
        height: 14px;
        line-height: 11px;
        font-weight: 500;
        color: #8d9abb;
    }

    .popup-content .button-next,
    .popup-content .button-prev {
        background-color: #000 !important;
        color: #909cb8 !important;
        padding: 0.5em 1.5em 0.5em 1.5em;
        border-radius: 0.1em;
        outline: 0;
        border: 0;
        cursor: pointer;
    }

    .popup-content .button-left:hover,
    .popup-content .button-right:hover {
        background-color: #ccc;
    }

    .closing-x {
        font-size: 25px;
        width: 25px;
        height: 25px;
        text-align: center;
        position: fixed;
        right: 10px;
        top: 10px;
        vertical-align: middle;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
        cursor: pointer;
        border-radius: 50%;
        z-index: 2;
        user-select: none;
        background-color: transparent;
    }

    .closing-x:focus,
    .closing-x:hover {
        background-color: rgba(0, 0, 0, 0.75);
    }

    .switch {
        position: relative;
        display: inline-block;
        width: 43px;
        height: 20px;
    }

    .switch input {
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

    input:checked + .slider {
        background-color: rgb(40 69 102);
    }

    input:focus + .slider {
        box-shadow: 0 0 1px #2196f3;
    }

    input:checked + .slider:before {
        -webkit-transform: translateX(22px);
        -ms-transform: translateX(22px);
        transform: translateX(22px);
    }

    .slider.round {
        border-radius: 34px;
    }

    .slider.round:before {
        border-radius: 50%;
    }
</style>
