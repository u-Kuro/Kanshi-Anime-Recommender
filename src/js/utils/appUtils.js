let idCounter = -Number.MAX_SAFE_INTEGER
const getUniqueId = () => {
    if (idCounter < Number.MAX_SAFE_INTEGER || typeof idCounter === "bigint") {
        return `${++idCounter}`
    } else {
        if (idCounter && typeof window.BigInt === "function") {
            idCounter = BigInt(Number.MAX_SAFE_INTEGER)
            ++idCounter
        } else {
            idCounter = -Number.MAX_SAFE_INTEGER
        }
        return `${idCounter}`
    }
}
const requestImmediate = (fn, timeout = 0) => {
    let frame, start, timeoutFn
    const thisRequestImmediate = (timeStamp) => {
        let elapsed = 0
        if (!timeStamp) {
            elapsed = 16
        } else if (start !== undefined) {
            elapsed = timeStamp - start
        }
        start = timeStamp;
        timeout -= elapsed
        if (timeout > 0) {
            frame = requestAnimationFrame(thisRequestImmediate)
        } else {
            clearTimeout(timeoutFn)
            frame = requestAnimationFrame(() => {
                try { fn() } catch {}
            })
        }
    }
    if (timeout > 0) {
        timeoutFn = setTimeout(()=>{
            cancelAnimationFrame(frame)
            try { fn() } catch {}
        }, timeout)
        frame = requestAnimationFrame(thisRequestImmediate)
    } else {
        try { fn() } catch {}
    }
    return () => {
        cancelAnimationFrame(frame)
        clearTimeout(timeoutFn)
    }
}
const downloadLink = (url, fileName) => {
    try {
        const a = document.createElement("a")
        a.href = url
        a.target = "_blank";
        a.rel = "noopener noreferrer"
        a.download = fileName
        a.click()
        URL.revokeObjectURL(url)
    } catch { }
}
const showToast = (str, isLongDuration = true) => {
    try {
        if (
            typeof str === "string"
            && str.length > 0 
            && typeof isLongDuration === "boolean"
        ) {
            JSBridge.openToast(str, isLongDuration)
        }
    } catch (ex) { console.error(ex) }
}

export {
    getUniqueId,
    requestImmediate,
    downloadLink,
    showToast,
}