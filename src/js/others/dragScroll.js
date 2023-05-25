function dragScroll(element) {
    var curYPos, curXPos, curDown, curScrollLeft, curScrollTop;
  
    let move = (e) => {
      if (curDown) {
        element.scrollTop = curYPos - e.pageY + curScrollTop;
        element.scrollLeft = curXPos - e.pageX + curScrollLeft;
      }
    };
  
    let down = (e) => {
      curYPos = e.pageY;
      curXPos = e.pageX;
      curScrollLeft = element.scrollLeft;
      curScrollTop = element.scrollTop;
      curDown = true;
    };
  
    let up = () => {
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
export {dragScroll};