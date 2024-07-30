<script>
    import { fade } from "svelte/transition";
    import { sineOut } from "svelte/easing";
    import { ncsCompare, requestImmediate } from "../../../js/others/helper.js";
    import {
        android,
        animeOptionVisible,
        openedAnimeOptionIdx,
        popupVisible,
        openedAnimePopupIdx,
        hiddenEntries,
        confirmPromise,
        loadedAnimeLists,
        selectedCategory,
    } from "../../../js/globalValues.js";
    import { animeManager } from "../../../js/workerUtils.js";

    let shownTitle;
    let youtubeSearchTitle;
    let animeCopyTitle;
    let animeID;
    let animeUrl;
    let animeType;
    let animeIdx;

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
    animeOptionVisible.subscribe((val) => {
        if (val === true) {
            window.addEventListener("keydown", keyDown);
            isRecentlyOpened = true;
            isRecentlyOpenedTimeout = requestImmediate(() => {
                isRecentlyOpened = false;
            }, 100);
            window.setShouldGoBack?.(false);
        } else {
            window.removeEventListener("keydown", keyDown);
            isRecentlyOpenedTimeout?.();
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
        let element = e.target;
        let classList = element.classList;
        if (
            !(
                classList.contains("closing-x") || element.closest(".closing-x")
            ) &&
            (element.closest(".anime-options-container") ||
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
        if (typeof youtubeSearchTitle !== "string" || youtubeSearchTitle === "" || typeof animeType !== "string" || animeType === "") {
            return;
        }
        window.open(
            `https://www.youtube.com/results?search_query=${encodeURIComponent(
                youtubeSearchTitle + " " + animeType,
            )}`,
            "_blank",
        );
    }

    let copySecondTimout;
    function copyTitle(e) {
        if ((isRecentlyOpened && e.type !== "keydown") || !shownTitle) return;
        clearTimeout(copySecondTimout);
        if (animeCopyTitle && !ncsCompare(animeCopyTitle, shownTitle)) {
            if ($android) {
                try {
                    if (typeof animeCopyTitle==="string") {
                        JSBridge?.copyToClipBoard?.(animeCopyTitle);
                    }
                    if (typeof shownTitle==="string") {
                        JSBridge?.copyToClipBoard?.(shownTitle);
                    }
                } catch {}
            } else {
                navigator?.clipboard?.writeText?.(animeCopyTitle);
                copySecondTimout = setTimeout(() => {
                    navigator?.clipboard?.writeText?.(shownTitle);
                }, 350);
            }
        } else if ($android) {
            try {
                if (typeof shownTitle == "string") {
                    JSBridge?.copyToClipBoard?.(shownTitle);
                }
            } catch {}
        } else {
            navigator?.clipboard?.writeText?.(shownTitle);
        }
        $animeOptionVisible = false;
    }

    async function handleHideShow(e) {
        if (isRecentlyOpened && e.type !== "keydown") return;
        if (!$hiddenEntries) return pleaseWaitAlert();
        let title = shownTitle
            ? `<span style="color:hsl(var(--ac-color));">${shownTitle}</span>`
            : "this entry";
        let isHidden = $hiddenEntries[animeID];
        if (isHidden) {
            if (
                await $confirmPromise(
                    `Do you want to unhide ${title} in your recommendation list?`,
                )
            ) {
                animeManager({
                    selectedCategory: $selectedCategory,
                    removeId: animeID,
                    isHiding: false,
                });
                delete $hiddenEntries?.[animeID];
                $animeOptionVisible = false;
            }
        } else {
            if (
                await $confirmPromise(
                    `Do you want to hide ${title} in your recommendation list?`,
                )
            ) {
                animeManager({
                    selectedCategory: $selectedCategory,
                    removeId: animeID,
                    isHiding: true,
                });
                $hiddenEntries[animeID] = 1;
                $animeOptionVisible = false;
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

    function loadAnimeOption() {
        let openedAnime =
            $loadedAnimeLists?.[$selectedCategory]?.animeList?.[
                $openedAnimeOptionIdx ?? -1
            ];
        if (openedAnime) {
            shownTitle = openedAnime?.shownTitle;
            animeCopyTitle = openedAnime?.copiedTitle;
            let hasMoreThanOne, ytTitles = {}
            youtubeSearchTitle = null
            try {
                for (let key of ["english", "romaji", "native"]) {
                    let title = openedAnime?.title?.[key]?.trim?.(), loweredTitle
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
            animeID = openedAnime.id;
            animeUrl = openedAnime.animeUrl;
            let loweredFormat = openedAnime?.format?.trim()?.toLowerCase?.()
            animeType = loweredFormat === "manga" 
                ? "Manga" 
                : loweredFormat === "one shot"
                ? "One Shot"
                : loweredFormat === "novel"
                ? "Novel"
                : "Anime"
            animeIdx = $openedAnimeOptionIdx;
        } else {
            $animeOptionVisible = false;
        }
    }
    loadedAnimeLists.subscribe(() => {
        if ($animeOptionVisible) {
            loadAnimeOption();
        }
    });

    hiddenEntries.subscribe(() => {
        if ($animeOptionVisible) {
            loadAnimeOption();
        }
    });
</script>

{#if $animeOptionVisible && !$popupVisible && $loadedAnimeLists?.[$selectedCategory]}
    <div
        use:loadAnimeOption
        class="anime-options"
        in:fade="{{ duration: 200, easing: sineOut }}"
        out:fade="{{ duration: 200, easing: sineOut }}"
        on:click="{handleAnimeOptionVisibility}"
        on:touchend|passive="{handleTouchAnimeOptionVisibility}"
        on:keydown="{(e) =>
            e.key === 'Enter' && handleAnimeOptionVisibility(e)}"
    >
        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
        <div
            class="anime-options-container"
        >
            <div class="option-header">
                <span class="anime-title"><h1>{shownTitle}</h1></span>
                <svg
                    viewBox="0 0 24 24"
                    class="closing-x"
                    tabindex="{$popupVisible ? '' : '0'}"
                    on:click="{handleAnimeOptionVisibility}"
                    on:keydown="{(e) =>
                        e.key === 'Enter' && handleAnimeOptionVisibility(e)}"
                    ><path
                        fill="#fff"
                        d="m19 6-1-1-6 6-6-6-1 1 6 6-6 6 1 1 6-6 6 6 1-1-6-6Z"
                    ></path></svg
                >
            </div>
            <span
                tabindex="{$popupVisible ? '' : '0'}"
                class="anime-option"
                on:click="{openAnimePopup}"
                on:keydown="{(e) => e.key === 'Enter' && openAnimePopup(e)}"
                bind:this="{firstActionEl}"
                ><h2 class="option-title">Information</h2></span
            >
            <span
                tabindex="{$popupVisible ? '' : '0'}"
                class="anime-option"
                on:click="{openInAnilist}"
                on:keydown="{(e) => e.key === 'Enter' && openInAnilist(e)}"
                ><h2 class="option-title">Open in Anilist</h2></span
            >
            <span
                tabindex="{$popupVisible ? '' : '0'}"
                class="anime-option"
                on:click="{openInYoutube}"
                on:keydown="{(e) => e.key === 'Enter' && openInYoutube(e)}"
                ><h2 class="option-title">Open in YouTube</h2></span
            >
            {#if animeCopyTitle}
                <span
                    tabindex="{$popupVisible ? '' : '0'}"
                    class="anime-option"
                    on:click="{copyTitle}"
                    on:keydown="{(e) => e.key === 'Enter' && copyTitle(e)}"
                    ><h2 class="option-title">Copy Title</h2></span
                >
            {/if}
            <span
                tabindex="{$popupVisible ? '' : '0'}"
                class="anime-option"
                on:click="{handleHideShow}"
                on:keydown="{(e) => e.key === 'Enter' && handleHideShow(e)}"
                ><h2 class="option-title">
                    {!$hiddenEntries
                        ? "Please Wait..."
                        : ($hiddenEntries[animeID] ? "Show" : "Hide") +
                          " Entry"}
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
        background-color: var(--ol-color);
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

    .anime-options-container {
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

    .anime-title {
        overflow-x: auto;
        overflow-y: hidden;
        margin: 10px 0 10px 10px !important;
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
        padding: 10px;
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
        width: 24px;
        height: 24px;
        cursor: pointer;
    }
</style>
