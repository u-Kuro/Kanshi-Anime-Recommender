let request, db;

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
    if (!db) {
        await IDBinit();
    }
    self.postMessage({ status: "Importing User Data" })
    const reader = new FileReader()
    reader.onload = async () => {
        let fileContent;
        try {
            self.postMessage({ progress: 0 })
            fileContent = JSON.parse(reader.result)
            self.postMessage({ progress: 75 })
        } catch (e) {
            console.error(e)
            fileContent = undefined;
        }
        try {
            if (!fileContent) {
                self.postMessage({ progress: 0 })
                self.postMessage({ progress: 30 })
                fileContent = parseJSON(reader.result, reader.result.length)
                self.postMessage({ progress: 75 })
            }
            if (!fileContent) {
                self.postMessage({ status: "File parsing has failed" })
                self.postMessage({ error: "File parsing has failed" })
                return
            }
            self.postMessage({ status: "Updating Existing Data" })
            const collectionToPut = {}

            const userData = fileContent?.userData
            const username = userData?.username ?? fileContent?.username
            const shouldImportUserEntries = username && typeof username == "string"
            if (shouldImportUserEntries) {
                self.postMessage({ importedUsername: username })
            }

            self.postMessage({ progress: 76.10993657505286 })

            const tagInfo = fileContent?.tagInfo
            if (isJsonObject(tagInfo) && !jsonIsEmpty(tagInfo)) {
                collectionToPut.tagInfo = tagInfo
            }

            self.postMessage({ progress: 81.60676532769556 })
            if (shouldImportUserEntries) {
                const userEntries = userData?.userEntries
                if (userEntries instanceof Array) {
                    collectionToPut.userData = {
                        username,
                        userEntries,
                    }
                    collectionToPut.userMediaUpdateAt = fileContent.userMediaUpdateAt
                }
            }

            const algorithmFilters = fileContent.algorithmFilters
            if (algorithmFilters instanceof Array && algorithmFilters?.length > 0) {
                self.postMessage({ algorithmFilters })
                collectionToPut.algorithmFilters = algorithmFilters
            }

            self.postMessage({ progress: 82.87526427061312 })

            const userList = fileContent.userList
            const hiddenEntries = userList?.hiddenEntries
            const mediaCautions = userList?.mediaCautions
            const categories = userList?.categories
            let category
            for (const k in categories) {
                category = categories[k]
                break
            }
            
            if (isJsonObject(hiddenEntries)
                && mediaCautions instanceof Array
                && category?.mediaFilters instanceof Array
                && category?.mediaList instanceof Array
                && typeof category?.isHiddenList === "boolean"
                && typeof category?.sortBy?.sortName === "string"
                && typeof category?.sortBy?.sortType === "string"
            ) {
                self.postMessage({ mediaCautions })
                self.postMessage({ importedHiddenEntries: hiddenEntries })
                collectionToPut.userList = userList
            }

            self.postMessage({ progress: 94.08033826638479 })

            // Check if saved entries is lower
            const mediaEntries = fileContent.mediaEntries
            const excludedEntries = fileContent.excludedEntries

            let mediaUpdateAt = fileContent.mediaUpdateAt || 1706674120
            let currentMediaUpdateAt = await retrieveJSON("mediaUpdateAt") || 1706674120

            let shouldImportAniEntries =
                (mediaUpdateAt > currentMediaUpdateAt && mediaUpdateAt && isJsonObject(mediaEntries) && !jsonIsEmpty(mediaEntries))
                || Object.keys((await retrieveJSON("mediaEntries")) || {}).length < Object.keys(mediaEntries || {}).length

            if (shouldImportAniEntries) {
                collectionToPut.mediaEntries = mediaEntries
                collectionToPut.excludedEntries = excludedEntries
                collectionToPut.mediaUpdateAt = mediaUpdateAt
            }

            if (!jsonIsEmpty(collectionToPut)) {
                collectionToPut.shouldProcessRecommendation = true
                await saveJSONCollection(collectionToPut);
                self.postMessage({ status: "Data has been Imported" })
                self.postMessage({ status: null })
                self.postMessage({ progress: 100 })
                self.postMessage({ message: "success" })
            } else {
                self.postMessage({ status: "Something went wrong" })
                self.postMessage({ status: null })
                self.postMessage({ progress: 100 })
                self.postMessage({ error: "Something went wrong" })
            }
        } catch (reason) {
            console.error(reason)
            let error = reason?.stack || reason?.message
            if (typeof error !== "string" || !error) {
                error = "Something went wrong"
            }
            self.postMessage({ status: error })
            self.postMessage({ progress: 100 })
            self.postMessage({ error })
        }
    }
    reader.onerror = (reason) => {
        console.error(reason)
        let error = reason?.stack || reason?.message
        if (typeof error !== "string" || !error) {
            error = "Something went wrong"
        }
        self.postMessage({ status: error })
        self.postMessage({ progress: 100 })
        self.postMessage({ error })
    }
    if (reader.readyState !== 1) {// Not Loaded
        reader.readAsText(data.importedFile);
    } else {
        reader.onabort = () => {
            reader.readAsText(data.importedFile);
        }
        reader.abort();
    }
};
function IDBinit() {
    return new Promise((resolve) => {
        let request = indexedDB.open(
            "Kanshi.Media.Recommendations.Anilist.W~uPtWCq=vG$TR:Zl^#t<vdS]I~N70",
            1
        );
        request.onsuccess = (event) => {
            db = event.target.result;
            resolve()
        };
        request.onupgradeneeded = (event) => {
            db = event.target.result;
            db.createObjectStore("others");
            event.target.transaction.oncomplete = () => {
                resolve();
            }
        }
        request.onerror = (error) => {
            console.error(error);
        };
    })
}
function saveJSONCollection(collection) {
    return new Promise((resolve, reject) => {
        try {
            let transaction = db.transaction("others", "readwrite");
            let store = transaction.objectStore("others");
            let put;
            transaction.oncomplete = () => {
                resolve();
            }
            for (let key in collection) {
                let data = collection[key];
                let blob
                if (data instanceof Blob) {
                    blob = data
                    put = store.put(blob, key);
                } else if (isJsonObject(data) || data instanceof Array) {
                    blob = new Blob([JSON.stringify(data)]);
                    put = store.put(blob, key);
                } else {
                    put = store.put(data, key);
                }
                put.onerror = (ex) => {
                    transaction.oncomplete = undefined;
                    if (blob instanceof Blob) {
                        try {
                            transaction.oncomplete = () => {
                                resolve();
                            }
                            put = store.put((new FileReaderSync()).readAsArrayBuffer(blob), key);
                            put.onerror = (ex) => {
                                console.error(ex);
                                reject(ex);
                            }
                            try {
                                transaction?.commit?.();
                            } catch {}
                        } catch (ex2) {
                            console.error(ex);
                            console.error(ex2);
                            reject(ex2);
                        }
                    } else {
                        console.error(ex);
                        reject(ex);
                    }
                };
            }
            try {
                transaction?.commit?.();
            } catch {}
        } catch (ex) {
            console.error(ex);
            reject(ex);
        }
    });
}
function retrieveJSON(name) {
    return new Promise((resolve) => {
        try {
            let get = db
                .transaction("others", "readonly")
                .objectStore("others")
                .get(name);
            get.onsuccess = () => {
                let result = get.result;
                if (result instanceof Blob) {
                    result = JSON.parse((new FileReaderSync()).readAsText(result));
                } else if (result instanceof ArrayBuffer) {
                    result = JSON.parse((new TextDecoder()).decode(result));
                }
                resolve(result);
            };
            get.onerror = (ex) => {
                console.error(ex);
                resolve();
            };
        } catch (ex) {
            console.error(ex);
            resolve();
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
    } else if (!(typeof text === "string" || text instanceof String)) {
        throw new Error(`Input Text has Unexpected Type of ${text?.constructor?.name || typeof text}`, { cause: JSON.stringify(text) })
    }
    // Seeked First Character Below Before Parsing
    let at = -1;
    let ch = "";

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
            let progress = (textProcessed / textLength)
            if (progress < .9763) {
                const endPost = performance.now()
                if (endPost - startPost > 17) {
                    startPost = endPost
                    progress = progress * 100
                    self.postMessage({ progress })
                    if (progress > 0.01) {
                        self.postMessage({ status: `${progress.toFixed(2)}% Importing User Data` })
                    }
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
            if (ch && ch <= " ") {
                newAt += 1
                continue
            }
            at = newAt
            garbageChunk();
            break;
        }
    };

    let wordCheck = () => {
        let word = "";
        do {
            word += ch;
            seek();
        } while (ch.match(/[a-z]/i));
        return word;
    };

    let isPrimitive = true;
    let normalizeUnicodedString = (quote) => {
        // Start Quote is Already Removed
        let inQuotes = "";
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
            while (ch === "\\") {
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
            case "{":
                isPrimitive = false;
                let returnObj = {};
                seek()
                if (ch === "}") {
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
                    } else if (ch === ",") {
                        lastCh = ch;
                        seek();
                    } else {
                        throw error("Expected ',' or '}' after property value in JSON")
                    }
                    // Get Key
                    let key = parse(); // Already Seeked Next Character
                    if (ch === ":") {
                        lastCh = ch;
                        seek();
                    } else {
                        throw error("Expected ':' after property name in JSON")
                    }
                    // Get Value
                    returnObj[key] = parse(); // Already Seeked Next Character
                    if (ch === "}") {
                        seek()
                        return returnObj
                    }
                } while (ch === ",");
                if (lastCh === ",") {
                    throw error("Expected double-quoted property name in JSON")
                } else if (lastCh === ":") {
                    throw error("Unexpected end of JSON input")
                } else if (jsonIsEmpty(returnObj)) {
                    throw error("Expected property name or '}' in JSON")
                } else {
                    throw error("Expected ',' or '}' after property value in JSON")
                }
            case "[":
                isPrimitive = false
                let returnArr = [];
                seek()
                if (ch === "]") {
                    seek()
                    return returnArr
                }
                isFirstKey = true;
                do {
                    if (isFirstKey) {
                        isFirstKey = false
                    } else if (ch === ",") {
                        seek();
                    } else {
                        throw error(returnArr.length ? "Expected ',' or ']' after array element" : "Unexpected end of JSON input");
                    }
                    // Get Value
                    let value = parse(); // Already Seeked Next Character
                    returnArr.push(value);
                    if (ch === "]") {
                        seek()
                        return returnArr
                    }
                } while (ch === ",");
                throw error(returnArr.length ? "Expected ',' or ']' after array element" : "Unexpected end of JSON input");
            case '"':
                // case "'":
                // case "`":
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
                    return "";
                } else {
                    // normalizeUnicodedString function
                    // already updates character position
                    return normalizeUnicodedString(quote);
                }
            case "0":
            case "1":
            case "2":
            case "3":
            case "4":
            case "5":
            case "6":
            case "7":
            case "8":
            case "9":
            case "-":
                // case ".":
                // case "I":
                // case "+":
                let numHolder = ""
                let addUpNumberStr = () => {
                    numHolder += ch;
                    seek();
                };

                if (ch === "-" || ch === "+") {
                    addUpNumberStr();
                }
                // if (ch === "I") {
                //     word = wordCheck();
                //     wordToFind = "Infinity"
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
                let afterDecimal = ch === "."
                let afterExponential
                if (afterDecimal) {
                    addUpNumberStr();
                }
                while (isFinite(ch) && ch !== "") {
                    addUpNumberStr();
                    if (!afterDecimal && ch === ".") {
                        afterDecimal = true
                        addUpNumberStr();
                    } else if (!afterExponential && (ch === "e" || ch === "E")) {
                        afterExponential = true
                        addUpNumberStr();
                        if (ch === "+" || ch === "-") {
                            addUpNumberStr();
                        }
                    }
                }
                // }
                const num = Number(numHolder);
                if (isNaN(num)) {
                    const errorIndex = at - numHolder.length
                    throw error("Invalid Number", errorIndex);
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
            case "t":
                word = wordCheck();
                wordToFind = "true"
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
            case "f":
                word = wordCheck();
                wordToFind = "false"
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
            case "n":
                word = wordCheck();
                wordToFind = "null"
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
            // case "u":
            //     word = wordCheck();
            //     wordToFind = "undefined"
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
                throw error("Unexpected Token");
        }
    }
    // Initialize First Variable
    seek();
    return parse();
};