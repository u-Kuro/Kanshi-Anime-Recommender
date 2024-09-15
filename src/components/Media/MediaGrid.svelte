<script>
    import { onDestroy, onMount } from "svelte";
    import { fade } from "svelte/transition";
    import { sineOut } from "svelte/easing";
    import { cacheImage } from "../../js/caching.js";
    import {
        addClass,
        isJsonObject,
        ncsCompare,
        removeClass,
        requestImmediate,
        showToast,
    } from "../../js/others/helper.js";
    import {
        android,
        popupVisible,
        openedMediaPopupIdx,
        mediaOptionVisible,
        openedMediaOptionIdx,
        initData,
        gridFullView,
        earlisetReleaseDate,
        showFilterOptions,
        mobile,
        menuVisible,
        loadedMediaLists,
        loadNewMedia,
        searchedWord,
        selectedCategory,
        selectedMediaGridEl,
        shownAllInList,
        categories,
        windowHeight,
        windowWidth,
        trueWindowHeight,
        documentScrollTop,
        loadingCategory,
        initList,
        toast,
    } from "../../js/globalValues.js";
    import { mediaLoader } from "../../js/workerUtils.js";

    export let mainCategory;
    
    const subscriptions = {}
    let subscriptionId = 0

    const emptyImage = "data:image/png;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
    let numberOfPageLoadedGrid = Math.max(5, (($windowHeight - 239) / 250.525) * 5);

    subscriptions[subscriptionId++] =
    windowHeight.subscribe((val) => {
        numberOfPageLoadedGrid = Math.max(5, ((val - 239) / 250.525) * 5);
    })

    let mediaGridEl;    

    let shownMediaListCount;
    $: shownMediaListCount = $loadedMediaLists?.[mainCategory]?.mediaList?.length ?? 0;
    let mediaObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    mediaLoader({
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

    let latestSearchDate
    if (mainCategory === "") {
        subscriptions[subscriptionId++] = 
        searchedWord.subscribe((val) => {
            if (!val) return
            if ($android) {
                showToast("Please wait a moment")
            } else {
                $toast = "Please wait a moment"
            }
        });
    } else {
        subscriptions[subscriptionId++] = 
        searchedWord.subscribe((val) => {
            if ($categories == null) return
            if ($initList === false) {
                latestSearchDate = new Date()
            } else if (val) {
                if ($android) {
                    showToast("Please wait a moment")
                } else {
                    $toast = "Please wait a moment"
                }
            }
            mediaLoader({
                loadMore: true,
                selectedCategory: mainCategory,
                searchedWord: val,
                searchDate: latestSearchDate
            });
        });
    }

    $loadNewMedia[mainCategory] = function ({
        idx,
        media,
        isLast,
        updateDate,
        searchDate,
        isInit
    }) {
        let finishedReloading, finishedSearching
        if (isLast) {
            finishedReloading = finishedSearching = true
        } else {
            finishedReloading = updateDate >= $loadingCategory[mainCategory]
            finishedSearching = searchDate >= latestSearchDate
        }
        if (typeof media?.id === "number") {
            $shownAllInList[mainCategory] = isLast;
            let mediaList = $loadedMediaLists[mainCategory]?.mediaList;
            if (mediaList instanceof Array) {
                let newMediaList = mediaList;
                if (isLast && typeof idx === "number") {
                    newMediaList = newMediaList.slice(0, idx + 1);
                }
                if (
                    typeof idx === "number" &&
                    mediaList?.[idx] &&
                    Math.abs(mediaList[idx]?.id) === media.id
                ) {
                    newMediaList[idx] = media;
                    $loadedMediaLists[mainCategory].mediaList = newMediaList;
                } else {
                    if (idx < mediaList.length) {
                        newMediaList[idx] = media;
                    } else {
                        newMediaList.push(media);
                    }
                    $loadedMediaLists[mainCategory].mediaList = newMediaList;
                }
            } else {
                if ($loadedMediaLists[mainCategory]) {
                    $loadedMediaLists[mainCategory].mediaList = [media];
                }
            }
            if (isInit) return // already loads next media after return
            if (idx < shownMediaListCount - 1) {
                mediaLoader({
                    loadMore: true,
                    selectedCategory: mainCategory,
                    searchedWord: $searchedWord,
                });
            } else {
                if (finishedReloading) {
                    delete $loadingCategory[mainCategory]
                    $loadingCategory = $loadingCategory
                }
                if (finishedSearching) {
                    latestSearchDate = undefined
                }
                if (shouldLoadMoreMedia()) {
                    mediaLoader({
                        loadMore: true,
                        selectedCategory: mainCategory,
                        searchedWord: $searchedWord,
                    });
                }
            }
        } else if (isLast) {
            if ($loadedMediaLists[mainCategory]) {
                $loadedMediaLists[mainCategory].mediaList = [];
            }
            if (isInit) return // already loads next media after return
            if (finishedReloading) {
                delete $loadingCategory[mainCategory]
                $loadingCategory = $loadingCategory
            }
            if (finishedSearching) {
                latestSearchDate = undefined
            }
        } else if (!isInit) {
            if (finishedReloading) {
                delete $loadingCategory[mainCategory]
                $loadingCategory = $loadingCategory
            }
            if (finishedSearching) {
                latestSearchDate = undefined
            }
        }
    };



    let observedGrid;
    $: {
        if (observedGrid instanceof Element) {
            mediaObserver.observe(observedGrid);
        }
    }

    function shouldLoadMoreMedia() {
        let rect = observedGrid?.getBoundingClientRect?.();
        if ($gridFullView) {
            return rect?.left < $windowWidth;
        } else {
            return rect?.top < $windowHeight;
        }
    }

    function handleOpenPopup(mediaIdx) {
        $openedMediaPopupIdx = mediaIdx;
        $popupVisible = true;
    }

    let openOptionTimeout;
    window.oncontextmenu = () => {
        if (window[".isOpeningMediaOption"]) {
            window[".isOpeningMediaOption"] = false;
            return false;
        }
    };
    function handleOpenOption(event, mediaIdx) {
        try {
            window[".isOpeningMediaOption"] = true;
        } catch (e) {}
        let element = event.target;
        let classList = element.classList;
        if (classList.contains("copy") || element.closest(".copy")) return;
        openOptionTimeout?.();
        openOptionTimeout = requestImmediate(() => {
            $openedMediaOptionIdx = mediaIdx;
            $mediaOptionVisible = true;
        }, 500);
    }
    function cancelOpenOption() {
        openOptionTimeout?.();
        window[".isOpeningMediaOption"] = false;
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

    let lastLeftScroll, currentLeftScroll;
    let afterFullGrid;
    let isWholeGridSeen,
        isOnVeryLeftOfMediaGrid = true;
    let isOnVeryLeftOfMediaGridTimeout;
    $: {
        isWholeGridSeen =
            $gridFullView &&
            Math.abs(
                document.documentElement.scrollHeight -
                    $documentScrollTop -
                    document.documentElement.clientHeight,
            ) <= 3;

        isOnVeryLeftOfMediaGridTimeout?.();
        if ($gridFullView && mediaGridEl?.scrollLeft < 1) {
            isOnVeryLeftOfMediaGridTimeout = requestImmediate(() => {
                isOnVeryLeftOfMediaGrid = $gridFullView && mediaGridEl?.scrollLeft < 1;
            }, 1000);
        } else {
            isOnVeryLeftOfMediaGrid = false;
        }
    }
    let shouldShowGoBackInFullView;
    $: shouldShowGoBackInFullView =
        $gridFullView &&
        afterFullGrid &&
        (currentLeftScroll < lastLeftScroll || $windowWidth > 596.5);

    subscriptions[subscriptionId++] =
    documentScrollTop.subscribe((val) => {
        const documentEl = document.documentElement
        isWholeGridSeen = $gridFullView && Math.abs(documentEl.scrollHeight - val - documentEl.clientHeight) <= 3;
    })

    let filterOptiChangeTimeout;
    subscriptions[subscriptionId++] =
    showFilterOptions.subscribe(() => {
        filterOptiChangeTimeout?.();
        filterOptiChangeTimeout = requestImmediate(() => {
            const documentEl = document.documentElement
            isWholeGridSeen =
                $gridFullView &&
                Math.abs(
                    documentEl.scrollHeight -
                        $documentScrollTop -
                        documentEl.clientHeight,
                ) <= 3;
        }, 17);
    });

    function goBackGrid() {
        if ($gridFullView) {
            mediaGridEl.style.overflow = "hidden";
            mediaGridEl.style.overflow = "";
            mediaGridEl.scroll({ left: 0, behavior: "smooth" });
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
    function reloadImage(e) {
        try {
            let element = e?.target
            if (element?.tagName!=="IMG") {
                const classList = element?.classList
                const parent = classList?.contains?.("shimmer") ? element : element?.closest?.(".shimmer")
                element = parent?.querySelector?.("img")
            }
            const src = element?.src;
            if (src && src !== emptyImage)
            element.src = src
        } catch {}
    }

    let waitForOnVeryLeft;
    const mediaGridOnScroll = () => {
        window.mediaGridScrolled?.(mediaGridEl.scrollLeft);
        if (!waitForOnVeryLeft) {
            isOnVeryLeftOfMediaGridTimeout?.();
        }
        if ($gridFullView && mediaGridEl?.scrollLeft < 1) {
            if (!waitForOnVeryLeft) {
                waitForOnVeryLeft = true;
                isOnVeryLeftOfMediaGridTimeout = requestImmediate(() => {
                    isOnVeryLeftOfMediaGrid =
                        $gridFullView && mediaGridEl?.scrollLeft < 1;
                    waitForOnVeryLeft = false;
                }, 8);
            }
        } else {
            isOnVeryLeftOfMediaGridTimeout?.();
            waitForOnVeryLeft = false;
            isOnVeryLeftOfMediaGrid = false;
        }
        if (!$gridFullView) return;
    }

    onMount(() => {
        subscriptions[subscriptionId++] =
        selectedCategory.subscribe((val) => {
            if (val === mainCategory && val) {
                $selectedMediaGridEl = mediaGridEl;
            }
        });
        mediaGridEl.addEventListener("scroll", mediaGridOnScroll);
    });

    // COPY TEXT ABSTRACTION
	let cancelCopyTimeout;
    function cardPointerDown(e) {
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
    function cardPointerEnd(e) {
        if (e?.pointerType === "mouse") return;
        let target = e?.target;
		const classList = target?.classList;
		if (classList && !classList?.contains?.("copy")) target = target.closest(".copy");
		if (!target) return
        
        cancelCopyTimeout?.()
    }

    onDestroy(() => {
        mediaObserver?.disconnect?.()
        mediaGridEl?.removeEventListener?.("scroll", mediaGridOnScroll);
        for (const k in subscriptions) {
            subscriptions[k]?.()
        }
        cancelOpenOption()
        cancelCopyTimeout?.()
    })
</script>

<div
    data-category="{mainCategory}"
    class="{"category-list" + (mainCategory === $selectedCategory || mainCategory === ''
        ? ' viewed'
        : '') + ($gridFullView ? ' full-view' : '')}"
    style:--media-grid-height="{($mobile && !$android
        ? $trueWindowHeight
        : $windowHeight) + "px"}"
>
    {#if true}
        {@const mediaList = $loadedMediaLists?.[mainCategory]?.mediaList}
        <section
            class="{'image-grid ' +
                ($gridFullView ? ' full-view' : '') +
                (mediaList?.length === 0 && !$initData ? ' empty-grid' : '') +
                ($loadingCategory[""]
                            || $loadingCategory[mainCategory]
                            || latestSearchDate
                            || $initList !== false
                                ? ' semi-loading'
                                : '')
            }"
            data-category="{mainCategory}"
            bind:this="{mediaGridEl}"
            on:wheel="{(e) => {
                if (
                    $gridFullView &&
                    mediaGridEl.scrollWidth > mediaGridEl.clientWidth &&
                    Math.abs(e?.deltaY) > Math.abs(e?.deltaX)
                ) {
                    // If its not scrolled at the very bottom of the screen and see next
                    if (!isWholeGridSeen && e?.deltaY > 0) return;
                    // If its scrolled to very left and see previous
                    if (isOnVeryLeftOfMediaGrid && e?.deltaY < 0) return;
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
            aria-label="List of Media Per Category"
        >
            {#if mediaList?.length > 0}
                {#each mediaList as media, mediaIndex ((media?.id != null ? media.id + " " + mediaIndex : {}) ?? {})}
                    {@const format = media.format}
                    {@const isManga = format === "Manga" || format === "One Shot"}
                    {@const isNovel = format === "Novel"}
                    <div
                        class="image-card"
                        bind:this="{media.gridElement}"
                        title="{(media?.shownTitle ? media?.shownTitle+'\n\n' : '') + (media?.briefInfo || '')}"
                    >
                        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                        <div
                            class="shimmer"
                            tabindex="{$menuVisible || $popupVisible
                                ? ''
                                : '0'}"
                            on:click="{handleOpenPopup(mediaIndex)}"
                            on:pointerdown="{(e) => {
                                reloadImage(e)
                                handleOpenOption(e, mediaIndex)
                            }}"
                            on:pointerup="{cancelOpenOption}"
                            on:pointercancel="{cancelOpenOption}"
                            on:keyup="{(e) =>
                                e.key === 'Enter' &&
                                handleOpenPopup(mediaIndex)}"
                            role="button"
                            aria-label="Open Detailed Information for the Media"
                        >
                            {#if media?.coverImageUrl || media?.bannerImageUrl || media?.trailerThumbnailUrl}
                                {#key media?.coverImageUrl || media?.bannerImageUrl || media?.trailerThumbnailUrl}
                                    <img
                                        use:addImage="{media?.coverImageUrl ||
                                            media?.bannerImageUrl ||
                                            media?.trailerThumbnailUrl ||
                                            emptyImage}"
                                        fetchpriority="{mediaIndex >
                                        numberOfPageLoadedGrid
                                            ? ''
                                            : 'high'}"
                                        loading="{mediaIndex >
                                        numberOfPageLoadedGrid
                                            ? 'lazy'
                                            : 'eager'}"
                                        class="{'image-card-thumb  fade-out'}"
                                        alt="{(media?.shownTitle || '') +
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
                            <span
                                class="image-card-title"
                                on:pointerdown="{cardPointerDown}"
                                on:pointerup="{cardPointerEnd}"
                                on:pointercancel="{cardPointerEnd}"
                            >
                                <span
                                    class="title copy"
                                    data-copy="{media?.shownTitle || ''}"
                                    data-secondcopy="{media?.copiedTitle || ''}"
                                >{media?.shownTitle || "N/A"}</span>
                                <span
                                    class="brief-info-wrapper copy"
                                    data-copy="{media?.shownTitle || ''}"
                                    data-secondcopy="{media?.copiedTitle || ''}"
                                >
                                    <div class="brief-info">
                                        <span>
                                            <!-- circle -->
                                            <svg
                                                viewBox="0 0 512 512"
                                                class="{`${media?.userStatusColor}-fill circle`}"
                                                ><path
                                                    d="M256 512a256 256 0 1 0 0-512 256 256 0 1 0 0 512z"
                                                ></path></svg
                                            >
                                            {#if !isManga && !isNovel && isJsonObject(media?.nextAiringEpisode)}
                                                {@const finishedEpisodes =
                                                    getFinishedEpisode(
                                                        media.episodes,
                                                        media.nextAiringEpisode,
                                                    )}
                                                {`${media.format || "N/A"}`}
                                                {#if finishedEpisodes}
                                                    {#key $earlisetReleaseDate || 1}
                                                        {finishedEpisodes}
                                                    {/key}
                                                {:else}
                                                    {`${
                                                        media.episodes
                                                            ? "(" +
                                                            media.episodes +
                                                            ")"
                                                            : ""
                                                    }`}
                                                {/if}
                                            {:else}
                                                {`${media.format || "N/A"}`}
                                                {#if isManga}
                                                    {`${
                                                        media.chapters > 0
                                                            ? "(" +
                                                            media.chapters +
                                                            " Ch)"
                                                            : media.episodeProgress >
                                                                0
                                                            ? "(" +
                                                                media.episodeProgress +
                                                                ' Ch")'
                                                            : media.volumes >
                                                                0
                                                                ? "(" +
                                                                media.volumes +
                                                                " Vol)"
                                                                : media.volumeProgress >
                                                                    0
                                                                ? "(" +
                                                                    media.volumeProgress +
                                                                    ' Vol")'
                                                                : ""
                                                    }`}
                                                {:else if isNovel}
                                                    {`${
                                                        media.volumes > 0
                                                            ? "(" +
                                                            media.volumes +
                                                            " Vol)"
                                                            : media.volumeProgress >
                                                                0
                                                            ? "(" +
                                                                media.volumeProgress +
                                                                ' Vol")'
                                                            : media.chapters >
                                                                0
                                                                ? "(" +
                                                                media.chapters +
                                                                " Ch)"
                                                                : media.episodeProgress >
                                                                    0
                                                                ? "(" +
                                                                    media.episodeProgress +
                                                                    ' Ch")'
                                                                : ""
                                                    }`}
                                                {:else}
                                                    {`${
                                                        media.episodes > 0
                                                            ? "(" +
                                                            media.episodes +
                                                            ")"
                                                            : media.episodeProgress >
                                                                0
                                                            ? "(" +
                                                                media.episodeProgress +
                                                                '")'
                                                            : ""
                                                    }`}
                                                {/if}
                                            {/if}
                                        </span>
                                    </div>
                                    <div class="brief-info">
                                        <span>
                                            {#if media?.shownScore != null}
                                                <!-- star -->
                                                <svg
                                                    viewBox="0 0 576 512"
                                                    class="{`${media?.contentCautionColor}-fill score`}"
                                                    ><path
                                                        d="M317 18a32 32 0 0 0-58 0l-64 132-144 22a32 32 0 0 0-17 54l104 103-25 146a32 32 0 0 0 47 33l128-68 129 68a32 32 0 0 0 46-33l-24-146 104-103a32 32 0 0 0-18-54l-144-22-64-132z"
                                                    ></path></svg
                                                >
                                                {media?.shownScore ?? "N/A"}
                                            {:else if media?.shownCount != null}
                                                <!-- people -->
                                                <svg
                                                    viewBox="0 0 640 512"
                                                    class="{`${media?.contentCautionColor}-fill score`}"
                                                >
                                                    <path
                                                        d="M96 128a128 128 0 1 1 256 0 128 128 0 1 1-256 0zM0 482c0-98 80-178 178-178h92c98 0 178 80 178 178 0 17-13 30-30 30H30c-17 0-30-13-30-30zm609 30H471c6-9 9-20 9-32v-8c0-61-27-115-70-152h69c89 0 161 72 161 161 0 17-14 31-31 31zM432 256c-31 0-59-13-79-33a159 159 0 0 0 13-169 112 112 0 1 1 66 202z"
                                                    ></path></svg
                                                >
                                                {media?.shownCount ?? "N/A"}
                                            {:else if media?.shownFavorites != null}
                                                <svg
                                                    viewBox="0 0 512 512"
                                                    class="{`${media?.contentCautionColor}-fill score`}"
                                                >
                                                    <path
                                                        d="m48 300 180 169a41 41 0 0 0 56 0l180-169c31-28 48-68 48-109v-6A143 143 0 0 0 268 84l-12 12-12-12A143 143 0 0 0 0 185v6c0 41 17 81 48 109z"
                                                    ></path></svg
                                                >
                                                {media?.shownFavorites ?? "N/A"}
                                            {:else if media?.shownActivity != null}
                                                <svg
                                                    viewBox="0 0 512 512"
                                                    class="{`${media?.contentCautionColor}-fill score`}"
                                                >
                                                    <path
                                                        d="M64 64a32 32 0 1 0-64 0v336c0 44 36 80 80 80h400a32 32 0 1 0 0-64H80c-9 0-16-7-16-16V64zm407 87a32 32 0 0 0-46-46L320 211l-57-58a32 32 0 0 0-46 0L105 265a32 32 0 0 0 46 46l89-90 57 58c13 12 33 12 46 0l128-128z"
                                                    ></path></svg
                                                >
                                                {media?.shownActivity ?? "N/A"}
                                            {/if}
                                        </span>
                                    </div>
                                </span>
                            </span>
                        </div>
                        {#if mediaIndex + 1 === mediaList.length}
                            <div
                                aria-hidden="true"
                                class="observed-grid"
                                bind:this="{observedGrid}"
                            ></div>
                        {/if}
                    </div>
                {/each}
                {#each Array($shownAllInList?.[mainCategory] ? 0 : 1) as _}
                    <div class="image-card skeleton dummy" aria-hidden="true">
                        <div class="shimmer"></div>
                    </div>
                {/each}
                {#each Array($gridFullView ? Math.floor(($windowHeight ?? 1100) / 220) : 5) as _}
                    <div class="image-card dummy" aria-hidden="true"></div>
                {/each}
            {:else if mediaList?.length === 0}
                <div class="empty">No Results</div>
                {#if !$shownAllInList?.[mainCategory]}
                    <div class="image-card" aria-hidden="true">
                        <div
                            class="observed-grid empty-card"
                            bind:this="{observedGrid}"
                        ></div>
                    </div>
                {/if}
            {:else}
                {#each Array(21) as _}
                    <div class="image-card skeleton" aria-hidden="true">
                        <div class="shimmer"></div>
                    </div>
                {/each}
                {#each Array(5) as _}
                    <div class="image-card" aria-hidden="true"></div>
                {/each}
            {/if}
        </section>
        {#if !$android && shouldShowGoBackInFullView && $loadedMediaLists?.[mainCategory]?.mediaList?.length}
            <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
            <div
                class="go-back-grid full-view"
                tabindex="{$menuVisible || $popupVisible ? '' : '0'}"
                on:click="{goBackGrid}"
                on:keyup="{(e) => e.key === 'Enter' && goBackGrid(e)}"
                in:fade="{{ duration: 200, easing: sineOut }}"
                out:fade="{{ duration: 200, easing: sineOut }}"
            >
                <svg
                    viewBox="0 0 320 512"
                >
                    <path d="M41 233a32 32 0 0 0 0 46l160 160a32 32 0 0 0 46-46L109 256l138-137a32 32 0 0 0-46-46L41 233z"
                    ></path>
                </svg>
            </div>
        {/if}
    {/if}
</div>

<style>
    :global(.media-list-pager.pager-is-changing > .category-list) {
        height: min(calc(var(--grid-max-height) + 65px),calc(100vh + max(20px, calc(var(--grid-position) + 20px)))) !important;
    }
    .category-list {
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
        height: min(var(--grid-max-height), calc(100vh + max(20px, calc(var(--grid-position) + 20px))));
    }

    :global(.media-list-pager.is-changing-top-position > .category-list) {
        visibility: hidden;
    }

    .category-list::-webkit-scrollbar {
        display: none;
    }

    .category-list.viewed {
        height: unset !important;
        overflow-x: hidden !important;
        overflow-y: auto !important;
        visibility: unset !important;
    }

    :global(.media-list-pager.remove-snap-scroll .category-list) {
        height: unset !important;
    }

    .category-list.full-view {
        padding: 12px 0;
        margin-bottom: 65px;
        height: max(calc(var(--media-grid-height) - 230px), 248px) !important;
        min-height: unset !important;
        overflow: hidden !important;
        visibility: unset !important;
    }

    .skeleton {
        border-radius: 6px !important;
        background-color: hsla(0, 0%, 10%, 0.5) !important;
    }

    .image-grid.semi-loading .image-card {
        animation: semi-loading-blink 1.5s ease-in-out infinite;
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
        grid-template-columns: repeat(auto-fill,minmax(min(100% / 2 - 10px, 170px), 170px));
        overflow-anchor: visible;
        -ms-overflow-style: none;
        scrollbar-width: none;
        position: absolute;
        width: 100%;
        top: 0;
        transform: translateY(max(20px, calc(var(--grid-position) + 20px))) translateZ(0);
        padding-bottom: calc(101vh + 65px);
    }

    .category-list.viewed .image-grid {
        position: unset !important;
        padding-bottom: unset !important;
        transform: unset !important;
    }

    :global(.media-list-pager.remove-snap-scroll .image-grid) {
        position: unset !important;
    }

    @media screen and (max-width: 390px) {
        .image-grid {
            grid-template-columns: repeat(auto-fill, calc(100% / 2 - 10px));
        }
    }

    @media screen and (max-width: 250px) {
        .image-grid {
            grid-template-columns: repeat(auto-fill,minmax(min(100%, 180px), 180px));
        }
    }

    .image-grid.full-view {
        display: flex;
        flex-wrap: wrap;
        flex-direction: column;
        justify-content: space-evenly;
        align-content: flex-start;
        height: max(calc(var(--media-grid-height) - 250px), 236px) !important;
        overflow-y: hidden !important;
        overflow-x: auto !important;
        top: unset !important;
        transform: unset !important;
    }

    .image-grid.full-view.empty-grid {
        height: unset !important;
        justify-content: start;
        align-content: center;
    }

    .image-grid::-webkit-scrollbar {
        display: none;
    }

    .image-card {
        animation: fade-in 0.2s ease-out;
        width: 100%;
        height: var(--popup-content-height);
        display: grid;
        grid-template-rows: auto;
        grid-template-columns: 100%;
    }
    .image-card.full-view:empty {
        height: 0px !important;
    }
    .image-card:not(.full-view):empty {
        width: 0px !important;
    }
    :global(.image-card.hidden > .shimmer),
    :global(.image-card.hidden > .image-card-title) {
        display: none;
    }

    .image-grid.full-view .image-card {
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

    .image-grid.full-view .image-card > .shimmer {
        padding-bottom: unset !important;
    }

    .image-card-thumb {
        position: absolute;
        background: hsla(0, 0%, 10%, 0.5);
        border-radius: 6px;
        display: block;
        cursor: pointer;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15), 0 1px 2px rgba(0, 0, 0, 0.25);
        transition: opacity 0.2s ease-out;
        object-fit: cover;
        width: 100%;
        height: 100%;
        transform: translateZ(0);
        user-select: none;
    }

    .image-card:not(.skeleton):focus-within .image-card-thumb,
    .image-card:not(.skeleton):focus .image-card-thumb,
    .image-card:not(.skeleton):hover .image-card-thumb {
        opacity: 0.5 !important;
        box-shadow: 0 14px 28px rgba(0, 0, 0, 0.25), 0 10px 10px rgba(0, 0, 0, 0.22);
    }

    .image-card-thumb.fade-out {
        opacity: 0;
    }

    .image-card-title {
        padding: 50% 4px 4px;
        font-size: clamp(12px, 12px, 14px);
        position: absolute;
        bottom: 0;
        background: linear-gradient(to top,rgba(0, 0, 0, 0.75),rgba(0, 0, 0, 0));
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
        bottom: 80px !important;
        right: 30px !important;
        transform: translateZ(0) !important;
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
        box-shadow: 0 14px 28px rgba(0, 0, 0, 0.25), 0 10px 10px rgba(0, 0, 0, 0.22);
    }

    .go-back-grid.full-view {
        position: absolute !important;
        right: unset !important;
        bottom: unset !important;
        top: 50% !important;
        left: 8px !important;
        transform: translateY(-50%) translateZ(0) !important;
        width: 44px !important;
        height: 44px !important;
    }

    @media screen and (max-width: 750px) {
        .image-grid {
            padding-inline: 10px;
        }
    }

    @media screen and (max-width: 425px) {
        .go-back-grid.full-view {
            left: 0;
        }
    }

    .go-back-grid.full-view svg {
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
        animation: loading-shimmer 2s linear infinite;
        position: absolute;
        background: linear-gradient(90deg,hsla(0, 0%, 10%, 0) 0,hsla(0, 0%, 100%, 0.06) 40%,hsla(0, 0%, 100%, 0.06) 60%,hsla(0, 0%, 10%, 0));
        content: "";
        display: block;
        height: 100%;
        transform: translateX(0) translateZ(0);
        width: 200%;
    }
    @keyframes loading-shimmer {
        0% {
            transform: translateX(-100%) translateZ(0);
        }
        100% {
            transform: translateX(100%) translateZ(0);
        }
    }

    @keyframes semi-loading-blink {
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

    .image-grid.full-view .observed-grid:not(.empty-card) {
        max-width: 1020px !important;
        max-height: max(calc(var(--media-grid-height) - 260px),210px) !important;
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
