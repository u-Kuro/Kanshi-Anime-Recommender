let g = {},
  request,
  db;
const seasonOrder = { spring: 3, summer: 2, autumn: 1, winter: 0 };
const addedAnimeLen = 33;
const availableFilterTypes = {
  sortdesc: true,
  sortdescending: true,
  sortascending: true,
  sortasc: true,
  topscore: true,
  topscores: true,
  limittopscore: true,
  limittopscores: true,
  topwscore: true,
  limittopwscores: true,
  limittopwscore: true,
  topwscores: true,
  format: true,
  formats: true,
  genre: true,
  genres: true,
  tagcategory: true,
  tagcategories: true,
  tag: true,
  tags: true,
  studio: true,
  studios: true,
  staffrole: true,
  staffroles: true,
  staff: true,
  staffs: true,
  measure: true,
  measures: true,
  average: true,
  averages: true,
  includeunknownvariables: true,
  unknownvariables: true,
  unknownvariable: true,
  includeunknown: true,
  unknown: true,
  samplesizes: true,
  samplesize: true,
  samples: true,
  sample: true,
  size: true,
  minimumpopularity: true,
  minpopularity: true,
  popularity: true,
  minimumaveragescores: true,
  minimumaveragescore: true,
  minimumaverages: true,
  minimumaverage: true,
  minimumscores: true,
  minimumscore: true,
  averagescores: true,
  averagescore: true,
  scores: true,
  score: true,
  minaveragescores: true,
  minaveragescore: true,
  minaverages: true,
  minaverage: true,
  minscores: true,
  minscore: true,
  minimumavescores: true,
  minimumavescore: true,
  minimumave: true,
  avescores: true,
  avescore: true,
  limittopsimilarity: true,
  limittopsimilarities: true,
  limitsimilarity: true,
  limitsimilarities: true,
  topsimilarities: true,
  topsimilarity: true,
  similarities: true,
  similarity: true,
  userscore: true,
  userscores: true,
  wscore: true,
  wscores: true,
  year: true,
  years: true,
  season: true,
  seasons: true,
  userstatus: true,
  status: true,
  title: true,
  titles: true,
};
const topSimilarities = { include: {}, exclude: {} };
self.onmessage = async ({ data }) => {
  if (data.removeIndex !== undefined) {
    g.animeData.splice(data.removeIndex, 1);
  } else if (data.loadMoreAnime) {
    let lastIdx = data.shownAnimeLen;
    self.postMessage({
      animeData: g.animeData.slice(
        lastIdx,
        Math.min(lastIdx + addedAnimeLen, g.animeData.length - 1)
      ),
    });
  } else {
    if (!db) {
      await IDBinit();
    }
    g = await data;
    await preWorker()
      .then(async () => {
        return await mainWorker();
      })
      .then(async () => {
        return await postWorker();
      });
  }
};

async function preWorker() {
  return await new Promise(async (resolve) => {
    g.recList = Object.values((await retrieveJSON("savedRecScheme")) ?? {});
    g.savedHiddenAnimeIDs = (await retrieveJSON("savedHiddenAnimeIDs")) ?? {};
    g.savedTheme = (await retrieveJSON("savedTheme")) ?? "darkMode";
    g.kidsAnimeIsHidden = (await retrieveJSON("kidsAnimeIsHidden")) ?? true;
    g.savedWarnAnime = (await retrieveJSON("savedWarnAnime")) ?? [
      "!genre: !ecchi",
      "!tag: !boys' love",
      "tag: cgi",
      "!tag: !ero guro",
      "!tag: !female harem",
      "tag: full cgi",
      "!tag: !male harem",
      "!tag: !mixed gender harem",
      "!tag: !nudity",
      "!tag: !slavery",
      "!tag: !suicide",
      "!tag: !yuri",
      "!tag: !netorare",
      "!tag: !rape",
    ];
    g.animeSort = "Wscore Desc"; // Default
    return resolve();
  });
}

