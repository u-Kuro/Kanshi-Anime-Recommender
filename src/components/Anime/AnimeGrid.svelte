<script>
    import { onMount } from "svelte";
    import { fade } from "svelte/transition";
    import { sineOut } from "svelte/easing";
    import { cacheImage } from "../../js/caching.js";
    import {
        addClass,
        isJsonObject,
        removeClass,
        getLocalStorage,
    } from "../../js/others/helper.js";
    import {
        android,
        popupVisible,
        openedAnimePopupIdx,
        animeOptionVisible,
        openedAnimeOptionIdx,
        initData,
        gridFullView,
        earlisetReleaseDate,
        showFilterOptions,
        mobile,
        menuVisible,
        loadedAnimeLists,
        loadNewAnime,
        searchedWord,
        selectedCategory,
        selectedAnimeGridEl,
        shownAllInList,
        runIsScrolling,
        showLoadingAnime,
        categories,
    } from "../../js/globalValues.js";
    import { animeLoader } from "../../js/workerUtils.js";

    export let mainCategory;
    let mainEl;

    const emptyImage =
        "data:image/png;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
    let windowHeight = Math.max(
        window.visualViewport.height,
        window.innerHeight,
    );
    let originalWindowHeight = screen?.height
        ? Math.min(screen.height, windowHeight)
        : windowHeight;
    let windowWidth = Math.max(
        document?.documentElement?.getBoundingClientRect?.()?.width,
        window.visualViewport.width,
        window.innerWidth,
    );

    let animeGridEl;
    let numberOfPageLoadedGrid = Math.max(
        5,
        ((windowHeight - 239) / 250.525) * 5,
    );

    let shownAnimeListCount;
    $: shownAnimeListCount =
        $loadedAnimeLists?.[mainCategory]?.animeList?.length ?? 0;
    let animeObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    animeLoader({
                        loadMore: true,
                        selectedCategory: mainCategory,
                        searchedWord: $searchedWord,
                    });
                }
            });
        },
        {
            root: null,
            rootMargin: "100%",
            threshold: [0, 1],
        },
    );

    $loadNewAnime[mainCategory] = async function newAnime({
        idx,
        anime,
        isLast,
    }) {
        if (typeof anime?.id === "number") {
            $shownAllInList[mainCategory] = isLast;
            let animeList = $loadedAnimeLists[mainCategory]?.animeList;
            if (animeList instanceof Array) {
                let newAnimeList = animeList;
                if (isLast && typeof idx === "number") {
                    newAnimeList = newAnimeList.slice(0, idx + 1);
                }
                if (
                    typeof idx === "number" &&
                    animeList?.[idx] &&
                    Math.abs(animeList[idx]?.id) === anime.id
                ) {
                    newAnimeList[idx] = anime;
                    $loadedAnimeLists[mainCategory].animeList = newAnimeList;
                } else {
                    if (idx < animeList.length) {
                        newAnimeList[idx] = anime;
                    } else {
                        newAnimeList.push(anime);
                    }
                    $loadedAnimeLists[mainCategory].animeList = newAnimeList;
                }
            } else {
                if ($loadedAnimeLists[mainCategory]) {
                    $loadedAnimeLists[mainCategory].animeList = [anime];
                }
            }
            if (idx < shownAnimeListCount - 1 || shouldLoadMoreAnime()) {
                animeLoader({
                    loadMore: true,
                    selectedCategory: mainCategory,
                    searchedWord: $searchedWord,
                });
            }
        } else if (isLast) {
            if ($loadedAnimeLists[mainCategory]) {
                $loadedAnimeLists[mainCategory].animeList = [];
            }
        }
    };

    let observedGrid;
    $: {
        if (observedGrid instanceof Element) {
            animeObserver.observe(observedGrid);
        }
    }

    searchedWord.subscribe((val) => {
        if ($categories==null) return
        animeLoader({
            loadMore: true,
            selectedCategory: mainCategory,
            searchedWord: val,
        });
    });

    function shouldLoadMoreAnime() {
        let rect = observedGrid?.getBoundingClientRect?.();
        if (isFullViewed) {
            return rect?.left < windowWidth;
        } else {
            return rect?.top < windowHeight;
        }
    }

    function handleOpenPopup(animeIdx) {
        $openedAnimePopupIdx = animeIdx;
        $popupVisible = true;
    }

    let openOptionTimeout;
    window.oncontextmenu = () => {
        if (window[".isOpeningAnimeOption"]) {
            window[".isOpeningAnimeOption"] = false;
            return false;
        }
    };
    function handleOpenOption(event, animeIdx) {
        try {
            window[".isOpeningAnimeOption"] = true;
        } catch (e) {}
        let element = event.target;
        let classList = element.classList;
        if (classList.contains("copy") || element.closest(".copy")) return;
        if (openOptionTimeout) clearTimeout(openOptionTimeout);
        openOptionTimeout = setTimeout(() => {
            $openedAnimeOptionIdx = animeIdx;
            $animeOptionVisible = true;
        }, 500);
    }
    function cancelOpenOption() {
        if (openOptionTimeout) clearTimeout(openOptionTimeout);
        window[".isOpeningAnimeOption"] = false;
    }

    function getFinishedEpisode(episodes, nextAiringEpisode) {
        let timeDifMS;
        let nextEpisode;
        if (
            typeof nextAiringEpisode?.episode === "number" &&
            typeof nextAiringEpisode?.airingAt === "number"
        ) {
            let nextAiringDate = new Date(nextAiringEpisode?.airingAt * 1000);
            nextEpisode = nextAiringEpisode?.episode;
            if (nextAiringDate instanceof Date && !isNaN(nextAiringDate)) {
                timeDifMS = nextAiringDate.getTime() - new Date().getTime();
            }
        }
        if (timeDifMS > 0 && episodes >= 1 && episodes >= nextEpisode) {
            return `(${Math.max(nextEpisode - 1, 0)}/${episodes})`;
        } else if (
            timeDifMS <= 0 &&
            typeof nextEpisode === "number" &&
            episodes > nextEpisode
        ) {
            return `(${nextEpisode}/${episodes})`;
        } else if (typeof episodes === "number") {
            return `(${episodes})`;
        } else if (typeof nextEpisode === "number") {
            if (timeDifMS > 0 && nextEpisode > 1) {
                return `(${nextEpisode - 1}")`;
            } else if (timeDifMS <= 0) {
                return `(${nextEpisode}")`;
            }
        }
        return "";
    }
    function horizontalWheel(event, parentClass) {
        let element = event.target;
        let classList = element.classList;
        if (!classList.contains(parentClass)) {
            element = element.closest("." + parentClass);
        }
        if (element.scrollWidth <= element.clientWidth) return;
        if (event.deltaY !== 0 && event.deltaX === 0) {
            event.preventDefault();
            event.stopPropagation();
            element.scrollLeft = Math.max(0, element.scrollLeft + event.deltaY);
        }
    }

    let isFullViewed;
    let lastLeftScroll, currentLeftScroll;
    let afterFullGrid;
    let isWholeGridSeen,
        isOnVeryLeftOfAnimeGrid = true;
    let isOnVeryLeftOfAnimeGridTimeout;
    $: {
        isFullViewed =
            $gridFullView ?? getLocalStorage("gridFullView") ?? false;

        isWholeGridSeen =
            isFullViewed &&
            Math.abs(
                document.documentElement.scrollHeight -
                    document.documentElement.scrollTop -
                    document.documentElement.clientHeight,
            ) <= 3;

        clearTimeout(isOnVeryLeftOfAnimeGridTimeout);
        if (isFullViewed && animeGridEl?.scrollLeft < 1) {
            isOnVeryLeftOfAnimeGridTimeout = setTimeout(() => {
                isOnVeryLeftOfAnimeGrid =
                    isFullViewed && animeGridEl?.scrollLeft < 1;
            }, 1000);
        } else {
            isOnVeryLeftOfAnimeGrid = false;
        }
    }
    let shouldShowGoBackInFullView;
    $: shouldShowGoBackInFullView =
        isFullViewed &&
        afterFullGrid &&
        (currentLeftScroll < lastLeftScroll || windowWidth > 596.5);

    window.addEventListener("scroll", () => {
        isWholeGridSeen =
            isFullViewed &&
            Math.abs(
                document.documentElement.scrollHeight -
                    document.documentElement.scrollTop -
                    document.documentElement.clientHeight,
            ) <= 3;
    });

    let filterOptiChangeTimeout;
    showFilterOptions.subscribe(() => {
        clearTimeout(filterOptiChangeTimeout);
        filterOptiChangeTimeout = setTimeout(() => {
            isWholeGridSeen =
                isFullViewed &&
                Math.abs(
                    document.documentElement.scrollHeight -
                        document.documentElement.scrollTop -
                        document.documentElement.clientHeight,
                ) <= 3;
        }, 17);
    });

    function goBackGrid() {
        if (isFullViewed) {
            animeGridEl.style.overflow = "hidden";
            animeGridEl.style.overflow = "";
            animeGridEl.scroll({ left: 0, behavior: "smooth" });
        } else {
            if ($android || !matchMedia("(hover:hover)").matches) {
                document.documentElement.style.overflow = "hidden";
                document.documentElement.style.overflow = "";
            }
            window.scrollTo({ top: -9999, behavior: "smooth" });
        }
    }

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

    onMount(() => {
        selectedCategory.subscribe((val) => {
            if (val === mainCategory && val) {
                $selectedAnimeGridEl = animeGridEl;
            }
        });
        let newWindowHeight = Math.max(
            window.visualViewport.height,
            window.innerHeight,
        );
        if (newWindowHeight > windowHeight) {
            originalWindowHeight = screen?.height
                ? Math.min(screen.height, newWindowHeight)
                : newWindowHeight;
        }
        windowHeight = newWindowHeight;
        windowWidth = Math.max(
            document?.documentElement?.getBoundingClientRect?.()?.width,
            window.visualViewport.width,
            window.innerWidth,
        );
        window.addEventListener("resize", () => {
            let newWindowHeight = Math.max(
                window.visualViewport.height,
                window.innerHeight,
            );
            if (newWindowHeight > windowHeight) {
                originalWindowHeight = screen?.height
                    ? Math.min(screen.height, newWindowHeight)
                    : newWindowHeight;
            }
            windowHeight = newWindowHeight;
            windowWidth = Math.max(
                document?.documentElement?.getBoundingClientRect?.()?.width,
                window.visualViewport.width,
                window.innerWidth,
            );
        });
        let waitForOnVeryLeft;
        animeGridEl.addEventListener("scroll", () => {
            window?.animeGridScrolled?.(animeGridEl.scrollLeft);
            if (!waitForOnVeryLeft) {
                clearTimeout(isOnVeryLeftOfAnimeGridTimeout);
            }
            if (isFullViewed && animeGridEl?.scrollLeft < 1) {
                if (!waitForOnVeryLeft) {
                    waitForOnVeryLeft = true;
                    isOnVeryLeftOfAnimeGridTimeout = setTimeout(() => {
                        isOnVeryLeftOfAnimeGrid =
                            isFullViewed && animeGridEl?.scrollLeft < 1;
                        waitForOnVeryLeft = false;
                    }, 8);
                }
            } else {
                clearTimeout(isOnVeryLeftOfAnimeGridTimeout);
                waitForOnVeryLeft = false;
                isOnVeryLeftOfAnimeGrid = false;
            }
        });
        animeGridEl?.addEventListener("scroll", () => {
            if (!$gridFullView) return;
            runIsScrolling.update((e) => !e);
        });
    });
