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
        confirmPromise,
        checkAnimeLoaderStatus,
    } from "../../../js/globalValues";
    import { ncsCompare } from "../../../js/others/helper.js";

    let shownTitle;
    let youtubeSearchTitle;
    let animeCopyTitle;
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
            }, 100);
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
        $animeOptionVisible = false;
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
            `https://www.youtube.com/results?search_query=${encodeURIComponent(
                youtubeSearchTitle + " Anime"
            )}`,
            "_blank"
        );
    }

    function copyTitle(e) {
        if ((isRecentlyOpened && e.type !== "keydown") || !animeCopyTitle)
            return;
        if ($android) {
            try {
                JSBridge.copyToClipBoard(shownTitle);
                JSBridge.copyToClipBoard(animeCopyTitle);
            } catch (ex) {}
        } else {
            if (shownTitle && !ncsCompare(animeCopyTitle, shownTitle)) {
                navigator?.clipboard?.writeText?.(shownTitle);
                setTimeout(() => {
                    navigator?.clipboard?.writeText?.(animeCopyTitle);
                }, 300);
            } else {
                navigator?.clipboard?.writeText?.(animeCopyTitle);
            }
        }
        $animeOptionVisible = false;
    }

    async function handleHideShow(e) {
        if (isRecentlyOpened && e.type !== "keydown") return;
        let title = shownTitle
            ? `<span style="color:#00cbf9;">${shownTitle}</span>`
            : "this anime";
        let isHidden = $hiddenEntries[animeID];
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
                $animeOptionVisible = false;
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
                $animeOptionVisible = false;
            }
        }
    }

    function loadAnimeOption() {
        let openedAnime = $finalAnimeList?.[$openedAnimeOptionIdx ?? -1];
        if (openedAnime) {
            shownTitle = openedAnime?.shownTitle;
            animeCopyTitle = youtubeSearchTitle = openedAnime?.copiedTitle;
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
        <div class="anime-options-container" out:fade={{ duration: 200 }}>
            <div class="option-header">
                <span class="anime-title"><h1>{shownTitle}</h1></span>
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
            {#if animeCopyTitle}
                <span
                    class="anime-option"
                    on:click={copyTitle}
                    on:keydown={(e) => e.key === "Enter" && copyTitle(e)}
                    ><h2 class="option-title">Copy Title</h2></span
                >
            {/if}
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
            height: calc(100% - 48px) !important;
            top: 48px !important;
        }
    }

    .anime-options-container {
        animation: fadeIn 0.2s ease;
        display: flex;
        flex-direction: column;
        background-color: #0b1622 !important;
        color: white !important;
        width: 300px;
        max-width: 95%;
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
