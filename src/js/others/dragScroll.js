function dragScroll(element, axis = 'xy') {
  var curYPos, curXPos, curDown, curScrollLeft, curScrollTop;

  let move = (e) => {
    if (curDown) {
      if (axis.toLowerCase().includes('y'))
        element.scrollTop = curYPos - e.pageY + curScrollTop;
      if (axis.toLowerCase().includes('x'))
        element.scrollLeft = curXPos - e.pageX + curScrollLeft;
    }
  };

  let down = (e) => {
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
export { dragScroll };