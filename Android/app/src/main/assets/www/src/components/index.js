// Component
// Anime
import AnimeGrid from "./Anime/AnimeGrid.svelte";
// Anime/Fixed
import AnimePopup from "./Anime/Fixed/AnimePopup.svelte";
import AnimeOptionsPopup from "./Anime/Fixed/AnimeOptionsPopup.svelte";

// Fixed
import FilterPopup from "./Fixed/FilterPopup.svelte";
import Navigator from "./Fixed/Navigator.svelte";
import Menu from "./Fixed/Menu.svelte";
import Toast from "./Fixed/Toast.svelte";
import Loader from "./Fixed/Loader.svelte";

// Other Components
import Header from "./Others/Header.svelte";
import Search from "./Others/Search.svelte";

export default {
    Fixed: {
        FilterPopup: FilterPopup,
        Navigator: Navigator,
        Menu: Menu,
        Header: Header,
        Toast: Toast,
        Loader: Loader
    },
    Anime: {
        AnimeGrid: AnimeGrid,
        Fixed: {
            AnimePopup: AnimePopup,
            AnimeOptionsPopup: AnimeOptionsPopup
        }
    },
    Others: {
        Search: Search,
        Header: Header
    }
}
