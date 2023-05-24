import { writable } from "svelte/store";

const IndexDB = writable(null)
const animeEntries = writable({})
const lastUpdate = writable("")
const userEntries = writable({})
const filterOptions = writable({})
const processedAnimeList = writable([])

const menuVisible = writable(false)
export {
    IndexDB,
    lastUpdate,
    animeEntries,
    userEntries,
    filterOptions,
    processedAnimeList,
    menuVisible
}