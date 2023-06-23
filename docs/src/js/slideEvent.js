import alter from "../js/alter.js";
import { runIsScrolling } from "../js/globalValues.js"
function captureSlideEvent(targetElement, callback = new Function) {
    // Slides
    let startX;
    let endX;
    let startY;
    let endY;
    let pointerId;
    let isPointerDown = false;
    let isSliding = false;
    let pointTimeout;
    let slideAnimationFrame;
    let activationThreshold = 15;

    targetElement.addEventListener('pointerdown', down);
    targetElement.addEventListener('pointerup', up);
    targetElement.addEventListener('pointercancel', cancel);

    function move(event) {
        if (event.pointerId === pointerId && isPointerDown) {
            endX = event.clientX;
            endY = event.clientY;
            let deltaX = endX - startX;
            let deltaY = endY - startY;
            // Cancel the previous animation frame request
            if ((deltaX > deltaY && deltaX >= activationThreshold) || (isSliding && deltaX >= 0)) {
                deltaX = deltaX - activationThreshold
                isSliding = true
                runIsScrolling.update(e => !e)
                cancelAnimationFrame(slideAnimationFrame)
                slideAnimationFrame = requestAnimationFrame(() => {
                    alter(targetElement, {
                        styles: {
                            transform: `translateX(${Math.max(deltaX, 0)}px)`
                        }
                    })
                })
            } else if (isSliding && deltaX <= 0) {
                cancelAnimationFrame(slideAnimationFrame)
                slideAnimationFrame = requestAnimationFrame(() => {
                    alter(targetElement, {
                        styles: {
                            transform: `translateX(0px)`
                        }
                    })
                })
            }
        } else {
            targetElement.removeEventListener('pointermove', move)
            slideCallback('none', targetElement)
        }
    }
    function up(event) {
        if (pointerDownTimeout) clearTimeout(pointerDownTimeout)
        targetElement.removeEventListener('pointermove', move)
        if (pointTimeout) clearTimeout(pointTimeout)
        if (event.pointerId === pointerId && isPointerDown) {
            endX = event.clientX;
            let targetElementRect = targetElement.getBoundingClientRect()
            let targetWidth = Math.min(targetElementRect.width, window.innerWidth);
            let xThreshold = targetWidth / 2;
            let deltaX = (endX - startX) - activationThreshold
            if (deltaX >= xThreshold) {
                slideCallback('slideRight', targetElement);
            } else {
                slideCallback('none', targetElement);
            }
            releasePointer();
        }
    }
    let pointerDownTimeout;
    function down(event) {
        if (pointerDownTimeout) clearTimeout(pointerDownTimeout)
        pointerDownTimeout = setTimeout(() => {
            startX = event.clientX;
            startY = event.clientY;
            pointerId = event.pointerId;
            targetElement.setPointerCapture(pointerId);
            isPointerDown = true;
            targetElement.addEventListener('pointermove', move)
        }, 100)
    }
    function cancel(event) {
        if (pointerDownTimeout) clearTimeout(pointerDownTimeout)
        targetElement.removeEventListener('pointermove', move)
        if (pointTimeout) clearTimeout(pointTimeout)
        if (event.pointerId === pointerId && isPointerDown) {
            slideCallback('none', targetElement)
            releasePointer();
        }
    }
    function releasePointer() {
        targetElement.releasePointerCapture(pointerId);
        isSliding = false
        isPointerDown = false;
    }

    function slideCallback(type, targetElement) {
        // Handle slide events as needed
        if (type === "slideRight") {
            requestAnimationFrame(() => {
                alter(targetElement, {
                    keyframes: [
                        { transform: `translateX(${window.innerWidth}px)` }
                    ],
                    easing: 'linear',
                    callback: () => {
                        callback().then(() => {
                            alter(targetElement, {
                                styles: {
                                    transform: ``
                                }
                            })
                        })
                    }
                })
            })
        } else if (type === "none") {
            requestAnimationFrame(() => {
                alter(targetElement, {
                    keyframes: [
                        { transform: `` },
                    ],
                    easing: 'linear',
                })
            })
        }
    }
    return () => {
        targetElement.removeEventListener('pointerdown', down)
        targetElement.removeEventListener('pointerup', up)
        targetElement.removeEventListener('pointermove', move)
        targetElement.removeEventListener('pointercancel', cancel)
    }
}

export default captureSlideEvent