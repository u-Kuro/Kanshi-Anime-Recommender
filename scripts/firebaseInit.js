import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, off } from "firebase/database";
import firebaseConfig from "../config/firebaseConfig.js";

const app = initializeApp(firebaseConfig);
const fdb = getDatabase(app);
let valListeners = {}

// Usage example
let listen = async(_path, _callBack) => {
    return await _onValue(_path, _callBack, 'listen')
};

let get = async(_path ) => {
    return await _onValue(_path, undefined, 'get')
}

let _onValue = (_path, _callBack, _type) => {
    return new Promise(async(resolve) => {
        try {
            let dataRef = ref(fdb, _path);
            if(_type==='listen') {
                valListeners[_path] = onValue(dataRef, (snapshot) => {
                    let data = snapshot.val();
                    _callBack(data);
                }, (error) => {
                    throw error;
                })
                resolve(valListeners[_path])
            } else if(_type==='get') {
                onValue(dataRef, (snapshot) => {
                    let data = snapshot.val();
                    resolve(data)
                }, {
                    onlyOnce: true
                }, (error) => {
                    throw error;
                })
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    })
}

let unsubscribe = (listener) => {
    try {
        if(typeof listener==='string'){
            off(valListeners[listener])
        } else if(listener instanceof Array) {
            listener.forEach(item => {
                off(valListeners[item])
            })
        } else {
            off()
            valListeners[listener] = {}
        }
    } catch(error) {
        console.error(error);
    }
}

export {app, fdb, get, listen, unsubscribe};