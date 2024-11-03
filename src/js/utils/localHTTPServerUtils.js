import { get } from "svelte/store"
import { uniqueKey } from "../variables"

const getLocalServerURL = () => {
    return new Promise((resolve, reject) => {
        try {
            window[`${get(uniqueKey)}LOCAL_SERVER_URL_PROMISE`] = { resolve, reject }
            JSBridge.getLocalServerURL()
        } catch (e) { 
            console.error(e)
            reject()
        }
    })
}

export {
    getLocalServerURL,
}