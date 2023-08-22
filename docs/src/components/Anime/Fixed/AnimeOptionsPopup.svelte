<script>
    import { fly } from "svelte/transition";
    import {
        android,
        animeOptionVisible,
        openedAnimeOptionIdx,
        finalAnimeList,
        popupVisible,
        openedAnimePopupIdx,
        hiddenEntries,
        animeLoaderWorker,
        confirmPromise,
        checkAnimeLoaderStatus,
    } from "../../../js/globalValues";

    let animeTitle;
    let youtubeSearchTitle;
    let animeID;
    let animeUrl;
    let animeIdx;

    let isRecentlyOpened = true,
        isRecentlyOpenedTimeout;
    animeOptionVisible.subscribe((val) => {
        if (val === true) {
            isRecentlyOpened = true;
            isRecentlyOpenedTimeout = setTimeout(() => {
                isRecentlyOpened = false;
            }, 500);
        } else {
            if (isRecentlyOpenedTimeout) clearTimeout(isRecentlyOpenedTimeout);
            isRecentlyOpened = false;
        }
    });

    function handleTouchAnimeOptionVisibility(e) {
        if (isRecentlyOpened) return;
        let target = e.target;
        let classList = target.classList;
        if (
            target.closest(".anime-options-container") ||
            classList.contains("anime-options-container")
        )
            return;
        $animeOptionVisible = false;
    }

    function handleAnimeOptionVisibility(e) {
        if (isRecentlyOpened && e.type !== "keydown") return;
        let target = e.target;
        let classList = target.classList;
        if (
            !classList.contains("closing-x") &&
            (target.closest(".anime-options-container") ||
                classList.contains("anime-options-container"))
        )
            return;
        $animeOptionVisible = false;
    }

    function openAnimePopup(e) {
        if (isRecentlyOpened && e.type !== "keydown") return;
        $openedAnimePopupIdx = animeIdx;
        $popupVisible = true;
    }

    function openInAnilist(e) {
        if (isRecentlyOpened && e.type !== "keydown") return;
        if (typeof animeUrl !== "string" || animeUrl === "") return;
        window.open(animeUrl, "_blank");
    }

    async function openInYoutube(e) {
        if (isRecentlyOpened && e.type !== "keydown") return;
        if (typeof youtubeSearchTitle !== "string" || youtubeSearchTitle === "")
            return;
        window.open(
            `https://www.youtube.com/results?search_query=${youtubeSearchTitle} Anime`,
            "_blank"
        );
    }

    function copyTitle(e) {
        if ((isRecentlyOpened && e.type !== "keydown") || !animeTitle) return;
        if ($android) {
            try {
                JSBridge.copyToClipBoard(animeTitle);
            } catch (ex) {}
        } else {
            navigator?.clipboard?.writeText?.(animeTitle);
        }
        $animeOptionVisible = false;
    }

    async function handleHideShow(e) {
        if (isRecentlyOpened && e.type !== "keydown") return;
        let title = animeTitle ? `<b>${animeTitle}</b>` : "this anime";
        let isHidden = $hiddenEntries[animeID];
        if (isHidden) {
            if (
                await $confirmPromise(
                    `Are you sure you want to show ${title} in your recommendation list?`
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
                $animeOptionVisible = false;
            }
        } else {
            if (
                await $confirmPromise(
                    `Are you sure you want to hide ${title} in your recommendation list?`
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
                $animeOptionVisible = false;
            }
        }
    }

    function loadAnimeOption() {
        let openedAnime = $finalAnimeList?.[$openedAnimeOptionIdx ?? -1];
        if (openedAnime) {
            animeTitle =
                openedAnime?.title?.english ||
                openedAnime?.title?.userPreferred ||
                openedAnime?.title?.romaji ||
                openedAnime?.title?.native;
            youtubeSearchTitle =
                openedAnime?.title?.romaji ||
                openedAnime?.title?.userPreferred ||
                openedAnime?.title?.english ||
                openedAnime?.title?.native;
            animeID = openedAnime.id;
            animeUrl = openedAnime.animeUrl;
            animeIdx = $openedAnimeOptionIdx;
        } else {
            $animeOptionVisible = false;
        }
    }
    finalAnimeList.subscribe(() => {
        if ($animeOptionVisible) {
            loadAnimeOption();
        }
    });
</script>

{#if $animeOptionVisible && !$popupVisible && $finalAnimeList}
    <div
        use:loadAnimeOption
        class="anime-options"
        on:click={handleAnimeOptionVisibility}
        on:touchend|passive={handleTouchAnimeOptionVisibility}
        on:keydown={(e) => e.key === "Enter" && handleAnimeOptionVisibility(e)}
    >
        <div
            class="anime-options-container"
            transition:fly={{ y: 20, duration: 300 }}
        >
            <div class="option-header">
                <span class="anime-title"><h1>{animeTitle}</h1></span>
                <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                <div
                    class="closing-x"
                    tabindex="0"
                    on:click={handleAnimeOptionVisibility}
                    on:keydown={(e) =>
                        e.key === "Enter" && handleAnimeOptionVisibility(e)}
                >
                    &#215;
                </div>
            </div>
            <span
                class="anime-option"
                on:click={openAnimePopup}
                on:keydown={(e) => e.key === "Enter" && openAnimePopup(e)}
                ><h2 class="option-title">Information</h2></span
            >
            <span
                class="anime-option"
                on:click={openInAnilist}
                on:keydown={(e) => e.key === "Enter" && openInAnilist(e)}
                ><h2 class="option-title">Open in Anilist</h2></span
            >
            <span
                class="anime-option"
                on:click={openInYoutube}
                on:keydown={(e) => e.key === "Enter" && openInYoutube(e)}
                ><h2 class="option-title">Open in YouTube</h2></span
            >
            <span
                class="anime-option"
                on:click={copyTitle}
                on:keydown={(e) => e.key === "Enter" && copyTitle(e)}
                ><h2 class="option-title">Copy Title</h2></span
            >
            <span
                class="anime-option"
                on:click={handleHideShow}
                on:keydown={(e) => e.key === "Enter" && handleHideShow(e)}
                ><h2 class="option-title">
                    {($hiddenEntries[animeID] ? "Show" : "Hide") + " Anime"}
                </h2></span
            >
        </div>
    </div>
{/if}

<style>
    .anime-options {
        transform: translateZ(0);
        -webkit-transform: translateZ(0);
        -ms-transform: translateZ(0);
        -moz-transform: translateZ(0);
        -o-transform: translateZ(0);
        position: fixed;
        display: flex;
        z-index: 994;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.4);
        justify-content: center;
        align-items: center;
        overflow-y: auto;
        overscroll-behavior: contain;
        -ms-overflow-style: none;
        scrollbar-width: none;
    }

    .anime-options::-webkit-scrollbar {
        display: none;
    }

    @media screen and (max-width: 750px) {
        .anime-options {
            height: calc(100% - 55px) !important;
            top: 55px !important;
        }
    }

    .anime-options-container {
        display: flex;
        flex-direction: column;
        background-color: #151f2e;
        width: 300px;
        max-width: 90%;
        border-radius: 6px;
        padding: 10px 15px;
    }

    .option-header {
        display: grid;
        grid-template-columns: auto 25px;
        align-items: center;
        justify-content: space-between;
        gap: 1em;
    }

    .anime-title {
        overflow-x: auto;
        overflow-y: hidden;
        margin: 1em 0 1em 1em !important;
        padding: 0 !important;
        -ms-overflow-style: none;
        scrollbar-width: none;
    }

    .anime-title::-webkit-scrollbar {
        display: none;
    }

    h1 {
        white-space: nowrap;
    }

    span {
        padding: 1em;
        user-select: none !important;
        text-decoration: none !important;
    }

    .anime-option {
        cursor: pointer;
    }

    .option-title {
        font-weight: 400;
        cursor: pointer;
    }

    .closing-x {
        font-size: 25px;
        width: 25px;
        height: 25px;
        text-align: center;
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
</style>
