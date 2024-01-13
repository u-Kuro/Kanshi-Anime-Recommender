<script>
	import { inject } from "@vercel/analytics";
	import getWebVersion from "./version";
	import C from "./components/index.js";
	import { onMount, tick } from "svelte";
	import { fade } from "svelte/transition";
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
		confirmIsVisible,
		animeOptionVisible,
		runUpdate,
		runExport,
		importantLoad,
		importantUpdate,
		updateRecommendationList,
		loadAnime,
		runIsScrolling,
		confirmPromise,
		hasWheel,
		progress,
		popupIsGoingBack,
		dropdownIsVisible,
		newFinalAnime,
		showStatus,
		mobile,
		isBackgroundUpdateKey,
		visitedKey,
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
		getLocalStorage,
		isAndroid,
		isJsonObject,
		isMobile,
		ncsCompare,
		removeLocalStorage,
		setLocalStorage,
		getScrollbarWidth,
		addClass,
		removeClass,
	} from "./js/others/helper.js";

	$android = isAndroid(); // Android/Browser Identifier
	$mobile = isMobile(); // Mobile/
	// Init Data
	let initDataPromises = [];

	window.kanshiInit = new Promise(async (resolve) => {
		// Check App ID
		$appID = await getWebVersion();

		// Check Data Loss
		if ($android) {
			if ($visitedKey && window[$visitedKey] === true) {
				let isAlreadyVisited = await retrieveJSON($visitedKey);
				if (!isAlreadyVisited) {
					window[".androidDataIsEvicted"] = true;
					try {
						JSBridge?.notifyDataEviction?.();
						if (
							$isBackgroundUpdateKey &&
							window?.[$isBackgroundUpdateKey] === true
						) {
							JSBridge?.backgroundUpdateIsFinished?.(false);
						}
					} catch (e) {}
				}
			} else {
				await saveJSON(true, $visitedKey, true).then(() => {
					try {
						let isWebApp =
							!window?.location?.protocol?.includes?.("file");
						JSBridge?.visited?.(isWebApp);
					} catch (e) {}
				});
			}
		}

		// Check App Version Updates
		if ($android && navigator.onLine) {
			try {
				if ($appID) {
					JSBridge?.checkAppID?.($appID, false);
				}
			} catch (e) {
				window.updateAppAlert?.();
			}
		}

		if (
			$android &&
			$isBackgroundUpdateKey &&
			window?.[$isBackgroundUpdateKey] === true
		) {
			resolve();
		} else {
			$gridFullView =
				$gridFullView ??
				getLocalStorage("gridFullView") ??
				(await retrieveJSON("gridFullView"));
			if ($gridFullView == null) {
				$gridFullView = false;
				setLocalStorage("gridFullView", false)
					.catch(() => {
						removeLocalStorage("gridFullView");
					})
					.finally(() => {
						saveJSON(false, "gridFullView");
					});
			}

			await animeLoader({ loadInit: true })
				.then(async (data) => {
					$animeLoaderWorker = data.animeLoaderWorker;
					if (data?.isNew) {
						if (
							$finalAnimeList?.length > data?.finalAnimeListCount
						) {
							$finalAnimeList = $finalAnimeList?.slice?.(
								0,
								data.finalAnimeListCount,
							);
						}
						if (data?.finalAnimeList?.length > 0) {
							data?.finalAnimeList?.forEach?.((anime, idx) => {
								$newFinalAnime = {
									idx: data.lastShownAnimeListIndex + idx,
									finalAnimeList: anime,
								};
							});
						} else {
							$finalAnimeList = [];
						}
					}
					return;
				})
				.catch(async () => {
					await saveJSON(true, "shouldLoadAnime");
					return;
				})
				.finally(resolve);
		}
	})
		.then(() => {
			// Get Export Folder for Android
			(async () => {
				if ($android) {
					$exportPathIsAvailable =
						$exportPathIsAvailable ??
						getLocalStorage("exportPathIsAvailable") ??
						(await retrieveJSON("exportPathIsAvailable"));
					if ($exportPathIsAvailable == null) {
						$exportPathIsAvailable = false;
						setLocalStorage("exportPathIsAvailable", false)
							.catch(() => {
								removeLocalStorage("exportPathIsAvailable");
							})
							.finally(() => {
								saveJSON(false, "exportPathIsAvailable");
							});
					}
				}
			})();

			// Check/Get/Update/Process Anime Entries
			initDataPromises.push(
				new Promise(async (resolve, reject) => {
					try {
						let shouldGetAnimeEntries = await retrieveJSON(
							"animeEntriesIsEmpty",
						);
						if (shouldGetAnimeEntries === true) {
							$finalAnimeList = null;
							getAnimeEntries()
								.then(() => {
									resolve();
								})
								.catch(async () => {
									reject();
								});
						} else if (shouldGetAnimeEntries === false) {
							resolve();
						} else {
							reject();
						}
					} catch (e) {
						reject(e);
					}
				}),
			);

			// Check/Update/Process User Anime Entries
			initDataPromises.push(
				new Promise(async (resolve, reject) => {
					// let accessToken = getAnilistAccessTokenFromURL();
					// if (accessToken) {
					// 	await saveJSON(accessToken, "access_token");
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
					try {
						let _username = await retrieveJSON("username");
						if (_username !== $username) {
							setLocalStorage("username", _username || "").catch(
								() => {
									removeLocalStorage("username");
								},
							);
							$username = _username;
						}
						if (
							$android &&
							window?.shouldUpdateNotifications === true &&
							!(
								$isBackgroundUpdateKey &&
								window?.[$isBackgroundUpdateKey] === true
							)
						) {
							window.shouldUpdateNotifications = false;
							try {
								JSBridge?.callUpdateNotifications?.();
							} catch (e) {}
						}
						resolve();
					} catch (e) {
						reject(e);
					}
					// }
				}),
			);

			// Check/Get/Update Filter Options Selection
			initDataPromises.push(
				new Promise(async (resolve, reject) => {
					try {
						getFilterOptions()
							.then((data) => {
								$selectedCustomFilter =
									data.selectedCustomFilter;
								$activeTagFilters = data.activeTagFilters;
								$filterOptions = data.filterOptions;
								resolve();
							})
							.catch(() => {
								reject();
							});
					} catch (e) {
						reject(e);
					}
				}),
			);

			Promise.all(initDataPromises)
				.then(async () => {
					$initData = false;
					if (
						$android &&
						$isBackgroundUpdateKey &&
						window?.[$isBackgroundUpdateKey] === true
					) {
						try {
							let dataIsUpdated;
							requestUserEntries().finally(() => {
								dataIsUpdated =
									window.KanshiBackgroundShouldProcessRecommendation;
								requestAnimeEntries().finally(() => {
									dataIsUpdated =
										dataIsUpdated ||
										window.KanshiBackgroundShouldProcessRecommendation;
									new Promise(async (resolve) => {
										if (dataIsUpdated) {
											try {
												JSBridge?.setShouldProcessRecommendation?.(
													true,
												);
											} catch (e) {}
											processRecommendedAnimeList()
												.then(() => {
													try {
														JSBridge?.setShouldProcessRecommendation?.(
															false,
														);
													} catch (e) {}
													resolve(true);
												})
												.catch(resolve);
										} else {
											resolve();
										}
									}).then((recommendationListIsProcessed) => {
										new Promise(async (resolve) => {
											if (recommendationListIsProcessed) {
												animeLoader()
													.then(() => {
														try {
															JSBridge?.setShouldLoadAnime?.(
																false,
															);
														} catch (e) {}
														resolve();
													})
													.finally(resolve);
											} else {
												resolve();
											}
										}).finally(async () => {
											let shouldExport =
												dataIsUpdated ||
												(await autoExportIsPastDate());
											if (shouldExport) {
												$exportPathIsAvailable =
													$exportPathIsAvailable ??
													(await retrieveJSON(
														"exportPathIsAvailable",
													));
												if ($exportPathIsAvailable) {
													$autoExport =
														$autoExport ??
														(await retrieveJSON(
															"autoExport",
														));
													if ($autoExport) {
														await new Promise(
															(resolve) =>
																exportUserData().finally(
																	resolve,
																),
														);
													}
												}
											}
											JSBridge?.backgroundUpdateIsFinished?.(
												true,
											);
										});
									});
								});
							});
						} catch (e) {
							try {
								JSBridge?.backgroundUpdateIsFinished?.(false);
							} catch (e) {}
						}
					} else {
						(async () => {
							if ($android) {
								try {
									JSBridge?.backgroundUpdateIsFinished?.(
										false,
									);
								} catch (e) {}
							}
							if (!isJsonObject($hiddenEntries)) {
								$hiddenEntries =
									(await retrieveJSON("hiddenEntries")) || {};
							}
							$autoPlay =
								$autoPlay ??
								getLocalStorage("autoPlay") ??
								(await retrieveJSON("autoPlay"));
							if ($autoPlay == null) {
								$autoPlay = false;
								setLocalStorage("autoPlay", false)
									.catch(() => {
										removeLocalStorage("autoPlay");
									})
									.finally(() => {
										saveJSON(false, "autoPlay");
									});
							}
							$autoUpdate =
								$autoUpdate ??
								getLocalStorage("autoUpdate") ??
								(await retrieveJSON("autoUpdate"));
							if ($autoUpdate == null) {
								$autoUpdate = false;
								setLocalStorage("autoUpdate", false)
									.catch(() => {
										removeLocalStorage("autoUpdate");
									})
									.finally(() => {
										saveJSON(false, "autoUpdate");
									});
							}
							$autoExport =
								$autoExport ??
								getLocalStorage("autoExport") ??
								(await retrieveJSON("autoExport"));
							if ($autoExport == null) {
								$autoExport = false;
								setLocalStorage("autoExport", false)
									.catch(() => {
										removeLocalStorage("autoExport");
									})
									.finally(() => {
										saveJSON(false, "autoExport");
									});
							}
							$showStatus =
								$showStatus ??
								getLocalStorage("showStatus") ??
								(await retrieveJSON("showStatus"));
							if ($showStatus == null) {
								$showStatus = true;
								setLocalStorage("showStatus", true)
									.catch(() => {
										removeLocalStorage("showStatus");
									})
									.finally(() => {
										saveJSON(true, "showStatus");
									});
							}
						})();
						// Get/Show List
						let shouldProcessRecommendation;
						if (!shouldProcessRecommendation) {
							let lastProcessRecommendationAiringAt =
								getLocalStorage(
									"lastProcessRecommendationAiringAt",
								) ??
								(await retrieveJSON(
									"lastProcessRecommendationAiringAt",
								));
							if (
								typeof lastProcessRecommendationAiringAt ===
									"number" &&
								!isNaN(lastProcessRecommendationAiringAt)
							) {
								let neareastAnimeCompletionAiringAt =
									getLocalStorage(
										"neareastAnimeCompletionAiringAt",
									) ??
									(await retrieveJSON(
										"neareastAnimeCompletionAiringAt",
									));
								if (
									typeof neareastAnimeCompletionAiringAt ===
										"number" &&
									!isNaN(neareastAnimeCompletionAiringAt)
								) {
									window?.setAnimeCompletionUpdateTimeout?.(
										neareastAnimeCompletionAiringAt,
									);
									let neareastAnimeCompletionAiringDate =
										new Date(
											neareastAnimeCompletionAiringAt *
												1000,
										);
									if (
										neareastAnimeCompletionAiringDate <=
											new Date() &&
										lastProcessRecommendationAiringAt >
											neareastAnimeCompletionAiringAt
									) {
										shouldProcessRecommendation = true;
									}
								}
							} else {
								shouldProcessRecommendation = true;
							}
						}
						if (!shouldProcessRecommendation) {
							shouldProcessRecommendation = await retrieveJSON(
								"shouldProcessRecommendation",
							);
						}
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
									.catch(() => {
										resolve(true);
									});
							} else {
								resolve();
							}
						}).then(async (shouldLoadAnime) => {
							if (!shouldLoadAnime) {
								shouldLoadAnime =
									await retrieveJSON("shouldLoadAnime");
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
										$animeLoaderWorker =
											data.animeLoaderWorker;
										if (data?.isNew) {
											if (
												$finalAnimeList?.length >
												data?.finalAnimeListCount
											) {
												$finalAnimeList =
													$finalAnimeList?.slice?.(
														0,
														data.finalAnimeListCount,
													);
											}
											if (
												data?.finalAnimeList?.length > 0
											) {
												data?.finalAnimeList?.forEach?.(
													(anime, idx) => {
														$newFinalAnime = {
															idx:
																data.lastShownAnimeListIndex +
																idx,
															finalAnimeList:
																anime,
														};
													},
												);
											} else {
												$finalAnimeList = [];
											}
											$hiddenEntries =
												data.hiddenEntries ||
												$hiddenEntries;
											$dataStatus = null;
											checkAutoFunctions(true);
											loadAnalytics();
										}
										return;
									})
									.catch(initFailed);
							} else {
								$dataStatus = null;
								checkAutoFunctions(true);
								loadAnalytics();
							}
						});
					}
				})
				.catch(initFailed);
		})
		.finally(() => {
			try {
				delete window?.kanshiInit;
			} catch (e) {}
		});

	async function initFailed(error) {
		checkAutoFunctions(true);
		$dataStatus = "Something went wrong";
		if ($android) {
			try {
				JSBridge?.backgroundUpdateIsFinished?.(false);
			} catch (e) {}
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
		if ($initData) {
			$initData = false;
		}
		console.error(error);
		loadAnalytics();
	}

	let windowWidth = Math.max(
		document?.documentElement?.getBoundingClientRect?.()?.width,
		window.visualViewport.width,
		window.innerWidth,
	);
	let usernameInputEl, animeGridEl;

	$dataStatus = "Retrieving Some Data";
	let pleaseWaitStatusInterval = setInterval(() => {
		if (!$dataStatus) {
			$dataStatus = "Please Wait";
		}
	}, 200);

	// function getAnilistAccessTokenFromURL() {
	// 	let urlParams = new URLSearchParams(window.location.hash.slice(1));
	// 	return urlParams.get("access_token");
	// }
	async function checkAutoFunctions(
		initCheck = false,
		visibilityChange = false,
	) {
		if ($appID == null) {
			window?.kanshiInit?.then?.(() => {
				checkAutoFunctions(initCheck);
			});
		} else if (initCheck) {
			try {
				await requestUserEntries();
				await requestAnimeEntries();
				checkAutoExportOnLoad();
			} catch (e) {
				$dataStatus = "Something went wrong";
				console.error(e);
				checkAutoExportOnLoad();
			}
		} else if ($autoUpdate && (await autoUpdateIsPastDate())) {
			if (!$userRequestIsRunning) {
				requestUserEntries()
					.then(() => {
						requestAnimeEntries().finally(() => {
							checkAutoExportOnLoad();
						});
					})
					.catch((error) => {
						checkAutoExportOnLoad();
						$dataStatus = "Something went wrong";
						console.error(error);
					});
			} else {
				requestAnimeEntries().finally(() => {
					checkAutoExportOnLoad();
				});
			}
		} else if ($autoExport && (await autoExportIsPastDate())) {
			exportUserData().finally(() => {
				if (visibilityChange && !$userRequestIsRunning) {
					requestUserEntries({ visibilityChange: true });
				}
			});
		} else if (visibilityChange && !$userRequestIsRunning) {
			requestUserEntries({ visibilityChange: true });
		}
	}
	async function checkAutoExportOnLoad() {
		if ($autoExport) {
			if (await autoExportIsPastDate()) {
				exportUserData();
			}
		}
	}

	let addedBackgroundStatusUpdate = () => {
		addedBackgroundStatusUpdate = undefined;
		if (window?.[$isBackgroundUpdateKey] !== true) return;
		if (!$android) return;
		if (!$isBackgroundUpdateKey) return;
		let sendBackgroundStatusIsRunning;
		dataStatus.subscribe((val) => {
			if (sendBackgroundStatusIsRunning) return;
			if (!val) return;
			if (typeof val !== "string") return;
			sendBackgroundStatusIsRunning = true;
			setTimeout(() => {
				sendBackgroundStatusIsRunning = false;
				try {
					JSBridge?.sendBackgroundStatus?.(val);
				} catch (e) {}
			}, 1000);
		});
		return true;
	};
	initData.subscribe(async (val) => {
		if (val === false) {
			clearInterval(pleaseWaitStatusInterval);
			if (!addedBackgroundStatusUpdate?.()) {
				getExtraInfo();
			}
		}
	});

	// Reactive Functions
	importantLoad.subscribe(async (val) => {
		if (typeof val !== "boolean" || $initData) return;
		if (
			$android &&
			$isBackgroundUpdateKey &&
			window?.[$isBackgroundUpdateKey] === true
		)
			return;
		$listUpdateAvailable = false;
		if ($animeLoaderWorker) {
			$animeLoaderWorker.terminate();
			$animeLoaderWorker = null;
		}
		animeLoader()
			.then(async (data) => {
				$animeLoaderWorker = data.animeLoaderWorker;
				if (data?.isNew) {
					if ($finalAnimeList?.length > data?.finalAnimeListCount) {
						$finalAnimeList = $finalAnimeList?.slice?.(
							0,
							data.finalAnimeListCount,
						);
					}
					if (data?.finalAnimeList?.length > 0) {
						data?.finalAnimeList?.forEach?.((anime, idx) => {
							$newFinalAnime = {
								idx: data.lastShownAnimeListIndex + idx,
								finalAnimeList: anime,
							};
						});
					} else {
						$finalAnimeList = [];
					}
					$hiddenEntries = data.hiddenEntries || $hiddenEntries;
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
		if (
			$android &&
			$isBackgroundUpdateKey &&
			window?.[$isBackgroundUpdateKey] === true
		)
			return;
		await saveJSON(true, "shouldProcessRecommendation");
		$listUpdateAvailable = false;
		processRecommendedAnimeList()
			.then(async () => {
				importantLoad.update((e) => !e);
			})
			.catch((error) => {
				importantLoad.update((e) => !e);
				console.error(error);
			});
	});
	updateRecommendationList.subscribe(async (val) => {
		if (typeof val !== "boolean" || $initData) return;
		if (
			$android &&
			$isBackgroundUpdateKey &&
			window?.[$isBackgroundUpdateKey] === true
		)
			return;
		await saveJSON(true, "shouldProcessRecommendation");
		processRecommendedAnimeList()
			.then(async () => {
				loadAnime.update((e) => !e);
			})
			.catch((error) => {
				loadAnime.update((e) => !e);
				console.error(error);
			});
	});

	async function runLoadAnime(params = {}) {
		return new Promise(async (resolve) => {
			if (
				($popupVisible ||
					($gridFullView
						? animeGridEl.scrollLeft > 500
						: animeGridEl?.getBoundingClientRect?.()?.top < 0)) &&
				$finalAnimeList?.length
			) {
				await saveJSON(true, "shouldLoadAnime");
				$listUpdateAvailable = true;
				resolve();
			} else {
				if ($animeLoaderWorker) {
					$animeLoaderWorker.terminate();
					$animeLoaderWorker = null;
				}
				animeLoader(params)
					.then(async (data) => {
						$animeLoaderWorker = data.animeLoaderWorker;
						if (data?.isNew) {
							if (
								$finalAnimeList?.length >
								data?.finalAnimeListCount
							) {
								$finalAnimeList = $finalAnimeList?.slice?.(
									0,
									data.finalAnimeListCount,
								);
							}
							if (data?.finalAnimeList?.length > 0) {
								data?.finalAnimeList?.forEach?.(
									(anime, idx) => {
										$newFinalAnime = {
											idx:
												data.lastShownAnimeListIndex +
												idx,
											finalAnimeList: anime,
										};
									},
								);
							} else {
								$finalAnimeList = [];
							}
							$hiddenEntries =
								data.hiddenEntries || $hiddenEntries;
						}
						$dataStatus = null;
						return;
					})
					.catch((error) => {
						console.error(error);
						return;
					})
					.finally(resolve);
			}
		});
	}

	loadAnime.subscribe(async (val) => {
		if (typeof val !== "boolean" || $initData) return;
		if (
			$android &&
			$isBackgroundUpdateKey &&
			window?.[$isBackgroundUpdateKey] === true
		)
			return;
		runLoadAnime();
	});

	window.shouldRefreshAnimeList = async (
		shouldProcessRecommendation,
		shouldLoadAnime,
	) => {
		if ($initData) return;
		new Promise(async (resolve) => {
			if (shouldProcessRecommendation) {
				await saveJSON(true, "shouldProcessRecommendation");
				processRecommendedAnimeList()
					.then(() => resolve(true))
					.catch(() => resolve());
			} else {
				resolve(false);
			}
		}).then((thisShouldLoadAnime) => {
			let isAlreadyLoaded = !shouldLoadAnime && !thisShouldLoadAnime;
			runLoadAnime(isAlreadyLoaded ? { loadInit: true } : {}).finally(
				() => window?.checkEntries?.(),
			);
		});
	};

	let hourINMS = 60 * 60 * 1000;
	autoUpdate.subscribe(async (val) => {
		if (
			$android &&
			$isBackgroundUpdateKey &&
			window?.[$isBackgroundUpdateKey] === true
		)
			return;
		if (val === true) {
			if ($appID != null) {
				saveJSON(true, "autoUpdate");
			}
			// Check Run First
			if (await autoUpdateIsPastDate()) {
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
			$autoUpdateInterval = null;
			if ($appID != null) {
				saveJSON(false, "autoUpdate");
			}
		}
	});
	async function autoUpdateIsPastDate() {
		let isPastDate = false;
		$lastRunnedAutoUpdateDate = await retrieveJSON(
			"lastRunnedAutoUpdateDate",
		);
		if (!$lastRunnedAutoUpdateDate) isPastDate = true;
		else if (
			$lastRunnedAutoUpdateDate instanceof Date &&
			!isNaN($lastRunnedAutoUpdateDate)
		) {
			if (
				new Date().getTime() - $lastRunnedAutoUpdateDate.getTime() >=
				hourINMS
			) {
				isPastDate = true;
			}
		}
		return isPastDate;
	}
	runUpdate.subscribe((val) => {
		if (typeof val !== "boolean" || $initData || !navigator.onLine) return;
		if (
			$android &&
			$isBackgroundUpdateKey &&
			window?.[$isBackgroundUpdateKey] === true
		)
			return;
		if (!$userRequestIsRunning) {
			requestUserEntries()
				.then(() => {
					requestAnimeEntries();
				})
				.catch((error) => {
					$dataStatus = "Something went wrong";
					console.error(error);
				});
		} else {
			requestAnimeEntries();
		}
	});
	autoExport.subscribe(async (val) => {
		if (
			$android &&
			$isBackgroundUpdateKey &&
			window?.[$isBackgroundUpdateKey] === true
		)
			return;
		if (val === true) {
			if ($appID != null) {
				saveJSON(true, "autoExport");
			}
			if (await autoExportIsPastDate()) {
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
			$autoExportInterval = null;
			if ($appID != null) {
				saveJSON(false, "autoExport");
			}
		}
	});
	async function autoExportIsPastDate() {
		// Check Run First
		let isPastDate = false;
		$lastRunnedAutoExportDate = await retrieveJSON(
			"lastRunnedAutoExportDate",
		);
		if (!$lastRunnedAutoExportDate) isPastDate = true;
		else if (
			$lastRunnedAutoExportDate instanceof Date &&
			!isNaN($lastRunnedAutoExportDate)
		) {
			if (
				new Date().getTime() - $lastRunnedAutoExportDate.getTime() >=
				hourINMS
			) {
				isPastDate = true;
			}
		}
		return isPastDate;
	}
	runExport.subscribe((val) => {
		if (typeof val !== "boolean" || $initData) return;
		if (
			$android &&
			$isBackgroundUpdateKey &&
			window?.[$isBackgroundUpdateKey] === true
		)
			return;
		exportUserData();
	});
	window.runExport = () => {
		$runExport = !$runExport;
	};
	runIsScrolling.subscribe((val) => {
		if (typeof val !== "boolean") return;
		$isScrolling = true;
		clearTimeout($scrollingTimeout);
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
	document.addEventListener("visibilitychange", async () => {
		if ($initData || $android || document.visibilityState !== "visible")
			return;
		if (
			$android &&
			$isBackgroundUpdateKey &&
			window?.[$isBackgroundUpdateKey] === true
		)
			return;
		if ($autoUpdate == null) {
			$autoUpdate =
				$autoUpdate ??
				getLocalStorage("autoUpdate") ??
				(await retrieveJSON("autoUpdate"));
			if ($autoUpdate == null) {
				$autoUpdate = false;
				setLocalStorage("autoUpdate", false)
					.catch(() => {
						removeLocalStorage("autoUpdate");
					})
					.finally(() => {
						saveJSON(false, "autoUpdate");
					});
			}
		}
		if ($autoExport == null) {
			$autoExport =
				$autoExport ??
				getLocalStorage("autoExport") ??
				(await retrieveJSON("autoExport"));
			if ($autoExport == null) {
				$autoExport = false;
				setLocalStorage("autoExport", false)
					.catch(() => {
						removeLocalStorage("autoExport");
					})
					.finally(() => {
						saveJSON(false, "autoExport");
					});
			}
		}
		checkAutoFunctions(false, true);
	});

	if ("scrollRestoration" in window.history) {
		window.history.scrollRestoration = "manual"; // Disable scrolling to top when navigating back
	}
	let windowWheel = () => {
		$hasWheel = true;
		window.removeEventListener("wheel", windowWheel, { passive: true });
	};
	window.addEventListener("wheel", windowWheel, { passive: true });
	window.checkEntries = async () => {
		if ($initData) return;
		if (
			$android &&
			$isBackgroundUpdateKey &&
			window?.[$isBackgroundUpdateKey] === true
		)
			return;
		if ($autoUpdate == null) {
			$autoUpdate =
				$autoUpdate ??
				getLocalStorage("autoUpdate") ??
				(await retrieveJSON("autoUpdate"));
			if ($autoUpdate == null) {
				$autoUpdate = false;
				setLocalStorage("autoUpdate", false)
					.catch(() => {
						removeLocalStorage("autoUpdate");
					})
					.finally(() => {
						saveJSON(false, "autoUpdate");
					});
			}
		}
		if ($autoExport == null) {
			$autoExport =
				$autoExport ??
				getLocalStorage("autoExport") ??
				(await retrieveJSON("autoExport"));
			if ($autoExport == null) {
				$autoExport = false;
				setLocalStorage("autoExport", false)
					.catch(() => {
						removeLocalStorage("autoExport");
					})
					.finally(() => {
						saveJSON(false, "autoExport");
					});
			}
		}
		checkAutoFunctions(false, true);
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
					animeGridEl.scroll({ left: 0, behavior: "smooth" });
				} else {
					window?.showCustomFilterNav?.(true);
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
					window?.showCustomFilterNav?.(true);
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
					JSBridge?.willExit?.();
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
	menuVisible.subscribe((val) => {
		if (val === true) window.setShouldGoBack(false);
	});
	let scrollBarWidth = getScrollbarWidth();
	let hasNoScrollWidth = scrollBarWidth != null && scrollBarWidth <= 0;
	popupVisible.subscribe((val) => {
		if (val === true) {
			if (hasNoScrollWidth) {
				addClass(document?.documentElement, "hide-scrollbar");
			}
			addClass(document?.documentElement, "popup-visible");
			window.setShouldGoBack(false);
		} else if (val === false) {
			if (hasNoScrollWidth) {
				removeClass(document?.documentElement, "hide-scrollbar");
			}
			removeClass(document?.documentElement, "popup-visible");
			let shouldUpdate =
				animeGridEl?.getBoundingClientRect?.()?.top > 0 &&
				!$popupVisible;
			if ($listUpdateAvailable && shouldUpdate) {
				updateList();
			}
		}
	});
	let isBelowNav = false;
	window.addEventListener("scroll", () => {
		let shouldUpdate =
			animeGridEl?.getBoundingClientRect?.()?.top > 0 && !$popupVisible;
		if ($listUpdateAvailable && shouldUpdate) {
			updateList();
		}
		isBelowNav = document.documentElement.scrollTop > 45;
		if (animeGridEl?.getBoundingClientRect?.()?.top < 0 && !willExit)
			window.setShouldGoBack(false);
		runIsScrolling.update((e) => !e);
	});

	window.setShouldGoBack = (_shouldGoBack) => {
		if (!_shouldGoBack) willExit = false;
		if ($android) {
			try {
				JSBridge?.setShouldGoBack?.(_shouldGoBack);
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
				JSBridge?.copyToClipBoard?.(text);
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
	window.handleConfirmationCancelled = handleConfirmationCancelled;
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
		if (
			$android &&
			$isBackgroundUpdateKey &&
			window?.[$isBackgroundUpdateKey] === true
		)
			return;
		$listIsUpdating = true;
		if ($animeLoaderWorker) {
			$animeLoaderWorker.terminate();
			$animeLoaderWorker = null;
		}
		animeLoader()
			.then(async (data) => {
				$animeLoaderWorker = data.animeLoaderWorker;
				if (data?.isNew) {
					if ($finalAnimeList?.length > data?.finalAnimeListCount) {
						$finalAnimeList = $finalAnimeList?.slice?.(
							0,
							data.finalAnimeListCount,
						);
					}
					if (data?.finalAnimeList?.length > 0) {
						data?.finalAnimeList?.forEach?.((anime, idx) => {
							$newFinalAnime = {
								idx: data.lastShownAnimeListIndex + idx,
								finalAnimeList: anime,
							};
						});
					} else {
						$finalAnimeList = [];
					}
					$hiddenEntries = data.hiddenEntries || $hiddenEntries;
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
				JSBridge?.downloadUpdate?.();
			} catch (e) {
				window.open(
					"https://github.com/u-Kuro/Kanshi.Anime-Recommendation/raw/main/Kanshi.apk",
					"_blank",
				);
			}
		}
	};

	let _progress = 0,
		progressTimeout,
		progressChangeStart = performance.now();
	progress.subscribe((val) => {
		if (
			val >= 100 ||
			val <= 0 ||
			performance.now() - progressChangeStart > 300
		) {
			clearTimeout(progressTimeout);
			progressTimeout = setTimeout(() => {
				if (_progress < 100 && _progress > 0) {
					_progress = Math.max(val, _progress);
				} else {
					_progress = val;
				}
			}, 16);
			progressChangeStart = performance.now();
		}
	});

	onMount(() => {
		usernameInputEl = document.getElementById("usernameInput");
		animeGridEl = document.getElementById("anime-grid");
		animeGridEl?.addEventListener("scroll", () => {
			if (animeGridEl.scrollLeft > 500 && !willExit)
				window.setShouldGoBack(false);
			if (!$gridFullView) return;
			runIsScrolling.update((e) => !e);
		});
		document
			.getElementById("popup-container")
			.addEventListener("scroll", () => {
				runIsScrolling.update((e) => !e);
			});
		windowWidth = Math.max(
			document?.documentElement?.getBoundingClientRect?.()?.width,
			window.visualViewport.width,
			window.innerWidth,
		);
		let maxWindowHeight = 0;
		let lastWindowHeight = (maxWindowHeight =
			Math.max(window.visualViewport.height, window.innerHeight) || 0);
		window.addEventListener("resize", () => {
			let newWindowHeight =
				Math.max(window.visualViewport.height, window.innerHeight) || 0;
			let possibleVirtualKeyboardChange =
				Math.abs(lastWindowHeight - newWindowHeight) >
				Math.max(100, maxWindowHeight * 0.15);
			if (possibleVirtualKeyboardChange) {
				let isPossiblyHid = newWindowHeight > lastWindowHeight;
				window?.showCustomFilterNav?.(isPossiblyHid, !isPossiblyHid);
				if (isPossiblyHid) {
					document?.activeElement?.blur?.();
				}
			}
			lastWindowHeight = newWindowHeight;
			maxWindowHeight = Math.max(maxWindowHeight, newWindowHeight) || 0;
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

	function loadAnalytics() {
		(async () => {
			// For Youtube API
			window.onYouTubeIframeAPIReady = () => {
				window.playMostVisibleTrailer?.();
			};
			let YTscript = document.createElement("script");
			YTscript.src = "https://www.youtube.com/iframe_api?v=16";
			YTscript.id = "www-widgetapi-script";
			YTscript.defer = true;
			YTscript.onload = () => {
				window?.onYouTubeIframeAPIReady?.();
			};
			document.head.appendChild(YTscript);

			let isVercel =
				window?.location?.origin === "https://kanshi.vercel.app";
			// Google Analytics
			let GAscript = document.createElement("script");
			if (isVercel) {
				inject?.(); // Vercel Analytics
				GAscript.src =
					"https://www.googletagmanager.com/gtag/js?id=G-F5E8XNQS20";
			} else {
				GAscript.src =
					"https://www.googletagmanager.com/gtag/js?id=G-PPMY92TJCE";
			}
			GAscript.defer = true;
			GAscript.onload = () => {
				window.dataLayer = window.dataLayer || [];
				function gtag() {
					dataLayer.push(arguments);
				}
				gtag("js", new Date());
				if (isVercel) {
					gtag("config", "G-F5E8XNQS20");
				} else {
					gtag("config", "G-PPMY92TJCE");
				}
			};
			document.head.appendChild(GAscript);
		})();
	}

	let delayedPopupVis, delayedMenuVis;
	popupVisible.subscribe((val) => {
		if (!val && !$menuVisible) {
			setTimeout(() => {
				delayedPopupVis = val;
			}, 200);
		} else {
			delayedPopupVis = val;
		}
	});

	menuVisible.subscribe((val) => {
		if (!val && !$popupVisible) {
			setTimeout(() => {
				delayedMenuVis = val;
			}, 200);
		} else {
			delayedMenuVis = val;
		}
	});
</script>

<main
	id="main"
	class={($popupVisible || $menuVisible ? "full-screen-popup" : "") +
		(delayedPopupVis || delayedMenuVis
			? " delayed-full-screen-popup"
			: "") +
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
	:global(html) {
		overflow-y: overlay !important;
		scrollbar-gutter: stable !important;
	}
	@media screen and (min-width: 750px) {
		:global(html::-webkit-scrollbar) {
			width: 16px;
		}
		:global(html::-webkit-scrollbar-thumb) {
			height: 72px;
			border-radius: 10px;
			border: 5px solid transparent;
			background-clip: content-box;
			background-color: hsl(0, 0%, 50%);
		}
		:global(html::-webkit-scrollbar-track) {
			background: transparent;
		}
	}
	:global(html.hide-scrollbar) {
		overflow: hidden !important;
		scrollbar-gutter: auto !important;
	}
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
		background-color: var(--fg-color);
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
		#main.android > #progress.is-below-absolute-progress {
			height: 1px !important;
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
