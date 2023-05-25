import { writable } from "svelte/store";

const IndexedDB = writable(null)

const animeEntries = writable(null)
const lastAnimeUpdate = writable(null)

const username = writable(null)
const userEntries = writable(null)
const lastUserAnimeUpdate = writable(null)

const filterOptions = writable(null)
const recommendedAnimeList = writable(null)

const menuVisible = writable(false)

export {
    IndexedDB,
    animeEntries,
    lastAnimeUpdate,
    username,
    userEntries,
    lastUserAnimeUpdate,
    filterOptions,
    recommendedAnimeList,
    menuVisible
}