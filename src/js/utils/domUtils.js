const addClass = (element, className) => {
    try {
        element.classList.add(className)
    } catch { }
}
const removeClass = (element, className) => {
    try {
        element.classList.remove(className)
    } catch { }
}
const getElementWidth = (element) => {
    try {
        const elementComputedStyle = window.getComputedStyle(element)
        let elementWidth = element.getBoundingClientRect().width
        elementWidth -=
            parseFloat(elementComputedStyle.paddingLeft) +
            parseFloat(elementComputedStyle.paddingRight)
        return elementWidth
    } catch { }
}
const getChildIndex = (childElement) => {
    try {
        return Array.from(childElement.parentElement.children).indexOf(childElement);
    } catch { }
}
const getMostVisibleElement = (parent, childSelector, intersectionRatioThreshold = 0.5) => {
    try {
        let childElements;
        if (childSelector instanceof Array) {
            childElements = childSelector;
        } else {
            childElements = parent.querySelectorAll(childSelector);
        }
        let twoElements = []
        for (let i = 0; i < childElements.length; i++) {
            if (childElements[i].offsetTop > parent.scrollTop) {
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
        let mostVisibleElement = null,
            highestVisibleRatio = 0,
            parentRect = parent.getBoundingClientRect();
        for (let i = 0; i < twoElements.length; i++) {
            const childElement = twoElements[i],
                childRect = childElement.getBoundingClientRect(),
                intersectionRatio = (Math.min(childRect.bottom, parentRect.bottom) - Math.max(childRect.top, parentRect.top)) / childRect.height;
            if (intersectionRatio >= intersectionRatioThreshold && intersectionRatio > highestVisibleRatio) {
                highestVisibleRatio = intersectionRatio;
                mostVisibleElement = childElement;
            }
        }
        return mostVisibleElement;
    } catch { }
}
const changeInputValue = (inputElement, newValue) => {
    try {
        let selectionStart = inputElement.selectionStart
        inputElement.value = newValue;
        if (selectionStart > 0 && typeof selectionStart === "number") {
            --selectionStart
            inputElement.setSelectionRange(selectionStart, selectionStart);
        }
    } catch { }
}
const scrollToElement = (parent, target, position = "top", behavior, offset = 0) => {
    try {
        if (typeof target === "string") target = document.querySelector(target)
        let scrollAmount;
        if (parent === window) {
            const targetRect = target.getBoundingClientRect();
            const scrollY = window.scrollY;
            if (position === "bottom") {
                scrollAmount = targetRect.bottom + scrollY - window.innerHeight;
            } else if (position === "center") {
                scrollAmount = targetRect.top + scrollY - (window.innerHeight / 2);
            } else {
                scrollAmount = targetRect.top + scrollY;
            }
        } else {
            if (typeof parent === "string") parent = document.querySelector(parent)
            if (position === "bottom") {
                scrollAmount = target.offsetTop + target.offsetHeight - parent.offsetHeight;
            } else if (position === "center") {
                const targetRect = target.getBoundingClientRect(),
                    parentRect = parent.getBoundingClientRect();
                scrollAmount = 
                    (targetRect.top + targetRect.height / 2) 
                    - (parentRect.top + parentRect.height / 2)
                    - (parentRect.height / 2);
                    + parent.scrollTop
            } else {
                scrollAmount = 
                    target.getBoundingClientRect().top
                    - parent.getBoundingClientRect().top
                    + parent.scrollTop;
            }
        }
        if (parent === window) {
            if (behavior === "smooth") {
                window.scrollTo({
                    top: scrollAmount + offset,
                    behavior: "smooth"
                })
            } else {
                window.scrollTo({ top: scrollAmount + offset })
            }
        } else {
            if (behavior === "smooth") {
                parent.scrollBy({
                    top: scrollAmount + offset,
                    behavior: "smooth"
                })
            } else {
                parent.scrollTop = scrollAmount + offset;
            }
        }
    } catch { }
}
const dragScroll = (element, axis = "xy", avoidCondition = () => false) => {
    try {
        let curDown,
            curYPos, curXPos,
            velocityY, velocityX,
            currentScrollYPosition, currentScrollXPosition,
            kineticScrollYAnimation, kineticScrollXAnimation;
        const move = (e) => {
            if (curDown && e.pointerType === "mouse") {
                if (axis.toLowerCase().includes("y")) {
                    element.scrollTop = currentScrollYPosition - e.clientY - curYPos;
                }
                if (axis.toLowerCase().includes("x")) {
                    element.scrollLeft = currentScrollXPosition - e.clientX - curXPos;
                }
            }
        },
        down = (e) => {
            if (e.pointerType !== "mouse" || avoidCondition(e)) return
            velocityY = 0;
            cancelAnimationFrame(kineticScrollYAnimation);
            velocityX = 0;
            cancelAnimationFrame(kineticScrollXAnimation);
            if (axis.toLowerCase().includes("y")) {
                curYPos = e.clientY;
                currentScrollYPosition = element.scrollTop
            }
            if (axis.toLowerCase().includes("x")) {
                curXPos = e.clientX;
                currentScrollXPosition = element.scrollLeft
            }
            curDown = true;
        },
        up = (e) => {
            if (curDown) {
                if (axis.toLowerCase().includes("y") && e.pointerType === "mouse") {
                    velocityY = e.clientY - curYPos
                    element.scrollTop = currentScrollYPosition - velocityY;
                    simulateKineticScrollY(element)
                }
                if (axis.toLowerCase().includes("x") && e.pointerType === "mouse") {
                    velocityX = e.clientX - curXPos
                    element.scrollLeft = currentScrollXPosition - velocityX;
                    simulateKineticScrollX(element)
                }
            }
            curDown = false;
        },
        cancel = () => curDown = false,
        simulateKineticScrollY = (container, currentScrollTop) => {
            if (
                (currentScrollTop == null || container.scrollTop === currentScrollTop)
                && typeof velocityY === "number"
                && container && Math.abs(velocityY) > 0.1
            ) {
                container.scrollTop -= velocityY * 0.1;
                kineticScrollYAnimation = requestAnimationFrame(() => simulateKineticScrollY(container, container.scrollTop));
                velocityY *= 0.9;
            } else {
                velocityY = 0;
                cancelAnimationFrame(kineticScrollYAnimation);
            }
        },
        simulateKineticScrollX = (container, currentScrollLeft) => {
            if (
                (currentScrollLeft == null || container.scrollLeft === currentScrollLeft)
                && typeof velocityX === "number"
                && container && Math.abs(velocityX) > 0.1
            ) {
                container.scrollLeft -= velocityX * 0.1;
                kineticScrollXAnimation = requestAnimationFrame(() => simulateKineticScrollX(container, container.scrollLeft));
                velocityX *= 0.9;
            } else {
                velocityX = 0;
                cancelAnimationFrame(kineticScrollXAnimation);
            }
        }
    
        element.addEventListener("pointermove", move);
        element.addEventListener("pointerdown", down);
        element.addEventListener("pointerup", up);
        window.addEventListener("pointerup", cancel);
        window.addEventListener("pointercancel", cancel);
        return () => {
            velocityX = velocityY = 0;
            cancelAnimationFrame(kineticScrollYAnimation);
            cancelAnimationFrame(kineticScrollXAnimation);
            element.removeEventListener("pointermove", move);
            element.removeEventListener("pointerdown", down);
            element.removeEventListener("pointerup", up);
            window.addEventListener("pointerup", cancel);
            window.addEventListener("pointercancel", cancel);
        };
    } catch {
        return () => { }
    }
}

export {
    addClass,
    removeClass,
    getElementWidth,
    getChildIndex,
    getMostVisibleElement,
    changeInputValue,
    scrollToElement,
    dragScroll
}