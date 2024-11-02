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
function isValidDateTime(dateTime) {
    return typeof dateTime === "number" && !isNaN(new Date(dateTime))
}
export {
    isJsonObject,
    jsonIsEmpty,
    equalsIgnoreCase,
    isValidDateTime
}