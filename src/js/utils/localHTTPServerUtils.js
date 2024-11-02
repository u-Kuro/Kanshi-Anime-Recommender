const getLocalServerURL = () => {
    return new Promise((resolve, reject) => {
        try {
            window[`${get(uniqueKey)}LOCAL_SERVER_URL_PROMISE`] = { resolve, reject }
            JSBridge.getLocalServerURL()
        } catch { reject() }
    })
}

export {
    getLocalServerURL,
}