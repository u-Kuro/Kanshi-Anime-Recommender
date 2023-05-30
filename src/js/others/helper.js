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
        await makeFetchRequest('https://graphql.anilist.co', requestOptions)
        .then(data=>resolve(data))
        .catch(error => reject(error))
    })
}

function formatNumber(number, dec=2) {
    if (typeof number === "number") {
      const formatter = new Intl.NumberFormat("en-US", {
        maximumFractionDigits: dec, // display up to 2 decimal places
        minimumFractionDigits: 0, // display at least 0 decimal places
        notation: "compact", // use compact notation for large numbers
        compactDisplay: "short", // use short notation for large numbers (K, M, etc.)
      });
  
      if (Math.abs(number) >= 1000) {
        return formatter.format(number);
      } else if (Math.abs(number) < 0.01) {
        return number.toExponential(0);
      } else {
        return (
          number.toFixed(dec) ||
          number.toLocaleString("en-US", { maximumFractionDigits: dec })
        );
      }
    } else {
      return null;
    }
}

export { 
    jsonIsEmpty,
    makeFetchRequest,
    fetchAniListData,
    formatNumber
}