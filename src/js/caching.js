import { requestProgress } from "./globalValues"

let cacheID = 1
let loadedUrls = {}
let minProgress = 0;
let runningRequest = 0;
const cacheRequest = (url) => {
    return new Promise((resolve, reject) => {
        url = url + `?v=${cacheID}`
        if (loadedUrls[url]) {
            resolve(loadedUrls[url])
        } else {
            ++runningRequest
            fetch(url, {
                headers: {
                    'Cache-Control': 'max-age=31536000, immutable'
                }
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(res.statusText);
                    }
                    const contentLength = response.headers.get('content-length');
                    let loaded = 0;
                    return new Response(
                        new ReadableStream({
                            start(controller) {
                                const reader = response.body.getReader();
                                read();
                                function read() {
                                    reader.read()
                                        .then((progressEvent) => {
                                            if (progressEvent.done) {
                                                controller.close();
                                                return;
                                            }
                                            console.log(loaded, contentLength)
                                            loaded += progressEvent.value.byteLength;
                                            let progress = (loaded / contentLength) * 100
                                            if (runningRequest < 2) { // Just One Running Request
                                                minProgress = progress
                                            } else if (progress < minProgress) { // More than 1 Request
                                                minProgress = progress
                                            }
                                            requestProgress.set(minProgress)
                                            controller.enqueue(progressEvent.value);
                                            read();
                                        })
                                }
                            }
                        })
                    );
                })
                .then(response => response.blob())
                .then(blob => {
                    --runningRequest
                    let bloburl = URL.createObjectURL(blob);
                    loadedUrls[url] = bloburl
                    resolve(bloburl);
                })
                .catch((error) => {
                    --runningRequest
                    reject(new Error(error))
                })
        }
    })
}

export { cacheRequest }