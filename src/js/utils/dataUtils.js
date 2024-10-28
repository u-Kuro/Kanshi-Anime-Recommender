const isJsonObject = (obj) => {
    return Object.prototype.toString.call(obj) === "[object Object]"
}
const jsonIsEmpty = (obj) => {
    for (const key in obj) return false;
    return true;
}
const equalsIgnoreCase = (str1, str2) => {
    try {
        return str1.toLowerCase() === str2.toLowerCase();
    } catch { }
}

export {
    isJsonObject,
    jsonIsEmpty,
    equalsIgnoreCase
}