<script>
	import C from "./components/index.js";
	import { onMount, onDestroy, tick } from "svelte";
	import { inject } from "@vercel/analytics";
	import { IDBinit, retrieveJSON, saveJSON } from "./js/indexedDB.js";
	import {
		android,
		lastAnimeUpdate,
		username,
		hiddenEntries,
		filterOptions,
		activeTagFilters,
		finalAnimeList,
		animeLoaderWorker,
		initData,
		searchedAnimeKeyword,
		dataStatus,
		autoUpdate,
		autoUpdateInterval,
		lastRunnedAutoUpdateDate,
		exportPathIsAvailable,
		autoExport,
		autoExportInterval,
		lastRunnedAutoExportDate,
		autoPlay,
		popupVisible,
		menuVisible,
		shouldGoBack,
		isScrolling,
		scrollingTimeout,
		// Reactive Functions
		runUpdate,
		runExport,
		updateRecommendationList,
		loadAnime,
		updateFilters,
		animeOptionVisible,
		runIsScrolling,
	} from "./js/globalValues.js";
	import {
		getAnimeEntries,
		getFilterOptions,
		getAnimeFranchises,
		requestAnimeEntries,
		requestUserEntries,
		processRecommendedAnimeList,
		animeLoader,
		exportUserData,
	} from "./js/workerUtils.js";
	import {
		isAndroid,
		isJsonObject,
		jsonIsEmpty,
	} from "./js/others/helper.js";

	$android = isAndroid(); // Android/Browser Identifier

	// Get Export Folder for Android
	(async () => {
		$exportPathIsAvailable = await retrieveJSON("exportPathIsAvailable");
	})();

	inject(); // Vercel Analytics

	window.onload = () => {
		window.dataLayer = window.dataLayer || [];
		function gtag() {
			dataLayer.push(arguments);
		}
		gtag("js", new Date());
		gtag("config", "G-PPMY92TJCE");
	}; // Google Analytics

	// For Youtube API
	const onYouTubeIframeAPIReady = new Function();
	window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;

	// Init Data
	let initDataPromises = [];
	$dataStatus = "Getting Existing Data";
	let pleaseWaitStatusInterval = setInterval(() => {
		if (!$dataStatus) {
			$dataStatus = "Please Wait...";
		}
	}, 300);

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
			// Get Auto Functions
			$lastRunnedAutoUpdateDate = await retrieveJSON(
				"lastRunnedAutoUpdateDate"
			);
			$lastRunnedAutoExportDate = await retrieveJSON(
				"lastRunnedAutoExportDate"
			);
			// Should be After Getting the Dates for Reactive Change
			$autoUpdate = (await retrieveJSON("autoUpdate")) ?? false;
			$autoExport = (await retrieveJSON("autoExport")) ?? false;
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
		if (typeof val !== "boolean") return;
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
		if (typeof val !== "boolean") return;
		animeLoader()
			.then(async (data) => {
				$animeLoaderWorker = data.animeLoaderWorker;
				$searchedAnimeKeyword = "";
				if ($initData) {
					$finalAnimeList = null; // Loading
				} else if (data?.isNew) {
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
		if (typeof val !== "boolean") return;
		getFilterOptions().then((data) => {
			$activeTagFilters = data.activeTagFilters;
			$filterOptions = data.filterOptions;
		});
	});
	let dayInMS = 24 * 60 * 60 * 1000;
	autoUpdate.subscribe(async (val) => {
		if (typeof val !== "boolean") return;
		else if (val === true) {
			saveJSON(true, "autoUpdate");
			// Check Run First
			let isPastDate = false;
			if ($lastRunnedAutoUpdateDate === null) isPastDate = true;
			else if (
				$lastRunnedAutoUpdateDate instanceof Date &&
				!isNaN($lastRunnedAutoUpdateDate)
			) {
				if (
					new Date().getTime() - $lastRunnedAutoUpdateDate.getTime() >
					dayInMS
				) {
					isPastDate = true;
				}
			}
			if (isPastDate) {
				runUpdate.update((e) => !e);
				if ($autoUpdateInterval) clearInterval($autoUpdateInterval);
				$autoUpdateInterval = setInterval(() => {
					if ($autoUpdate) {
						runUpdate.update((e) => !e);
					}
				}, dayInMS);
			} else {
				let timeLeft =
					dayInMS -
						(new Date().getTime() -
							$lastRunnedAutoUpdateDate?.getTime()) || 0;
				setTimeout(() => {
					if ($autoUpdate === false) return;
					runUpdate.update((e) => !e);
					if ($autoUpdateInterval) clearInterval($autoUpdateInterval);
					$autoUpdateInterval = setInterval(() => {
						if ($autoUpdate) {
							runUpdate.update((e) => !e);
						}
					}, dayInMS);
				}, timeLeft);
			}
		} else if (val === false) {
			if ($autoUpdateInterval) clearInterval($autoUpdateInterval);
			saveJSON(false, "autoUpdate");
		}
	});
	runUpdate.subscribe((val) => {
		if (typeof val !== "boolean") return;
		$lastRunnedAutoUpdateDate = new Date();
		saveJSON($lastRunnedAutoUpdateDate, "lastRunnedAutoUpdateDate");
		requestUserEntries()
			.then(() => {
				requestAnimeEntries();
			})
			.catch((error) => {
				console.error(error);
			});
	});
	let hourINMS = 60 * 60 * 1000;
	autoExport.subscribe(async (val) => {
		if (typeof val !== "boolean") return;
		else if (val === true) {
			saveJSON(true, "autoExport");
			// Check Run First
			let isPastDate = false;
			if ($lastRunnedAutoExportDate === null) isPastDate = true;
			else if (
				$lastRunnedAutoExportDate instanceof Date &&
				!isNaN($lastRunnedAutoExportDate)
			) {
				if (
					new Date().getTime() - $lastRunnedAutoExportDate.getTime() >
					hourINMS
				) {
					isPastDate = true;
				}
			}
			if (isPastDate) {
				runExport.update((e) => !e);
				if ($autoExportInterval) clearInterval($autoExportInterval);
				$autoExportInterval = setInterval(() => {
					if ($autoExport) {
						runExport.update((e) => !e);
					}
				}, hourINMS);
			} else {
				let timeLeft =
					hourINMS -
						(new Date().getTime() -
							$lastRunnedAutoExportDate?.getTime()) || 0;
				setTimeout(() => {
					if ($autoExport === false) return;
					runExport.update((e) => !e);
					if ($autoExportInterval) clearInterval($autoExportInterval);
					$autoExportInterval = setInterval(() => {
						if ($autoExport) {
							runExport.update((e) => !e);
						}
					}, hourINMS);
				}, timeLeft);
			}
		} else if (val === false) {
			if ($autoExportInterval) clearInterval($autoExportInterval);
			saveJSON(false, "autoExport");
		}
	});
	runExport.subscribe(() => {
		if (typeof val !== "boolean") return;
		$lastRunnedAutoExportDate = new Date();
		saveJSON($lastRunnedAutoExportDate, "lastRunnedAutoExportDate");
		exportUserData();
	});
	runIsScrolling.subscribe((val) => {
		if (typeof val !== "boolean") return;
		if (!$isScrolling) $isScrolling = true;
		if ($scrollingTimeout) clearTimeout($scrollingTimeout);
		$scrollingTimeout = setTimeout(() => {
			$isScrolling = false;
		}, 1000);
	});

	popupVisible.subscribe((val) => {
		documentScroll(val);
	});
	menuVisible.subscribe((val) => {
		documentScroll(val);
	});
	animeOptionVisible.subscribe((val) => {
		documentScroll(val);
	});
	function documentScroll(val) {
		// if (val === true) {
		// 	currentScrollTop = document.documentElement.scrollTop;
		// 	document.documentElement.classList.add("noscroll");
		// 	document.body.classList.add("noscroll");
		// 	document.body.style.top = -currentScrollTop + "px";
		// } else if (val === false) {
		// 	document.documentElement.classList.remove("noscroll");
		// 	document.body.classList.remove("noscroll");
		// 	document.body.style.top = "";
		// 	document.documentElement.scrollTop = currentScrollTop;
		// }
	}

	// Global Function For Android/Browser
	if ("scrollRestoration" in window.history) {
		window.history.scrollRestoration = "manual"; // Disable scrolling to top when navigating back
	}
	window.addEventListener("popstate", () => {
		window.backPressed();
	});
	window.backPressed = () => {
		if ($shouldGoBack && !$android) {
			window.history.go(-1); // Only in Browser
		} else {
			if (!$android) {
				window.history.pushState("visited", ""); // Push Popped State
			}
			if ($animeOptionVisible) {
				$animeOptionVisible = false;
				return;
			} else if ($menuVisible) {
				$menuVisible = false;
				return;
			} else if ($popupVisible) {
				$popupVisible = false;
				return;
			} else if (window.scrollY > 200) {
				window.scrollTo({ top: 0, behavior: "smooth" });
				return;
			} else {
				window.scrollTo({ top: 0, behavior: "smooth" });
				window.setShoulGoBack(true);
			}
		}
	};
	popupVisible.subscribe((val) => {
		if (typeof val !== "boolean") return;
		if (val === true) window.setShoulGoBack(false);
	});
	menuVisible.subscribe((val) => {
		if (typeof val !== "boolean") return;
		if (val === true) window.setShoulGoBack(false);
	});
	window.addEventListener("scroll", () => {
		if (window.scrollY !== 0) window.setShoulGoBack(false);
		runIsScrolling.update((e) => !e);
	});
	onMount(() => {
		document
			.getElementById("popup-container")
			.addEventListener("scroll", () => {
				runIsScrolling.update((e) => !e);
			});
	});

	window.setShoulGoBack = (_shouldGoBack) => {
		if ($android) {
			try {
				JSBridge.setShoulGoBack(_shouldGoBack);
			} catch (e) {}
		} else {
			if (window.history.state !== "visited") {
				// Only Add 1 state
				window.history.pushState("visited", "");
			}
			$shouldGoBack = _shouldGoBack;
		}
	};

	window.copyToClipBoard = (text) => {
		if ($android) {
			try {
				JSBridge.copyToClipBoard(text);
			} catch (e) {}
		} else {
			navigator?.clipboard?.writeText?.(text);
		}
	};

	let copytimeoutId;
	let copyhold = false;
	document.addEventListener("pointerdown", (e) => {
		let target = e.target;
		let classList = target.classList;
		if (!classList.contains("copy")) target = target.closest(".copy");
		if (target) {
			e.preventDefault();
			copyhold = true;
			if (copytimeoutId) clearTimeout(copytimeoutId);
			copytimeoutId = setTimeout(() => {
				let text = target.getAttribute("copy-value");
				if (text && !$isScrolling && copyhold) {
					target.style.pointerEvents = "none";
					setTimeout(() => {
						target.style.pointerEvents = "";
					}, 500);
					window.copyToClipBoard(text);
				}
			}, 500);
		}
	});
	document.addEventListener("pointerup", (e) => {
		let target = e.target;
		let classList = target.classList;
		if (!classList.contains("copy")) target = target.closest(".copy");
		if (target) {
			copyhold = false;
			if (copytimeoutId) clearTimeout(copytimeoutId);
		}
	});
	document.addEventListener("pointercancel", (e) => {
		let target = e.target;
		let classList = target.classList;
		if (!classList.contains("copy")) target = target.closest(".copy");
		if (target) {
			copyhold = false;
			if (copytimeoutId) clearTimeout(copytimeoutId);
		}
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