</script>

<main
    bind:this="{mainEl}"
    data-category="{mainCategory}"
    class="{(mainCategory === $selectedCategory || mainCategory === ''
        ? 'viewed'
        : '') + (isFullViewed ? ' fullView' : '')}"
    style:--anime-grid-height="{($mobile && !$android
        ? originalWindowHeight
        : windowHeight) + "px"}"
>
    {#if true}
        {@const animeList = $loadedAnimeLists?.[mainCategory]?.animeList}
        <div
            class="{'image-grid ' +
                (isFullViewed ? ' fullView' : '') +
                (animeList?.length === 0 && !$initData ? ' empty-grid' : '')}"
            data-category="{mainCategory}"
            bind:this="{animeGridEl}"
            on:wheel="{(e) => {
                if (
                    isFullViewed &&
                    animeGridEl.scrollWidth > animeGridEl.clientWidth &&
                    Math.abs(e?.deltaY) > Math.abs(e?.deltaX)
                ) {
                    // If its not scrolled at the very bottom of the screen and see next
                    if (!isWholeGridSeen && e?.deltaY > 0) return;
                    // If its scrolled to very left and see previous
                    if (isOnVeryLeftOfAnimeGrid && e?.deltaY < 0) return;
                    horizontalWheel(e, 'image-grid');
                }
            }}"
            on:scroll="{(e) => {
                let element = e?.target;
                lastLeftScroll = currentLeftScroll;
                currentLeftScroll = element?.scrollLeft;
                if (currentLeftScroll > 500) {
                    afterFullGrid = true;
                } else {
                    afterFullGrid = false;
                }
            }}"
        >
            {#if animeList?.length > 0}
                {#each animeList as anime, animeIndex ((anime?.id ? anime.id + " " + animeIndex : {}) ?? {})}
                    {@const loweredFormat = anime.format?.toLowerCase?.()}
                    {@const isManga =
                        loweredFormat === "manga" ||
                        loweredFormat === "one shot"}
                    {@const isNovel = loweredFormat === "novel"}
                    <div
                        class="{'image-card' +
                            ($showLoadingAnime === mainCategory ||
                            $showLoadingAnime === true ||
                            anime?.isLoading
                                ? ' semi-loading'
                                : '')}"
                        bind:this="{anime.gridElement}"
                        title="{anime?.briefInfo || ''}"
                    >
                        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                        <div
                            class="shimmer"
                            tabindex="{$menuVisible || $popupVisible
                                ? ''
                                : '0'}"
                            on:click="{handleOpenPopup(animeIndex)}"
                            on:pointerdown="{(e) =>
                                handleOpenOption(e, animeIndex)}"
                            on:pointerup="{cancelOpenOption}"
                            on:pointercancel="{cancelOpenOption}"
                            on:keyup="{(e) =>
                                e.key === 'Enter' &&
                                handleOpenPopup(animeIndex)}"
                        >
                            {#if anime?.coverImageUrl || anime?.bannerImageUrl || anime?.trailerThumbnailUrl}
                                {#key anime?.coverImageUrl || anime?.bannerImageUrl || anime?.trailerThumbnailUrl}
                                    <img
                                        use:addImage="{anime?.coverImageUrl ||
                                            anime?.bannerImageUrl ||
                                            anime?.trailerThumbnailUrl ||
                                            emptyImage}"
                                        fetchpriority="{animeIndex >
                                        numberOfPageLoadedGrid
                                            ? ''
                                            : 'high'}"
                                        loading="{animeIndex >
                                        numberOfPageLoadedGrid
                                            ? 'lazy'
                                            : 'eager'}"
                                        class="{'image-card-thumb  fade-out'}"
                                        alt="{(anime?.shownTitle || '') +
                                            ' Cover'}"
                                        width="180px"
                                        height="254.531px"
                                        on:load="{(e) => {
                                            removeClass(e.target, 'fade-out');
                                            addClass(
                                                e.target?.closest?.('.shimmer'),
                                                'loaded',
                                            );
                                        }}"
                                        on:error="{(e) => {
                                            addClass(e.target, 'fade-out');
                                            addClass(e.target, 'display-none');
                                        }}"
                                    />
                                {/key}
                            {/if}
                            <span class="image-card-title">
                                <span
                                    class="title copy"
                                    data-copy="{anime?.shownTitle || ''}"
                                    data-secondcopy="{anime?.copiedTitle || ''}"
                                    >{anime?.shownTitle || "N/A"}</span
                                >
                                <span
                                    class="brief-info-wrapper copy"
                                    data-copy="{anime?.shownTitle || ''}"
                                    data-secondcopy="{anime?.copiedTitle || ''}"
                                >
                                    <div class="brief-info">
                                        <span>
                                            <!-- circle -->
                                            <svg
                                                viewBox="0 0 512 512"
                                                class="{`${anime?.userStatusColor}-fill circle`}"
                                                ><path
                                                    d="M256 512a256 256 0 1 0 0-512 256 256 0 1 0 0 512z"
                                                ></path></svg
                                            >
                                            {#if !isManga && !isNovel && isJsonObject(anime?.nextAiringEpisode)}
                                                {@const finishedEpisodes =
                                                    getFinishedEpisode(
                                                        anime.episodes,
                                                        anime.nextAiringEpisode,
                                                    )}
                                                {`${anime.format || "N/A"}`}
                                                {#if finishedEpisodes}
                                                    {#key $earlisetReleaseDate || 1}
                                                        {finishedEpisodes}
                                                    {/key}
                                                {:else}
                                                    {`${
                                                        anime.episodes
                                                            ? "(" +
                                                              anime.episodes +
                                                              ")"
                                                            : ""
                                                    }`}
                                                {/if}
                                            {:else}
                                                {`${anime.format || "N/A"}`}
                                                {#if isManga}
                                                    {`${
                                                        anime.chapters > 0
                                                            ? "(" +
                                                              anime.chapters +
                                                              " Ch)"
                                                            : anime.episodeProgress >
                                                                0
                                                              ? "(" +
                                                                anime.episodeProgress +
                                                                ' Ch")'
                                                              : anime.volumes >
                                                                  0
                                                                ? "(" +
                                                                  anime.volumes +
                                                                  " Vol)"
                                                                : anime.volumeProgress >
                                                                    0
                                                                  ? "(" +
                                                                    anime.volumeProgress +
                                                                    ' Vol")'
                                                                  : ""
                                                    }`}
                                                {:else if isNovel}
                                                    {`${
                                                        anime.volumes > 0
                                                            ? "(" +
                                                              anime.volumes +
                                                              " Vol)"
                                                            : anime.volumeProgress >
                                                                0
                                                              ? "(" +
                                                                anime.volumeProgress +
                                                                ' Vol")'
                                                              : anime.chapters >
                                                                  0
                                                                ? "(" +
                                                                  anime.chapters +
                                                                  " Ch)"
                                                                : anime.episodeProgress >
                                                                    0
                                                                  ? "(" +
                                                                    anime.episodeProgress +
                                                                    ' Ch")'
                                                                  : ""
                                                    }`}
                                                {:else}
                                                    {`${
                                                        anime.episodes > 0
                                                            ? "(" +
                                                              anime.episodes +
                                                              ")"
                                                            : anime.episodeProgress >
                                                                0
                                                              ? "(" +
                                                                anime.episodeProgress +
                                                                '")'
                                                              : ""
                                                    }`}
                                                {/if}
                                            {/if}
                                        </span>
                                    </div>
                                    <div class="brief-info">
                                        <span>
                                            {#if anime?.shownScore != null}
                                                <!-- star -->
                                                <svg
                                                    viewBox="0 0 576 512"
                                                    class="{`${anime?.contentCautionColor}-fill score`}"
                                                    ><path
                                                        d="M317 18a32 32 0 0 0-58 0l-64 132-144 22a32 32 0 0 0-17 54l104 103-25 146a32 32 0 0 0 47 33l128-68 129 68a32 32 0 0 0 46-33l-24-146 104-103a32 32 0 0 0-18-54l-144-22-64-132z"
                                                    ></path></svg
                                                >
                                                {anime?.shownScore ?? "N/A"}
                                            {:else if anime?.shownCount != null}
                                                <!-- people -->
                                                <svg
                                                    viewBox="0 0 640 512"
                                                    class="{`${anime?.contentCautionColor}-fill score`}"
                                                >
                                                    <path
                                                        d="M96 128a128 128 0 1 1 256 0 128 128 0 1 1-256 0zM0 482c0-98 80-178 178-178h92c98 0 178 80 178 178 0 17-13 30-30 30H30c-17 0-30-13-30-30zm609 30H471c6-9 9-20 9-32v-8c0-61-27-115-70-152h69c89 0 161 72 161 161 0 17-14 31-31 31zM432 256c-31 0-59-13-79-33a159 159 0 0 0 13-169 112 112 0 1 1 66 202z"
                                                    ></path></svg
                                                >
                                                {anime?.shownCount ?? "N/A"}
                                            {:else if anime?.shownFavorites != null}
                                                <svg
                                                    viewBox="0 0 512 512"
                                                    class="{`${anime?.contentCautionColor}-fill score`}"
                                                >
                                                    <path
                                                        d="m48 300 180 169a41 41 0 0 0 56 0l180-169c31-28 48-68 48-109v-6A143 143 0 0 0 268 84l-12 12-12-12A143 143 0 0 0 0 185v6c0 41 17 81 48 109z"
                                                    ></path></svg
                                                >
                                                {anime?.shownFavorites ?? "N/A"}
                                            {:else if anime?.shownActivity != null}
                                                <svg
                                                    viewBox="0 0 512 512"
                                                    class="{`${anime?.contentCautionColor}-fill score`}"
                                                >
                                                    <path
                                                        d="M64 64a32 32 0 1 0-64 0v336c0 44 36 80 80 80h400a32 32 0 1 0 0-64H80c-9 0-16-7-16-16V64zm407 87a32 32 0 0 0-46-46L320 211l-57-58a32 32 0 0 0-46 0L105 265a32 32 0 0 0 46 46l89-90 57 58c13 12 33 12 46 0l128-128z"
                                                    ></path></svg
                                                >
                                                {anime?.shownActivity ?? "N/A"}
                                            {/if}
                                        </span>
                                    </div>
                                </span>
                            </span>
                        </div>
                        {#if animeIndex + 1 === animeList.length}
                            <div
                                class="observed-grid"
                                bind:this="{observedGrid}"
                            ></div>
                        {/if}
                    </div>
                {/each}
                {#each Array($shownAllInList?.[mainCategory] ? 0 : 1) as _}
                    <div class="image-card skeleton dummy">
                        <div class="shimmer"></div>
                    </div>
                {/each}
                {#each Array(isFullViewed ? Math.floor((windowHeight ?? 1100) / 220) : 5) as _}
                    <div class="image-card dummy"></div>
                {/each}
            {:else if animeList?.length === 0}
                <div class="empty">No Results</div>
                {#if !$shownAllInList?.[mainCategory]}
                    <div class="image-card">
                        <div
                            class="observed-grid empty-card"
                            bind:this="{observedGrid}"
                        ></div>
                    </div>
                {/if}
            {:else}
                {#each Array(21) as _}
                    <div class="image-card skeleton">
                        <div class="shimmer"></div>
                    </div>
                {/each}
                {#each Array(5) as _}
                    <div class="image-card"></div>
                {/each}
            {/if}
        </div>
        {#if !$android && shouldShowGoBackInFullView && $loadedAnimeLists?.[mainCategory]?.animeList?.length}
            <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
            <div
                class="{'go-back-grid' +
                    (shouldShowGoBackInFullView ? ' fullView' : '')}"
                tabindex="{$menuVisible || $popupVisible ? '' : '0'}"
                on:click="{goBackGrid}"
                on:keyup="{(e) => e.key === 'Enter' && goBackGrid(e)}"
                out:fade="{{ duration: 200, easing: sineOut }}"
            >
                <svg
                    viewBox="{`0 0 ${
                        shouldShowGoBackInFullView ? '320' : '448'
                    } 512`}"
                >
                    <path
                        d="{// angle left
                        shouldShowGoBackInFullView
                            ? 'M41 233a32 32 0 0 0 0 46l160 160a32 32 0 0 0 46-46L109 256l138-137a32 32 0 0 0-46-46L41 233z'
                            : // angle up
                              'M201 137c13-12 33-12 46 0l160 160a32 32 0 0 1-46 46L224 205 87 343a32 32 0 0 1-46-46l160-160z'}"
                    ></path>
                </svg>
            </div>
        {/if}
    {/if}
</main>

<style>
    :global(.anime-list-pager.pager-is-changing > main) {
        height: min(
            calc(var(--grid-max-height) + 65px),
            calc(100vh + max(20px, calc(var(--grid-position) + 20px)))
        ) !important;
    }
    main {
        width: 100%;
        min-width: 100%;
        min-height: 100vh;
        padding: 20px 0px 0px 0px;
        margin-bottom: 65px;
        position: relative;
        overflow: hidden;
        scroll-snap-align: center;
        scroll-snap-stop: always !important;
        overflow-anchor: visible;
        -ms-overflow-style: none;
        scrollbar-width: none;
        height: min(
            var(--grid-max-height),
            calc(100vh + max(20px, calc(var(--grid-position) + 20px)))
        );
    }

    :global(.anime-list-pager.is-changing-top-position > main) {
        visibility: hidden;
    }

    main::-webkit-scrollbar {
        display: none;
    }

    main.viewed {
        height: unset !important;
        overflow-x: hidden !important;
        overflow-y: auto !important;
        visibility: unset !important;
    }

    :global(.anime-list-pager.remove-snap-scroll main) {
        height: unset !important;
    }

    main.fullView {
        padding: 12px 0;
        margin-bottom: 65px;
        height: max(calc(var(--anime-grid-height) - 230px), 248px) !important;
        min-height: unset !important;
        overflow: hidden !important;
        visibility: unset !important;
    }

    .skeleton {
        border-radius: 6px !important;
        background-color: hsla(0, 0%, 10%, 0.5) !important;
    }

    .image-card.semi-loading {
        animation: semiLoadingBlink 1.5s ease-in-out infinite;
    }

    .image-card.skeleton {
        background-color: transparent !important;
    }

    .title.skeleton {
        height: 10px;
        width: 75%;
        margin-bottom: clamp(1px, 3px, 5px);
    }

    .brief-info.skeleton {
        height: 10px;
        width: 50%;
        margin-bottom: clamp(1px, 3px, 5px);
    }

    .title {
        margin-bottom: clamp(1px, 3px, 5px);
        overflow-x: auto;
        overflow-y: hidden;
        white-space: nowrap;
        display: block;
        -ms-overflow-style: none;
        scrollbar-width: none;
        cursor: text;
    }

    .title::-webkit-scrollbar {
        display: none;
    }

    .image-card.skeleton .brief-info .image-card.skeleton .brief-info-wrapper {
        height: 10px;
        width: 50%;
    }

    .image-grid {
        display: grid;
        justify-content: space-between;
        align-items: flex-start;
        grid-gap: 10px;
        grid-template-columns: repeat(
            auto-fill,
            minmax(min(100% / 2 - 10px, 170px), 170px)
        );
        overflow-anchor: visible;
        -ms-overflow-style: none;
        scrollbar-width: none;
        position: absolute;
        width: 100%;
        top: 0;
        transform: translateY(max(20px, calc(var(--grid-position) + 20px)))
            translateZ(0);
        padding-bottom: calc(101vh + 65px);
    }

    main.viewed .image-grid {
        position: unset !important;
        padding-bottom: unset !important;
        transform: unset !important;
    }

    :global(.anime-list-pager.remove-snap-scroll .image-grid) {
        position: unset !important;
    }

    @media screen and (max-width: 390px) {
        .image-grid {
            grid-template-columns: repeat(auto-fill, calc(100% / 2 - 10px));
        }
    }

    @media screen and (max-width: 250px) {
        .image-grid {
            grid-template-columns: repeat(
                auto-fill,
                minmax(min(100%, 180px), 180px)
            );
        }
    }

    .image-grid.fullView {
        display: flex;
        flex-wrap: wrap;
        flex-direction: column;
        justify-content: space-evenly;
        align-content: flex-start;
        height: max(calc(var(--anime-grid-height) - 250px), 236px) !important;
        overflow-y: hidden !important;
        overflow-x: auto !important;
        top: unset !important;
        transform: unset !important;
    }

    .image-grid.fullView.empty-grid {
        height: unset !important;
        justify-content: start;
        align-content: center;
    }

    .image-grid::-webkit-scrollbar {
        display: none;
    }

    .image-card {
        animation: fadeIn 0.2s ease-out;
        width: 100%;
        height: var(--popup-content-height);
        display: grid;
        grid-template-rows: auto;
        grid-template-columns: 100%;
    }
    .image-card.fullView:empty {
        height: 0px !important;
    }
    .image-card:not(.fullView):empty {
        width: 0px !important;
    }
    :global(.image-card.hidden > .shimmer),
    :global(.image-card.hidden > .image-card-title) {
        display: none;
    }

    .image-grid.fullView .image-card {
        width: 150px;
        height: 210px;
    }
    .image-card > .shimmer {
        position: relative;
        padding-bottom: min(calc(181 / 128 * 100%), 209px);
        background-color: hsla(0, 0%, 10%, 0.5);
        border-radius: 6px;
    }
    @media screen and (min-width: 580px) {
        .image-card > .shimmer {
            padding-bottom: calc(181 / 128 * 100%);
        }
    }

    .image-grid.fullView .image-card > .shimmer {
        padding-bottom: unset !important;
    }

    .image-card-thumb {
        position: absolute;
        background: hsla(0, 0%, 10%, 0.5);
        border-radius: 6px;
        display: block;
        cursor: pointer;
        box-shadow:
            0 1px 3px rgba(0, 0, 0, 0.15),
            0 1px 2px rgba(0, 0, 0, 0.25);
        transition: opacity 0.2s ease-out;
        object-fit: cover;
        -o-object-fit: cover;
        width: 100%;
        height: 100%;
        transform: translateZ(0);
        -webkit-transform: translateZ(0);
        -ms-transform: translateZ(0);
        -moz-transform: translateZ(0);
        -o-transform: translateZ(0);
        user-select: none;
    }

    .image-card:not(.skeleton):focus-within .image-card-thumb,
    .image-card:not(.skeleton):focus .image-card-thumb,
    .image-card:not(.skeleton):hover .image-card-thumb {
        opacity: 0.5 !important;
        box-shadow:
            0 14px 28px rgba(0, 0, 0, 0.25),
            0 10px 10px rgba(0, 0, 0, 0.22);
    }

    .image-card-thumb.fade-out {
        opacity: 0;
    }

    .image-card-title {
        padding: 50% 4px 4px;
        font-size: clamp(12px, 12px, 14px);
        position: absolute;
        bottom: 0;
        background: linear-gradient(
            to top,
            rgba(0, 0, 0, 0.75),
            rgba(0, 0, 0, 0)
        );
        color: var(--fg-color);
        width: 100%;
        max-height: 100%;
        overflow-y: auto;
        overflow-x: hidden;
        -ms-overflow-style: none;
        scrollbar-width: none;
        cursor: pointer;
    }
    .image-card-title::-webkit-scrollbar {
        display: none;
    }

    .brief-info,
    .brief-info-wrapper {
        display: flex;
        gap: 2px;
        flex-wrap: wrap;
        align-items: center;
        white-space: nowrap;
        user-select: none;
    }
    .brief-info-wrapper {
        column-gap: 4px;
    }

    .brief-info::-webkit-scrollbar {
        display: none;
    }
    .brief-info {
        overflow-x: auto;
        overflow-y: hidden;
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
    .brief-info > span {
        display: flex;
        flex-wrap: nowrap;
        align-items: center;
        gap: 3px;
    }
    .brief-info .circle {
        height: 9px;
        width: 9px;
    }
    .brief-info .score {
        height: 12px;
        width: 12px;
    }

    .go-back-grid {
        position: fixed !important;
        top: unset !important;
        bottom: 48px !important;
        right: 30px !important;
        transform: translateZ(0) !important;
        -webkit-transform: translateZ(0) !important;
        -ms-transform: translateZ(0) !important;
        -moz-transform: translateZ(0) !important;
        -o-transform: translateZ(0) !important;
        animation: fadeIn 0.2s ease-out;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 6px;
        background-color: var(--ol-color);
        border: 1px solid var(--bd-color);
        cursor: pointer;
        border-radius: 50%;
        width: 60px;
        height: 60px;
        box-shadow:
            0 14px 28px rgba(0, 0, 0, 0.25),
            0 10px 10px rgba(0, 0, 0, 0.22);
    }

    .go-back-grid.fullView {
        position: absolute !important;
        right: unset !important;
        bottom: unset !important;
        top: 50% !important;
        left: 8px !important;
        transform: translateY(-100%) translateZ(0) !important;
        -webkit-transform: translateY(-100%) translateZ(0) !important;
        -ms-transform: translateY(-100%) translateZ(0) !important;
        -moz-transform: translateY(-100%) translateZ(0) !important;
        -o-transform: translateY(-100%) translateZ(0) !important;
        width: 44px !important;
        height: 44px !important;
    }

    @media screen and (max-width: 750px) {
        .image-grid {
            padding-inline: 10px;
        }
    }

    @media screen and (max-width: 425px) {
        .go-back-grid.fullView {
            left: 0;
        }
    }

    .go-back-grid.fullView svg {
        width: 20px !important;
        height: 20px !important;
    }
    .go-back-grid svg {
        width: 30px;
        height: 30px;
    }

    .empty {
        width: 100%;
        font-size: 20px;
        font-weight: 700;
        opacity: 1;
        padding: 15vh 30px;
        text-align: center;
        grid-column: 1 / -1;
        margin: 0 auto;
    }

    .shimmer {
        position: relative;
        overflow: hidden;
    }

    .shimmer.loaded::before {
        content: unset !important;
    }

    .shimmer::before {
        animation: loadingShimmer 2s linear infinite;
        position: absolute;
        background: linear-gradient(
            90deg,
            hsla(0, 0%, 10%, 0) 0,
            hsla(0, 0%, 100%, 0.06) 40%,
            hsla(0, 0%, 100%, 0.06) 60%,
            hsla(0, 0%, 10%, 0)
        );
        content: "";
        display: block;
        height: 100%;
        transform: translateX(0) translateZ(0);
        -webkit-transform: translateX(0) translateZ(0);
        -ms-transform: translateX(0) translateZ(0);
        -moz-transform: translateX(0) translateZ(0);
        -o-transform: translateX(0) translateZ(0);
        width: 200%;
    }
    @keyframes loadingShimmer {
        0% {
            transform: translateX(-100%) translateZ(0);
            -webkit-transform: translateX(-100%) translateZ(0);
            -ms-transform: translateX(-100%) translateZ(0);
            -moz-transform: translateX(-100%) translateZ(0);
            -o-transform: translateX(-100%) translateZ(0);
        }
        100% {
            transform: translateX(100%) translateZ(0);
            -webkit-transform: translateX(100%) translateZ(0);
            -ms-transform: translateX(100%) translateZ(0);
            -moz-transform: translateX(100%) translateZ(0);
            -o-transform: translateX(100%) translateZ(0);
        }
    }

    @keyframes semiLoadingBlink {
        0% {
            opacity: 1;
        }
        50% {
            opacity: 0.8;
        }
        100% {
            opacity: 1;
        }
    }

    @media screen and (max-width: 660px) {
        .image-grid {
            justify-content: space-evenly;
        }
    }

    .observed-grid {
        position: absolute !important;
        width: 100vw !important;
        max-width: 1040px !important;
        min-height: 100vh !important;
        left: 0 !important;
        bottom: 0 !important;
        top: unset !important;
        right: unset !important;
        z-index: -9 !important;
    }

    .image-grid.fullView .observed-grid:not(.empty-card) {
        max-width: 1020px !important;
        max-height: max(
            calc(var(--anime-grid-height) - 260px),
            210px
        ) !important;
        right: 0 !important;
        top: 0 !important;
        left: unset !important;
        bottom: unset !important;
    }

    .image-card {
        position: relative !important;
        overflow: hidden !important;
    }

    .display-none {
        display: none !important;
    }
</style>
