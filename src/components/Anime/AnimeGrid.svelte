<script>
    import { tick, afterUpdate } from "svelte";
    import {
        finalAnimeList,
        searchedAnimeKeyword,
    } from "../../js/globalValues.js";
    import { formatNumber } from "../../js/others/helper.js";

    let filteredAnimeList = [];
    let shownAnimeList = [];
    let renderedImgGridLimit = 20;

    let observer;
    let observerTimeout;

    function addObserver() {
        observer = new IntersectionObserver(
            (entries, self) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        self.unobserve(entry.target);
                        if (observerTimeout) clearTimeout(observerTimeout);
                        observerTimeout = setTimeout(() => {
                            if (
                                filteredAnimeList.length &&
                                filteredAnimeList.length > shownAnimeList.length
                            ) {
                                shownAnimeList = shownAnimeList.concat(
                                    filteredAnimeList.slice(
                                        shownAnimeList.length,
                                        Math.min(
                                            shownAnimeList.length +
                                                renderedImgGridLimit,
                                            filteredAnimeList.length
                                        )
                                    )
                                );
                                shownAnimeList = shownAnimeList;
                                (async () => {
                                    await tick();
                                    observer.observe(
                                        shownAnimeList[
                                            shownAnimeList.length - 1
                                        ].element
                                    );
                                })();
                            }
                        }, 300);
                    }
                });
            },
            {
                root: null,
                rootMargin: "100%",
                threshold: 0,
            }
        );
    }

    finalAnimeList.subscribe((val) => {
        if (val instanceof Array && val.length) {
            filteredAnimeList = $finalAnimeList;
            if (observer) {
                observer.disconnect();
            }
            shownAnimeList = [];
            shownAnimeList = shownAnimeList.concat(
                filteredAnimeList.slice(
                    0,
                    Math.min(renderedImgGridLimit, filteredAnimeList.length)
                )
            );
            (async () => {
                addObserver();
                await tick();
                observer.observe(
                    shownAnimeList[shownAnimeList.length - 1].element
                );
            })();
        }
    });

    searchedAnimeKeyword.subscribe(async (val) => {
        if ($finalAnimeList instanceof Array && $finalAnimeList.length) {
            filteredAnimeList = $finalAnimeList;
            filteredAnimeList = filteredAnimeList.filter(({ title }) =>
                hasPartialMatch(title, val)
            );
        }
        if (filteredAnimeList instanceof Array && filteredAnimeList.length) {
            if (observer) {
                observer.disconnect();
            }
            shownAnimeList = [];
            shownAnimeList = shownAnimeList.concat(
                filteredAnimeList.slice(
                    0,
                    Math.min(renderedImgGridLimit, filteredAnimeList.length)
                )
            );
            (async () => {
                addObserver();
                await tick();
                observer.observe(
                    shownAnimeList[shownAnimeList.length - 1].element
                );
            })();
        } else if (filteredAnimeList instanceof Array) {
            if (observer) {
                observer.disconnect();
            }
            shownAnimeList = [];
        }
    });

    let hasPartialMatch = (strings, searchString) => {
        if (typeof strings === "string") {
            let fullstring = strings;
            strings = strings?.split?.(" ");
            strings.push(fullstring);
        }
        return strings.some(function (str) {
            return str
                ?.toLowerCase?.()
                .startsWith(searchString?.toLowerCase?.());
        });
    };
</script>

