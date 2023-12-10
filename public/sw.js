self.addEventListener("install",e=>{}),self.addEventListener("fetch",e=>{e.respondWith(fetch(e.request).catch(e=>{
    console.log(e);
    return e.response
}))});