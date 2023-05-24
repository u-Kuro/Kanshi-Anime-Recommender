<script>
    import { onMount, onDestroy } from "svelte";
    let animes = [
        {
            id: 1,
            "anime-title": "Gintama",
            "card-title-component": "",
            "hover-text": "",
        },
        {
            id: 2,
            "anime-title": "Gintama",
            "card-title-component": "",
            "hover-text": "",
        },
        {
            id: 3,
            "anime-title": "Gintama",
            "card-title-component": "",
            "hover-text": "",
        },
        {
            id: 4,
            "anime-title": "Gintama",
            "card-title-component": "",
            "hover-text": "",
        },
        {
            id: 5,
            "anime-title": "Gintama",
            "card-title-component": "",
            "hover-text": "",
        },
        {
            id: 6,
            "anime-title": "Gintama",
            "card-title-component": "",
            "hover-text": "",
        },
        {
            id: 7,
            "anime-title": "Gintama",
            "card-title-component": "",
            "hover-text": "",
        },
        {
            id: 8,
            "anime-title": "Gintama",
            "card-title-component": "",
            "hover-text": "",
        },
        {
            id: 9,
            "anime-title": "Gintama",
            "card-title-component": "",
            "hover-text": "",
        },
        {
            id: 10,
            "anime-title": "Gintama",
            "card-title-component": "",
            "hover-text": "",
        },
        {
            id: 11,
            "anime-title": "Gintama",
            "card-title-component": "",
            "hover-text": "",
        },
        {
            id: 12,
            "anime-title": "Gintama",
            "card-title-component": "",
            "hover-text": "",
        },
        {
            id: 13,
            "anime-title": "Gintama",
            "card-title-component": "",
            "hover-text": "",
        },
        {
            id: 14,
            "anime-title": "Gintama",
            "card-title-component": "",
            "hover-text": "",
        },
        {
            id: 15,
            "anime-title": "Gintama",
            "card-title-component": "",
            "hover-text": "",
        },
    ];

    onMount(() => {
        let animeLoaderWorker = new Worker("./js/worker/animeLoader.js");
        console.log(animeLoaderWorker);
    });
</script>

<main>
    <div id="anime-grid" class="image-grid">
        {#each animes as anime (anime.id)}
            <div class="image-grid__card" title={anime["hover-text"]}>
                <div>
                    <img
                        style="opacity:0;"
                        class="image-grid__card-thumb"
                        alt=""
                        src="https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/nx98292-MjBqoQt8fjzF.png"
                        onload="this.style.opacity=1"
                    />
                </div>
                <span
                    class="image-grid__card-title copy-value"
                    data-copy-value={anime["anime-title"]}
                >
                    <span class="title copy-value">{anime["anime-title"]}</span>
                    <span class="copy-value brief-info">
                        <div class="copy-value brief-info">
                            <i
                                class="green-color copy-value fa-solid fa-circle"
                            />
                            TV [12]
                        </div>
                        <div class="copy-value brief-info">
                            <i class="red-color copy-value fa-solid fa-star" />
                            20.12
                        </div>
                    </span>
                </span>
            </div>
        {/each}
    </div>
</main>

<style>
    main {
        width: 100%;
        height: 100%;
    }

    .image-grid {
        display: flex;
        justify-content: space-evenly;
        align-items: flex-start;
        flex-wrap: wrap;
        grid-gap: 0.8rem;
        margin: 1.5em 0;
    }

    .image-grid__card {
        animation: fadeIn var(--transDur) ease-in;
        width: 48%;
        max-width: 180px;
    }

    .image-grid__card:focus,
    .image-grid__card:hover {
        z-index: 2;
    }

    .image-grid__card:focus .image-grid__card-title,
    .image-grid__card:hover .image-grid__card-title {
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

    .image-grid__card:focus .image-grid__card-thumb,
    .image-grid__card:hover .image-grid__card-thumb {
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
</style>
