const jsonIsEmpty = (obj) => {
    for (const key in obj) {
        return false;
    }
    return true;
}

const makeFetchRequest = (url, options) => {
    return new Promise((resolve, reject) => {
        fetch(url, options).then(response => {
            if (!response.ok) reject(`Fetch error! Status: ${response.status}`);
            resolve(response.json());
        }).catch(err => reject(err));
    })
}
  
const fetchAniListData = (anilistGraphQLQuery) => {
    return new Promise(async(resolve, reject)=>{
        const requestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Cache-Control': 'max-age=31536000, immutable'
            },
            body: JSON.stringify({
                query: anilistGraphQLQuery
            })
        };
        await makeFetchRequest('https://graphql.anilist.co', requestOptions, callback)
        .then(data=>resolve(data))
        .catch(error => reject(error))
    })
}

export { 
    jsonIsEmpty,
    makeFetchRequest,
    fetchAniListData
}