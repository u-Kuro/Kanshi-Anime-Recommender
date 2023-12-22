const version = 259;
export default async function getWebVersion() {
    try {
        let location = window.location
        if (location.protocol.includes("file")) {
            return version
        }
        let path = location.pathname;
        path = path.endsWith('/') ? path : path + '/'
        path = path.includes('/index.html') ? path.replace('/index.html', '') : path
        let response = await fetch(`${path}version.json`, {
            cache: "no-store"
        })
        let result = await response.json()
        return result.version || version
    } catch (error) { return version }
};