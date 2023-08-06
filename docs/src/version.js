const version = 64;
export default async function getWebVersion() {
    try {
        let path = window.location.pathname;
        path = path.endsWith('/') ? path : path + '/'
        path = path.includes('/index.html') ? path.replace('/index.html', '') : path
        let response = await fetch(`${path}version.json`, {
            cache: "no-store"
        })
        let result = await response.json()
        return result.version || version
    } catch (error) { return version }
};