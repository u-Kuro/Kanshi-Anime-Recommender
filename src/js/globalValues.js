import { writable } from "svelte/store";

const animeEntries = writable(null)
const lastAnimeUpdate = writable(null)

const username = writable(null)
const userEntries = writable(null)
const lastUserAnimeUpdate = writable(null)

const filterOptions = writable(null)
const activeTagFilters = writable(null)
const recommendedAnimeList = writable(null)
const finalAnimeList = writable(null)
const animeLoaderWorker = writable(null)
const dataStatus = writable(null)

const searchedAnimeKeyword = writable("")
const menuVisible = writable(false)

export {
    animeEntries,
    lastAnimeUpdate,
    username,
    userEntries,
    lastUserAnimeUpdate,
    filterOptions,
    activeTagFilters,
    recommendedAnimeList,
    finalAnimeList,
    animeLoaderWorker,
    dataStatus,
    searchedAnimeKeyword,
    menuVisible
}