import alter from "../js/alter.js";
import { runIsScrolling } from "../js/globalValues.js"
function captureSlideEvent(targetElement, callback = new Function) {
    // Slides
    var startX;
    var endX;
    // var startY;
    // var endY;
    var pointerId;
    var isPointerDown = false;
    var pointTimeout;

    targetElement.addEventListener('pointerdown', down);
    targetElement.addEventListener('pointerup', up);
    targetElement.addEventListener('pointercancel', cancel);

    function move(event) {
        if (event.pointerId === pointerId && isPointerDown) {
            endX = event.clientX;
            const deltaX = endX - startX;
            if (deltaX >= 50) {
                runIsScrolling.update(e => !e)
                alter(targetElement, {
                    keyframes: [
                        { transform: `translateX(${deltaX}px)` },
                    ]
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
            var targetElementRect = targetElement.getBoundingClientRect()
            var targetHeight = Math.min(targetElementRect.width, window.innerWidth);
            var xThreshold = targetHeight * 0.4;
            var deltaX = endX - startX
            // var slopeX = Math.abs(deltaX);
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
        isPointerDown = false;
    }

    function slideCallback(type, targetElement) {
        // Handle slide events as needed
        if (type === "slideRight") {
            alter(targetElement, {
                keyframes: [
                    { transform: `translateX(${window.innerWidth}px)` }
                ],
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
        } else if (type === "none") {
            alter(targetElement, {
                keyframes: [
                    { transform: `` },
                ]
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