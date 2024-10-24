
let db;
let appID

self.addEventListener("unhandledrejection", (event) => {
    const reason = event?.reason
    console.error(reason)
    let error = reason?.stack || reason?.message
    if (typeof error !== "string" || !error) {
        error = "Something went wrong"
    }
    self.postMessage({ error })
});

self.onmessage = async ({ data }) => {
    try {                
        if (!db) await IDBinit();

        const { mediaEntries, dataInfo } = data
        
        self.postMessage({ status: `Updating Existing Data` })
        if (
            mediaEntries instanceof Blob
            && excludedEntries instanceof Blob
            && tagInfo instanceof Blob
            && filters instanceof Blob
        ) {
            const collectionToPut = {
                tagInfo,
            }
            await updateStoreCollection({
                stores: {
                    mediaEntries,
                    excludedEntries,
                },
                singletons: {
                    mediaUpdateAt: 1728227505,
                    tagInfoUpdateAt: 1728039511
                }
            })
            self.postMessage({ status: null });
            self.postMessage({ done: true });
        } else {
            const error = "Failed to Request Initial Data"
            console.error(error)
            self.postMessage({ error })
        }
    } catch (reason) {
        console.error(reason)
        let error = reason?.stack || reason?.message
        if (typeof error !== "string" || !error) {
            error = "Something went wrong"
        }
        self.postMessage({ error })
    }
}
function IDBinit() {
    return new Promise((resolve) => {
        const request = indexedDB.open(
            "Kanshi.Media.Recommendations.Anilist.W~uPtWCq=vG$TR:Zl^#t<vdS]I~N70",
            1
        );
        request.onsuccess = (event) => {
            db = event.target.result;
            resolve()
        };
        request.onupgradeneeded = (event) => {
            const target = event.target;
            db = target.result;
            db.createObjectStore("others");
            target.transaction.oncomplete = () => {
                resolve();
            }
        }
        request.onerror = (error) => {
            console.error(error);
        };
    })
}
function handleBlobPutError(store, key, record, ex) {
    if (record instanceof Blob) {
        try {
            store
            .put((new FileReaderSync()).readAsArrayBuffer(record), key)
            .onerror = (ex) => {
                console.error(ex);
                reject(ex);
            }
        } catch (ex) {
            console.error(ex);
            reject(ex);
        }
    } else {
        reject(ex);
    }
    console.error(ex);
}
function handlePutError(store, key, record, ex) {
    try {
        let put
        if (record instanceof Blob) {
            put = store.put(record, key);
        } else {
            record = new Blob([JSON.stringify(record)]);
            put = store.put(record, key);
        }
        put.onerror = (ex) => handleBlobPutError(store, key, record, ex)
    } catch (ex) {
        handleBlobPutError(store, key, record, ex)
    }
    console.error(ex);
}
function updateStore(store, records) {
    for (const key in records) {
        const record = records[key];
        try {
            store
            .put(record, key)
            .onerror = (ex) => handlePutError(store, key, record, ex)
        } catch (ex) {
            handlePutError(store, key, record, ex)
        }
    }
}
function updateStoreCollection({ stores = {}, singletons = {}}) {
    return new Promise((resolve, reject) => {
        try {
            const transaction = db.transaction(
                Object.keys(stores).concat(singletons),
                "readwrite"
            );
            transaction.oncomplete = () => {
                resolve();
            }
            for (const storeKey in stores) {
                updateStore(
                    transaction.objectStore(storeKey),
                    storeKey,
                    stores[key]
                )
            }
            for (const recordKey in singletons) {
                updateStore(
                    transaction.objectStore(recordKey),
                    recordKey,
                    { [recordKey]: singletons[recordKey] }
                )
            }
        } catch (ex) {
            console.error(ex);
            reject(ex);
        }
    });
}
function isJsonObject(obj) {
    return Object.prototype.toString.call(obj) === "[object Object]"
}
function jsonIsEmpty(obj) {
    for (const key in obj) {
        return false;
    }
    return true;
}
function parseJSON(text, textLength) {
    if (isJsonObject(text) || text instanceof Array) {
        return text
    } else if (!(typeof text === 'string' || text instanceof String)) {
        throw new Error(`Input Text has Unexpected Type of ${text?.constructor?.name || typeof text}`, { cause: JSON.stringify(text) })
    }
    // Seeked First Character Below Before Parsing
    let at = -1;
    let ch = '';

    const maxByteSize = 64 * 1024; // 64 KB
    let textProcessed = 0
    let startPost = performance.now();
    let garbageChunk = () => {
        if (text.length >= maxByteSize) {
            // Add Processed Length
            textProcessed += at
            // Garbage Processed Length
            text = text.slice(at)
            at = 0
            // Send Progress Info
            const endPost = performance.now()
            if (endPost - startPost > 17) {
                startPost = endPost
                let progress = (textProcessed / textLength) * 100
                self.postMessage({ progress })
                if (progress > 0.01) {
                    self.postMessage({ status: `${progress.toFixed(2)}% Retaining Anime, Manga, and Novel Entries` })
                }
            }
        }
    }

    let seek = (added = 1) => {
        // Get Next Chunk Until Available
        let newAt = at + added
        while (true) {
            // Recheck new chunk in next position
            ch = text.charAt(newAt);
            if (ch && ch <= ' ') {
                newAt += 1
                continue
            }
            at = newAt
            garbageChunk();
            break;
        }
    };

    let wordCheck = () => {
        let word = '';
        do {
            word += ch;
            seek();
        } while (ch.match(/[a-z]/i));
        return word;
    };

    let isPrimitive = true;
    let normalizeUnicodedString = (quote) => {
        // Start Quote is Already Removed
        let inQuotes = '';
        let hasCompleteString = false;
        let startIndexNotIncluded = at
        let endIndexNotIncluded = 0;
        let slashCount = 0;
        let removedFirstQuote = false;
        // Find the end Quote
        while (quote) {
            // Check series of indices as possible end quote
            endIndexNotIncluded = text.indexOf(quote, startIndexNotIncluded + 1);
            // If it is not found wait for next chunk
            if (endIndexNotIncluded < 0) {
                // If Stream is done 
                // and End of Quote is not Found
                // break it and run exception below
                break;
            }
            // Chch 
            ch = text.charAt(endIndexNotIncluded - 1);
            while (ch === '\\') {
                slashCount++;
                ch = text.charAt(endIndexNotIncluded - (slashCount + 1));
            }
            // If the slash behind the possible end quote is odd 
            // Then it is included in the string
            // So find the next possible end quote
            if (!removedFirstQuote) {
                removedFirstQuote = true;
                startIndexNotIncluded += 1
            }
            if (slashCount % 2 !== 0) {
                slashCount = 0;
                // Get the string from last
                inQuotes += text.substring(startIndexNotIncluded, endIndexNotIncluded)
                startIndexNotIncluded = endIndexNotIncluded
            } else {
                if (isPrimitive) {
                    let nonWhiteSpace = /[^ ]*/g
                    const endOfStringIndex = endIndexNotIncluded + 2
                    nonWhiteSpace.lastIndex = endOfStringIndex
                    const match = nonWhiteSpace.exec(text)
                    const matchStr = match?.[0]
                    const errorIndex = match?.index;
                    if (matchStr && errorIndex >= endOfStringIndex) {
                        throw error("Unexpected non-whitespace character after JSON", errorIndex)
                    }
                    inQuotes += text.substring(startIndexNotIncluded, endIndexNotIncluded);
                    hasCompleteString = true
                } else {
                    inQuotes += text.substring(startIndexNotIncluded, endIndexNotIncluded);
                    hasCompleteString = true
                    // Update character position
                    // Inside string +2 for outer quotes
                    seek(inQuotes.length + 2)
                }
                break;
            }
        }

        if (hasCompleteString) {
            // Parse other escapes inside the quote 
            let stringifiedValue = `"${inQuotes}"`
            return JSON.parse(stringifiedValue);
        } else {
            throw error("Unterminated string in JSON")
        }
    };

    let error = (message, errorIndex) => {
        return new Error(`${message} at position ${errorIndex ?? at} (${text.charAt(errorIndex ?? at)})`, { cause: JSON.stringify(text) })
    }

    function parse() {
        // Find next non white space character
        let quote;
        let wordToFind
        let isFirstKey;
        switch (ch) {
            case '{':
                isPrimitive = false;
                let returnObj = {};
                seek()
                if (ch === '}') {
                    seek()
                    return returnObj
                } else if (ch !== `"`
                    // && ch !== `'` && ch !== "`"
                ) {
                    // Not a Valid Key
                    throw error("Expected property name or '}' in JSON")
                }
                isFirstKey = true;
                let lastCh
                do {
                    if (isFirstKey) {
                        isFirstKey = false
                    } else if (ch === ',') {
                        lastCh = ch;
                        seek();
                    } else {
                        throw error("Expected ',' or '}' after property value in JSON")
                    }
                    // Get Key
                    let key = parse(); // Already Seeked Next Character
                    if (ch === ':') {
                        lastCh = ch;
                        seek();
                    } else {
                        throw error("Expected ':' after property name in JSON")
                    }
                    // Get Value
                    returnObj[key] = parse(); // Already Seeked Next Character
                    if (ch === '}') {
                        seek()
                        return returnObj
                    }
                } while (ch === ',');
                if (lastCh === ',') {
                    throw error("Expected double-quoted property name in JSON")
                } else if (lastCh === ':') {
                    throw error("Unexpected end of JSON input")
                } else if (jsonIsEmpty(returnObj)) {
                    throw error("Expected property name or '}' in JSON")
                } else {
                    throw error("Expected ',' or '}' after property value in JSON")
                }
            case '[':
                isPrimitive = false
                let returnArr = [];
                seek()
                if (ch === ']') {
                    seek()
                    return returnArr
                }
                isFirstKey = true;
                do {
                    if (isFirstKey) {
                        isFirstKey = false
                    } else if (ch === ',') {
                        seek();
                    } else {
                        throw error(returnArr.length ? "Expected ',' or ']' after array element" : "Unexpected end of JSON input");
                    }
                    // Get Value
                    let value = parse(); // Already Seeked Next Character
                    returnArr.push(value);
                    if (ch === ']') {
                        seek()
                        return returnArr
                    }
                } while (ch === ',');
                throw error(returnArr.length ? "Expected ',' or ']' after array element" : "Unexpected end of JSON input");
            case '"':
                // case "'":
                // case '`':
                // Get First Quote
                quote = ch
                if (text.length < 2) {
                    throw error("Unterminated string in JSON")
                }
                if (text.charAt(at + 1) === quote) {
                    if (isPrimitive) {
                        const endOfStringIndex = at + 2
                        let nonWhiteSpace = /[^ ]*/g
                        nonWhiteSpace.lastIndex = endOfStringIndex
                        const match = nonWhiteSpace.exec(text)
                        const matchStr = match?.[0]
                        const errorIndex = match?.index;
                        if (matchStr && errorIndex >= endOfStringIndex) {
                            throw error("Unexpected non-whitespace character after JSON", errorIndex)
                        }
                    } else {
                        // Update character position
                        // 2 Quotes
                        seek(2);
                    }
                    return '';
                } else {
                    // normalizeUnicodedString function
                    // already updates character position
                    return normalizeUnicodedString(quote);
                }
            case '0':
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':
            case '8':
            case '9':
            case '-':
                // case '.':
                // case 'I':
                // case '+':
                let numHolder = ''
                let addUpNumberStr = () => {
                    numHolder += ch;
                    seek();
                };

                if (ch === '-' || ch === '+') {
                    addUpNumberStr();
                }
                // if (ch === 'I') {
                //     word = wordCheck();
                //     wordToFind = 'Infinity'
                //     if (word === wordToFind) {
                //         if (isPrimitive) {
                //             const indexAfterWord = at
                //             let nonWhiteSpace = /[^ ]*/g
                //             nonWhiteSpace.lastIndex = indexAfterWord
                //             const match = nonWhiteSpace.exec(text)
                //             const matchStr = match?.[0]
                //             const errorIndex = match?.index;
                //             if (matchStr && errorIndex >= indexAfterWord) {
                //                 throw error("Unexpected non-whitespace character after JSON", errorIndex)
                //             }
                //         }
                //         numHolder += word;
                //     } else {
                //         const numHolderLen = numHolder.length
                //         const wordLen = word.length + numHolderLen
                //         const wordToFindLen = wordToFind.length + numHolderLen
                //         if (wordLen > wordToFindLen) {
                //             const errorIndex = at - (wordLen - wordToFindLen);
                //             throw error("Unexpected non-whitespace character after JSON", errorIndex)
                //         } else {
                //             const errorInWordIndex = at - 1;
                //             throw error("Unexpected non-whitespace character after JSON", errorInWordIndex)
                //         }
                //     }
                // } else {
                let afterDecimal = ch === '.'
                let afterExponential
                if (afterDecimal) {
                    addUpNumberStr();
                }
                while (isFinite(ch) && ch !== '') {
                    addUpNumberStr();
                    if (!afterDecimal && ch === '.') {
                        afterDecimal = true
                        addUpNumberStr();
                    } else if (!afterExponential && (ch === 'e' || ch === 'E')) {
                        afterExponential = true
                        addUpNumberStr();
                        if (ch === '+' || ch === '-') {
                            addUpNumberStr();
                        }
                    }
                }
                // }
                const num = Number(numHolder);
                if (isNaN(num)) {
                    const errorIndex = at - numHolder.length
                    throw error('Invalid Number', errorIndex);
                } else {
                    if (isPrimitive) {
                        const indexAfterNumber = at
                        let nonWhiteSpace = /[^ ]*/g
                        nonWhiteSpace.lastIndex = indexAfterNumber
                        const match = nonWhiteSpace.exec(text)
                        const matchStr = match?.[0]
                        const errorIndex = match?.index;
                        if (matchStr && errorIndex >= indexAfterNumber) {
                            throw error("Unexpected non-whitespace character after JSON", errorIndex)
                        }
                    }
                    return num;
                }
            case 't':
                word = wordCheck();
                wordToFind = 'true'
                if (word === wordToFind) {
                    if (isPrimitive) {
                        const indexAfterWord = at
                        let nonWhiteSpace = /[^ ]*/g
                        nonWhiteSpace.lastIndex = indexAfterWord
                        const match = nonWhiteSpace.exec(text)
                        const matchStr = match?.[0]
                        const errorIndex = match?.index;
                        if (matchStr && errorIndex >= indexAfterWord) {
                            throw error("Unexpected non-whitespace character after JSON", errorIndex)
                        }
                    }
                    return true
                } else {
                    const wordLen = word.length
                    const wordToFindLen = wordToFind.length
                    if (wordLen > wordToFindLen) {
                        const errorIndex = at - (wordLen - wordToFindLen);
                        throw error("Unexpected non-whitespace character after JSON", errorIndex)
                    } else {
                        const errorInWordIndex = at - 1;
                        throw error("Unexpected non-whitespace character after JSON", errorInWordIndex)
                    }
                }
            case 'f':
                word = wordCheck();
                wordToFind = 'false'
                if (word === wordToFind) {
                    if (isPrimitive) {
                        const indexAfterWord = at
                        let nonWhiteSpace = /[^ ]*/g
                        nonWhiteSpace.lastIndex = indexAfterWord
                        const match = nonWhiteSpace.exec(text)
                        const matchStr = match?.[0]
                        const errorIndex = match?.index;
                        if (matchStr && errorIndex >= indexAfterWord) {
                            throw error("Unexpected non-whitespace character after JSON", errorIndex)
                        }
                    }
                    return false
                } else {
                    const wordLen = word.length
                    const wordToFindLen = wordToFind.length
                    if (wordLen > wordToFindLen) {
                        const errorIndex = at - (wordLen - wordToFindLen);
                        throw error("Unexpected non-whitespace character after JSON", errorIndex)
                    } else {
                        const errorInWordIndex = at - 1;
                        throw error("Unexpected non-whitespace character after JSON", errorInWordIndex)
                    }
                }
            case 'n':
                word = wordCheck();
                wordToFind = 'null'
                if (word === wordToFind) {
                    if (isPrimitive) {
                        const indexAfterWord = at
                        let nonWhiteSpace = /[^ ]*/g
                        nonWhiteSpace.lastIndex = indexAfterWord
                        const match = nonWhiteSpace.exec(text)
                        const matchStr = match?.[0]
                        const errorIndex = match?.index;
                        if (matchStr && errorIndex >= indexAfterWord) {
                            throw error("Unexpected non-whitespace character after JSON", errorIndex)
                        }
                    }
                    return null
                } else {
                    const wordLen = word.length
                    const wordToFindLen = wordToFind.length
                    if (wordLen > wordToFindLen) {
                        const errorIndex = at - (wordLen - wordToFindLen);
                        throw error("Unexpected non-whitespace character after JSON", errorIndex)
                    } else {
                        const errorInWordIndex = at - 1;
                        throw error("Unexpected non-whitespace character after JSON", errorInWordIndex)
                    }
                }
            // case 'u':
            //     word = wordCheck();
            //     wordToFind = 'undefined'
            //     if (word === wordToFind) {
            //         if (isPrimitive) {
            //             const indexAfterWord = at
            //             let nonWhiteSpace = /[^ ]*/g
            //             nonWhiteSpace.lastIndex = indexAfterWord
            //             const match = nonWhiteSpace.exec(text)
            //             const matchStr = match?.[0]
            //             const errorIndex = match?.index;
            //             if (matchStr && errorIndex >= indexAfterWord) {
            //                 throw error("Unexpected non-whitespace character after JSON", errorIndex)
            //             }
            //         }
            //         return undefined
            //     } else {
            //         const wordLen = word.length
            //         const wordToFindLen = wordToFind.length
            //         if (wordLen > wordToFindLen) {
            //             const errorIndex = at - (wordLen - wordToFindLen);
            //             throw error("Unexpected non-whitespace character after JSON", errorIndex)
            //         } else {
            //             const errorInWordIndex = at - 1;
            //             throw error("Unexpected non-whitespace character after JSON", errorInWordIndex)
            //         }
            //     }
            default:
                throw error('Unexpected Token');
        }
    }
    // Initialize First Variable
    seek();
    return parse();
};

