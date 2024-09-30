const port = chrome.runtime.connect({ name: 'digital-insight' });

Object.defineProperty(HTMLMediaElement.prototype, 'playing', {
  get() {
    return !!(this.currentTime > 0 && !this.paused && !this.ended && this.readyState > 2);
  },
});

const track = (event) => port.postMessage({
  event,
  url: window.location.href,
});

document.addEventListener('click', () => track('click'), false);
document.addEventListener('keyup', () => track('keyup'), false);
document.addEventListener('touchstart', () => track('touchstart'), false);

let scrollTimer;
window.addEventListener('scroll', () => {
  clearTimeout(scrollTimer);
  scrollTimer = setTimeout(() => {
    track('scroll');
  }, 1000);
}, false);

// let mouseMoveTimer;
// document.addEventListener('mousemove', () => {
//   clearTimeout(mouseMoveTimer);
//   mouseMoveTimer = setTimeout(() => {
//     track('mousemove');
//   }, 1000);
// }, false);

let videos = [];
window.addEventListener('load', () => {
  videos = document.querySelectorAll('video');
});

setInterval(() => {
  videos.forEach((video) => {
    if (video.playing) {
      // checks if element is playing right now
      track('playing');
    }
  });
}, 10 * 1000);
