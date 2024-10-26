<script>
    import { sineOut } from "svelte/easing";
    import { fade } from "svelte/transition";
    import { mediaManager } from "../../../js/workerUtils.js";
    import { equalsIgnoreCase } from "../../../js/utils/dataUtils.js";
    import { requestImmediate, showToast } from "../../../js/utils/appUtils.js";
    import {
        android,
        mediaOptionVisible,
        openedMediaOptionIdx,
        popupVisible,
        openedMediaPopupIdx,
        hiddenEntries,
        confirmPromise,
        loadedMediaLists,
        selectedCategory,
        toast,
        initList,
    } from "../../../js/globalValues.js";
    

    let shownTitle;
    let youtubeSearchTitle;
    let mediaCopyTitle;
    let mediaID;
    let mediaUrl;
    let mediaType;
    let mediaIdx;

    let firstActionEl;
    function keyDown(e) {
        if (e.key === "Tab") {
            e.preventDefault();
            e.stopPropagation();
            firstActionEl?.focus?.();
            window.removeEventListener("keydown", keyDown);
        }
    }

    let isRecentlyOpened = true,
        isRecentlyOpenedTimeout;
    mediaOptionVisible.subscribe((val) => {
        if (val === true) {
            window.addEventListener("keydown", keyDown);
            isRecentlyOpened = true;
            isRecentlyOpenedTimeout = requestImmediate(() => {
                isRecentlyOpened = false;
            }, 100);
            window.addHistory?.();
        } else {
            window.removeEventListener("keydown", keyDown);
            isRecentlyOpenedTimeout?.();
            isRecentlyOpened = false;
        }
    });

    function handleTouchMediaOptionVisibility(e) {
        if (isRecentlyOpened) return;
        let target = e.target;
        let classList = target.classList;
        if (
            target.closest(".media-options-container") ||
            classList.contains("media-options-container")
        )
            return;
        $mediaOptionVisible = false;
    }

    function handleMediaOptionVisibility(e) {
        if (isRecentlyOpened && e.type !== "keydown") return;
        let element = e.target;
        let classList = element.classList;
        if (
            !(
                classList.contains("closing-x") || element.closest(".closing-x")
            ) &&
            (element.closest(".media-options-container") ||
                classList.contains("media-options-container"))
        )
            return;
        $mediaOptionVisible = false;
    }

    function openMediaPopup(e) {
        if (isRecentlyOpened && e.type !== "keydown") return;
        $openedMediaPopupIdx = mediaIdx;
        $popupVisible = true;
        $mediaOptionVisible = false;
    }

    function openInAnilist(e) {
        if (isRecentlyOpened && e.type !== "keydown") return;
        if (typeof mediaUrl !== "string" || mediaUrl === "") return;
        window.open(mediaUrl, "_blank");
    }

    async function openInYoutube(e) {
        if (isRecentlyOpened && e.type !== "keydown") return;
        if (typeof youtubeSearchTitle !== "string" || youtubeSearchTitle === "" || typeof mediaType !== "string" || mediaType === "") {
            return;
        }
        window.open(
            `https://www.youtube.com/results?search_query=${encodeURIComponent(
                youtubeSearchTitle + " " + mediaType,
            )}`,
            "_blank",
        );
    }

    function copyTitle(e) {
        if ((isRecentlyOpened && e.type !== "keydown") || !shownTitle) return;
        if (mediaCopyTitle && !equalsIgnoreCase(mediaCopyTitle, shownTitle)) {
            if ($android) {
                try {
                    if (typeof mediaCopyTitle==="string") {
                        JSBridge.copyToClipBoard(mediaCopyTitle);
                    }
                    requestImmediate(() => {
                        if (typeof shownTitle==="string") {
                            JSBridge.copyToClipBoard(shownTitle);
                        }
                    }, 1000);
                } catch (ex) { console.error(ex) }
            } else {
                navigator?.clipboard?.writeText?.(mediaCopyTitle);
                requestImmediate(() => {
                    navigator?.clipboard?.writeText?.(shownTitle);
                }, 1000);
            }
        } else if ($android) {
            try {
                if (typeof shownTitle == "string") {
                    JSBridge.copyToClipBoard(shownTitle);
                }
            } catch (ex) { console.error(ex) }
        } else {
            navigator?.clipboard?.writeText?.(shownTitle);
        }
        $mediaOptionVisible = false;
    }

    async function handleHideShow(e) {
        if (isRecentlyOpened && e.type !== "keydown") return;
        if ($initList !== false || !$hiddenEntries) {
            if ($android) {
                showToast("Please wait a moment")
            } else {
                $toast = "Please wait a moment"
            }
            return
        }
        let title = shownTitle
            ? `<span style="color:hsl(var(--ac-color));">${shownTitle}</span>`
            : "this entry";
        let isHidden = $hiddenEntries[mediaID];
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
                $mediaOptionVisible = false;
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
                $mediaOptionVisible = false;
            }
        }
    }

    function loadMediaOption() {
        let openedMedia =
            $loadedMediaLists?.[$selectedCategory]?.mediaList?.[
                $openedMediaOptionIdx ?? -1
            ];
        if (openedMedia) {
            shownTitle = openedMedia?.shownTitle;
            mediaCopyTitle = openedMedia?.copiedTitle;
            let hasMoreThanOne, ytTitles = {}
            youtubeSearchTitle = null
            try {
                for (let key of ["english", "romaji", "native"]) {
                    let title = openedMedia?.title?.[key]?.trim?.(), loweredTitle
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
            if (hasMoreThanOne && typeof youtubeSearchTitle==="string" && youtubeSearchTitle !== "") {
                youtubeSearchTitle = `(${youtubeSearchTitle})`
            }
            mediaID = openedMedia.id;
            mediaUrl = openedMedia.mediaUrl;
            let format = openedMedia?.format
            mediaType = format === "Manga" || format === "One Shot" || format === "Novel" ? format : "Anime"
            mediaIdx = $openedMediaOptionIdx;
        } else {
            $mediaOptionVisible = false;
        }
    }
    loadedMediaLists.subscribe(() => {
        if ($mediaOptionVisible) {
            loadMediaOption();
        }
    });

    hiddenEntries.subscribe(() => {
        if ($mediaOptionVisible) {
            loadMediaOption();
        }
    });
</script>

{#if $mediaOptionVisible && !$popupVisible && $loadedMediaLists?.[$selectedCategory]}
    <div
        use:loadMediaOption
        class="fixed-media-options"
        in:fade="{{ duration: 200, easing: sineOut }}"
        out:fade="{{ duration: 200, easing: sineOut }}"
        on:click="{handleMediaOptionVisibility}"
        on:touchend|passive="{handleTouchMediaOptionVisibility}"
        on:keydown="{(e) =>
            e.key === "Enter" && handleMediaOptionVisibility(e)}"
    >
        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
        <div
            class="media-options-container"
        >
            <div class="option-header">
                <span class="media-title"><h1>{shownTitle}</h1></span>
                <svg
                    viewBox="0 0 24 24"
                    class="closing-x"
                    tabindex="{$popupVisible ? "" : "0"}"
                    on:click="{handleMediaOptionVisibility}"
                    on:keydown="{(e) =>
                        e.key === "Enter" && handleMediaOptionVisibility(e)}"
                    role="button"
                    aria-label="Close Media Options Popup"
                    ><path
                        fill="#fff"
                        d="m19 6-1-1-6 6-6-6-1 1 6 6-6 6 1 1 6-6 6 6 1-1-6-6Z"
                    ></path></svg
                >
            </div>
            <span
                tabindex="{$popupVisible ? "" : "0"}"
                class="media-option"
                on:click="{openMediaPopup}"
                on:keydown="{(e) => e.key === "Enter" && openMediaPopup(e)}"
                bind:this="{firstActionEl}"
                role="button"
                aria-label="Open Detailed Information for the Media"
                ><h2 class="option-title">Information</h2></span
            >
            <span
                tabindex="{$popupVisible ? "" : "0"}"
                class="media-option"
                on:click="{openInAnilist}"
                on:keydown="{(e) => e.key === "Enter" && openInAnilist(e)}"
                role="button"
                aria-label="Open in AniList"
                ><h2 class="option-title">Open in Anilist</h2></span
            >
            <span
                tabindex="{$popupVisible ? "" : "0"}"
                class="media-option"
                on:click="{openInYoutube}"
                on:keydown="{(e) => e.key === "Enter" && openInYoutube(e)}"
                role="button"
                aria-label="Open Related YouTube Videos"
                ><h2 class="option-title">Open in YouTube</h2></span
            >
            {#if mediaCopyTitle}
                <span
                    tabindex="{$popupVisible ? "" : "0"}"
                    class="media-option"
                    on:click="{copyTitle}"
                    on:keydown="{(e) => e.key === "Enter" && copyTitle(e)}"
                    role="button"
                    aria-label="Copy Title"
                    ><h2 class="option-title">Copy Title</h2></span
                >
            {/if}
            <span
                tabindex="{$popupVisible ? "" : "0"}"
                class="media-option"
                on:click="{handleHideShow}"
                on:keydown="{(e) => e.key === "Enter" && handleHideShow(e)}"
                role="button"
                aria-label="Hide or Show Media"
                ><h2 class="option-title">
                    {!$hiddenEntries
                        ? "Please Wait..."
                        : ($hiddenEntries[mediaID] ? "Show" : "Hide") +
                          " Entry"}
                </h2></span
            >
        </div>
    </div>
{/if}

<style>
    .fixed-media-options {
        position: fixed;
        display: flex;
        z-index: 994;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: var(--ol-color);
        justify-content: center;
        align-items: center;
        overflow-y: auto;
        overscroll-behavior: contain;
        -ms-overflow-style: none;
        scrollbar-width: none;
    }

    .fixed-media-options::-webkit-scrollbar {
        display: none;
    }

    .media-options-container {
        display: flex;
        flex-direction: column;
        background-color: var(--bg-color) !important;
        color: var(--fg-color) !important;
        border: 1px solid var(--bd-color);
        width: 300px;
        max-height: 95%;
        max-width: 95%;
        border-radius: 6px;
        padding: 10px 15px;
        overflow: auto;
    }

    .option-header {
        display: grid;
        grid-template-columns: auto 25px;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
    }

    .media-title {
        overflow-x: auto;
        overflow-y: hidden;
        margin: 10px 0 10px 10px !important;
        padding: 0 !important;
        -ms-overflow-style: none;
        scrollbar-width: none;
    }

    .media-title::-webkit-scrollbar {
        display: none;
    }

    h1 {
        white-space: nowrap;
    }

    span {
        padding: 10px;
        user-select: none !important;
        text-decoration: none !important;
    }

    .media-option {
        cursor: pointer;
    }

    .option-title {
        font-weight: 400;
        cursor: pointer;
    }

    .closing-x {
        width: 24px;
        height: 24px;
        cursor: pointer;
    }
</style>
