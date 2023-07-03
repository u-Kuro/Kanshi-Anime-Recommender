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
        loadAnime
    } from "../../../js/globalValues";

    let animeTitle;
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
            let openedAnime = $finalAnimeList[$openedAnimeOptionIdx];
            if (openedAnime) {
                animeTitle = openedAnime.title;
                animeID = openedAnime.id;
                animeUrl = openedAnime.animeUrl;
                animeIdx = $openedAnimeOptionIdx;
            }
            $openedAnimeOptionIdx = null;
        } else {
            if (isRecentlyOpenedTimeout) clearTimeout(isRecentlyOpenedTimeout);
            isRecentlyOpened = false;
        }
    });

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
        $animeOptionVisible = false;
    }

    function openInAnilist(e) {
        if (isRecentlyOpened && e.type !== "keydown") return;
        if (animeUrl) {
            window.open(animeUrl, "_blank");
        }
        $animeOptionVisible = false;
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
        let isHidden = $hiddenEntries[animeID];
        if (isHidden) {
            if (
                await $confirmPromise(
                    "Are you sure you want to show the anime?"
                )
            ) {
                delete $hiddenEntries[animeID];
                $hiddenEntries = $hiddenEntries;
                if ( $finalAnimeList.length ) {
                    if ($animeLoaderWorker instanceof Worker) {
                        $animeLoaderWorker.postMessage({ removeID: animeID });
                    } else {
                        $animeLoaderWorker = null;
                        $finalAnimeList = null;
                        $loadAnime = !$loadAnime
                    }
                }
                $animeOptionVisible = false;
            }
        } else {
            if (
                await $confirmPromise(
                    "Are you sure you want to hide the anime?"
                )
            ) {
                $hiddenEntries[animeID] = true;
                if ( $finalAnimeList.length ) {
                    if ($animeLoaderWorker instanceof Worker) {
                        $animeLoaderWorker.postMessage({ removeID: animeID });
                    } else {
                        $animeLoaderWorker = null;
                        $finalAnimeList = null;
                        $loadAnime = !$loadAnime
                    }
                }
                $animeOptionVisible = false;
            }
        }
    }
</script>

{#if $animeOptionVisible}
    <div
        class="anime-options"
        on:click={handleAnimeOptionVisibility}
        on:keydown={(e) => e.key === "Enter" && handleAnimeOptionVisibility(e)}
    >
        <div
            class="anime-options-container"
            transition:fly={{ y: 20, duration: 300 }}
        >
            <div class="option-header">
                <span class="anime-title"><h1>{animeTitle}</h1></span>
                <div
                    class="closing-x"
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
                ><h2 class="option-title">Open Anime</h2></span
            >
            <span
                class="anime-option"
                on:click={openInAnilist}
                on:keydown={(e) => e.key === "Enter" && openInAnilist(e)}
                ><h2 class="option-title">Open In Anilist</h2></span
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
        position: fixed;
        display: flex;
        z-index: 996;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.4);
        justify-content: center;
        align-items: center;
        overflow-y: auto;
        overscroll-behavior: contain;
    }

    .anime-options::-webkit-scrollbar {
        display: none;
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
