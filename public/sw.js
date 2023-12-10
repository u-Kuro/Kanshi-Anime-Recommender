self.addEventListener("install", e => { }), self.addEventListener("fetch", e => {
    console.log(self)
    console.log(self.location)
    console.log(self.location.href)
    console.log(e);
    console.log(e.request);
    console.log(e.request.url);
    e.request.url !== self.location.href && e.respondWith(fetch(e.request))
})