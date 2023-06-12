import {saveIDBdata, getIDBdata} from "../js/workerUtils.js"
let db;
async function IDBinit(){
    return await new Promise((resolve)=>{
        let request = indexedDB.open("Kanshi.Anime.Recommendations.Anilist.W~uPtWCq=vG$TR:Zl^#t<vdS]I~N70", 1)
        request.onerror = (error) => {
            alert("Your browser is not supported, to continue please update to recent version, use non private/incognito, or use another browser.")
            console.error(error)
        }
        request.onsuccess = (event) => {
            db = event.target.result
            return resolve(db)
        }
        request.onupgradeneeded = (event) => {
            db = event.target.result;
            db.createObjectStore("MyObjectStore")
            return resolve(db)
        }
    })
}
function saveJSON(data, name) {
    return new Promise(async(resolve, reject)=>{
        await saveIDBdata(data, name)
        .then((message)=>{
            resolve(message)
        })
        .catch((error) => {
            reject(error)
        })
    })
}
async function retrieveJSON(name) {
    return new Promise(async(resolve, reject)=>{
        await getIDBdata(name)
        .then((data)=>{
            resolve(data)
        })
        .catch((error) => {
            reject(error)
        })
    })
}
async function deleteJSON(name) {
    return await new Promise((resolve)=>{
        try {
            let write = db.transaction("MyObjectStore","readwrite").objectStore("MyObjectStore").delete(name)
            write.onsuccess = () => {
                return resolve()
            }
            write.onerror = (error) => {
                console.error(error)
                return resolve()
            }
        } catch(ex) {
            console.error(ex)
            return resolve()
        }
    })
}

export { IDBinit, saveJSON, retrieveJSON, deleteJSON, db }