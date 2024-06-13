const version = 408;
let webVersionPromise
export default async function getWebVersion() {
    if (webVersionPromise) return webVersionPromise
    webVersionPromise = new Promise(async (resolve) => {
        try {
            let location = window.location
            if (location.protocol.includes("file")) {
                resolve(version)
                webVersionPromise = null
                return
            }
            let path = location.pathname;
            path = path.endsWith('/') ? path : path + '/'
            path = path.includes('/index.html') ? path.replace('/index.html', '') : path
            let response = await fetch(`${path}version.json`, {
                cache: "no-cache"
            })
            const result = await response.json()
            if (typeof result === "number" && !isNaN(result) && isFinite(result)) {
                resolve(result || version)
            } else {
                resolve(version)
            }
            webVersionPromise = null
            return
        } catch (error) {
            resolve(version)
            webVersionPromise = null
            return
        }
    })
    return webVersionPromise
};