async function mainWorker() {
  return await new Promise(async (resolve) => {
    let minTopSimilarities = 5;
    // Arrange Filters
    // Table/List Filters
    let filters = [];
    let includes = [];
    let excludes = g.kidsAnimeIsHidden ? ["tag: kids"] : [];
    let filterName;
    for (let i = 0; i < g.savedFilters.length; i++) {
      filterName = g.savedFilters[i].trim().toLowerCase();
      filters.push(filterName);
      if (filterName.charAt(0) === "!") {
        filterName = filterName.slice(1);
        filterName =
          typeof filterName === "string" ? filterName.split(":") : [];
        if (filterName.length > 1) {
          filterName = [filterName.shift(), filterName.join()];
          let type = filterName[0];
          let cinfo = filterName[1].trim().toLowerCase();
          if (cinfo.charAt(0) === "!") {
            cinfo = cinfo.slice(1);
            excludes.push(type + ":" + cinfo);
          } else {
            excludes.push(type + ":" + cinfo);
          }
        } else if (filterName.length === 1) {
          excludes.push(filterName[0]);
        }
      } else includes.push(filterName);
    }
    // Content Warnings
    let savedWarnR = [];
    let savedWarnY = [];
    for (let i = 0; i < g.savedWarnAnime.length; i++) {
      let warnName = g.savedWarnAnime[i].trim().toLowerCase();
      if (warnName.charAt(0) === "!") {
        warnName = warnName.slice(1);
        warnName = typeof warnName === "string" ? warnName.split(":") : [];
        if (warnName.length > 1) {
          warnName = [warnName.shift(), warnName.join()];
          let type = warnName[0];
          let cinfo = warnName[1].trim().toLowerCase();
          if (cinfo.charAt(0) === "!") {
            cinfo = cinfo.slice(1);
            savedWarnR.push(type + ": " + cinfo);
          } else {
            savedWarnR.push(type + ": " + cinfo);
          }
        } else if (warnName.length === 1) {
          savedWarnR.push(warnName[0]);
        }
      } else savedWarnY.push(warnName);
    }
    // FilterOut User Includes and Excludes
    // Note: Order of Sequence is Important Here
    // Include
    // For other Filters
    let ishidden = false;
    let tempRecScheme = [];
    for (let i = 0; i < includes.length; i++) {
      if (typeof includes[i] !== "string") continue;
      // Get the type, seperator, and filter
      let included = includes[i]
        .trim()
        .toLowerCase()
        .split(/(:|>=|<=|>|<)/);
      if (
        included.length > 2 &&
        availableFilterTypes[included[0].replace(/\s|-|_/g, "")]
      ) {
        included = [
          included.shift(),
          included.shift(),
          included.join("").trim(),
        ];
      } else {
        included = included.shift();
      }
      let type, filter, seperator;
      if (typeof included === "string") {
        type = "";
        seperator = null;
        filter = included.trim();
      } else {
        type = included[0].replace(/\s|-|_/g, "");
        seperator = included[1]?.trim() ?? null;
        filter = (included[2] ?? type).trim();
      }
      if (
        type === "limittopwscores" ||
        type === "limittopwscore" ||
        type === "topwscores" ||
        type === "topwscore"
      ) {
        continue;
      }
      if (
        type === "limittopscores" ||
        type === "limittopscore" ||
        type === "topscores" ||
        type === "topscore"
      ) {
        continue;
      }
      if (
        (type === "limittopsimilarity" ||
          type === "limittopsimilarities" ||
          type === "limitsimilarity" ||
          type === "limitsimilarities") &&
        seperator === ":"
      ) {
        if (isaN(filter)) {
          minTopSimilarities = parseFloat(filter);
        }
        continue;
      }
      if (
        (type === "topsimilarities" ||
          type === "topsimilarity" ||
          type === "similarities" ||
          type === "similarity") &&
        seperator === ":"
      ) {
        let tmpfilter = filter.replace(/\s|-|_/g, "");
        if (tmpfilter === "content" || tmpfilter === "contents") {
          topSimilarities.include.contents = true;
          continue;
        }
        if (tmpfilter === "studio" || tmpfilter === "studios") {
          topSimilarities.include.studios = true;
          continue;
        }
        if (tmpfilter === "staff" || tmpfilter === "staffs") {
          topSimilarities.include.staffs = true;
          continue;
        }
      }
      if (
        (type === "sortasc" || type === "sortascending") &&
        seperator === ":"
      ) {
        let tmpfilter = filter.replace(/\s|-|_/g, "");
        if (tmpfilter === "wscore" || tmpfilter === "wscores") {
          g.animeSort = "Wscore Asc";
          continue;
        }
        if (tmpfilter === "score" || tmpfilter === "scores") {
          g.animeSort = "Score Asc";
          continue;
        }
        if (tmpfilter === "averagescore" || tmpfilter === "averagescores") {
          g.animeSort = "Ascore Asc";
          continue;
        }
        if (tmpfilter === "userscore" || tmpfilter === "userscores") {
          g.animeSort = "Uscore Asc";
          continue;
        }
        if (tmpfilter === "popularity") {
          g.animeSort = "Popularity Asc";
          continue;
        }
        if (tmpfilter === "date") {
          g.animeSort = "Date Asc";
          continue;
        }
      }
      if (
        (type === "sortdesc" || type === "sortdescending") &&
        seperator === ":"
      ) {
        let tmpfilter = filter.replace(/\s|-|_/g, "");
        if (tmpfilter === "wscore" || tmpfilter === "wscores") {
          g.animeSort = "Wscore Desc";
          continue;
        }
        if (tmpfilter === "score" || tmpfilter === "scores") {
          g.animeSort = "Score Desc";
          continue;
        }
        if (tmpfilter === "averagescore" || tmpfilter === "averagescores") {
          g.animeSort = "Ascore Desc";
          continue;
        }
        if (tmpfilter === "userscore" || tmpfilter === "userscores") {
          g.animeSort = "Uscore Desc";
          continue;
        }
        if (tmpfilter === "popularity") {
          g.animeSort = "Popularity Desc";
          continue;
        }
        if (tmpfilter === "date") {
          g.animeSort = "Date Desc";
          continue;
        }
      }
      if (equalsNCS("hidden", filter)) {
        ishidden = true;
        continue;
      }
      for (let j = 0; j < g.recList.length; j++) {
        // Numbers
        if (type === "averagescore" || type === "averagescores") {
          if (seperator === ">=") {
            if (isaN(filter))
              if (g.recList[j]?.averageScore >= parseFloat(filter))
                tempRecScheme.push(g.recList[j]);
            continue;
          }
          if (seperator === "<=") {
            if (isaN(filter))
              if (g.recList[j]?.averageScore <= parseFloat(filter))
                tempRecScheme.push(g.recList[j]);
            continue;
          }
          if (seperator === ">") {
            if (isaN(filter))
              if (g.recList[j]?.averageScore > parseFloat(filter))
                tempRecScheme.push(g.recList[j]);
            continue;
          }
          if (seperator === "<") {
            if (isaN(filter))
              if (g.recList[j]?.averageScore < parseFloat(filter))
                tempRecScheme.push(g.recList[j]);
            continue;
          }
          if (seperator === ":") {
            if (isaN(filter))
              if (g.recList[j]?.averageScore === parseFloat(filter))
                tempRecScheme.push(g.recList[j]);
            continue;
          }
        }
        if (type === "userscore" || type === "userscores") {
          if (seperator === ">=") {
            if (isaN(filter))
              if (g.recList[j]?.userScore >= parseFloat(filter))
                tempRecScheme.push(g.recList[j]);
            continue;
          }
          if (seperator === "<=") {
            if (isaN(filter))
              if (g.recList[j]?.userScore <= parseFloat(filter))
                tempRecScheme.push(g.recList[j]);
            continue;
          }
          if (seperator === ">") {
            if (isaN(filter))
              if (g.recList[j]?.userScore > parseFloat(filter))
                tempRecScheme.push(g.recList[j]);
            continue;
          }
          if (seperator === "<") {
            if (isaN(filter))
              if (g.recList[j]?.userScore < parseFloat(filter))
                tempRecScheme.push(g.recList[j]);
            continue;
          }
          if (seperator === ":") {
            if (isaN(filter))
              if (g.recList[j]?.userScore === parseFloat(filter))
                tempRecScheme.push(g.recList[j]);
            continue;
          }
        }
        if (type === "wscore" || type === "wscores") {
          if (seperator === ">=") {
            if (isaN(filter))
              if (g.recList[j]?.weightedScore >= parseFloat(filter))
                tempRecScheme.push(g.recList[j]);
            continue;
          }
          if (seperator === "<=") {
            if (isaN(filter))
              if (g.recList[j]?.weightedScore <= parseFloat(filter))
                tempRecScheme.push(g.recList[j]);
            continue;
          }
          if (seperator === ">") {
            if (isaN(filter))
              if (g.recList[j]?.weightedScore > parseFloat(filter))
                tempRecScheme.push(g.recList[j]);
            continue;
          }
          if (seperator === "<") {
            if (isaN(filter))
              if (g.recList[j]?.weightedScore < parseFloat(filter))
                tempRecScheme.push(g.recList[j]);
            continue;
          }
          if (seperator === ":") {
            if (isaN(filter))
              if (g.recList[j]?.weightedScore === parseFloat(filter))
                tempRecScheme.push(g.recList[j]);
            continue;
          }
        }
        // Score
        if (type === "score" || type === "scores") {
          if (seperator === ">=") {
            if (isaN(filter))
              if (g.recList[j]?.score >= parseFloat(filter))
                tempRecScheme.push(g.recList[j]);
            continue;
          }
          if (seperator === "<=") {
            if (isaN(filter))
              if (g.recList[j]?.score > parseFloat(filter))
                tempRecScheme.push(g.recList[j]);
            continue;
          }
          if (seperator === ">") {
            if (isaN(filter))
              if (g.recList[j]?.score <= parseFloat(filter))
                tempRecScheme.push(g.recList[j]);
            continue;
          }
          if (seperator === "<") {
            if (isaN(filter))
              if (g.recList[j]?.score < parseFloat(filter))
                tempRecScheme.push(g.recList[j]);
            continue;
          }
          if (seperator === ":") {
            if (isaN(filter))
              if (g.recList[j]?.score === parseFloat(filter))
                tempRecScheme.push(g.recList[j]);
            continue;
          }
        }
        // Popularity
        if (type === "popularity") {
          if (seperator === ">=") {
            if (isaN(filter))
              if (g.recList[j]?.popularity >= parseFloat(filter))
                tempRecScheme.push(g.recList[j]);
            continue;
          }
          if (seperator === "<=") {
            if (isaN(filter))
              if (g.recList[j]?.popularity <= parseFloat(filter))
                tempRecScheme.push(g.recList[j]);
            continue;
          }
          if (seperator === ">") {
            if (isaN(filter))
              if (g.recList[j]?.popularity > parseFloat(filter))
                tempRecScheme.push(g.recList[j]);
            continue;
          }
          if (seperator === "<") {
            if (isaN(filter))
              if (g.recList[j]?.popularity < parseFloat(filter))
                tempRecScheme.push(g.recList[j]);
            continue;
          }
          if (seperator === ":") {
            if (isaN(filter))
              if (g.recList[j]?.popularity === parseFloat(filter))
                tempRecScheme.push(g.recList[j]);
            continue;
          }
        }
        // Year
        if (type === "year" || type === "years") {
          if (seperator === ">=") {
            if (isaN(filter))
              if (g.recList[j]?.year >= parseFloat(filter))
                tempRecScheme.push(g.recList[j]);
            continue;
          }
          if (seperator === "<=") {
            if (isaN(filter))
              if (g.recList[j]?.year <= parseFloat(filter))
                tempRecScheme.push(g.recList[j]);
            continue;
          }
          if (seperator === ">") {
            if (isaN(filter))
              if (g.recList[j]?.year > parseFloat(filter))
                tempRecScheme.push(g.recList[j]);
            continue;
          }
          if (seperator === "<") {
            if (!isNaN(filter))
              if (g.recList[j]?.year < parseFloat(filter))
                tempRecScheme.push(g.recList[j]);
            continue;
          }
          if (seperator === ":") {
            if (isaN(filter))
              if (g.recList[j]?.year === parseFloat(filter))
                tempRecScheme.push(g.recList[j]);
            continue;
          }
        }
        // Categories
        if ((type === "format" || type === "formats") && seperator === ":") {
          if (findWord(g.recList[j]?.format, filter)) {
            tempRecScheme.push(g.recList[j]);
            continue;
          }
        }
        if ((type === "season" || type === "seasons") && seperator === ":") {
          if (findWord(g.recList[j]?.season, filter)) {
            tempRecScheme.push(g.recList[j]);
            continue;
          }
        }
        if (type === "userstatus" && seperator === ":") {
          if (findWord(g.recList[j]?.userStatus, filter)) {
            tempRecScheme.push(g.recList[j]);
            continue;
          }
        }
        if (type === "status" && seperator === ":") {
          if (findWord(g.recList[j]?.status, filter)) {
            tempRecScheme.push(g.recList[j]);
            continue;
          }
        }
        if ((type === "title" || type === "titles") && seperator === ":") {
          if (findWord(g.recList[j]?.title, filter)) {
            tempRecScheme.push(g.recList[j]);
            continue;
          }
        }
        if ((type === "studio" || type === "studios") && seperator === ":") {
          if (findWord(Object.keys(g.recList[j]?.studios || {}), filter)) {
            tempRecScheme.push(g.recList[j]);
            continue;
          }
        }
        if ((type === "staff" || type === "staffs") && seperator === ":") {
          if (findWord(Object.keys(g.recList[j]?.staff || {}), filter)) {
            tempRecScheme.push(g.recList[j]);
            continue;
          }
        }
        if ((type === "genre" || type === "genres") && seperator === ":") {
          if (findWord(g.recList[j]?.genres, filter)) {
            tempRecScheme.push(g.recList[j]);
            continue;
          }
        }
        if ((type === "tag" || type === "tags") && seperator === ":") {
          if (findWord(g.recList[j]?.tags, filter)) {
            tempRecScheme.push(g.recList[j]);
            continue;
          }
        }
        // One Word
        if (!seperator) {
          if (
            findWord(g.recList[j]?.format, filter) ||
            findWord(g.recList[j]?.year, filter) ||
            findWord(g.recList[j]?.season, filter) ||
            findWord(g.recList[j]?.userStatus, filter) ||
            findWord(g.recList[j]?.status, filter) ||
            findWord(g.recList[j]?.title, filter) ||
            findWord(Object.keys(g.recList[j]?.studios || {}), filter) ||
            findWord(Object.keys(g.recList[j]?.staff || {}), filter)
          ) {
            tempRecScheme.push(g.recList[j]);
            continue;
          }
          let genres = g.recList[j]?.genres;
          let tags = g.recList[j]?.tags;
          if (typeof genres === "string" || genres instanceof Array) {
            if (findWord(genres, filter)) {
              tempRecScheme.push(g.recList[j]);
              continue;
            }
          }
          if (typeof tags === "string" || tags instanceof Array) {
            if (findWord(tags, filter)) {
              tempRecScheme.push(g.recList[j]);
              continue;
            }
          }
        }
      }
      g.recList = tempRecScheme;
      tempRecScheme = [];
    }

    // Exclude
    for (let i = 0; i < excludes.length; i++) {
      if (typeof excludes[i] !== "string") continue;
      // Get the type, seperator, and filter
      let excluded = excludes[i]
        .trim()
        .toLowerCase()
        .split(/(:|>=|<=|>|<)/);
      if (
        excluded.length > 2 &&
        availableFilterTypes[excluded[0].replace(/\s|-|_/g, "")]
      ) {
        excluded = [
          excluded.shift(),
          excluded.shift(),
          excluded.join("").trim(),
        ];
      } else {
        excluded = excluded.shift();
      }
      let type, filter, seperator;
      if (typeof excluded === "string") {
        type = "";
        seperator = null;
        filter = excluded.trim();
      } else {
        type = excluded[0].replace(/\s|-|_/g, "");
        seperator = excluded[1]?.trim() ?? null;
        filter = (excluded[2] ?? type).trim();
      }
      if (
        (type === "topsimilarities" ||
          type === "topsimilarity" ||
          type === "similarities" ||
          type === "similarity") &&
        seperator === ":"
      ) {
        let tmpfilter = filter.replace(/\s|-|_/g, "");
        if (tmpfilter === "content" || tmpfilter === "contents") {
          topSimilarities.exclude.contents = true;
          continue;
        }
        if (tmpfilter === "studio" || tmpfilter === "studios") {
          topSimilarities.exclude.studios = true;
          continue;
        }
        if (tmpfilter === "staff" || tmpfilter === "staffs") {
          topSimilarities.exclude.staffs = true;
          continue;
        }
      }
      for (let j = 0; j < g.recList.length; j++) {
        if (
          (type === "averagescore" || type === "averagescores") &&
          seperator === ":"
        ) {
          if (isaN(filter))
            if (g.recList[j]?.averageScore === parseFloat(filter)) continue;
        }
        if (
          (type === "userscore" || type === "userscores") &&
          seperator === ":"
        ) {
          if (isaN(filter))
            if (g.recList[j]?.userScore === parseFloat(filter)) continue;
        }
        if ((type === "wscore" || type === "wscores") && seperator === ":") {
          if (isaN(filter))
            if (g.recList[j]?.weightedScore === parseFloat(filter)) continue;
        }
        if ((type === "score" || type === "scores") && seperator === ":") {
          if (isaN(filter))
            if (g.recList[j]?.score === parseFloat(filter)) continue;
        }
        if (type === "popularity" && seperator === ":") {
          if (isaN(filter))
            if (g.recList[j]?.popularity === parseFloat(filter)) continue;
        }
        if ((type === "year" || type === "years") && seperator === ":") {
          if (isaN(filter))
            if (g.recList[j]?.year === parseFloat(filter)) continue;
        }
        // Categories
        if ((type === "format" || type === "formats") && seperator === ":") {
          if (findWord(g.recList[j]?.format, filter)) {
            continue;
          }
        }
        if ((type === "season" || type === "seasons") && seperator === ":") {
          if (findWord(g.recList[j]?.season, filter)) {
            continue;
          }
        }
        if (type === "userstatus" && seperator === ":") {
          if (findWord(g.recList[j]?.userStatus, filter)) {
            continue;
          }
        }
        if (type === "status" && seperator === ":") {
          if (findWord(g.recList[j]?.status, filter)) {
            continue;
          }
        }
        if ((type === "title" || type === "titles") && seperator === ":") {
          if (findWord(g.recList[j]?.title, filter)) {
            continue;
          }
        }
        if ((type === "studio" || type === "studios") && seperator === ":") {
          if (findWord(Object.keys(g.recList[j]?.studios || {}), filter)) {
            continue;
          }
        }
        if ((type === "staff" || type === "staffs") && seperator === ":") {
          if (findWord(Object.keys(g.recList[j]?.staff || {}), filter)) {
            continue;
          }
        }
        if ((type === "genre" || type === "genres") && seperator === ":") {
          if (findWord(g.recList[j]?.genres, filter)) {
            continue;
          }
        }
        if ((type === "tag" || type === "tags") && seperator === ":") {
          if (findWord(g.recList[j]?.tags, filter)) {
            continue;
          }
        }
        // One Word
        if (!seperator) {
          if (
            findWord(g.recList[j]?.format, filter) ||
            findWord(g.recList[j]?.year, filter) ||
            findWord(g.recList[j]?.season, filter) ||
            findWord(g.recList[j]?.userStatus, filter) ||
            findWord(g.recList[j]?.status, filter) ||
            findWord(g.recList[j]?.title, filter) ||
            findWord(Object.keys(g.recList[j]?.studios || {}), filter) ||
            findWord(Object.keys(g.recList[j]?.staff || {}), filter)
          ) {
            continue;
          }
          let genres = g.recList[j]?.genres;
          let tags = g.recList[j]?.tags;
          if (typeof genres === "string" || genres instanceof Array) {
            if (findWord(genres, filter)) {
              continue;
            }
          }
          if (typeof tags === "string" || tags instanceof Array) {
            if (findWord(tags, filter)) {
              continue;
            }
          }
        }
        // else add Anime if it doesn't have any excluded content
        tempRecScheme.push(g.recList[j]);
      }
      g.recList = tempRecScheme;
      tempRecScheme = [];
    }

    // Filter for Limiting Items In List
    for (let i = 0; i < includes.length; i++) {
      if (typeof includes[i] !== "string") continue;
      // Get the type, seperator, and filter
      let included = includes[i]
        .trim()
        .toLowerCase()
        .split(/(:|>=|<=|>|<)/);
      if (
        included.length > 2 &&
        availableFilterTypes[included[0].replace(/\s|-|_/g, "")]
      ) {
        included = [
          included.shift(),
          included.shift(),
          included.join("").trim(),
        ];
      } else {
        included = included.shift();
      }
      let type, filter, seperator;
      if (typeof included === "string") {
        type = "";
        seperator = null;
        filter = included.trim();
      } else {
        type = included[0].replace(/\s|-|_/g, "");
        seperator = included[1]?.trim() ?? null;
        filter = (included[2] ?? type).trim();
      }
      if (seperator === ":" && isaN(filter) && g.recList instanceof Array) {
        if (
          type === "limittopwscores" ||
          type === "limittopwscore" ||
          type === "topwscores" ||
          type === "topwscore"
        ) {
          g.recList = g.recList
            .sort(
              (a, b) =>
                parseFloat(b?.weightedScore ?? 0) -
                parseFloat(a?.weightedScore ?? 0)
            )
            .filter((e) =>
              ishidden
                ? g.savedHiddenAnimeIDs[e?.id]
                : !g.savedHiddenAnimeIDs[e?.id]
            )
            .slice(0, parseFloat(filter));
        }
        if (
          type === "limittopscores" ||
          type === "limittopscore" ||
          type === "topscores" ||
          type === "topscore"
        ) {
          g.recList = g.recList
            .sort(
              (a, b) => parseFloat(b?.score ?? 0) - parseFloat(a?.score ?? 0)
            )
            .filter((e) =>
              ishidden
                ? g.savedHiddenAnimeIDs[e?.id]
                : !g.savedHiddenAnimeIDs[e?.id]
            )
            .slice(0, parseFloat(filter));
          break;
        }
      }
    }

    let warnR = {},
      warnY = {};
    // Validate Warn Content
    if (savedWarnR instanceof Array) {
      for (let i = 0; i < savedWarnR.length; i++) {
        if (typeof savedWarnR[i] !== "string") continue;
        // Get the type, seperator, and content
        let savedWarn = savedWarnR[i].trim().toLowerCase().split(/(:)/);
        if (
          savedWarn.length > 2 &&
          availableFilterTypes[savedWarn[0].replace(/\s|-|_/g, "")]
        ) {
          savedWarn = [
            savedWarn.shift(),
            savedWarn.shift(),
            savedWarn.join("").trim(),
          ];
        } else {
          savedWarn = savedWarn.shift();
        }
        let type, content, seperator;
        if (typeof savedWarn === "string") {
          type = "";
          seperator = null;
          content = savedWarn.trim();
        } else {
          type = savedWarn[0].replace(/\s/g, "");
          seperator = savedWarn[1]?.trim() ?? null;
          content = (savedWarn[2] ?? type).trim();
        }
        if (seperator) {
          if (type === "genre" || type === "genres") {
            warnR["genre: " + content] = true;
          }
          if (type === "tag" || type === "tags") {
            warnR["tag: " + content] = true;
          }
          if (type === "userstatus") {
            warnR["user status: " + content] = true;
          }
        } else {
          warnR["genre: " + content] = true;
          warnR["tag: " + content] = true;
          warnR["user status: " + content] = true;
        }
      }
    } else if (isJson(savedWarnR)) {
      warnR = savedWarnR;
    }
    if (savedWarnY instanceof Array) {
      for (let i = 0; i < savedWarnY?.length; i++) {
        if (typeof savedWarnY[i] !== "string") continue;
        // Get the type, seperator, and content
        let savedWarn = savedWarnY[i].trim().toLowerCase().split(/(:)/);
        if (
          savedWarn.length > 2 &&
          availableFilterTypes[savedWarn[0].replace(/\s|-|_/g, "")]
        ) {
          savedWarn = [
            savedWarn.shift(),
            savedWarn.shift(),
            savedWarn.join("").trim(),
          ];
        } else {
          savedWarn = savedWarn.shift();
        }
        let type, content, seperator;
        if (typeof savedWarn === "string") {
          type = "";
          seperator = null;
          content = savedWarn.trim();
        } else {
          type = savedWarn[0].replace(/\s/g, "");
          seperator = savedWarn[1]?.trim() ?? null;
          content = (savedWarn[2] ?? type).trim();
        }
        if (seperator) {
          if (type === "genre" || type === "genres") {
            warnY["genre: " + content] = true;
          }
          if (type === "tag" || type === "tags") {
            warnY["tag: " + content] = true;
          }
          if (type === "userstatus") {
            warnY["user status: " + content] = true;
          }
        } else {
          warnY["genre: " + content] = true;
          warnY["tag: " + content] = true;
          warnY["user status: " + content] = true;
        }
      }
    } else if (isJson(savedWarnY)) {
      warnY = savedWarnY;
    }
    // Sort the Anime
    if (g.animeSort === "Score Desc") {
      g.recList.sort((a, b) => {
        let x = Number(a?.score),
          y = Number(b.score);
        if (!x) return 1;
        if (!y) return -1;
        return y - x;
      });
    } else if (g.animeSort === "Uscore Desc") {
      g.recList.sort((a, b) => {
        let x = Number(a?.userScore),
          y = Number(b.userScore);
        if (!x) return 1;
        if (!y) return -1;
        return y - x;
      });
    } else if (g.animeSort === "Ascore Desc") {
      g.recList.sort((a, b) => {
        let x = Number(a?.averageScore),
          y = Number(b.averageScore);
        if (!x) return 1;
        if (!y) return -1;
        return y - x;
      });
    } else if (g.animeSort === "Popularity Desc") {
      g.recList.sort((a, b) => {
        let x = Number(a?.popularity),
          y = Number(b.popularity);
        if (!x) return 1;
        if (!y) return -1;
        return y - x;
      });
    } else if (g.animeSort === "Date Desc") {
      g.recList.sort((a, b) => {
        // Sort by year (descending), place falsy values at last
        let x = a.year ? a.year : Number.MIN_SAFE_INTEGER;
        let y = b.year ? b.year : Number.MIN_SAFE_INTEGER;
        if (x !== y) return y - x;
        // Sort by season (descending), place falsy values at last
        x = a.season ? a.season.toLowerCase() : "";
        y = b.season ? b.season.toLowerCase() : "";
        if (x !== y) return seasonOrder[y] - seasonOrder[x];
        // Sort by weightedScore (descending), place falsy values at last
        x = a.weightedScore ? a.weightedScore : Number.MIN_SAFE_INTEGER;
        y = b.weightedScore ? b.weightedScore : Number.MIN_SAFE_INTEGER;
        return y - x;
      });
    } else if (g.animeSort === "Score Asc") {
      g.recList.sort((a, b) => {
        let x = Number(a?.score),
          y = Number(b.score);
        if (!x) return 1;
        if (!y) return -1;
        return x - y;
      });
    } else if (g.animeSort === "Uscore Asc") {
      g.recList.sort((a, b) => {
        let x = Number(a?.userScore),
          y = Number(b.userScore);
        if (!x) return 1;
        if (!y) return -1;
        return x - y;
      });
    } else if (g.animeSort === "Ascore Asc") {
      g.recList.sort((a, b) => {
        let x = Number(a?.averageScore),
          y = Number(b.averageScore);
        if (!x) return 1;
        if (!y) return -1;
        return x - y;
      });
    } else if (g.animeSort === "Popularity Asc") {
      g.recList.sort((a, b) => {
        let x = Number(a?.popularity),
          y = Number(b.popularity);
        if (!x) return 1;
        if (!y) return -1;
        return x - y;
      });
    } else if (g.animeSort === "Date Asc") {
      g.recList.sort((a, b) => {
        // Sort by year (ascending), place falsy values at last
        let x = a.year ? a.year : Number.MAX_SAFE_INTEGER;
        let y = b.year ? b.year : Number.MAX_SAFE_INTEGER;
        if (x !== y) return x - y;

        // Sort by season (ascending), place falsy values at last
        x = a.season ? a.season.toLowerCase() : "";
        y = b.season ? b.season.toLowerCase() : "";
        if (x !== y) return seasonOrder[x] - seasonOrder[y];

        // Sort by weightedScore (descending), place falsy values at last
        x = a.weightedScore ? a.weightedScore : Number.MIN_SAFE_INTEGER;
        y = b.weightedScore ? b.weightedScore : Number.MIN_SAFE_INTEGER;
        return x - y;
      });
    } else if (g.animeSort === "Wscore Asc") {
      g.recList.sort((a, b) => {
        let x = Number(a?.weightedScore),
          y = Number(b.weightedScore);
        if (!x) return 1;
        if (!y) return -1;
        return x - y;
      });
    } else {
      // Wscore Desc
      g.recList.sort((a, b) => {
        let x = Number(a?.weightedScore),
          y = Number(b.weightedScore);
        if (!x) return 1;
        if (!y) return -1;
        return y - x;
      });
    }
    // Show Table
    g.animeData = [];
    g.recList.forEach((value) => {
      if (ishidden) {
        if (!g.savedHiddenAnimeIDs[value?.id]) {
          return;
        }
      } else {
        if (g.savedHiddenAnimeIDs[value?.id]) {
          return;
        }
      }
      let warnInfoArray = {
        semiwarn: [],
        warn: [],
        lowscore: "",
        verylowscore: "",
      };
      let hasWarning = false;
      let hasSemiWarning = false;
      let hasVeryLowScore = false;
      let hasLowScore = false;
      let warns = [];
      let topPreference = [];
      let score = parseFloat(value?.score ?? 0);
      let weightedScore = parseFloat(value?.weightedScore ?? 0);
      let userScore = parseFloat(value?.userScore ?? 0);
      let averageScore = parseFloat(value?.averageScore ?? 0);
      let popularity = parseInt(value?.popularity ?? 0);
      let meanScoreAll = parseFloat(value?.meanScoreAll ?? 0);
      let meanScoreAbove = parseFloat(value?.meanScoreAbove ?? 0);
      let similarities = [];
      let format = value?.format?.replace?.("_"," ")
      let episodes = parseFloat(value?.episodes ?? 0);
      let duration = parseFloat(value?.duration ?? 0);
      let studios = Object.entries(value?.studios || {})
        .map(([k, v]) => {
          return `<a class='${
            g.savedTheme
          } copy-value user-select-all' target='_blank' rel='noopener noreferrer' href=${
            v || "javascript:;"
          } data-copy-value='${k}'>${k}</a>`;
        })
        .filter(Boolean)
        .join(", ");
      value?.variablesIncluded?.forEach((v) => {
        if (!jsonIsEmpty(topSimilarities.include)) {
          if (isJson(v)) {
            Object.entries(v).forEach(([name, url]) => {
              if (name.slice(0, 8) === "studio: ") {
                if (
                  topSimilarities.include.studios &&
                  !topSimilarities.exclude.studios
                ) {
                  similarities.push(
                    `<a class='${
                      g.savedTheme
                    } copy-value user-select-all' target='_blank' rel='noopener noreferrer' href=${
                      url || "javascript:;"
                    } data-copy-value='${name}'>${name}</a>`
                  );
                  topPreference.push(name);
                }
              } else {
                if (
                  topSimilarities.include.staffs &&
                  !topSimilarities.exclude.staffs
                ) {
                  similarities.push(
                    `<a class='${
                      g.savedTheme
                    } copy-value user-select-all' target='_blank' rel='noopener noreferrer' href=${
                      url || "javascript:;"
                    } data-copy-value='${name}'>${name}</a>`
                  );
                  topPreference.push(name);
                }
              }
            });
          } else if (
            topSimilarities.include.contents &&
            !topSimilarities.exclude.contents
          ) {
            similarities.push(
              `<span class='${g.savedTheme} copy-value user-select-all' data-copy-value='${v}'>${v}</span>`
            );
            topPreference.push(v);
          }
        } else {
          if (isJson(v)) {
            Object.entries(v).forEach(([name, url]) => {
              if (name.slice(0, 8) === "studio: ") {
                if (!topSimilarities.exclude.studios) {
                  similarities.push(
                    `<a class='${
                      g.savedTheme
                    } copy-value user-select-all' target='_blank' rel='noopener noreferrer' href=${
                      url || "javascript:;"
                    } data-copy-value='${name}'>${name}</a>`
                  );
                  topPreference.push(name);
                }
              } else {
                if (!topSimilarities.exclude.staffs) {
                  similarities.push(
                    `<a class='${
                      g.savedTheme
                    } copy-value user-select-all' target='_blank' rel='noopener noreferrer' href=${
                      url || "javascript:;"
                    } data-copy-value='${name}'>${name}</a>`
                  );
                  topPreference.push(name);
                }
              }
            });
          } else if (!topSimilarities.exclude.contents) {
            similarities.push(
              `<span class='${g.savedTheme} copy-value user-select-all' data-copy-value='${v}'>${v}</span>`
            );
            topPreference.push(v);
          }
        }
      });
      similarities = similarities.splice(0, minTopSimilarities);
      topPreference = topPreference.splice(0, 3);
      // Content Warns
      if (meanScoreAll) {
        if (score < meanScoreAll) {
          hasVeryLowScore = true;
        }
      }
      if (meanScoreAbove) {
        if (score < meanScoreAbove) {
          hasLowScore = true;
        }
      }
      let genres = value?.genres || [];
      let shownGenres = []
      if (typeof genres === "string") {
        genres = genres.split(", ");
      }
      genres.forEach((name) => {
        shownGenres.push(`<span class='copy-value' data-copy-value='${name || "N/A"}'>${name}</span>`)
        let valGenre = name.trim().toLowerCase();
        let fullGenre = "genre: " + valGenre;
        if (warnR[fullGenre] || warnR[valGenre]) {
          warns.push(name);
          warnInfoArray.warn.push(name);
          hasWarning = true;
        } else if ((warnY[fullGenre] || warnY[valGenre]) && !hasWarning) {
          warns.push(name);
          warnInfoArray.semiwarn.push(name);
          hasSemiWarning = true;
        }
      });
      shownGenres = shownGenres?.length ? shownGenres.join(", ") : null;
      let shownTags = []
      let tags = value?.tags || [];
      if (typeof tags === "string") {
        tags = tags.split(", ");
      }
      tags.forEach((name) => {
        shownTags.push(`<span class='copy-value' data-copy-value='${name || "N/A"}'>${name}</span>`)
        let valTag = name.trim().toLowerCase();
        let fullTag = "tag: " + valTag;
        if (warnR[fullTag] || warnR[valTag]) {
          warns.push(name);
          warnInfoArray.warn.push(name);
          hasWarning = true;
        } else if ((warnY[fullTag] || warnY[valTag]) && !hasWarning) {
          warns.push(name);
          warnInfoArray.semiwarn.push(name);
          hasSemiWarning = true;
        }
      });
      shownTags = shownTags?.length ? shownTags.join(", ") : null;
      if (hasVeryLowScore && typeof meanScoreAll === "number") {
        warnInfoArray.verylowscore = `Very Low Score (Mean: ${
          formatNumber(meanScoreAll) ?? "N/A"
        })`;
        warns.unshift(warnInfoArray.verylowscore);
      } else if (hasLowScore && typeof meanScoreAbove === "number") {
        warnInfoArray.lowscore = `Low Score (Mean: ${
          formatNumber(meanScoreAbove) ?? "N/A"
        })`;
        warns.unshift(warnInfoArray.lowscore);
      }
      warns = warns.map((warn) => {
        return `<span class='copy-value' data-copy-value='${warn}'>${warn}</span>`;
      });
      let shownWarn = [];
      if (warnInfoArray.semiwarn.length) {
        shownWarn = shownWarn.concat(warnInfoArray.semiwarn);
      }
      if (warnInfoArray.warn.length) {
        shownWarn = shownWarn.concat(warnInfoArray.warn);
      }
      if (warnInfoArray.verylowscore) {
        shownWarn.unshift(warnInfoArray.verylowscore);
      } else if (warnInfoArray.lowscore) {
        shownWarn.unshift(warnInfoArray.lowscore);
      }
      let hoverText = "";
      if (topPreference.length) {
        hoverText += "Favourites: " + topPreference.join(", ") + "\n\n";
      }
      if (shownWarn.length) {
        hoverText += "Caution: " + shownWarn.join(", ");
      }
      let shownScore;
      let seasonYear = value?.season || value?.year? (`${value?.season || ""} ${value?.year || ""}`).trim() : null
      if (g.animeSort === "Score Asc" || g.animeSort === "Score Desc") {
        shownScore = formatNumber(score);
      } else if (
        g.animeSort === "Uscore Asc" ||
        g.animeSort === "Uscore Desc"
      ) {
        shownScore = userScore;
      } else if (
        g.animeSort === "Ascore Asc" ||
        g.animeSort === "Ascore Desc"
      ) {
        shownScore = averageScore;
      } else {
        shownScore = formatNumber(weightedScore);
      }
      let userStatusColor;
      let userStatus = value?.userStatus
      if (equalsNCS(userStatus,"completed")) {
        userStatusColor = "green";
      } else if(equalsNCS(userStatus,"current")||equalsNCS(userStatus,"repeating")) {
        userStatusColor = "blue"
      } else if(equalsNCS(userStatus,"planning")) {
        userStatusColor = "orange"
      } else if(equalsNCS(userStatus,"paused")) {
        userStatusColor = "peach" 
      } else if(equalsNCS(userStatus,"dropped")) {
        userStatusColor = "red"
      } else {
        userStatusColor = "lightgrey" // Default Unwatched no Icon
      }
      let userStatusIcon = userStatusColor? `<i class='${userStatusColor}-color copy-value fa-solid fa-circle' data-copy-value='${value?.title || "N/A"}'></i>` : ''
      let warningColor = hasWarning
          ? "red"
          : hasVeryLowScore
          ? "purple"
          : hasLowScore
          ? "orange"
          : hasSemiWarning
          ? "teal"
          : "green";
    let cardTitleComponent = `
      <span class='title copy-value' data-copy-value='${value?.title || "N/A"}'>${value?.title}</span>
      <span class='copy-value brief-info' data-copy-value='${value?.title || "N/A"}'>
        <div class='copy-value brief-info' data-copy-value='${value?.title || "N/A"}'>
          ${userStatusIcon}
          ${format||''}${episodes>0 && episodes? ' ['+episodes+']':''}
        </div>
        <div class='copy-value brief-info' data-copy-value='${value?.title || "N/A"}'>
          <i class='${warningColor}-color copy-value fa-solid fa-star' data-copy-value='${value?.title || "N/A"}'></i>
          ${shownScore}
        </div>`
      //   <div class='copy-value brief-info' data-copy-value='${value?.title || "N/A"}'>
      //     <i class='lightgrey-color copy-value fa-solid fa-user' data-copy-value='${value?.title || "N/A"}'></i>
      //     ${formatNumber(popularity,0)}
      //   </div>
      // `
      // Add Episode and Duration to Format
      if(episodes>0 && format){
        format = `${format} [${episodes}]`
        if(duration>0){
          let time = msToTime(duration*60*1000)
          format = `${format} | ${time?time:''}`
        }
      }
      // Animes Data
      var animeData = {
        // Original Values
        "anime-id": value.id,
        "anime-title": value?.title,
        format: format,
        "user-status": userStatus,
        status: value?.status,
        "season-year": seasonYear,
        studio: studios,
        genres: shownGenres,
        tags: shownTags,
        wscore: formatNumber(weightedScore),
        score: formatNumber(score),
        "user-score": userScore,
        "average-score": averageScore,
        popularity: popularity,
        "trailer-id": value?.trailerID,
        "anime-url": value?.animeUrl,
        "banner-img-url": value?.bannerImageUrl,
        "cover-img-url": value?.coverImageUrl,
          // HTML Components
        warnings: warns.join(", "),
        "top-similarities": similarities.join(", "),
        // Other Values          
        "is-hidden": ishidden?"true":"false",
        "warning-color": warningColor,
        "card-title-component": cardTitleComponent,
        "hover-text": hoverText,
      };
      g.animeData.push(animeData);
      return;
    });
    resolve();
  });
}
async function postWorker() {
  return await new Promise(async (resolve) => {
    if (g.savedFilters) {
      await saveJSON(g.savedFilters, "savedFilters");
    }
    self.postMessage({
      newList: true,
      animeData: g.animeData.slice(0, addedAnimeLen),
    });
    // const maxStrLength = 1000000
    // const postMessage = chunkString(g.animeData,maxStrLength)
    // const pmLen = postMessage.length
    // for(let i=0; i<pmLen;i++){
    //     setTimeout(()=>{
    //         self.postMessage({
    //             chunk: postMessage[i],
    //             done: i===pmLen-1
    //         })
    //     },i*100)
    // }
    return resolve();
  });
}
async function IDBinit() {
  return await new Promise((resolve) => {
    request = indexedDB.open(
      "Kanshi.Anime.Recommendations.Anilist.W~uPtWCq=vG$TR:Zl^#t<vdS]I~N70",
      1
    );
    request.onerror = (error) => {
      console.error(error);
    };
    request.onsuccess = (event) => {
      db = event.target.result;
      return resolve();
    };
    request.onupgradeneeded = (event) => {
      db = event.target.result;
      db.createObjectStore("MyObjectStore");
      return resolve();
    };
  });
}
async function saveJSON(data, name) {
  return await new Promise(async (resolve) => {
    try {
      let write = db
        .transaction("MyObjectStore", "readwrite")
        .objectStore("MyObjectStore")
        .openCursor();
      write.onsuccess = async (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.key === name) {
            await cursor.update(data);
            return resolve();
          }
          await cursor.continue();
        } else {
          await db
            .transaction("MyObjectStore", "readwrite")
            .objectStore("MyObjectStore")
            .add(data, name);
          return resolve();
        }
      };
      write.onerror = async (error) => {
        console.error(error);
        await db
          .transaction("MyObjectStore", "readwrite")
          .objectStore("MyObjectStore")
          .add(data, name);
        return resolve();
      };
    } catch (ex) {
      try {
        console.error(ex);
        await db
          .transaction("MyObjectStore", "readwrite")
          .objectStore("MyObjectStore")
          .add(data, name);
        return resolve();
      } catch (ex2) {
        console.error(ex2);
        return resolve();
      }
    }
  });
}
async function retrieveJSON(name) {
  return await new Promise((resolve) => {
    try {
      let read = db
        .transaction("MyObjectStore", "readwrite")
        .objectStore("MyObjectStore")
        .get(name);
      read.onsuccess = () => {
        return resolve(read.result);
      };
      read.onerror = (error) => {
        console.error(error);
        return resolve();
      };
    } catch (ex) {
      console.error(ex);
      return resolve();
    }
  });
}
function msToTime(duration) {
  let seconds = Math.floor((duration / 1000) % 60),
      minutes = Math.floor((duration / (1000*60)) % 60),
      hours = Math.floor((duration / (1000*60*60)) % 24),
      days = Math.floor((duration / (1000*60*60*24)) % 7),
      weeks = Math.floor((duration / (1000*60*60*24*7)) % 4),
      months = Math.floor((duration / (1000*60*60*24*7*4)) % 12)
      years = Math.floor((duration / (1000*60*60*24*7*4*12)) % 10)
      decades = Math.floor((duration / (1000*60*60*24*7*4*12*10)) % 10)
      century = Math.floor((duration / (1000*60*60*24*7*4*12*10*10)) % 10)
      millenium = Math.floor((duration / (1000*60*60*24*7*4*12*10*10*10)) % 10)
  let time = []
  if(millenium<=0&&century<=0&&decades<=0&&years<=0&&months<=0&&weeks<=0&&days<=0&&hours<=0&&minutes<=0&&seconds<=0) return "0s"
  if(millenium>0) time.push(millenium===1?`${millenium}mil`:`${millenium}mils`)
  if(decades>0) time.push(decades===1?`${decades}de`:`${decades}des`)
  if(years>0) time.push(`${years}y`)
  if(months>0) time.push(months===1?`${months}mo`:`${months}mos`)
  if(weeks>0) time.push(`${weeks}w`)
  if(days>0) time.push(`${days}d`)
  if(hours>0) time.push(`${hours}h`)
  if(minutes>0) time.push(`${minutes}m`)
  if(seconds>0) time.push(`${seconds}s`)
  return time.join(" ")
}
function formatNumber(number, dec=2) {
  if (typeof number === "number") {
    const formatter = new Intl.NumberFormat("en-US", {
      maximumFractionDigits: dec, // display up to 2 decimal places
      minimumFractionDigits: 0, // display at least 0 decimal places
      notation: "compact", // use compact notation for large numbers
      compactDisplay: "short", // use short notation for large numbers (K, M, etc.)
    });

    if (Math.abs(number) >= 1000) {
      return formatter.format(number);
    } else if (Math.abs(number) < 0.01) {
      return number.toExponential(0);
    } else {
      return (
        number.toFixed(dec) ||
        number.toLocaleString("en-US", { maximumFractionDigits: dec })
      );
    }
  } else {
    return null;
  }
}
function chunkString(str, chunkSize) {
  const chunks = [];
  while (str) {
    if (str.length < chunkSize) {
      chunks.push(str);
      break;
    } else {
      chunks.push(str.substr(0, chunkSize));
      str = str.substr(chunkSize);
    }
  }
  return chunks;
}
function findWord(data, word) {
  if (typeof data === "string") {
    return data.toLowerCase().includes(word.trim().toLowerCase());
  } else if (Array.isArray(data)) {
    return data.some((e) =>
      e.trim().toLowerCase().includes(word.trim().toLowerCase())
    );
  } else {
    return false;
  }
}
function equalsNCS(str1, str2) {
  if (
    !(typeof str1 === "number" || typeof str1 === "string") &&
    (typeof str2 === "number" || typeof str2 === "string")
  )
    return false;
  return str1.toString().trim().toLowerCase() === str2.toString().trim().toLowerCase();
}
function isaN(num) {
  if (!num && num !== 0) {
    return false;
  } else if (typeof num === "boolean") {
    return false;
  } else if (typeof num === "string" && !num) {
    return false;
  }
  return !isNaN(num);
}
function isJson(j) {
  try {
    return j?.constructor.name === "Object" && `${j}` === "[object Object]";
  } catch (e) {
    return false;
  }
}
function jsonIsEmpty(obj) {
  if (isJson(obj)) {
    for (let i in obj) return false;
    return true;
  }
  console.error(
    `Error: Expected Object Constructor (reading '${
      obj?.constructor.name
    }' - ${JSON.stringify(obj)})`
  );
  return true; // Temporarily Added for Past Conditions to Work
}
function nFormatter(num, digits) {
  const lookup = [
    { value: 1e3, symbol: "k" },
    { value: 1e6, symbol: "M" },
    { value: 1e9, symbol: "G" },
    { value: 1e12, symbol: "T" },
    { value: 1e15, symbol: "P" },
    { value: 1e18, symbol: "E" },
  ];
  const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
  let item = lookup
    .slice()
    .reverse()
    .find(function (item) {
      return num >= item.value;
    });
  return item
    ? (num / item.value).toFixed(digits).replace(rx, "$1") + item.symbol
    : num;
}
function generateUniqueRandomNumber() {
  var timestamp = new Date().getTime(); // Current timestamp
  var randomString = Math.random().toString(36).substr(2, 10); // Random string

  var uniqueNumber = parseInt(timestamp + randomString, 10);
  return uniqueNumber;
}
