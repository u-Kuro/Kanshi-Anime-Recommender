
const isJsonObject = (obj) => {
  return Object.prototype.toString.call(obj) === "[object Object]"
}

const jsonIsEmpty = (obj) => {
  for (const key in obj) {
    return false;
  }
  return true;
}

function msToTime(duration, limit) {
  try {
    let seconds = Math.floor((duration / 1000) % 60),
      minutes = Math.floor((duration / (1000 * 60)) % 60),
      hours = Math.floor((duration / (1000 * 60 * 60)) % 24),
      days = Math.floor((duration / (1000 * 60 * 60 * 24)) % 7),
      weeks = Math.floor((duration / (1000 * 60 * 60 * 24 * 7)) % 4),
      months = Math.floor((duration / (1000 * 60 * 60 * 24 * 7 * 4)) % 12),
      years = Math.floor((duration / (1000 * 60 * 60 * 24 * 7 * 4 * 12)) % 10),
      decades = Math.floor((duration / (1000 * 60 * 60 * 24 * 7 * 4 * 12 * 10)) % 10),
      century = Math.floor((duration / (1000 * 60 * 60 * 24 * 7 * 4 * 12 * 10 * 10)) % 10),
      millenium = Math.floor((duration / (1000 * 60 * 60 * 24 * 7 * 4 * 12 * 10 * 10 * 10)) % 10);
    let time = []
    if (millenium <= 0 && century <= 0 && decades <= 0 && years <= 0 && months <= 0 && weeks <= 0 && days <= 0 && hours <= 0 && minutes <= 0 && seconds <= 0) return "0s"
    if (millenium > 0) time.push(`${millenium}mil`)
    if (decades > 0) time.push(`${decades}dec`)
    if (years > 0) time.push(`${years}y`)
    if (months > 0) time.push(`${months}mon`)
    if (weeks > 0) time.push(`${weeks}w`)
    if (days > 0) time.push(`${days}d`)
    if (hours > 0) time.push(`${hours}h`)
    if (minutes > 0) time.push(`${minutes}m`)
    if (seconds > 0) time.push(`${seconds}s`)
    if (limit > 0) {
      time = time.slice(0, limit)
    }
    return time.join(" ")
  } catch (e) {
    return
  }
}

function getMostVisibleElement(parent, childSelector, intersectionRatioThreshold = 0.5) {
  try {
    var childElements;
    if (childSelector instanceof Array) {
      childElements = childSelector;
    } else {
      childElements = parent.querySelectorAll(childSelector);
    }
    var mostVisibleElement = null;
    var highestVisibleRatio = 0;
    let twoElements = []
    let parentScroll = parent.scrollTop
    for (let i = 0; i < childElements.length; i++) {
      if (childElements[i].offsetTop > parentScroll) {
        if (i > 0) {
          twoElements = [childElements[i - 1], childElements[i]]
        } else if (i === 0) {
          twoElements = [childElements[i]];
        } else {
          twoElements = [];
        }
        break;
      }
    }
    var parentRect = parent.getBoundingClientRect();
    twoElements.forEach((childElement) => {
      var childRect = childElement.getBoundingClientRect();
      var intersectionHeight = Math.min(childRect.bottom, parentRect.bottom) - Math.max(childRect.top, parentRect.top);
      var intersectionRatio = intersectionHeight / childRect.height;
      if (intersectionRatio >= intersectionRatioThreshold && intersectionRatio > highestVisibleRatio) {
        highestVisibleRatio = intersectionRatio;
        mostVisibleElement = childElement;
      }
    });
    return mostVisibleElement;
  } catch (ex) {
    // console.error(ex)
    return
  }
}

function getMostVisibleElementFromArray(parent, elements, intersectionRatioThreshold = 0.5) {
  try {
    if (!elements.length) return null;
    let mostVisibleElement = null;
    var highestVisibleRatio = 0;
    let parentRect = parent.getBoundingClientRect();
    if (elements instanceof HTMLCollection) {
      elements = Array.from(elements);
    }
    elements?.forEach?.((child) => {
      let childRect = child.getBoundingClientRect();
      var intersectionHeight = Math.min(childRect.bottom, parentRect.bottom) - Math.max(childRect.top, parentRect.top);
      var intersectionRatio = intersectionHeight / childRect.height;
      if (intersectionRatio > highestVisibleRatio) {
        if (intersectionRatioThreshold === 0 && intersectionRatio > intersectionRatioThreshold) {
          highestVisibleRatio = intersectionRatio;
          mostVisibleElement = child;
        } else if (intersectionRatio >= intersectionRatioThreshold) {
          highestVisibleRatio = intersectionRatio;
          mostVisibleElement = child;
        }
      }
    });
    return mostVisibleElement;
  } catch (ex) {
    // console.error(ex)
    return
  }
}