<main>
    <div id="anime-grid" class="image-grid">
        {#if shownAnimeList.length}
            {#each shownAnimeList as { id, title, format, episodes, weightedScore, coverImageUrl, element }, idx (id)}
                <div class="image-grid__card" bind:this={element}>
                    <div class="shimmer">
                        <img
                            style="opacity:0;"
                            class="image-grid__card-thumb"
                            alt=""
                            src={coverImageUrl}
                            onload="this.style.opacity=1"
                        />
                    </div>
                    <span
                        class="image-grid__card-title copy-value"
                        data-copy-value={title}
                    >
                        <span class="title copy-value">{title}</span>
                        <span class="copy-value brief-info">
                            <div class="copy-value brief-info">
                                <i
                                    class="green-color copy-value fa-solid fa-circle"
                                />
                                {`${format} [${episodes}]`}
                            </div>
                            <div class="copy-value brief-info">
                                <i
                                    class="red-color copy-value fa-solid fa-star"
                                />
                                {formatNumber(weightedScore)}
                            </div>
                        </span>
                    </span>
                </div>
            {/each}
            {#if shownAnimeList.length < filteredAnimeList.length}
                {#each Array(1) as _}
                    <div class="image-grid__card skeleton">
                        <div class="shimmer">
                            <img
                                style="opacity:0;"
                                class="image-grid__card-thumb skeleton"
                                alt=""
                            />
                        </div>
                    </div>
                {/each}
            {/if}
        {:else if filteredAnimeList.length || !$finalAnimeList}
            {#each Array(renderedImgGridLimit) as _}
                <div class="image-grid__card skeleton">
                    <div class="shimmer">
                        <img
                            style="opacity:0;"
                            class="image-grid__card-thumb skeleton"
                            alt=""
                        />
                    </div>
                </div>
            {/each}
        {:else}
            {"Empty Data"}
        {/if}
    </div>
</main>

<style>
    main {
        width: 100%;
        height: 100%;
    }

    .skeleton {
        border-radius: 6px !important;
        background-color: rgba(0, 0, 0, 0.25) !important;
    }

    .image-grid__card.skeleton {
        background-color: rgba(0, 0, 0, 0.25) !important;
    }
    .image-grid__card > div.shimmer {
        height: 240px !important;
    }

    .image-grid {
        display: grid;
        justify-content: space-evenly;
        align-items: flex-start;
        grid-gap: 0.8rem;
        margin: 1.5em 0;
        /* flex-wrap: wrap; */
        grid-template-columns: repeat(
            auto-fit,
            minmax(min(calc(100% / 2), 180px), 1fr)
        );
    }

    .image-grid__card {
        animation: svelte-1g3ymol-fadeIn var(--transDur) ease-in;
        width: 180px;
        margin: 0 auto;
    }

    .image-grid__card:not(.skeleton):focus .image-grid__card-title,
    .image-grid__card:not(.skeleton):hover .image-grid__card-title {
        background-color: rgb(0, 0, 0, 0.75);
    }

    .image-grid__card .image-grid__card-thumb {
        background: #0003;
        border-radius: 0.25em;
        display: block;
        overflow: hidden;
        position: relative;
        height: 240px;
        box-shadow: 0 0 0.375em #0b1622;
        will-change: transform;
    }

    .image-grid__card:not(.skeleton):focus .image-grid__card-thumb,
    .image-grid__card:not(.skeleton):hover .image-grid__card-thumb {
        outline: transparent;
        border-radius: 0;
        opacity: 0.5;
    }

    .image-grid__card-thumb {
        object-fit: cover;
        width: 100%;
        height: 100%;
        transition: all 125ms linear;
        user-select: none;
    }

    .image-grid__card-thumb--portrait {
        width: 100%;
        height: auto;
    }

    .image-grid__card-title {
        display: flex;
        flex-wrap: wrap;
        padding: clamp(0.1em, 0.3em, 0.5em);
        font-size: clamp(1.2rem, 1.3rem, 1.4rem);
        background-color: transparent;
    }

    .image-grid__card-title span {
        flex: 1;
        min-width: 100%;
        margin: 0;
        padding: 0;
        display: flex;
        gap: 0.5ch;
        flex-flow: wrap;
        background-color: transparent;
    }

    .image-grid__card-title span.title {
        overflow-x: auto;
        overflow-y: hidden;
        white-space: nowrap;
        text-overflow: unset;
    }

    .image-grid__card-title span.title::-webkit-scrollbar {
        display: none;
    }

    .image-grid__card-title span.brief-info div {
        width: fit-content;
    }

    .image-grid__status {
        justify-content: center;
        display: flex;
        align-items: center;
        flex-direction: column;
        gap: 1em;
        animation: fadeIn var(--transDur) linear;
        text-align: center;
        width: 100%;
        grid-column: 1/-1;
    }

    .empty-img {
        flex: 1;
        width: clamp(6rem, 6.5rem, 7rem);
    }

    .pl,
    .pl:after,
    .pl:before {
        animation-duration: 2s;
        animation-timing-function: linear;
        animation-iteration-count: infinite;
    }

    .pl {
        margin: 0 auto 1.5em auto;
        position: relative;
        width: 3em;
        height: 3em;
        content: "";
        display: inline-block;
        border: 0.25em solid currentColor;
        border-top-color: transparent;
        border-radius: 50%;
        animation-name: spin;
    }

    .pl:after,
    .pl:before {
        background: 0 0;
        content: "";
    }

    .pl:before {
        top: -0.25em;
        left: -0.25em;
        width: 2.5em;
        height: 2.5em;
        border-radius: 50%;
        border-bottom-color: currentColor;
    }

    .pl:after {
        top: -0.25em;
        left: -0.25em;
        width: 2.5em;
        height: 2.5em;
        border-radius: 50%;
        border-bottom-color: currentColor;
    }

    @keyframes spin {
        0% {
            transform: rotate(0);
        }

        100% {
            transform: rotate(360deg);
        }
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
        }

        to {
            opacity: 1;
        }
    }

    .shimmer {
        position: relative;
        overflow: hidden;
    }

    .shimmer::before {
        animation: loadingShimmer 2s linear infinite;
        position: absolute;
        background: linear-gradient(
            90deg,
            rgba(30, 42, 56, 0) 0,
            rgba(8, 143, 214, 0.06) 40%,
            rgba(8, 143, 214, 0.06) 60%,
            rgba(30, 42, 56, 0)
        );
        content: "";
        display: block;
        height: 100%;
        transform: translateX(0);
        width: 200%;
    }
    @keyframes loadingShimmer {
        0% {
            transform: translateX(-100%);
        }
        100% {
            transform: translateX(100%);
        }
    }
</style>
