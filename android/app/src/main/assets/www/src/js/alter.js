"use strict";
function alter(element_s, parameters = {}) {
    // Initialize Element(s)
    if (element_s instanceof Window || element_s instanceof Element || element_s instanceof Document) {
        element_s = [element_s]
    } else if (typeof element_s === "string" || element_s instanceof String) {
        element_s = document.querySelectorAll(element_s)
        if (element_s.length === 0) { return }
        else { element_s = Array.from(element_s) }
    } else if (!(element_s instanceof HTMLCollection) && !(element_s instanceof NodeList)) { return }
    // Apply parameters
    if (typeof parameters['keyframes'] !== "undefined" || typeof parameters['keyframe'] !== "undefined") {
        const options = { duration: 200, fill: "forwards", easing: 'ease' } // DEFAULTS
        let animations = []
        for (const key in parameters) {
            if (key === 'keyframes' || key === 'keyframe' || key === 'styles' || key === 'style') continue
            options[key] = parameters[key]
        }
        const keyframes = parameters['keyframes'] || parameters['keyframe']
        if (typeof options['duration'] === 'number') {
            if (keyframes instanceof Array) {
                for (let i = 0; i < element_s.length; i++) {
                    if (isNativeAnimateFunction(element_s[i])) {
                        animations.push([element_s[i].animate(keyframes, options), element_s[i]])
                    }
                }
            }
        }
        if (parameters['onfinish'] === undefined) {
            const lastkeyframe = keyframes.slice(-1)[0]
            animations.forEach(([animation, element], idx) => {
                animation.onfinish = () => {
                    Object.assign(element.style, lastkeyframe)
                    animation.cancel()
                    if (idx === animations.length - 1 && typeof parameters['callback'] === 'function') {
                        parameters['callback']()
                    }
                }
            })
        }
        animations = animations.map(animation => animation[0])
        return animations.length === 1 ? animations[0] : animations
    } else if (typeof parameters['styles'] !== "undefined" || typeof parameters['style'] !== "undefined") {
        const styles = parameters?.styles || parameters?.style
        if (styles) {
            for (let i = 0; i < element_s.length; i++) {
                if (isNativeStyleProperty(element_s[i])) {
                    Object.assign(element_s[i].style, styles);
                }
            }
        }
        return element_s;
    } else { return }
    // return element(s)

    // Helper function
    function isNativeAnimateFunction(element) {
        return Element.prototype.animate.toString() === element?.animate?.toString?.();
    }
    function isNativeStyleProperty(element) {
        return element?.style instanceof CSSStyleDeclaration;
    }
}

if (typeof module !== "undefined" && typeof module?.exports !== 'undefined') { module.exports = alter }
export default alter