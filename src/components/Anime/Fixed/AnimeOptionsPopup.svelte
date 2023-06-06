<script>
    import { fade } from "svelte/transition";
    import {
        android,
        animeOptionVisible,
        openedAnimeOptionIdx,
        finalAnimeList,
        popupVisible,
        openedAnimePopupIdx,
        hiddenEntries,
        animeLoaderWorker,
    } from "../../../js/globalValues";

    let animeTitle;
    let animeID;
    let animeUrl;
    let animeIdx;

    let isRecentlyOpened = true;
    animeOptionVisible.subscribe((val) => {
        if (val === true) {
            isRecentlyOpened = true;
            setTimeout(() => {
                isRecentlyOpened = false;
            }, 500);
            let openedAnime = $finalAnimeList[$openedAnimeOptionIdx];
            if (openedAnime) {
                animeTitle = openedAnime.title;
                animeID = openedAnime.id;
                animeUrl = openedAnime.animeUrl;
                animeIdx = openedAnimeOptionIdx;
            }
            $openedAnimeOptionIdx = null;
        } else {
            isRecentlyOpened = false;
        }
    });

    function handleAnimeOptionVisibility(e) {
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

    function openAnimePopup() {
        if (isRecentlyOpened) return;
        $openedAnimePopupIdx = animeIdx;
        $popupVisible = true;
        $animeOptionVisible = false;
    }

    function openInAnilist() {
        if (isRecentlyOpened) return;
        if (animeUrl) {
            window.open(animeUrl, "_blank");
        }
        $animeOptionVisible = false;
    }

    function copyTitle() {
        if (isRecentlyOpened) return;
        if ($android) {
            try {
                JSBridge.copyToClipBoard(text);
            } catch (e) {}
        } else {
            navigator?.clipboard?.writeText?.(text);
        }
        $animeOptionVisible = false;
    }

    function handleHideShow() {
        if (isRecentlyOpened) return;
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
                $animeOptionVisible = false;
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
                $animeOptionVisible = false;
            }
        }
    }
</script>

{#if $animeOptionVisible}
    <div
        class="anime-options"
        on:click={handleAnimeOptionVisibility}
        on:keydown={handleAnimeOptionVisibility}
        transition:fade={{ duration: 200 }}
    >
        <div class="anime-options-container">
            <span class="anime-title"><h1>{animeTitle}</h1></span>
            <span on:click={openAnimePopup} on:keydown={openAnimePopup}
                ><h2>Open Anime</h2></span
            >
            <span on:click={openInAnilist} on:keydown={openInAnilist}
                ><h2>Open In Anilist</h2></span
            >
            <span on:click={copyTitle} on:keydown={copyTitle}
                ><h2>Copy Title</h2></span
            >
            <span on:click={handleHideShow} on:keydown={handleHideShow}
                ><h2>
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
        background-color: rgba(0, 0, 0, 0.6);
        justify-content: center;
        align-items: center;
        overflow-y: auto;
        overscroll-behavior: contain;
    }

    .anime-options-container {
        display: flex;
        flex-direction: column;
        background-color: #2d2d39;
        width: 300px;
        max-width: 90%;
        border-radius: 20px;
        padding: 10px 15px;
    }

    .anime-title {
        overflow-x: auto;
        overflow-y: hidden;
    }

    .anime-title::-webkit-scrollbar {
        display: none;
    }

    .anime-title h1 {
        white-space: nowrap;
    }

    .anime-options-container span {
        padding: 1em;
        color: #dddce0 !important;
        user-select: none !important;
        text-decoration: none !important;
    }

    .anime-options-container span:not(.anime-title) {
        cursor: pointer;
    }

    .anime-options-container h2 {
        font-weight: 400;
        cursor: pointer;
    }
</style>