function isElementVisible(parent, element, intersectionRatioThreshold = 0) {
  try {
    var boundingRect = element.getBoundingClientRect();
    var parentRect = parent.getBoundingClientRect();
    var overflowX = getComputedStyle(parent).overflowX;
    var overflowY = getComputedStyle(parent).overflowY;
    var isParentScrollable = overflowX === 'auto' || overflowX === 'scroll' || overflowY === 'auto' || overflowY === 'scroll';
    if (isParentScrollable) {
      var scrollLeft = parent.scrollLeft;
      var scrollTop = parent.scrollTop;
      var isVisible = (
        boundingRect.top >= parentRect.top &&
        boundingRect.left >= parentRect.left &&
        boundingRect.bottom <= parentRect.bottom &&
        boundingRect.right <= parentRect.right
      );
      if (!isVisible) {
        var intersectionTop = Math.max(boundingRect.top, parentRect.top) - Math.min(boundingRect.bottom, parentRect.bottom);
        var intersectionLeft = Math.max(boundingRect.left, parentRect.left) - Math.min(boundingRect.right, parentRect.right);
        var intersectionArea = intersectionTop * intersectionLeft;
        var elementArea = Math.min(boundingRect.height, window.innerHeight) * Math.min(boundingRect.width, window.innerWidth);
        var intersectionRatio = intersectionArea / elementArea;
        isVisible = intersectionRatio >= intersectionRatioThreshold;
      }
      if (!isVisible) {
        return false;
      }
      boundingRect = {
        top: boundingRect.top - parentRect.top + scrollTop,
        left: boundingRect.left - parentRect.left + scrollLeft,
        bottom: boundingRect.bottom - parentRect.top + scrollTop,
        right: boundingRect.right - parentRect.left + scrollLeft,
        height: boundingRect.height,
        width: boundingRect.width
      };
    }
    var windowHeight = window.innerHeight || document.documentElement.clientHeight;
    var windowWidth = window.innerWidth || document.documentElement.clientWidth;
    var isVisibleInWindow = (
      boundingRect.top >= 0 &&
      boundingRect.left >= 0 &&
      boundingRect.bottom <= windowHeight &&
      boundingRect.right <= windowWidth
    );
    return isVisibleInWindow;
  } catch (ex) {
    // console.error(ex)
    return
  }
}

const getChildIndex = (childElement, condition) => {
  try {
    return Array.from(childElement.parentElement.children).indexOf(childElement);
  } catch (ex) {
    // console.error(ex)
    return
  }
}

const scrollToElement = (parent, target, position = 'top', behavior, offset = 0) => {
  try {
    let scrollAmount;
    if (typeof target === "string") target = document.querySelector(target)
    if (parent === window) {
      const targetRect = target.getBoundingClientRect();
      const scrollY = window.scrollY;
      if (position === 'bottom') {
        scrollAmount = targetRect.bottom + scrollY - window.innerHeight;
      } else if (position === 'center') {
        scrollAmount = targetRect.top + scrollY - (window.innerHeight / 2);
      } else {
        scrollAmount = targetRect.top + scrollY;
      }
    } else {
      if (typeof parent === "string") parent = document.querySelector(parent)
      if (position === 'bottom') {
        scrollAmount = target.offsetTop + target.offsetHeight - parent.offsetHeight;
      } else if (position === 'center') {
        let targetRect = target.getBoundingClientRect();
        let parentRect = parent.getBoundingClientRect();
        let targetCenter = targetRect.top + targetRect.height / 2;
        let parentCenter = parentRect.top + parentRect.height / 2;
        scrollAmount = targetCenter - parentCenter + parent.scrollTop - parentRect.height / 2;
      } else {
        let targetRect = target.getBoundingClientRect();
        let parentRect = parent.getBoundingClientRect();
        scrollAmount = targetRect.top - parentRect.top + parent.scrollTop;
      }
    }
    if (parent === window) {
      if (behavior === 'smooth') {
        window.scrollTo({
          top: scrollAmount + offset,
          behavior: 'smooth'
        })
      } else {
        window.scrollTo({ top: scrollAmount + offset })
      }
    } else {
      if (behavior === 'smooth') {
        parent.scrollBy({
          top: scrollAmount + offset,
          behavior: "smooth"
        })
      } else {
        parent.scrollTop = scrollAmount + offset;
      }
    }
  } catch (ex) {
    // console.error(ex)
    return
  }
};

