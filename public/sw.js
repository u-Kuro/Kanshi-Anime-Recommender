self.addEventListener("install", e => { }), self.addEventListener("fetch", e => {
    e.respondWith(fetch(e.request).catch(e => {
        return new Response('Error: ' + error.message, {
            status: 500,
            statusText: 'Internal Server Error'
        });
    }))
});