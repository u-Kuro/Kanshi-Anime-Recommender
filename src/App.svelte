<script>
	import getWebVersion from "./version";
	import C from "./components/index.js";
	import { onMount, tick } from "svelte";
	import { fade } from "svelte/transition";
	import { inject } from "@vercel/analytics";
	import { retrieveJSON, saveJSON } from "./js/indexedDB.js";
	import {
		appID,
		android,
		username,
		hiddenEntries,
		filterOptions,
		selectedCustomFilter,
		activeTagFilters,
		finalAnimeList,
		animeLoaderWorker,
		initData,
		gridFullView,
		dataStatus,
		userRequestIsRunning,
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
		listUpdateAvailable,
		listIsUpdating,
		isFullViewed,
		confirmIsVisible,
		// Reactive Functions
		runUpdate,
		runExport,
		importantLoad,
		importantUpdate,
		updateRecommendationList,
		loadAnime,
		updateFilters,
		animeOptionVisible,
		runIsScrolling,
		confirmPromise,
		hasWheel,
		progress,
		popupIsGoingBack,
		dropdownIsVisible,
		// anilistAccessToken,
	} from "./js/globalValues.js";
	import {
		getAnimeEntries,
		getFilterOptions,
		requestAnimeEntries,
		requestUserEntries,
		processRecommendedAnimeList,
		animeLoader,
		exportUserData,
		getExtraInfo,
	} from "./js/workerUtils.js";
	import {
		isAndroid,
		isJsonObject,
		ncsCompare,
		setLocalStorage,
	} from "./js/others/helper.js";

	$android = isAndroid(); // Android/Browser Identifier
	let windowWidth = Math.max(
		document?.documentElement?.getBoundingClientRect?.()?.width,
		window.visualViewport.width,
		window.innerWidth,
	);
	let windowHeight = Math.max(
		window.visualViewport.height,
		window.innerHeight,
	);
	let usernameInputEl, animeGridEl;

	inject(); // Vercel Analytics

	window.onload = () => {
		window.dataLayer = window.dataLayer || [];
		function gtag() {
			dataLayer.push(arguments);
		}
		gtag("js", new Date());
		if (window.location.origin === "https://kanshi.vercel.app") {
			gtag("config", "G-F5E8XNQS20");
		} else {
			gtag("config", "G-PPMY92TJCE");
		}
	}; // Google Analytics

	// For Youtube API
	const onYouTubeIframeAPIReady = new Function();
	window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;

	// Init Data
	let initDataPromises = [];
	$dataStatus = "Getting Existing Data";
	let pleaseWaitStatusInterval = setInterval(() => {
		if (!$dataStatus) {
			$dataStatus = "Please Wait";
		}
	}, 200);

	new Promise(async (resolve) => {
		// Check App ID
		$appID = await getWebVersion();
		if ($android && navigator.onLine) {
			try {
				if ($appID) {
					JSBridge.checkAppID($appID, false);
				}
			} catch (e) {
				window.updateAppAlert?.();
			}
		}

		let _gridFullView = (await retrieveJSON("gridFullView")) ?? false;
		if (typeof _gridFullView === "boolean") {
			setLocalStorage("gridFullView", _gridFullView);
			$gridFullView = _gridFullView;
		}
		await animeLoader({ loadInit: true })
			.then(async (data) => {
				$animeLoaderWorker = data.animeLoaderWorker;
				if (data?.isNew) {
					$finalAnimeList = data.finalAnimeList;
					resolve();
				}
			})
			.catch(async () => {
				await saveJSON(true, "shouldLoadAnime");
				resolve();
			});
	}).then(() => {
		// Get Export Folder for Android
		if (!$android) {
			(async () => {
				$exportPathIsAvailable = await retrieveJSON(
					"exportPathIsAvailable",
				);
				if (typeof $exportPathIsAvailable === "boolean") {
					setLocalStorage(
						"exportPathIsAvailable",
						$exportPathIsAvailable,
					);
				}
			})();
		}
		// Check/Get/Update/Process Anime Entries
		initDataPromises.push(
			new Promise(async (resolve, reject) => {
				let _lastAnimeUpdate = await retrieveJSON("lastAnimeUpdate");
				let shouldGetAnimeEntries = !(
					_lastAnimeUpdate instanceof Date && !isNaN(_lastAnimeUpdate)
				);
				if (!shouldGetAnimeEntries) {
					let animeEntriesIsEmpty = await retrieveJSON(
						"animeEntriesIsEmpty",
					);
					if (animeEntriesIsEmpty) {
						shouldGetAnimeEntries = true;
					}
				}
				if (shouldGetAnimeEntries) {
					$finalAnimeList = null;
					getAnimeEntries()
						.then(() => {
							resolve();
						})
						.catch(async () => {
							reject();
						});
				} else {
					resolve();
				}
			}),
		);

		// Check/Update/Process User Anime Entries
		initDataPromises.push(
			new Promise(async (resolve) => {
				// let accessToken = getAnilistAccessTokenFromURL();
				// if (accessToken) {
				// 	await saveIDBdata(accessToken, "access_token");
				// 	$anilistAccessToken = accessToken;
				// } else {
				// 	$anilistAccessToken = await retrieveJSON("access_token");
				// }
				// if ($anilistAccessToken) {
				// 	let getUsername = () => {
				// 		fetch("https://graphql.anilist.co", {
				// 			method: "POST",
				// 			headers: {
				// 				Authorization: "Bearer " + $anilistAccessToken,
				// 				"Content-Type": "application/json",
				// 				Accept: "application/json",
				// 			},
				// 			body: JSON.stringify({
				// 				query: `{Viewer{name}}`,
				// 			}),
				// 		})
				// 			.then(async (response) => {
				// 				return await response.json();
				// 			})
				// 			.then(async (result) => {
				// 				if (
				// 					typeof result?.errors?.[0]?.message === "string"
				// 				) {
				// 					setTimeout(() => {
				// 						return getUsername();
				// 					}, 60000);
				// 				} else {
				// 					let savedUsername = await retrieveJSON(
				// 						"username"
				// 					);
				// 					let _username = result.data.Viewer.name;
				// 					if (_username && savedUsername !== _username) {
				// 						requestUserEntries({
				// 							username: _username,
				// 						})
				// 							.then(({ newusername }) => {
				// 								if (newusername) {
				// 									$username = newusername || "";
				// 									importantUpdate.update(
				// 										(e) => !e
				// 									);
				// 								}
				// 							})
				// 							.catch((error) => {
				// 								$dataStatus =
				// 									"Something went wrong";
				// 								console.error(error);
				// 							});
				// 					} else {
				// 						$username =
				// 							_username || savedUsername || "";
				// 					}
				// 					resolve();
				// 				}
				// 			})
				// 			.catch(() => {
				// 				setTimeout(() => {
				// 					return getUsername();
				// 				}, 60000);
				// 				resolve();
				// 			});
				// 	};
				// 	getUsername();
				// } else {
				let _username = await retrieveJSON("username");
				if (_username) {
					setLocalStorage("username", _username);
					$username = _username;
				}
				resolve();
				// }
			}),
		);

		// Check/Get/Update Filter Options Selection
		initDataPromises.push(
			new Promise(async (resolve, reject) => {
				getFilterOptions()
					.then((data) => {
						$selectedCustomFilter = data.selectedCustomFilter;
						$activeTagFilters = data.activeTagFilters;
						$filterOptions = data.filterOptions;
						resolve();
					})
					.catch(() => {
						reject();
					});
			}),
		);

		Promise.all(initDataPromises)
			.then(async () => {
				$initData = false;
				(async () => {
					if (!isJsonObject($hiddenEntries)) {
						$hiddenEntries = await retrieveJSON("hiddenEntries");
					}
					$autoPlay =
						$autoPlay ?? (await retrieveJSON("autoPlay")) ?? false;
					setLocalStorage("autoPlay", $autoPlay);
					$autoUpdate =
						$autoUpdate ??
						(await retrieveJSON("autoUpdate")) ??
						false;
					setLocalStorage("autoUpdate", $autoUpdate);
					$autoExport =
						$autoExport ??
						(await retrieveJSON("autoExport")) ??
						false;
					setLocalStorage("autoExport", $autoExport);
				})();
				// Get/Show List
				let shouldProcessRecommendation = await retrieveJSON(
					"shouldProcessRecommendation",
				);
				if (shouldProcessRecommendation === undefined) {
					let recommendedAnimeListLen = await retrieveJSON(
						"recommendedAnimeListLength",
					);
					if (recommendedAnimeListLen < 1) {
						shouldProcessRecommendation = true;
					}
				}
				new Promise(async (resolve) => {
					if (shouldProcessRecommendation) {
						processRecommendedAnimeList()
							.then(async () => {
								resolve(false);
							})
							.catch(initFailed);
					} else {
						resolve(true);
					}
				}).then(async (shouldLoadAnime) => {
					if (!shouldLoadAnime) {
						shouldLoadAnime = await retrieveJSON("shouldLoadAnime");
						if (shouldLoadAnime === undefined) {
							let finalAnimeListLen = await retrieveJSON(
								"finalAnimeListLength",
							);
							if (finalAnimeListLen < 1) {
								shouldLoadAnime = true;
							}
						}
					}
					if (shouldLoadAnime) {
						animeLoader()
							.then(async (data) => {
								$animeLoaderWorker = data.animeLoaderWorker;
								if (data?.isNew) {
									$finalAnimeList = data.finalAnimeList;
									$hiddenEntries = data.hiddenEntries;
									$dataStatus = null;
									checkAutoFunctions(true);
								}
								return;
							})
							.catch(initFailed);
					} else {
						$dataStatus = null;
						checkAutoFunctions(true);
					}
				});
			})
			.catch(initFailed);
	});

	async function initFailed() {
		checkAutoFunctions(true);
		$dataStatus = "Something went wrong";
		if ($android) {
			$confirmPromise?.({
				isAlert: true,
				title: "Something went wrong",
				text: "App may not be working properly, you may want to restart and make sure you're running the latest version.",
			});
		} else {
			$confirmPromise?.({
				isAlert: true,
				title: "Something went wrong",
				text: "App may not be working properly, you may want to refresh the page, or if not clear your cookies but backup your data first.",
			});
		}
		$initData = false;
		console.error(error);
	}

	// function getAnilistAccessTokenFromURL() {
	// 	let urlParams = new URLSearchParams(window.location.hash.slice(1));
	// 	return urlParams.get("access_token");
	// }

	async function checkAutoFunctions(initCheck = false) {
		// auto Update
		if (initCheck) {
			$lastRunnedAutoUpdateDate = await retrieveJSON(
				"lastRunnedAutoUpdateDate",
			);
			$lastRunnedAutoExportDate = await retrieveJSON(
				"lastRunnedAutoExportDate",
			);
			$userRequestIsRunning = true;
			requestUserEntries()
				.then(() => {
					$userRequestIsRunning = false;
					requestAnimeEntries().finally(() => {
						checkAutoExportOnLoad();
					});
				})
				.catch((error) => {
					checkAutoExportOnLoad();
					$userRequestIsRunning = false;
					$dataStatus = "Something went wrong";
					console.error(error);
				});
		} else {
			if (autoUpdateIsPastDate() && $autoUpdate) {
				$userRequestIsRunning = true;
				requestUserEntries()
					.then(() => {
						$userRequestIsRunning = false;
						requestAnimeEntries().finally(() => {
							checkAutoExportOnLoad();
						});
					})
					.catch((error) => {
						checkAutoExportOnLoad();
						$userRequestIsRunning = false;
						$dataStatus = "Something went wrong";
						console.error(error);
					});
			} else {
				checkAutoExportOnLoad();
			}
		}
	}
	function checkAutoExportOnLoad() {
		if ($autoExport) {
			if (autoExportIsPastDate()) {
				exportUserData();
			}
		}
	}

	initData.subscribe(async (val) => {
		if (val === false) {
			clearInterval(pleaseWaitStatusInterval);
			getExtraInfo();
		}
	});

	// Reactive Functions
	importantLoad.subscribe(async (val) => {
		if (typeof val !== "boolean" || $initData) return;
		$listUpdateAvailable = false;
		if ($animeLoaderWorker) {
			$animeLoaderWorker.terminate();
			$animeLoaderWorker = null;
		}
		animeLoader()
			.then(async (data) => {
				$animeLoaderWorker = data.animeLoaderWorker;
				if (data?.isNew) {
					$finalAnimeList = data.finalAnimeList;
					$hiddenEntries = data.hiddenEntries;
				}
				$dataStatus = null;
				return;
			})
			.catch((error) => {
				console.error(error);
			});
	});
	importantUpdate.subscribe(async (val) => {
		if (typeof val !== "boolean" || $initData) return;
		await saveJSON(true, "shouldProcessRecommendation");
		$listUpdateAvailable = false;
		processRecommendedAnimeList()
			.then(async () => {
				updateFilters.update((e) => !e);
				importantLoad.update((e) => !e);
			})
			.catch((error) => {
				importantLoad.update((e) => !e);
				console.error(error);
			});
	});
	updateRecommendationList.subscribe(async (val) => {
		if (typeof val !== "boolean" || $initData) return;
		await saveJSON(true, "shouldProcessRecommendation");
		processRecommendedAnimeList()
			.then(async () => {
				updateFilters.update((e) => !e);
				loadAnime.update((e) => !e);
			})
			.catch((error) => {
				loadAnime.update((e) => !e);
				console.error(error);
			});
	});

	loadAnime.subscribe(async (val) => {
		if (typeof val !== "boolean" || $initData) return;
		if (
			($popupVisible ||
				($gridFullView
					? animeGridEl.scrollLeft > 500
					: animeGridEl?.getBoundingClientRect?.()?.top < 0)) &&
			$finalAnimeList?.length
		) {
			await saveJSON(true, "shouldLoadAnime");
			$listUpdateAvailable = true;
		} else {
			if ($animeLoaderWorker) {
				$animeLoaderWorker.terminate();
				$animeLoaderWorker = null;
			}
			animeLoader()
				.then(async (data) => {
					$animeLoaderWorker = data.animeLoaderWorker;
					if (data?.isNew) {
						$finalAnimeList = data.finalAnimeList;
						$hiddenEntries = data.hiddenEntries;
					}
					$dataStatus = null;
					return;
				})
				.catch((error) => {
					console.error(error);
				});
		}
	});
	updateFilters.subscribe(async (val) => {
		if (typeof val !== "boolean" || $initData) return;
		getFilterOptions();
	});
	let hourINMS = 60 * 60 * 1000;
	autoUpdate.subscribe(async (val) => {
		if (val === true) {
			saveJSON(true, "autoUpdate");
			// Check Run First
			if (autoUpdateIsPastDate()) {
				checkAutoFunctions();
				if ($autoUpdateInterval) clearInterval($autoUpdateInterval);
				$autoUpdateInterval = setInterval(() => {
					if ($autoUpdate) {
						checkAutoFunctions();
					}
				}, hourINMS);
			} else {
				let timeLeft =
					hourINMS -
						(new Date().getTime() -
							$lastRunnedAutoUpdateDate?.getTime()) || 0;
				setTimeout(
					() => {
						if ($autoUpdate === false) return;
						checkAutoFunctions();
						if ($autoUpdateInterval)
							clearInterval($autoUpdateInterval);
						$autoUpdateInterval = setInterval(() => {
							if ($autoUpdate) {
								checkAutoFunctions();
							}
						}, hourINMS);
					},
					Math.min(timeLeft, 2000000000),
				);
			}
		} else if (val === false) {
			if ($autoUpdateInterval) clearInterval($autoUpdateInterval);
			saveJSON(false, "autoUpdate");
		}
	});
	function autoUpdateIsPastDate() {
		let isPastDate = false;
		if (!$lastRunnedAutoUpdateDate) isPastDate = true;
		else if (
			$lastRunnedAutoUpdateDate instanceof Date &&
			!isNaN($lastRunnedAutoUpdateDate)
		) {
			if (
				new Date().getTime() - $lastRunnedAutoUpdateDate.getTime() >
				hourINMS
			) {
				isPastDate = true;
			}
		}
		return isPastDate;
	}
	runUpdate.subscribe((val) => {
		if (typeof val !== "boolean" || $initData || !navigator.onLine) return;
		$userRequestIsRunning = true;
		requestUserEntries()
			.then(() => {
				$userRequestIsRunning = false;
				requestAnimeEntries();
			})
			.catch((error) => {
				$userRequestIsRunning = false;
				$dataStatus = "Something went wrong";
				console.error(error);
			});
	});
	autoExport.subscribe(async (val) => {
		if (val === true) {
			saveJSON(true, "autoExport");
			if (autoExportIsPastDate()) {
				checkAutoFunctions();
				if ($autoExportInterval) clearInterval($autoExportInterval);
				$autoExportInterval = setInterval(() => {
					if ($autoExport) {
						checkAutoFunctions();
					}
				}, hourINMS);
			} else {
				let timeLeft =
					hourINMS -
						(new Date().getTime() -
							$lastRunnedAutoExportDate?.getTime()) || 0;
				setTimeout(
					() => {
						if ($autoExport === false) return;
						checkAutoFunctions();
						if ($autoExportInterval)
							clearInterval($autoExportInterval);
						$autoExportInterval = setInterval(() => {
							if ($autoExport) {
								checkAutoFunctions();
							}
						}, hourINMS);
					},
					Math.min(timeLeft, 2000000000),
				);
			}
		} else if (val === false) {
			if ($autoExportInterval) clearInterval($autoExportInterval);
			saveJSON(false, "autoExport");
		}
	});
	function autoExportIsPastDate() {
		// Check Run First
		let isPastDate = false;
		if (!$lastRunnedAutoExportDate) isPastDate = true;
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
		return isPastDate;
	}
	runExport.subscribe((val) => {
		if (typeof val !== "boolean" || $initData) return;
		exportUserData();
	});
	window.runExport = () => {
		$runExport = !$runExport;
	};
	runIsScrolling.subscribe((val) => {
		if (typeof val !== "boolean") return;
		if (!$isScrolling) $isScrolling = true;
		if ($scrollingTimeout) clearTimeout($scrollingTimeout);
		$scrollingTimeout = setTimeout(() => {
			$isScrolling = false;
		}, 500);
	});

	listUpdateAvailable.subscribe((val) => {
		if (!val) {
			$listIsUpdating = false;
		}
	});
	// Global Function For Android/Browser
	document.addEventListener("visibilitychange", () => {
		if ($initData || $android || document.visibilityState !== "visible")
			return;
		if (
			$userRequestIsRunning &&
			(autoUpdateIsPastDate() || autoExportIsPastDate())
		) {
			checkAutoFunctions();
			if ($autoExport && !$autoExportInterval) {
				autoExport.update((e) => e);
			}
			if ($autoUpdate && !$autoUpdateInterval) {
				autoUpdate.update((e) => e);
			}
		} else if (!$userRequestIsRunning) {
			$userRequestIsRunning = true;
			requestUserEntries({ visibilityChange: true }).then(
				() => ($userRequestIsRunning = false),
			);
		}
	});

	if ("scrollRestoration" in window.history) {
		window.history.scrollRestoration = "manual"; // Disable scrolling to top when navigating back
	}
	let windowWheel = () => {
		$hasWheel = true;
		window.removeEventListener("wheel", windowWheel, { passive: true });
	};
	window.addEventListener("wheel", windowWheel, { passive: true });
	window.checkEntries = () => {
		if ($initData) return;
		if (
			$userRequestIsRunning &&
			(autoUpdateIsPastDate() || autoExportIsPastDate())
		) {
			checkAutoFunctions();
			if (!$autoExportInterval) {
				autoExport.update((e) => e);
			}
			if (!$autoUpdateInterval) {
				autoUpdate.update((e) => e);
			}
		} else if (!$userRequestIsRunning) {
			$userRequestIsRunning = true;
			requestUserEntries({ visibilityChange: true }).then(
				() => ($userRequestIsRunning = false),
			);
		}
	};
	window.addEventListener("popstate", () => {
		window.backPressed();
	});

	let willExit = false,
		exitScrollTimeout;
	window.backPressed = () => {
		if ($shouldGoBack && !$android) {
			window.history.go(-1); // Only in Browser
		} else {
			if (!$android) {
				window.history.pushState("visited", ""); // Push Popped State
			}
			if ($confirmIsVisible) {
				handleConfirmationCancelled();
				$confirmIsVisible = false;
				willExit = false;
				return;
			} else if (
				usernameInputEl &&
				usernameInputEl === document?.activeElement &&
				Math.max(
					document?.documentElement?.getBoundingClientRect?.()?.width,
					window.innerWidth,
				) <= 750
			) {
				usernameInputEl?.focus?.();
				usernameInputEl?.blur?.();
				willExit = false;
				return;
			} else if ($menuVisible) {
				$menuVisible = false;
				willExit = false;
				return;
			} else if (window.checkOpenFullScreenItem?.()) {
				window.closeFullScreenItem?.();
				willExit = false;
				return;
			} else if ($popupVisible) {
				$popupVisible = false;
				willExit = false;
				return;
			} else if ($animeOptionVisible) {
				$animeOptionVisible = false;
				willExit = false;
				return;
			} else if ($dropdownIsVisible) {
				$dropdownIsVisible = false;
				willExit = false;
				return;
			} else if (!willExit) {
				willExit = true;
				if ($gridFullView) {
					animeGridEl.style.overflow = "hidden";
					animeGridEl.style.overflow = "";
					animeGridEl?.children?.[0]?.scrollIntoView?.({
						behavior: "smooth",
					});
				} else {
					window.showCustomFilter?.();
					if ($android || !matchMedia("(hover:hover)").matches) {
						document.documentElement.style.overflow = "hidden";
						document.documentElement.style.overflow = "";
					}
					window.scrollTo({ top: -9999, behavior: "smooth" });
				}
				return;
			} else {
				if ($gridFullView) {
					animeGridEl.style.overflow = "hidden";
					animeGridEl.scrollLeft = 0;
					clearTimeout(exitScrollTimeout);
					exitScrollTimeout = setTimeout(() => {
						animeGridEl.style.overflow = "";
					}, 100);
				} else {
					window.showCustomFilter?.();
					if ($android || !matchMedia("(hover:hover)").matches) {
						document.documentElement.style.overflow = "hidden";
					}
					document.documentElement.scrollTop = 0;
					document.body.scrollTop = 0;
					window.scrollY = 0;
					if ($android || !matchMedia("(hover:hover)").matches) {
						clearTimeout(exitScrollTimeout);
						exitScrollTimeout = setTimeout(() => {
							document.documentElement.style.overflow = "";
						}, 100);
					}
				}
				try {
					JSBridge.willExit();
				} catch (e) {}
				window.setShouldGoBack(true);
				willExit = false;
			}
		}
	};
	gridFullView.subscribe(async (val) => {
		await tick();
		if (val) {
			if (animeGridEl?.scrollLeft > 500) {
				window.setShouldGoBack(false);
			}
		} else {
			if (animeGridEl?.getBoundingClientRect?.()?.top < 0) {
				window.setShouldGoBack(false);
			}
		}
	});
	popupVisible.subscribe((val) => {
		if (val === true) window.setShouldGoBack(false);
	});
	menuVisible.subscribe((val) => {
		if (val === true) window.setShouldGoBack(false);
	});
	let isBelowNav = false;
	let updateIconIsManual = false;
	window.addEventListener(
		"scroll",
		() => {
			let shouldUpdate =
				animeGridEl?.getBoundingClientRect?.()?.top > 0 &&
				!$popupVisible;
			if ($listUpdateAvailable && shouldUpdate) {
				updateList();
			}
			isBelowNav = document.documentElement.scrollTop > 47;
			if (animeGridEl?.getBoundingClientRect?.()?.top < 0 && !willExit)
				window.setShouldGoBack(false);
			runIsScrolling.update((e) => !e);
		},
		{ passive: true },
	);

	window.setShouldGoBack = (_shouldGoBack) => {
		if (!_shouldGoBack) willExit = false;
		if ($android) {
			try {
				JSBridge.setShouldGoBack(_shouldGoBack);
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

	let isChangingPopupVisible, isChangingPopupVisibleTimeout;
	popupIsGoingBack.subscribe(() => {
		clearTimeout(isChangingPopupVisibleTimeout);
		isChangingPopupVisible = true;
		isChangingPopupVisibleTimeout = setTimeout(() => {
			isChangingPopupVisible = false;
		}, 500);
	});
	let copytimeoutId;
	let copyhold = false;
	document.addEventListener("pointerdown", (e) => {
		if (e.pointerType === "mouse") return;
		let target = e.target;
		let classList = target.classList;
		if (!classList.contains("copy")) target = target.closest(".copy");
		if (target) {
			copyhold = true;
			if (copytimeoutId) clearTimeout(copytimeoutId);
			copytimeoutId = setTimeout(() => {
				let text = target.getAttribute("copy-value");
				if (
					text &&
					!$isScrolling &&
					copyhold &&
					!isChangingPopupVisible
				) {
					target.style.pointerEvents = "none";
					setTimeout(() => {
						target.style.pointerEvents = "";
					}, 500);
					let text2 = target.getAttribute("copy-value-2");
					if (text2 && !ncsCompare(text2, text)) {
						if ($android) {
							window.copyToClipBoard(text2);
							window.copyToClipBoard(text);
						} else {
							window.copyToClipBoard(text2);
							setTimeout(() => {
								window.copyToClipBoard(text);
							}, 300);
						}
					} else {
						window.copyToClipBoard(text);
					}
				}
			}, 500);
		}
	});
	document.addEventListener("pointerup", (e) => {
		if (e.pointerType === "mouse") return;
		let target = e.target;
		let classList = target.classList;
		if (!classList.contains("copy")) target = target.closest(".copy");
		if (target) {
			copyhold = false;
			if (copytimeoutId) clearTimeout(copytimeoutId);
		}
	});
	document.addEventListener("pointercancel", (e) => {
		if (e.pointerType === "mouse") return;
		let target = e.target;
		let classList = target.classList;
		if (!classList.contains("copy")) target = target.closest(".copy");
		if (target) {
			copyhold = false;
			if (copytimeoutId) clearTimeout(copytimeoutId);
		}
	});

	let _isAlert,
		_confirmTitle,
		_confirmText,
		_confirmLabel,
		_cancelLabel,
		_isImportant;
	let _confirmModalPromise;

	$confirmPromise = window.confirmPromise = async (confirmValues) => {
		return new Promise((resolve) => {
			_isAlert = confirmValues?.isAlert || false;
			_confirmTitle =
				confirmValues?.title ||
				(_isAlert ? "Heads Up" : "Confirmation");
			_confirmText =
				(typeof confirmValues === "string"
					? confirmValues
					: confirmValues?.text) || "Do you want to continue?";
			_confirmLabel = confirmValues?.confirmLabel || "OK";
			_cancelLabel = confirmValues?.cancelLabel || "CANCEL";
			_isImportant = confirmValues?.isImportant ?? false;
			$confirmIsVisible = true;
			_confirmModalPromise = { resolve };
		});
	};
	function handleConfirmationConfirmed() {
		_confirmModalPromise?.resolve?.(true);
		_confirmModalPromise =
			_isAlert =
			_confirmTitle =
			_confirmText =
			_confirmLabel =
			_cancelLabel =
			_isImportant =
				undefined;
		$confirmIsVisible = false;
	}
	function handleConfirmationCancelled() {
		_confirmModalPromise?.resolve?.(false);
		_confirmModalPromise =
			_isAlert =
			_confirmTitle =
			_confirmText =
			_confirmLabel =
			_cancelLabel =
			_isImportant =
				undefined;
		$confirmIsVisible = false;
	}
	confirmIsVisible.subscribe((val) => {
		if (val === false) {
			_confirmModalPromise?.resolve?.(false);
			_confirmModalPromise =
				_isAlert =
				_confirmTitle =
				_confirmText =
				_confirmLabel =
				_cancelLabel =
				_isImportant =
					undefined;
		}
	});

	async function updateList() {
		$listIsUpdating = true;
		if ($animeLoaderWorker) {
			$animeLoaderWorker.terminate();
			$animeLoaderWorker = null;
		}
		animeLoader()
			.then(async (data) => {
				$animeLoaderWorker = data.animeLoaderWorker;
				if (data?.isNew) {
					$finalAnimeList = data.finalAnimeList;
					$hiddenEntries = data.hiddenEntries;
				}
				$dataStatus = null;
				return;
			})
			.catch((error) => {
				console.error(error);
			});
	}

	window.updateAppAlert = async () => {
		if (
			await $confirmPromise?.({
				title: "New updates are available",
				text: "You may want to download the new version.",
				confirmLabel: "DOWNLOAD",
				isImportant: true,
			})
		) {
			try {
				JSBridge.downloadUpdate();
			} catch (e) {
				window.open(
					"https://github.com/u-Kuro/Kanshi.Anime-Recommendation/raw/main/Kanshi.apk",
					"_blank",
				);
			}
		}
	};

	let _progress = 0,
		progressFrame,
		progressChangeStart = performance.now();
	progress.subscribe((val) => {
		if (
			val >= 100 ||
			val <= 0 ||
			performance.now() - progressChangeStart > 300
		) {
			cancelAnimationFrame(progressFrame);
			progressFrame = requestAnimationFrame(() => {
				_progress = val;
			});
			progressChangeStart = performance.now();
		}
	});

	let changeStatusBarColorTimeout;
	$: {
		if ($android) {
			try {
				let isOverlay =
					$animeOptionVisible ||
					$confirmIsVisible ||
					$isFullViewed ||
					($dropdownIsVisible && windowWidth <= 750);
				clearTimeout(changeStatusBarColorTimeout);
				if (isOverlay) {
					JSBridge.changeStatusBarColor(true);
				} else {
					changeStatusBarColorTimeout = setTimeout(() => {
						JSBridge.changeStatusBarColor(false);
					}, 200);
				}
			} catch (e) {}
		}
	}

	onMount(() => {
		usernameInputEl = document.getElementById("usernameInput");
		animeGridEl = document.getElementById("anime-grid");
		animeGridEl?.addEventListener(
			"scroll",
			() => {
				updateIconIsManual =
					animeGridEl?.getBoundingClientRect?.()?.top < 0;
				if (animeGridEl.scrollLeft > 500 && !willExit)
					window.setShouldGoBack(false);
				if (!$gridFullView) return;
				runIsScrolling.update((e) => !e);
			},
			{ passive: true },
		);
		document.getElementById("popup-container").addEventListener(
			"scroll",
			() => {
				runIsScrolling.update((e) => !e);
			},
			{ passive: true },
		);
		windowWidth = Math.max(
			document?.documentElement?.getBoundingClientRect?.()?.width,
			window.visualViewport.width,
			window.innerWidth,
		);
		windowHeight = Math.max(
			window.visualViewport.height,
			window.innerHeight,
		);
		window.addEventListener("resize", () => {
			windowHeight = Math.max(
				window.visualViewport.height,
				window.innerHeight,
			);
			windowWidth = Math.max(
				document?.documentElement?.getBoundingClientRect?.()?.width,
				window.visualViewport.width,
				window.innerWidth,
			);
			if (windowWidth > 750) {
				Object.assign(
					document?.getElementById?.("progress")?.style || {},
					{
						display: "",
						zIndex: "",
					},
				);
			}
		});
	});
</script>

<main
	id="main"
	class={($popupVisible || $menuVisible ? " full-screen-popup" : "") +
		($android ? " android" : "")}
>
	{#if _progress > 0 && _progress < 100}
		<div
			out:fade={{ duration: 0, delay: 400 }}
			on:outrostart={(e) => {
				e.target.style.setProperty("--progress", "0%");
			}}
			id="progress"
			class={"progress" +
				(isBelowNav ? " is-below-absolute-progress" : "")}
			style:--progress={"-" + (100 - _progress) + "%"}
		/>
	{/if}
	<C.Fixed.Navigator />
	<C.Fixed.Menu />

	<div class="home" id="home">
		<C.Others.Search>
			<C.Anime.AnimeGrid />
		</C.Others.Search>
		<C.Anime.Fixed.AnimePopup />
	</div>

	<C.Fixed.CustomFilter />

	<C.Anime.Fixed.AnimeOptionsPopup />
	<C.Others.Confirm
		showConfirm={$confirmIsVisible}
		on:confirmed={handleConfirmationConfirmed}
		on:cancelled={handleConfirmationCancelled}
		isAlert={_isAlert}
		confirmTitle={_confirmTitle}
		confirmText={_confirmText}
		confirmLabel={_confirmLabel}
		cancelLabel={_cancelLabel}
		isImportant={_isImportant}
	/>
</main>

<style>
	main {
		width: 100%;
		min-height: calc(100vh - 48px);
		overflow-x: clip;
	}
	main.android {
		user-select: none !important;
	}
	@media screen and not (pointer: fine) {
		main {
			user-select: none !important;
		}
	}
	.home {
		height: calc(100% - 48px) !important;
		width: 100%;
		margin: 48px auto 0 !important;
		max-width: 1140px;
		padding-left: 50px;
		padding-right: 50px;
	}
	.progress.has-custom-filter-nav,
	:global(#main.full-screen-popup) > .progress {
		position: fixed !important;
	}
	.progress {
		background-color: #909cb8;
		position: fixed;
		top: 0px;
		z-index: 1003;
		height: 0.2em;
		width: 100%;
		transform: translateX(var(--progress));
		-webkit-transform: translateX(var(--progress));
		-ms-transform: translateX(var(--progress));
		-moz-transform: translateX(var(--progress));
		-o-transform: translateX(var(--progress));
		transition: transform 0.3s linear;
	}
	@media screen and (max-width: 750px) {
		.progress {
			position: absolute;
			height: 1px !important;
			top: 46px !important;
			z-index: 1000;
		}
		.progress.is-below-absolute-progress {
			position: fixed;
			height: 0.2em !important;
			top: 0px !important;
			z-index: 1003 !important;
		}

		:global(#main.full-screen-popup) > .progress {
			height: 1px !important;
			top: var(--top) !important;
			z-index: 1000 !important;
		}

		.home {
			padding: 0 1em;
		}
	}
</style>
