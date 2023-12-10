self.addEventListener("install", e => { }), self.addEventListener("fetch", e => {
    e.respondWith(fetch(e.request).catch(e => {
        console.log(e, e?.message)
        return new Response(e?.message, {
            status: 500,
            statusText: 'Internal Server Error'
        });
    }))
});