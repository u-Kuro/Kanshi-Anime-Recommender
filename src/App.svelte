<script>
	import { IndexDB, animeEntries, lastUpdate } from "./js/globalValues.js";
	import { IDBinit, retrieveJSON, saveJSON } from "./js/helper.js";
	import { onMount, onDestroy } from "svelte";
	import { listen, unsubscribe } from "../scripts/firebaseInit.js";
	import C from "./components/index.js";

	let listeners = [];

	onMount(async () => {
		let db = await IDBinit();
		IndexDB.set(db);
		lastUpdate.set(new Date(await retrieveJSON("lastSavedUpdateTime")));
		animeEntries.set(await retrieveJSON("savedAnimeEntries"));
		if (!$lastUpdate instanceof Date || !animeEntries) {
			// get data from database
		} else {
			// User has Date
			// listeners.push(await listen("lastUpdate", (val) => {
			// 	let serverLastUpdate = new Date(val);
			// 	if(serverLastUpdate>lastUpdate){
			// 		// user data is late
			// 	} else if(serverLastUpdate<lastUpdate){
			// 		// server data is late
			// 	}
			// 	// lastUpdate.set(val);
			// }));
		}
		console.log($lastUpdate);
	});

	onDestroy(() => {
		// unsubscribe(listeners);
	});
</script>

<main>
	<C.Fixed.Navigator />
	<C.Fixed.Menu />

	<C.Others.Header />
	<div class="home">
		<C.Others.Search />
		<C.Anime.AnimeGrid />
		<C.Anime.Fixed.AnimePopup />
	</div>

	<C.Fixed.FilterPopup />
	<C.Anime.Fixed.AnimeOptionsPopup />

	<C.Fixed.Toast />
	<C.Fixed.Loader />
</main>

<style>
	main {
		height: 100%;
		width: 100%;
	}
	.home {
		height: 100%;
		width: 100%;
		margin: 58px auto 0;
		max-width: 1140px;
		padding-left: 50px;
		padding-right: 50px;
	}
	@media screen and (orientation: portrait) {
		.home {
			padding: 0 1em;
		}
	}
</style>
