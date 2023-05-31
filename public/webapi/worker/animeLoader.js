let db,
    finalAnimeList,
    filteredList,
    keyword,
    filterTimeout,
    loadLimit = 18;

self.onmessage = async({ data }) => {
    if (data?.filterKeyword!==undefined) {
        keyword = data?.filterKeyword
        if(filterTimeout) clearTimeout(filterTimeout)
        filterTimeout = setTimeout(() =>{
            filteredList = finalAnimeList.filter(({title})=>title?.toLowerCase?.().includes(keyword))
            self.postMessage({
                isNew: true,
                finalAnimeList: filteredList.slice(0,loadLimit)
            });
        },1)
    } else if (data?.removeIndex!==undefined) {
        finalAnimeList.splice(data.removeIndex, 1);
    } else if (data?.loadMore!==undefined) {
        let nextIdx = data.shownAnimeLen;
        self.postMessage({
            isNew: false,
            isLast: nextIdx>=filteredList.length,
            finalAnimeList: filteredList.slice(
            nextIdx,
            Math.min(nextIdx + loadLimit, filteredList.length - 1)
          ),
        });
    } else {
        if(!db) await IDBinit()
        self.postMessage({status:"Initializing Filters"})
        let activeTagFilters = await retrieveJSON("activeTagFilters")
        let recommendedAnimeList = await retrieveJSON("recommendedAnimeList") || []
        // Init Content Warning
        let contentWarning = activeTagFilters?.['Content Warning'] || []
        let semiWarningContents = {
                genres: {},
                tags: {},
            },
            warningContents = {
                genres: {},
                tags: {},
            };
        contentWarning.forEach(({selected, filterType, optionName, optionType})=>{
            // Included is Semi Warning and Excluded is Warning
            if(selected==="included"){
                if(filterType==='dropdown'){
                    if(optionType==='genre'){
                        semiWarningContents.genres[optionName] = true
                    } else if(optionType==='tag'){
                        semiWarningContents.tags[optionName] = true
                    }
                }
            } else if(selected==='excluded'){
                if(filterType==='dropdown'){
                    if(optionType==='genre'){
                        warningContents.genres[optionName] = true
                    } else if(optionType==='tag'){
                        warningContents.tags[optionName] = true
                    }
                }
            }
        })
        // Init Anime Filter
        let include = {
                genres: {},
                tags: {}
            },
            exclude = {
                genres: {},
                tags: {}
            };
        let hideMyAnime = false,
            hiddenList = false,
            favouriteContentsLimit;
        let animeFilter = activeTagFilters?.['Anime Filter'] || []
        animeFilter.forEach(({selected, filterType, optionName, optionType, optionValue})=>{
            if(selected==="included"){
                if(filterType==='dropdown'){
                    if(optionType==='genre'){
                        include.genres[optionName] = true
                    } else if(optionType==='tag'){
                        include.tags[optionName] = true
                    }//...
                } else if(filterType==='checkbox'){
                    if(optionName==='hidden'){
                        hiddenList = true
                    } else if(optionName==='hide my anime'){
                        hideMyAnime = true
                    }
                } else if(filterType==='input number'){
                    if(optionName==="limit favourites"){
                        favouriteContentsLimit = optionValue
                    }
                }
            } else if(selected==='excluded'){
                if(filterType==='dropdown'){
                    if(optionType==='genre'){
                        exclude.genres[optionName] = true
                    } else if(optionType==='tag'){
                        exclude.tags[optionName] = true
                    }//...
                }
            }
        })      
        // Filter list based on the include and exclude criteria
        self.postMessage({status:"Filtering Recommendation List"})
        filteredList = finalAnimeList = recommendedAnimeList.filter(anime => {
            // Should Exclude
            if(!jsonIsEmpty(anime.genres)){
                if(anime.genres.some(e=>{
                    if(typeof e!=='string') return false
                    return exclude.genres[e.toLowerCase()]
                })) return false
            }
            // Should Include
            for(let genre in include.genres){
                if(!anime.genres.some(e=>{
                    return ncsCompare(e,genre)
                })) return false
            }
            // added to the filteredList
            return true;
        });

        // Sort List
        let sortFilter = await retrieveJSON("filterOptions")?.sortFilter
        let [sortName, sortType] = sortFilter?.filter(({sortType})=>sortType==="desc"||sortType==="asc")?.[0] || ["weighted score","desc"]
        if(sortType==="desc"){
            if(sortName==="weighted score"){
                finalAnimeList.sort((a,b)=>b.weightedScore-a.weightedScore)
            }
        }
        await saveJSON(finalAnimeList, "finalAnimeList")
        self.postMessage({status:null})
        self.postMessage({
            finalAnimeList: finalAnimeList.slice(0, loadLimit),
        });
    }
};

// Functions
function ncsCompare(str1, str2) {
    if (typeof str1 !== 'string' || typeof str2 !== 'string') {
      return false;
    }
    return str1.toLowerCase() === str2.toLowerCase();
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
    return await new Promise(async (resolve,reject) => {
        try {
            let write = db
            .transaction("MyObjectStore", "readwrite")
            .objectStore("MyObjectStore")
            .openCursor();
            write.onsuccess = async (event) => {
                let put = await db
                    .transaction("MyObjectStore", "readwrite")
                    .objectStore("MyObjectStore")
                    .put(data, name);
                put.onsuccess = (event) => {
                    return resolve();
                }
                put.onerror = (event) => {
                    return resolve();
                }
            };
            write.onerror = async (error) => {
                console.error(error);
                return reject()
            };
        } catch (ex) {
            console.error(ex)
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
function jsonIsEmpty(obj) {
    for (const key in obj) {
        return false;
    }
    return true;
}
function isJson(j) {
  try {
    return j?.constructor.name === "Object" && `${j}` === "[object Object]";
  } catch (e) {
    return false;
  }
}