let chunkLoadingLength = []
const requestEntries = async (url, totalLength, status, chunkIdx) => {
    if (url instanceof Array) {
        try {
            const promises = url.map((chunkUrl, idx) => {
                chunkLoadingLength[idx] = 0
                return requestEntries(chunkUrl, totalLength, status, idx)
            })
            const chunks = await Promise.all(promises)
            return chunks[0] + chunks[1]
        } catch (e) {
            throw e
        }
    } else {
        
        let newUrl
        if (typeof appID === "number") {
            newUrl = url + "?v=" + appID
        }

        try {
            let response = await fetch(newUrl || url, {
                headers: {
                    'Cache-Control': 'public, max-age=31536000, immutable',
                },
                cache: 'no-cache'
            })
            
            if (totalLength && status) {
                const reader = response.body.getReader();
                response = new Response(new ReadableStream({
                    async start(controller) {
                        let receivedLength = 0;
                        let startPost = performance.now();
                        
                        while (true) {
                            const { done, value } = await reader.read()
                            if (done) {
                                self.postMessage({ status: null })
                                self.postMessage({ progress: 100 })
                                return controller.close()
                            }
                            receivedLength += value?.byteLength || value?.length || 0;
                            if (chunkIdx != null) {
                                chunkLoadingLength[chunkIdx] = receivedLength
                            }
                            let progress
                            if (chunkIdx != null) {
                                progress = (arraySum(chunkLoadingLength) / totalLength) * 100
                            } else {
                                progress = (receivedLength / totalLength) * 100
                            }
                            if (progress > 0 && progress <= 100) {
                                const endPost = performance.now()
                                if (endPost - startPost >= 17) {
                                    startPost = endPost
                                    self.postMessage({ progress })
                                    if (progress >= 100) {
                                        self.postMessage({ status: `100% ${status}` })
                                    } else {
                                        self.postMessage({ status: `${progress.toFixed(2)}% ${status}` })
                                    }
                                }
                            }
                            controller.enqueue(value)
                        }
                    }
                }));
            }
            
            return await response.text()
        } catch {
            return await requestEntries(url)
        }
    }
}
function arraySum(obj) {
    return obj.reduce((a, b) => a + b, 0)
}