const scrollToElementAmount = (parent, target, position = 'top') => {
  try {
    if (typeof parent === "string") parent = document.querySelector(parent)
    if (typeof target === "string") target = document.querySelector(target)
    if (position === 'bottom') {
      return target.offsetTop + target.offsetHeight - parent.offsetHeight;
    } else {
      let targetRect = target.getBoundingClientRect();
      let parentRect = parent.getBoundingClientRect();
      return targetRect.top - parentRect.top + parent.scrollTop;
    }
  } catch (ex) {
    // console.error(ex)
    return
  }
};


const makeFetchRequest = (url, options) => {
  return new Promise((resolve, reject) => {
    fetch(url, options).then(response => {
      if (!response.ok) reject(`Fetch error! Status: ${response.status}`);
      resolve(response.json());
    }).catch(err => reject(err));
  })
}

const fetchAniListData = (anilistGraphQLQuery) => {
  return new Promise(async (resolve, reject) => {
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
      .then(data => resolve(data))
      .catch(error => reject(error))
  })
}

const formatNumber = (number, dec = 2) => {
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

const ncsCompare = (str1, str2) => {
  if (typeof str1 !== "string" || typeof str2 !== "string") {
    return false;
  }
  return str1.toLowerCase() === str2.toLowerCase();
}

const changeInputValue = (inputElement, newValue) => {
  let selectionStart = Math.max(inputElement.selectionStart - 1 || 0, 0);
  inputElement.value = newValue;
  inputElement.setSelectionRange(selectionStart, selectionStart);
}

const dragScroll = (element, axis = 'xy') => {
  var curYPos, curXPos, curDown, curScrollLeft, curScrollTop;

  let move = (e) => {
    if (curDown && e.pointerType === "mouse") {
      if (axis.toLowerCase().includes('y'))
        element.scrollTop = curYPos - e.pageY + curScrollTop;
      if (axis.toLowerCase().includes('x'))
        element.scrollLeft = curXPos - e.pageX + curScrollLeft;
    }
  };

  let down = (e) => {
    if (e.pointerType !== "mouse") return
    if (axis.toLowerCase().includes('y')) {
      curYPos = e.pageY;
      curScrollTop = element.scrollTop;
    }
    if (axis.toLowerCase().includes('x')) {
      curXPos = e.pageX;
      curScrollLeft = element.scrollLeft;
    }
    curDown = true;
  };

  let up = (e) => {
    if (e.pointerType !== "mouse") return
    curDown = false;
  };

  element.addEventListener('pointermove', move);
  element.addEventListener('pointerdown', down);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  return () => {
    element.removeEventListener('pointermove', move);
    element.removeEventListener('pointerdown', down);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
  };
}

const isAndroid = () => {
  try {
    JSBridge.exportJSON // Android Interface
    return true
  } catch (e) {
    return false
  }
}

let $_pastExportUrl;
const downloadLink = (url, fileName) => {
  if ($_pastExportUrl) {
    setTimeout(() => URL.revokeObjectURL($_pastExportUrl), 0)
  }
  $_pastExportUrl = url
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  return
}

const addClass = (element, className) => {
  element?.classList?.add?.(className)
}

const removeClass = (element, className) => {
  element?.classList?.remove?.(className)
}

const makeArrayUnique = (arr) => {
  const uniqueArray = [];
  const seenValues = {};
  for (const element of (arr || [])) {
    let strElement = JSON.stringify(element)
    if (!seenValues[strElement]) {
      uniqueArray.push(element);
      seenValues[strElement] = true;
    }
  }
  return uniqueArray;
}

const LocalStorageID = "Kanshi.Anime.Recommendations.Anilist.W~uPtWCq=vG$TR:Zl^#t<vdS]I~N70"
const getLocalStorage = (key) => {
  let data;
  try {
    key = LocalStorageID + key;
    data = localStorage.getItem(key)
    return JSON.parse(data)
  } catch (ex) {
    return data ?? null;
  }
}
const setLocalStorage = (key, data) => {
  try {
    localStorage.setItem(LocalStorageID + key, data)
  } catch (ex) { }
}

export {
  setLocalStorage,
  getLocalStorage,
  makeArrayUnique,
  getMostVisibleElementFromArray,
  addClass,
  removeClass,
  downloadLink,
  isAndroid,
  isJsonObject,
  jsonIsEmpty,
  getChildIndex,
  getMostVisibleElement,
  scrollToElement,
  scrollToElementAmount,
  makeFetchRequest,
  fetchAniListData,
  formatNumber,
  ncsCompare,
  msToTime,
  changeInputValue,
  dragScroll,
  isElementVisible
}