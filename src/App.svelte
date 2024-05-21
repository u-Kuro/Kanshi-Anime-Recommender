<script>
	import { onMount, tick } from "svelte";
	import { fade } from "svelte/transition";
	import { inject } from "@vercel/analytics";
	import C from "./components/index.js";
	import getWebVersion from "./version.js";
	import { retrieveJSON, saveJSON } from "./js/indexedDB.js";
	import {
		getAnimeEntries,
		getFilterOptions,
		requestAnimeEntries,
		requestUserEntries,
		processRecommendedAnimeList,
		animeManager,
		exportUserData,
		getExtraInfo,
		animeLoader,
	} from "./js/workerUtils.js";
	import {
		getLocalStorage,
		isAndroid,
		isJsonObject,
		isMobile,
		ncsCompare,
		removeLocalStorage,
		setLocalStorage,
	} from "./js/others/helper.js";
	import {
		appID,
		android,
		username,
		hiddenEntries,
		initData,
		gridFullView,
		dataStatus,
		userRequestIsRunning,
		autoUpdate,
		autoUpdateInterval,
		runnedAutoUpdateAt,
		exportPathIsAvailable,
		autoExport,
		autoExportInterval,
		runnedAutoExportAt,
		autoPlay,
		popupVisible,
		menuVisible,
		shouldGoBack,
		isScrolling,
		scrollingTimeout,
		listUpdateAvailable,
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
		showStatus,
		mobile,
		isBackgroundUpdateKey,
		visitedKey,
		orderedFilters,
		algorithmFilters,
		nonOrderedFilters,
		filterConfig,
		animeCautions,
		categories,
		selectedCategory,
		loadedAnimeLists,
		categoriesKeys,
		selectedAnimeGridEl,
		showLoadingAnime,
		// anilistAccessToken,
	} from "./js/globalValues.js";

	$android = isAndroid(); // Android/Browser Identifier
	$mobile = isMobile(); // Mobile/
	// Init Data
	let initDataPromises = [];
	let shouldReloadList;

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
						if (window[$isBackgroundUpdateKey] === true) {
							JSBridge?.backgroundUpdateIsFinished?.(false);
						}
					} catch (e) {}
				}
			} else {
				await saveJSON(true, $visitedKey, true).then(() => {
					try {
						JSBridge?.visited?.(true);
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

		if ($android && window[$isBackgroundUpdateKey] === true) {
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
				.then((data) => {
					shouldReloadList = data.shouldReloadList;
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
							window.shouldUpdateNotifications === true &&
							!(
								window[$isBackgroundUpdateKey] === true &&
								$isBackgroundUpdateKey
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
								$orderedFilters = data?.orderedFilters;
								$nonOrderedFilters = data?.nonOrderedFilters;
								$filterConfig = data?.filterConfig;
								$animeCautions = data?.animeCautions;
								$algorithmFilters = data?.algorithmFilter;
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
					if ($android && window[$isBackgroundUpdateKey] === true) {
						$initData = false;
						try {
							let dataIsUpdated;
							try {
								JSBridge?.setShouldProcessRecommendation?.(
									true,
								);
							} catch (e) {}
							requestUserEntries().finally(() => {
								dataIsUpdated =
									window.KanshiBackgroundShouldProcessRecommendation;
								requestAnimeEntries().finally(() => {
									dataIsUpdated =
										dataIsUpdated ||
										window.KanshiBackgroundShouldProcessRecommendation;
									new Promise(async (resolve) => {
										if (dataIsUpdated) {
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
											try {
												JSBridge?.setShouldProcessRecommendation?.(
													false,
												);
											} catch (e) {}
											resolve();
										}
									}).then((recommendationListIsProcessed) => {
										new Promise(async (resolve) => {
											if (recommendationListIsProcessed) {
												animeManager({
													updateRecommendedAnimeList: true,
												})
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
												try {
													JSBridge?.setShouldLoadAnime?.(
														false,
													);
												} catch (e) {}
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
							let neareastAnimeCompletionAiringDate = new Date(
								neareastAnimeCompletionAiringAt * 1000,
							);
							if (
								!isNaN(neareastAnimeCompletionAiringDate) &&
								neareastAnimeCompletionAiringDate <= new Date()
							) {
								shouldProcessRecommendation = true;
							} else {
								window.setAnimeCompletionUpdateTimeout?.(
									neareastAnimeCompletionAiringAt,
								);
							}
						}
						if (!shouldProcessRecommendation) {
							shouldProcessRecommendation =
								(await retrieveJSON(
									"shouldProcessRecommendation",
								)) ||
								(await retrieveJSON(
									"recommendedAnimeListIsEmpty",
								));
						}
						new Promise(async (resolve) => {
							if (shouldProcessRecommendation) {
								processRecommendedAnimeList().finally(() => {
									resolve(true);
								});
							} else {
								resolve();
							}
						}).then(async (shouldLoadAnime) => {
							shouldLoadAnime =
								shouldLoadAnime ||
								shouldReloadList ||
								(await retrieveJSON("shouldLoadAnime"));
							if (shouldLoadAnime) {
								animeManager({
									updateRecommendedAnimeList: true,
								})
									.then(async () => {
										$initData = false;
										if (shouldReloadList) {
											animeLoader({
												loadInit: true,
											}).then(() => {
												$dataStatus = null;
												checkAutoFunctions(true);
												loadAnalytics();
											});
										} else {
											$dataStatus = null;
											checkAutoFunctions(true);
											loadAnalytics();
										}
										return;
									})
									.catch(initFailed);
							} else {
								$initData = false;
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

	let windowWidth =
		Math.max(
			window.document?.documentElement?.getBoundingClientRect?.()
				?.width || 0,
			window.visualViewport?.width || 0,
			window.innerWidth || 0,
		) || 0;
	let animeListPagerPad = windowWidth > 660 ? 70 : 0;

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
		if ($android && window?.[$isBackgroundUpdateKey] === true) return;
		if ($appID == null) {
			window.kanshiInit?.then?.(() => {
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
		if ($android && window?.[$isBackgroundUpdateKey] === true) return;
		if ($autoExport) {
			if (await autoExportIsPastDate()) {
				exportUserData();
			}
		}
	}

	let addedBackgroundStatusUpdate = () => {
		addedBackgroundStatusUpdate = undefined;
		if (!$android) return;
		if (window?.[$isBackgroundUpdateKey] !== true) return;
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
			}, 750); // 1s with pad
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
		if ($android && window?.[$isBackgroundUpdateKey] === true) return;
		$listUpdateAvailable = false;
		animeManager({ updateRecommendedAnimeList: true });
	});
	importantUpdate.subscribe(async (val) => {
		if (typeof val !== "boolean" || $initData) return;
		if ($android && window?.[$isBackgroundUpdateKey] === true) return;
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
		if ($android && window?.[$isBackgroundUpdateKey] === true) return;
		processRecommendedAnimeList()
			.then(async () => {
				loadAnime.update((e) => !e);
			})
			.catch((error) => {
				loadAnime.update((e) => !e);
				console.error(error);
			});
	});

	async function runLoadAnime() {
		return new Promise(async (resolve) => {
			if (
				($popupVisible ||
					($gridFullView && $selectedAnimeGridEl
						? $selectedAnimeGridEl.scrollLeft > 500
						: $selectedAnimeGridEl?.getBoundingClientRect?.()?.top <
							0)) &&
				$loadedAnimeLists?.[$selectedCategory]?.animeList?.length
			) {
				$listUpdateAvailable = true;
				resolve();
			} else {
				animeManager({ updateRecommendedAnimeList: true });
			}
		});
	}

	loadAnime.subscribe(async (val) => {
		if (typeof val !== "boolean" || $initData) return;
		if ($android && window?.[$isBackgroundUpdateKey] === true) return;
		runLoadAnime();
	});

	window.shouldRefreshAnimeList = async (
		shouldProcessRecommendation,
		shouldLoadAnime,
	) => {
		if ($initData) return;
		$showLoadingAnime = true;
		new Promise(async (resolve) => {
			if (shouldProcessRecommendation) {
				processRecommendedAnimeList()
					.then(() => resolve(true))
					.catch(() => resolve());
			} else {
				resolve(false);
			}
		}).then((thisShouldLoadAnime) => {
			let isAlreadyLoaded = !shouldLoadAnime && !thisShouldLoadAnime;
			if (isAlreadyLoaded) {
				animeLoader({
					updateRecommendedAnimeList: true,
					updateUserList: true,
				}).finally(() => {
					$showLoadingAnime = false;
					window.checkEntries?.();
				});
			} else {
				animeManager({ updateRecommendedAnimeList: true }).finally(
					() => {
						window.checkEntries?.();
					},
				);
			}
		});
	};

	let hourINMS = 60 * 60 * 1000;
	autoUpdate.subscribe(async (val) => {
		if ($android && window?.[$isBackgroundUpdateKey] === true) return;
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
					hourINMS - (new Date().getTime() - $runnedAutoUpdateAt) ||
					0;
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
		return new Promise(async (resolve) => {
			let isPastDate = false;
			$runnedAutoUpdateAt = await retrieveJSON("runnedAutoUpdateAt");
			if ($runnedAutoUpdateAt == null) isPastDate = true;
			else if (
				typeof $runnedAutoUpdateAt === "number" &&
				!isNaN($runnedAutoUpdateAt)
			) {
				if (new Date().getTime() - $runnedAutoUpdateAt >= hourINMS) {
					isPastDate = true;
				}
			}
			return resolve(isPastDate);
		});
	}
	runUpdate.subscribe((val) => {
		if (typeof val !== "boolean" || $initData || !navigator.onLine) return;
		if ($android && window?.[$isBackgroundUpdateKey] === true) return;
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
		if ($android && window?.[$isBackgroundUpdateKey] === true) return;
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
					hourINMS - (new Date().getTime() - $runnedAutoExportAt) ||
					0;
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
		return new Promise(async (resolve) => {
			// Check Run First
			let isPastDate = false;
			$runnedAutoExportAt = await retrieveJSON("runnedAutoExportAt");
			if ($runnedAutoExportAt == null) isPastDate = true;
			else if (
				typeof $runnedAutoExportAt === "number" &&
				!isNaN($runnedAutoExportAt)
			) {
				if (new Date().getTime() - $runnedAutoExportAt >= hourINMS) {
					isPastDate = true;
				}
			}
			return resolve(isPastDate);
		});
	}
	runExport.subscribe((val) => {
		if (typeof val !== "boolean" || $initData) return;
		if ($android && window?.[$isBackgroundUpdateKey] === true) return;
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
		}, 200);
	});

	// Global Function For Android/Browser
	document.addEventListener("visibilitychange", async () => {
		if ($initData || $android || document.visibilityState !== "visible")
			return;
		if ($android && window?.[$isBackgroundUpdateKey] === true) return;
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

	if (window?.history) {
		window.history.scrollRestoration = "manual"; // Disable scrolling to top when navigating back
	}
	let windowWheel = () => {
		$hasWheel = true;
		window.removeEventListener?.("wheel", windowWheel, { passive: true });
	};
	window.addEventListener("wheel", windowWheel, { passive: true });
	window.checkEntries = async () => {
		if ($initData) return;
		if ($android && window[$isBackgroundUpdateKey] === true) return;
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
	window?.addEventListener?.("popstate", () => {
		window.backPressed?.();
	});

	let willExit = false,
		exitScrollTimeout;
	window.backPressed = () => {
		if ($shouldGoBack && !$android) {
			window.history?.go?.(-1); // Only in Browser
		} else {
			if (!$android) {
				window.history?.pushState?.("visited", ""); // Push Popped State
			}
			let activeElement = document?.activeElement;
			if ($confirmIsVisible) {
				handleConfirmationCancelled();
				$confirmIsVisible = false;
				willExit = false;
				return;
			} else if (
				["INPUT", "TEXTAREA"].includes(activeElement?.tagName) &&
				Math.max(
					document?.documentElement?.getBoundingClientRect?.()
						?.width || 0,
					window.visualViewport?.width || 0,
					window.innerWidth || 0,
				) <= 750
			) {
				activeElement?.blur?.();
				if (activeElement?.id === "usernameInput") {
					window.onfocusUsernameInput?.();
				}
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
				if ($gridFullView && $selectedAnimeGridEl) {
					$selectedAnimeGridEl.style.overflow = "hidden";
					$selectedAnimeGridEl.style.overflow = "";
					$selectedAnimeGridEl.scroll({
						left: 0,
						behavior: "smooth",
					});
				} else {
					window.showCategoriesNav?.(true);
					if ($android || !matchMedia("(hover:hover)").matches) {
						document.documentElement.style.overflow = "hidden";
						document.documentElement.style.overflow = "";
					}
					window.scrollTo?.({ top: -9999, behavior: "smooth" });
				}
				return;
			} else {
				if ($gridFullView && $selectedAnimeGridEl) {
					$selectedAnimeGridEl.style.overflow = "hidden";
					$selectedAnimeGridEl.scrollLeft = 0;
					clearTimeout(exitScrollTimeout);
					exitScrollTimeout = setTimeout(() => {
						$selectedAnimeGridEl.style.overflow = "";
					}, 100);
				} else {
					window.showCategoriesNav?.(true);
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
				window.setShouldGoBack?.(true);
				willExit = false;
			}
		}
	};

	function setMinHeight(val = $gridFullView) {
		if (val) {
			document.documentElement.style.minHeight = "";
		} else {
			document.documentElement.style.minHeight =
				screen.height + 65 + "px";
		}
	}

	gridFullView.subscribe(async (val) => {
		setMinHeight(val);
		await tick();
		if (val) {
			if ($selectedAnimeGridEl?.scrollLeft > 500) {
				window.setShouldGoBack?.(false);
			}
		} else {
			if ($selectedAnimeGridEl?.getBoundingClientRect?.()?.top < 0) {
				window.setShouldGoBack?.(false);
			}
		}
	});

	let animeListPagerEl, animeListPagerIsChanging;
	let panningIdx, panningCategory;
	let isBelowNav = false;
	let maxWindowHeight = 0;
	let gridTopPosition = 0,
		gridMaxHeight;
	let gridTopScrolls = {};
	let changingTopPosition,
		topPositionChangeTimeout,
		lastScrollTop,
		lastOffTosetWindow;

	window.addEventListener("scroll", () => {
		const scrollTop = document.documentElement.scrollTop;
		if (!$gridFullView) {
			const element = animeListPagerEl.querySelector(
				"main.viewed .image-grid",
			);
			if (element) {
				const offsetToWindow = element.getBoundingClientRect().top;
				if (
					scrollTop !== lastScrollTop &&
					(offsetToWindow <= 1 || lastOffTosetWindow <= 1)
				) {
					clearTimeout(topPositionChangeTimeout);
					changingTopPosition = true;
				}
				lastScrollTop = scrollTop;
				lastOffTosetWindow = offsetToWindow;
				//
				const category = element?.dataset?.category;
				if (
					category &&
					panningCategory &&
					panningCategory !== category
				) {
					$selectedCategory = panningCategory;
					animeListPagerIsChanging = false;
				}
				if (offsetToWindow > 1) {
					gridTopPosition = 0;
					Array.from(animeListPagerEl.children).forEach((el) => {
						el.scrollTop = 0;
					});
					for (const category in gridTopScrolls) {
						gridTopScrolls[category] = null;
					}
				} else {
					const scrollTop = document.documentElement.scrollTop;
					gridTopPosition = Math.abs(offsetToWindow);
					const category = element.dataset.category;
					const gridOffSetDocument =
						scrollTop + element.getBoundingClientRect().top;
					gridTopScrolls[category] = scrollTop - gridOffSetDocument;
				}
				gridMaxHeight = element?.clientHeight ?? gridMaxHeight;
				topPositionChangeTimeout = setTimeout(async () => {
					await tick();
					changingTopPosition = false;
				}, 30);
			}
		}

		const shouldUpdate =
			$selectedAnimeGridEl?.getBoundingClientRect?.()?.top > 0 &&
			!$popupVisible;
		if ($listUpdateAvailable && shouldUpdate) {
			updateList();
		}
		isBelowNav = scrollTop > 54;
		if (
			$selectedAnimeGridEl?.getBoundingClientRect?.()?.top < 0 &&
			!willExit
		) {
			window?.setShouldGoBack?.(false);
		}
		runIsScrolling.update((e) => !e);
	});

	window.setShouldGoBack = (_shouldGoBack) => {
		if (!_shouldGoBack) willExit = false;
		if ($android) {
			try {
				JSBridge?.setShouldGoBack?.(_shouldGoBack);
			} catch (e) {}
		} else {
			if (window.history?.state !== "visited") {
				// Only Add 1 state
				window.history?.pushState?.("visited", "");
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
			clearTimeout(copytimeoutId);
			copytimeoutId = setTimeout(() => {
				let text = target.dataset.copy;
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
					let text2 = target.dataset.secondCopytarget;
					if (text2 && !ncsCompare(text2, text)) {
						if ($android) {
							window.copyToClipBoard?.(text2);
							window.copyToClipBoard?.(text);
						} else {
							window.copyToClipBoard?.(text2);
							setTimeout(() => {
								window.copyToClipBoard?.(text);
							}, 300);
						}
					} else {
						window.copyToClipBoard?.(text);
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
	let isPersistent;
	$confirmPromise = window.confirmPromise = async (confirmValues) => {
		if (isPersistent && !confirmValues?.isPersistent) return;
		isPersistent = confirmValues?.isPersistent;
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
		isPersistent = false;
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
		isPersistent = false;
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
			isPersistent = false;
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
		if ($android && window?.[$isBackgroundUpdateKey] === true) return;
		$listUpdateAvailable = false;
		animeManager({ updateRecommendedAnimeList: true });
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
				window.open?.(
					"https://github.com/u-Kuro/Kanshi-Anime-Recommender/raw/main/Kanshi.apk",
					"_blank",
				);
			}
		}
	};

	let _progress = 0,
		progressChangeStart = performance.now(),
		isChangingProgress;
	progress.subscribe((val) => {
		if (
			val >= 100 ||
			val <= 0 ||
			performance.now() - progressChangeStart > 300
		) {
			if (_progress < 100 && _progress > 0) {
				_progress = Math.max(val, _progress);
			} else {
				if (isChangingProgress) return;
				isChangingProgress = true;
				setTimeout(() => {
					_progress = val;
					isChangingProgress = false;
				}, 17);
			}
			progressChangeStart = performance.now();
		}
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

	let isMaxWindowHeight;
	onMount(() => {
		window.animeGridScrolled = (scrollLeft) => {
			if (scrollLeft > 500 && !willExit) {
				window.setShouldGoBack?.(false);
			}
			if (!$gridFullView) return;
			runIsScrolling.update((e) => !e);
		};
		document
			.getElementById("popup-container")
			.addEventListener("scroll", () => {
				runIsScrolling.update((e) => !e);
			});
		windowWidth = Math.max(
			document?.documentElement?.getBoundingClientRect?.()?.width,
			window?.visualViewport?.width || 0,
			window?.innerWidth || 0,
		);
		animeListPagerPad = windowWidth > 660 ? 70 : 0;

		let lastWindowHeight = 0;
		if (
			!(
				document.fullScreen ||
				document.mozFullScreen ||
				document.webkitIsFullScreen ||
				document.msFullscreenElement
			)
		) {
			lastWindowHeight = maxWindowHeight =
				Math?.max?.(
					window.visualViewport?.height || 0,
					window.innerHeight || 0,
				) || 0;
		}
		window.addEventListener("resize", () => {
			let newWindowHeight = Math.max(
				window?.visualViewport?.height || 0,
				window?.innerHeight || 0,
			);
			let possibleVirtualKeyboardChange =
				Math.abs(lastWindowHeight - newWindowHeight) >
				Math.max(100, maxWindowHeight * 0.15);
			if (possibleVirtualKeyboardChange) {
				let isPossiblyHid = newWindowHeight > lastWindowHeight;
				window?.showCategoriesNav?.(isPossiblyHid, !isPossiblyHid);
				let activeElement = document?.activeElement;
				if (
					isPossiblyHid &&
					["INPUT", "TEXTAREA"].includes(activeElement?.tagName)
				) {
					activeElement?.blur?.();
					if (activeElement?.id === "usernameInput") {
						window?.onfocusUsernameInput?.();
					}
				}
			}

			setMinHeight();

			if (
				!(
					document.fullScreen ||
					document.mozFullScreen ||
					document.webkitIsFullScreen ||
					document.msFullscreenElement
				)
			) {
				isMaxWindowHeight = newWindowHeight >= maxWindowHeight;
				lastWindowHeight = newWindowHeight;
				maxWindowHeight =
					Math.max(maxWindowHeight, newWindowHeight) || 0;
			}
			windowWidth = Math.max(
				document?.documentElement?.getBoundingClientRect?.()?.width ||
					0,
				window?.visualViewport?.width || 0,
				window?.innerWidth || 0,
			);

			animeListPagerPad = windowWidth > 660 ? 70 : 0;

			window?.scrollToSelectedCategory?.();
		});

		animeListPagerEl.addEventListener("scroll", () => {
			animeListPagerIsChanging = true;
			window.showCategoriesNav?.(true, true);

			let originalScrollLeft = parseInt(animeListPagerEl.scrollLeft);

			let offsetWidth = animeListPagerEl.offsetWidth;

			let base = offsetWidth + animeListPagerPad;
			let idx = Math.round(
				originalScrollLeft / (offsetWidth + animeListPagerPad),
			);

			if (idx >= 0 && idx !== panningIdx) {
				let children = Array.from(animeListPagerEl?.children);
				let child = children?.[idx];
				let category = child?.dataset?.category;
				if (category != null) {
					window?.scrollToSelectedCategory?.(category);
					panningCategory = category;
				}
				panningIdx = idx;
			}

			let remainder = originalScrollLeft % base;
			if (remainder <= 2 || base - remainder <= 2) {
				let children = Array.from(animeListPagerEl?.children);
				let child = children?.[panningIdx];
				let category = child?.dataset?.category;

				if (category && category !== $selectedCategory) {
					$selectedCategory = category;
				}
				animeListPagerIsChanging = false;
			}
		});

		animeListPagerEl.addEventListener("scrollend", () => {
			if (animeListPagerIsChanging) {
				let children = Array.from(animeListPagerEl?.children);
				let child = children?.[panningIdx];
				let category = child?.dataset?.category;

				if (category && category !== $selectedCategory) {
					$selectedCategory = category;
				}
				animeListPagerIsChanging = false;
			}
		});

		let lastViewWidth = window.visualViewport.width;
		window.visualViewport.addEventListener("resize", () => {
			const currentViewWidth = window.visualViewport.width;
			const hasChangedViewWidth = lastViewWidth !== currentViewWidth;
			lastViewWidth = currentViewWidth;
			if (animeListPagerIsChanging) {
				if ($selectedCategory && hasChangedViewWidth) {
					let categoryIdx =
						panningIdx ??
						$categoriesKeys.findIndex(
							(category) => category === $selectedCategory,
						);
					let offsetWidth = animeListPagerEl.offsetWidth;
					let currentScrollLeft = animeListPagerEl.scrollLeft;
					let newScrollLeft =
						categoryIdx * offsetWidth +
						Math.max(0, categoryIdx - 1) * animeListPagerPad;
					if (newScrollLeft > currentScrollLeft) {
						animeListPagerEl.scrollBy({
							left: Number.EPSILON,
						});
					} else if (newScrollLeft < currentScrollLeft) {
						animeListPagerEl.scrollBy({
							left: -Number.EPSILON,
						});
					}
					animeListPagerIsChanging = false;
				}
			}
		});
	});

	let isFirstScroll = true;
	let scrollingCategories = {},
		isChangingSelection;
	window.gridScrolling = (category) => {
		if (!isChangingSelection) return;
		if (scrollingCategories == null) {
			scrollingCategories = {
				category: 1,
			};
		} else {
			scrollingCategories[category] = 1;
		}
	};
	let lastSelectedCategory;
	selectedCategory.subscribe(async (val) => {
		isChangingSelection = true;
		if (val) {
			await tick();
			window?.scrollToSelectedCategory?.(val);
			let categoryIdx =
				$categoriesKeys?.findIndex?.((category) => category === val) ??
				-1;
			if (categoryIdx === -1) {
				scrollingCategories = isChangingSelection = null;
				lastSelectedCategory = val;
				$selectedCategory = $categoriesKeys?.[0] || $selectedCategory;
				animeListPagerIsChanging = false;
				return;
			}
			if (lastSelectedCategory !== val) {
				let offsetWidth = animeListPagerEl.offsetWidth;
				animeListPagerEl.scrollLeft =
					categoryIdx * offsetWidth +
					Math.max(0, categoryIdx - 1) * animeListPagerPad;
				animeListPagerIsChanging = false;
			}
			if ($gridFullView) {
				scrollingCategories = isChangingSelection = null;
				lastSelectedCategory = val;
				return;
			}
			// Scroll To Grid Saved Scroll
			if (isFirstScroll) {
				isFirstScroll = false;
				scrollingCategories = isChangingSelection = null;
				lastSelectedCategory = val;
				return;
			}
			let documentEL = document.documentElement;
			let scrollTop = documentEL.scrollTop;
			let element = Array.from(animeListPagerEl.children).find(
				(el) => el.dataset.category === val,
			);
			if (element) {
				if (scrollingCategories?.[val] == null) {
					let gridToWindow = element.getBoundingClientRect().top + 20;
					let gridOffSetDocument = scrollTop + gridToWindow;
					let selectedGridTopScroll = gridTopScrolls[val];
					if (selectedGridTopScroll != null) {
						documentEL.scrollTop =
							gridOffSetDocument + selectedGridTopScroll;
					} else if (gridToWindow < 1) {
						documentEL.scrollTop = gridOffSetDocument;
					}
				}
				Array.from(animeListPagerEl.children).forEach((el) => {
					let category = el.dataset.category;
					if (val === category) return;
					let gridTopScroll = gridTopScrolls[category];
					if (gridTopScroll) {
						el.scrollTop = gridTopScroll;
					}
				});
			}
		}
		scrollingCategories = isChangingSelection = null;
		lastSelectedCategory = val;
	});
	categories.subscribe(async (val) => {
		if (val) {
			$categoriesKeys = Object.keys(val).sort();
			for (let i = 0, l = $categoriesKeys.length; i < l; i++) {
				if (val?.[$categoriesKeys[i]] == null) {
					delete $loadedAnimeLists?.[$categoriesKeys?.[i]];
				}
			}
		}
	});
	categoriesKeys.subscribe(async (val) => {
		await tick();
		if (
			val instanceof Array &&
			val.length > 0 &&
			typeof $selectedCategory === "string"
		) {
			if (!val.includes($selectedCategory)) {
				let newSelectedCategory = val[0];
				if (typeof newSelectedCategory === "string") {
					$selectedCategory = newSelectedCategory;
				}
			} else {
				window?.scrollToSelectedCategory?.($selectedCategory);
			}
		}
	});
</script>

<main
	id="main"
	class="{($android ? ' android' : '') +
		(isMaxWindowHeight ? ' maxwindowheight' : '') +
		($popupVisible ? ' popupvisible' : '')}"
>
	{#if _progress > 0 && _progress < 100}
		<div
			out:fade="{{ duration: 0, delay: 400 }}"
			on:outrostart="{(e) => {
				e.target.style.setProperty('--progress', '0%');
			}}"
			id="progress"
			class="{'progress' +
				(isBelowNav ? ' is-below-absolute-progress' : '')}"
			style:--progress="{"-" + (100 - _progress) + "%"}"
		></div>
	{/if}

	<C.Fixed.Navigator />

	<C.Fixed.Menu />

	<div class="home" id="home">
		<C.Others.Search />
		<div
			bind:this="{animeListPagerEl}"
			style:--grid-position="{gridTopPosition + "px"}"
			style:--grid-max-height="{gridMaxHeight + "px"}"
			id="anime-list-pager"
			class="{'anime-list-pager' +
				(animeListPagerIsChanging ? ' pager-is-changing' : '') +
				(changingTopPosition ? ' is-changing-top-position' : '') +
				($gridFullView ? ' remove-snap-scroll' : '')}"
			style:--anime-list-pager-pad="{animeListPagerPad + "px"}"
		>
			{#if $categoriesKeys?.length > 0}
				{#each $categoriesKeys || [] as mainCategory (mainCategory)}
					<C.Anime.AnimeGrid {mainCategory} />
				{/each}
			{:else}
				<C.Anime.AnimeGrid mainCategory="{''}" />
			{/if}
		</div>
	</div>

	<C.Fixed.Categories />

	<C.Anime.Fixed.AnimePopup />

	<C.Anime.Fixed.AnimeOptionsPopup />

	<C.Others.Confirm
		showConfirm="{$confirmIsVisible}"
		on:confirmed="{handleConfirmationConfirmed}"
		on:cancelled="{handleConfirmationCancelled}"
		isAlert="{_isAlert}"
		confirmTitle="{_confirmTitle}"
		confirmText="{_confirmText}"
		confirmLabel="{_confirmLabel}"
		cancelLabel="{_cancelLabel}"
		isImportant="{_isImportant}"
	/>
</main>

<style>
	:global(html) {
		color-scheme: dark !important;
		overflow-y: overlay !important;
		scrollbar-gutter: stable !important;
	}
	main {
		width: 100%;
		min-height: calc(100vh - 57px);
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
		height: calc(100% - 57px) !important;
		width: 100%;
		margin: 57px auto 0 !important;
		max-width: 1140px;
	}
	.progress.has-custom-filter-nav,
	:global(.progress:has(~ #nav-container.delayed-full-screen-popup)) {
		position: fixed !important;
	}
	.progress {
		background-color: var(--fg-color);
		position: fixed;
		top: 0px;
		z-index: 1003;
		height: 2px;
		width: 100%;
		transform: translateX(var(--progress));
		-webkit-transform: translateX(var(--progress));
		-ms-transform: translateX(var(--progress));
		-moz-transform: translateX(var(--progress));
		-o-transform: translateX(var(--progress));
		transition: transform 0.3s linear;
	}

	.anime-list-pager {
		--anime-list-pager-pad: 0;
		display: flex;
		overflow-x: auto;
		overflow-y: hidden;
		scroll-snap-type: x mandatory;
		column-gap: var(--anime-list-pager-pad);
		-ms-overflow-style: none;
		scrollbar-width: none;
		width: calc(100% - 100px);
		margin: 0 auto;
	}

	.anime-list-pager::-webkit-scrollbar {
		display: none;
	}

	.anime-list-pager.remove-snap-scroll {
		overflow: hidden !important;
	}

	@media screen and (max-width: 750px) {
		.progress {
			position: absolute;
			height: 1px !important;
			top: 55px !important;
			z-index: 1000;
		}
		.progress.is-below-absolute-progress {
			position: fixed;
			height: 2px !important;
			top: 0px !important;
			z-index: 1003 !important;
		}
		#main.android > #progress.is-below-absolute-progress {
			height: 1px !important;
		}
		:global(
				.progress:has(
						~ #nav-container.delayed-full-screen-popup:not(
								.layout-change
							):not(.hide)
					)
			) {
			height: 1px !important;
			top: 55px !important;
			z-index: 1000 !important;
		}
		.anime-list-pager {
			width: calc(100% - 20px);
		}
	}
</style>
