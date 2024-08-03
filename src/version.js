const version = 445;
let webVersionPromise
export default async function getWebVersion() {
    if (webVersionPromise) return webVersionPromise
    webVersionPromise = new Promise(async (resolve) => {
        try {
            const location = window.location
            if (location.protocol.includes("file")) {
                resolve(version)
                webVersionPromise = null
                return
            }
            const url = new URL("version.json", location).href
            const response = await fetch(url, {
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
        } catch {
            resolve(version)
            webVersionPromise = null
            return
        }
    })
    return webVersionPromise
};