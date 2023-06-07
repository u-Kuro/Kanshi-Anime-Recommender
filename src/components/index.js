// Component
// Anime
import AnimeGrid from "./Anime/AnimeGrid.svelte";
// Anime/Fixed
import AnimePopup from "./Anime/Fixed/AnimePopup.svelte";
import AnimeOptionsPopup from "./Anime/Fixed/AnimeOptionsPopup.svelte";

// Fixed
import Navigator from "./Fixed/Navigator.svelte";
import Menu from "./Fixed/Menu.svelte";

// Other Components
import Search from "./Others/Search.svelte";

export default {
    Fixed: {
        Navigator: Navigator,
        Menu: Menu,
    },
    Anime: {
        AnimeGrid: AnimeGrid,
        Fixed: {
            AnimePopup: AnimePopup,
            AnimeOptionsPopup: AnimeOptionsPopup
        }
    },
    Others: {
        Search: Search
    }
}
