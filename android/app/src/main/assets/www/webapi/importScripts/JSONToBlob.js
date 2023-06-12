function JSONToBlob(object) {
    let propertyStrings = [];
    let chunkStr = '';
    const maxByteSize = 4 * 1024 * 1024; // Maximum byte 4MB size for each chunk
    function isJsonObject(obj) {
        return Object.prototype.toString.call(obj) === "[object Object]"
    }
    function bloberize(x) {
        let first = true;
        if (chunkStr.length >= maxByteSize) {
            const propertyBlob = new Blob([chunkStr], { type: 'text/plain' });
            propertyStrings.push(propertyBlob);
            chunkStr = '';
        }
        if (isJsonObject(x)) {
            chunkStr += '{';
            for (let [k, v] of Object.entries(x)) {
                if (v === undefined) continue;
                if (isJsonObject(v) || v instanceof Array) {
                    if (first) {
                        first = false;
                        chunkStr += `${JSON.stringify(k)}:`;
                    } else {
                        chunkStr += `,${JSON.stringify(k)}:`;
                    }
                    bloberize(v);
                } else {
                    if (first) {
                        first = false;
                        chunkStr += `${JSON.stringify(k)}:${JSON.stringify(v)}`;
                    } else {
                        chunkStr += `,${JSON.stringify(k)}:${JSON.stringify(v)}`;
                    }
                }
            }
            chunkStr += '}';
            return;
        } else if (x instanceof Array) {
            chunkStr += '[';
            for (let i = 0; i < x.length; i++) {
                let v = x[i];
                if (isJsonObject(v) || v instanceof Array) {
                    if (first) {
                        first = false;
                    } else {
                        chunkStr += ',';
                    }
                    bloberize(v);
                } else {
                    if (first) {
                        first = false;
                        chunkStr += JSON.stringify(v);
                    } else {
                        chunkStr += `,${JSON.stringify(v)}`;
                    }
                }
            }
            chunkStr += ']';
            return;
        }
    }
    bloberize(object)
    const propertyBlob = new Blob([chunkStr], { type: 'text/plain' });
    propertyStrings.push(propertyBlob);
    chunkStr = '';
    return new Blob(propertyStrings, { type: 'application/json' });
}
