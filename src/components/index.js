// Component
// Media
import MediaGrid from "./Media/MediaGrid.svelte";
// Media/Fixed
import MediaPopup from "./Media/Fixed/MediaPopup.svelte";
import MediaOptionsPopup from "./Media/Fixed/MediaOptionsPopup.svelte";

// Fixed
import Categories from "./Fixed/Categories.svelte";
import Navigator from "./Fixed/Navigator.svelte";
import Menu from "./Fixed/Menu.svelte";

// Other Components
import Search from "./Others/Search.svelte";
import Confirm from "./Others/Confirm.svelte";

export default {
    Fixed: {
        Categories,
        Navigator,
        Menu
    },
    Media: {
        MediaGrid,
        Fixed: {
            MediaPopup,
            MediaOptionsPopup
        }
    },
    Others: {
        Search,
        Confirm
    }
}
