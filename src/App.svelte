<script>
	import C from "./components/index.js";
	import { onMount, onDestroy } from "svelte";
	import { IDBinit, retrieveJSON, saveJSON } from "./js/indexedDB.js";
	import {
		animeEntries,
		lastAnimeUpdate,
		username,
		userEntries,
		lastUserAnimeUpdate,
		hiddenEntries,
		filterOptions,
		activeTagFilters,
		recommendedAnimeList,
		finalAnimeList,
		animeLoaderWorker,
		initData,
		searchedAnimeKeyword,
		dataStatus,
		autoPlay,
		popupVisible,
		menuVisible,
		toast,
		// Reactive Functions
		updateRecommendationList,
		loadAnime,
		updateFilters,
	} from "./js/globalValues.js";
	import {
		getAnimeEntries,
		getFilterOptions,
		getAnimeFranchises,
		requestAnimeEntries,
		requestUserEntries,
		processRecommendedAnimeList,
		animeLoader,
	} from "./js/workerUtils.js";
	import { isJsonObject, jsonIsEmpty } from "./js/others/helper.js";

	// For Youtube API
	const onYouTubeIframeAPIReady = new Function();

	let initDataPromises = [];
	$dataStatus = "Getting Existing Data";
	let pleaseWaitStatusInterval = setInterval(() => {
		if (!$dataStatus) {
			$dataStatus = "Please Wait...";
		}
	}, 300);

	// Init Data
	// Check/Get/Update/Process Anime Entries
	initDataPromises.push(
		new Promise(async (resolve) => {
			let animeEntriesLen = await retrieveJSON("animeEntriesLength");
			let _lastAnimeUpdate = await retrieveJSON("lastAnimeUpdate");
			if (animeEntriesLen < 1 || !(_lastAnimeUpdate instanceof Date)) {
				$finalAnimeList = null;
				getAnimeEntries()
					.then((data) => {
						$lastAnimeUpdate = data.lastAnimeUpdate;
						resolve();
					})
					.catch(async (error) => {
						console.error(error);
						requestAnimeEntries();
						resolve();
					});
			} else {
				resolve();
			}
		})
	);

	// Check/Update/Process User Anime Entries
	initDataPromises.push(
		new Promise(async (resolve) => {
			let _username = await retrieveJSON("username");
			if (_username) {
				$username = _username;
				requestUserEntries({ username: $username });
			}
			resolve();
		})
	);

	// Check/Get Anime Franchises
	initDataPromises.push(
		new Promise(async (resolve) => {
			let animeFranchisesLen = await retrieveJSON(
				"animeFranchisesLength"
			);
			console.log(animeFranchisesLen);
			if (animeFranchisesLen < 1) {
				getAnimeFranchises();
			}
			resolve();
		})
	);

	// Check/Get/Update Filter Options Selection
	initDataPromises.push(
		new Promise(async (resolve) => {
			let _filterOptions = await retrieveJSON("filterOptions");
			let _activeTagFilters = await retrieveJSON("activeTagFilters");
			if (jsonIsEmpty(_filterOptions) || jsonIsEmpty(_activeTagFilters)) {
				updateFilters.update((e) => !e);
			} else {
				$filterOptions = _filterOptions;
				$activeTagFilters = _activeTagFilters;
			}
			resolve();
		})
	);

	// Get Existing Anime List
	initDataPromises.push(
		new Promise(async (resolve) => {
			let shouldProcessRecommendation = await retrieveJSON(
				"shouldProcessRecommendation"
			);
			let recommendedAnimeListLen = await retrieveJSON(
				"recommendedAnimeListLength"
			);
			if (
				!shouldProcessRecommendation &&
				recommendedAnimeListLen?.length
			) {
				loadAnime.update((e) => !e);
			} else {
				updateRecommendationList.update((e) => !e);
			}
			resolve();
		})
	);

	// Get Existing Data If there are any
	initDataPromises.push(
		new Promise(async (resolve) => {
			// Auto Play
			let _autoPlay = await retrieveJSON("autoPlay");
			if (typeof _autoPlay === "boolean") $autoPlay = _autoPlay;
			// Hidden Entries
			$hiddenEntries = (await retrieveJSON("hiddenEntries")) || {};
			resolve();
		})
	);

	Promise.all(initDataPromises)
		.then(async () => {
			$initData = false;
			clearInterval(pleaseWaitStatusInterval);
			if (!$username) {
				let usernameInput = document.getElementById("usernameInput");
				usernameInput.setCustomValidity("Enter your Anilist Username");
				usernameInput.reportValidity();
			}
			// Double Check
			let recommendedAnimeListLen = await retrieveJSON(
				"recommendedAnimeListLength"
			);
			if (recommendedAnimeListLen < 1) {
				updateRecommendationList.update((e) => !e);
			} else if (!$finalAnimeList?.length) {
				loadAnime.update((e) => !e);
			}
		})
		.catch((error) => {
			$initData = false;
			clearInterval(pleaseWaitStatusInterval);
			$dataStatus = "Something went wrong...";
			console.error(error);
		});

	// Reactive Functions
	updateRecommendationList.subscribe(async (val) => {
		if (val === null) return;
		await saveJSON(true, "shouldProcessRecommendation");
		processRecommendedAnimeList()
			.then(async () => {
				await saveJSON(false, "shouldProcessRecommendation");
				loadAnime.update((e) => !e);
			})
			.catch((error) => {
				throw error;
			});
	});
	loadAnime.subscribe(async (val) => {
		if (val === null) return;
		animeLoader()
			.then(async (data) => {
				$animeLoaderWorker = data.animeLoaderWorker;
				$searchedAnimeKeyword = "";
				if ($initData) {
					$finalAnimeList = null; // Loading
				} else {
					$finalAnimeList = data.finalAnimeList;
				}
				$dataStatus = null;
				return;
			})
			.catch((error) => {
				throw error;
			});
	});
	updateFilters.subscribe(async (val) => {
		if (val === null) return;
		getFilterOptions().then((data) => {
			$activeTagFilters = data.activeTagFilters;
			$filterOptions = data.filterOptions;
		});
	});

	let currentScrollTop;
	popupVisible.subscribe((val) => {
		documentScroll(val);
	});
	menuVisible.subscribe((val) => {
		documentScroll(val);
	});
	function documentScroll(val) {
		if (val === true) {
			currentScrollTop = document.documentElement.scrollTop;
			document.documentElement.classList.add("noscroll");
			document.body.classList.add("noscroll");
			document.body.style.top = -currentScrollTop + "px";
		} else if (val === false) {
			document.documentElement.classList.remove("noscroll");
			document.body.classList.remove("noscroll");
			document.body.style.top = "";
			document.documentElement.scrollTop = currentScrollTop;
		}
	}

	onDestroy(() => {});
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
