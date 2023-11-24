
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
  try {
    if (typeof str1 !== "string" || typeof str2 !== "string") {
      return false;
    }
    return str1.trim().toLowerCase() === str2.trim().toLowerCase();
  } catch (e) { }
}

const changeInputValue = (inputElement, newValue) => {
  let selectionStart = Math.max(inputElement.selectionStart - 1 || 0, 0);
  inputElement.value = newValue;
  inputElement.setSelectionRange(selectionStart, selectionStart);
}

const dragScroll = (element, axis = 'xy', avoidCondition = () => false) => {
  let curDown, curYPos, curXPos, velocityY, velocityX, currentScrollYPosition, currentScrollXPosition;

  let move = (e) => {
    if (curDown && e.pointerType === "mouse") {
      if (axis.toLowerCase().includes('y')) {
        let endYPos = e.clientY;
        let deltaY = endYPos - curYPos
        element.scrollTop = currentScrollYPosition - deltaY;
      }
      if (axis.toLowerCase().includes('x')) {
        let endXPos = e.clientX;
        let deltaX = endXPos - curXPos
        element.scrollLeft = currentScrollXPosition - deltaX;
      }
    }
  };

  let down = (e) => {
    if (e.pointerType !== "mouse" || avoidCondition(e)) return
    velocityY = 0;
    cancelAnimationFrame(kineticScrollYAnimation);
    velocityX = 0;
    cancelAnimationFrame(kineticScrollXAnimation);
    if (axis.toLowerCase().includes('y')) {
      curYPos = e.clientY;
      currentScrollYPosition = element.scrollTop
    }
    if (axis.toLowerCase().includes('x')) {
      curXPos = e.clientX;
      currentScrollXPosition = element.scrollLeft
    }
    curDown = true;
  };

  let up = (e) => {
    if (curDown) {
      if (axis.toLowerCase().includes('y') && e.pointerType === "mouse") {
        let endYPos = e.clientY;
        let deltaY = endYPos - curYPos
        element.scrollTop = currentScrollYPosition - deltaY;
        velocityY = deltaY
        simulateKineticScrollY(element)
      }
      if (axis.toLowerCase().includes('x') && e.pointerType === "mouse") {
        let endXPos = e.clientX;
        let deltaX = endXPos - curXPos
        element.scrollLeft = currentScrollXPosition - deltaX;
        velocityX = deltaX
        simulateKineticScrollX(element)
      }
    }
    curDown = false;
  };

  let cancel = () => curDown = false;

  let kineticScrollYAnimation;
  let simulateKineticScrollY = (container, currentScrollTop) => {
    let shouldScroll =
      (currentScrollTop == null || container.scrollTop === currentScrollTop)
      && typeof velocityY === "number"
      && container && Math.abs(velocityY) > 0.1
    if (shouldScroll) {
      container.scrollTop -= velocityY * 0.1;
      let newScrollTop = container.scrollTop;
      kineticScrollYAnimation = requestAnimationFrame(() => simulateKineticScrollY(container, newScrollTop));
      velocityY *= 0.9;
    } else {
      velocityY = 0;
      cancelAnimationFrame(kineticScrollYAnimation);
    }
  }

  let kineticScrollXAnimation;
  let simulateKineticScrollX = (container, currentScrollLeft) => {
    let shouldScroll =
      (currentScrollLeft == null || container.scrollLeft === currentScrollLeft)
      && typeof velocityX === "number"
      && container && Math.abs(velocityX) > 0.1
    if (shouldScroll) {
      container.scrollLeft -= velocityX * 0.1;
      let newScrollLeft = container.scrollLeft;
      kineticScrollXAnimation = requestAnimationFrame(() => simulateKineticScrollX(container, newScrollLeft));
      velocityX *= 0.9;
    } else {
      velocityX = 0;
      cancelAnimationFrame(kineticScrollXAnimation);
    }
  }

  element.addEventListener('pointermove', move);
  element.addEventListener('pointerdown', down);
  element.addEventListener('pointerup', up);
  window.addEventListener('pointerup', cancel);
  window.addEventListener('pointercancel', cancel);
  return () => {
    velocityX = velocityY = 0;
    cancelAnimationFrame(kineticScrollYAnimation);
    cancelAnimationFrame(kineticScrollXAnimation);
    element.removeEventListener('pointermove', move);
    element.removeEventListener('pointerdown', down);
    element.removeEventListener('pointerup', up);
    window.addEventListener('pointerup', cancel);
    window.addEventListener('pointercancel', cancel);
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

const getElementWidth = (element) => {
  try {
    const elementComputedStyle = window?.getComputedStyle?.(element, null)
    let elementWidth = element?.getBoundingClientRect?.()?.width
    elementWidth -=
      parseFloat(elementComputedStyle?.paddingLeft) +
      parseFloat(elementComputedStyle?.paddingRight)
    return elementWidth
  } catch (e) {
    return
  }
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

const capitalize = (s) => {
  if (typeof s === "string") {
    return s.split(" ").map((e) => e.substring(0, 1).toUpperCase() + e.substring(1)).join(" ")
  } else {
    return s
  }
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

const hasValidOrigin = (url) => {
  try {
    return (new URL(url)).origin !== 'null'
  } catch (ex) {
    return false
  }
}

const isMobile = () => {
  try {
    let check = false;
    (function (a) { if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true; })(navigator.userAgent || navigator.vendor || window.opera);
    return check;
  } catch (e) { }
};

export {
  setLocalStorage,
  getLocalStorage,
  makeArrayUnique,
  capitalize,
  getMostVisibleElementFromArray,
  addClass,
  removeClass,
  getElementWidth,
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
  isElementVisible,
  hasValidOrigin,
  isMobile
}