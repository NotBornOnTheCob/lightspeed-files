function applyNewLocation() {
    /*let style = document.createElement('STYLE');
    style.type = 'text/css';
    style.innerText = "ytd-background-promo-renderer {display: none !important;}\n";
    let head = document.getElementsByTagName('head');
    if (head.length)
        head[0].append(style);
    return false;*/
}
let killYTAutoplayInt, hideYTThumbnailsInt, killMiniPlayerInt, embedInt;
function killYouTubeMiniPlayers() {
    const e = document.getElementById('video-preview-container');
    if (e)
        e.remove();
    const ea = document.getElementsByTagName('ytd-miniplayer');
    if (ea.length > 0)
        ea[0].remove();
    document.querySelectorAll('div#mouseover-overlay').forEach((e) => { e.remove(); });
    document.querySelectorAll('div#hover-overlays').forEach((e) => { e.remove(); });
};
const blockYTImg = '/{{.InjectPath}}/blocked-image-search.png';
function hideYouTubeThumbnails() {
    const ea = document.querySelectorAll('#avatar, #channel-thumbnail');
    ea.forEach((e) => {
        [...e.getElementsByTagName('img')].forEach((i) => {
            if (!i.src.match(blockYTImg) && i.src.startsWith('https://')) {
                console.log('[LS Filter] hiding thumbnail ->', i.src);
                i.src = blockYTImg;
            }
        });
    });
  }
function killYouTubeAutoplay() {
    const a = document.createElement('A');
    a.href = window.location.href;
    if (a.hostname.match(/(^|\.)youtube\./)) {
        if (
            a.pathname.match(/^\/user\/[^\/\?]+$/)
            ||
            a.pathname.match(/^\/channel\/[^\/\?]+$/)
            ||
            a.pathname.match(/^\/c\/[^\/\?]+$/)
            ||
            a.pathname.match(/\/featured$/)
            ||
            a.pathname.match(/^\/@[^\/\?]+$/)
        ) {
            const ea = document.getElementsByTagName('video');
            if (ea.length == 0)
                return;
            for (i in ea) {
                if (typeof(ea[i].pause) !== 'function')
                    continue;
                if (!ea[i].paused) {
                    console.debug('[LS Filter] pause autoplay');
                    ea[i].pause();
                }
                const e = ea[i].closest('ytd-channel-video-player-renderer');
                if (e && e.style.display !== 'none') {
                    console.debug('[LS Filter] hide autoplay container');
                    e.style.display = 'none';
                }
            }
        }
    }
  }
  
function scrubYouTube() {
    const style = document.createElement('STYLE');
    style.type = 'text/css';
    style.innerText = '';
    if ({{.YouTubeHideSidebar}}) {
        console.debug('[LS Filter] hide sidebar');
        style.innerText += '.watch-sidebar, .ytd-watch-next-secondary-results-renderer {display: none !important;}\n';
    }
    if ({{.YouTubeHideComments}}) {
        console.debug('[LS Filter] hide comments');
        style.innerText += '#watch-discussion, .watch-discussion, ytd-comments {display: none !important;}\n';
    }
    if (style.innerText !== '') {
        let head = document.getElementsByTagName('head');
        if (head && head.length > 0) {
            head = head[0];
            head.append(style);
        }
    }
    if ({{.YouTubeDisableAutoPlay}}) {
        console.debug('[LS Filter] disable autoplay');
        if (typeof(killYTAutoplayInt) !== 'undefined')
            clearInterval(killYTAutoplayInt);
        killYouTubeAutoplay();
        killYTAutoplayInt = setInterval(killYouTubeAutoplay, 1000);
    }
    if ({{.YouTubeHideThumbnails}}) {
        console.debug('[LS Filter] hide thumbnails');
        if (typeof(hideYTThumbnailsInt) !== 'undefined')
            clearInterval(hideYTThumbnailsInt);
        hideYouTubeThumbnails();
        hideYTThumbnailsInt = setInterval(hideYouTubeThumbnails, 1000);
    }
    console.debug('[LS Filter] hide miniplayers');
    if (typeof(killMiniPlayerInt) !== 'undefined')
        clearInterval(killMiniPlayerInt);
    killYouTubeMiniPlayers();
    killMiniPlayerInt = setInterval(killYouTubeMiniPlayers, 1000);
    scoreEmbed();
    setInterval(scoreShort, 1000);
}
let embedScorePolicy;
function getEmbedScorePolicy() {
  if (typeof(trustedTypes) !== 'undefined' && !embedScorePolicy) {
    embedScorePolicy = trustedTypes.createPolicy('embedScore', {
      createHTML: (string) => string
    });
  }
  return embedScorePolicy;
}
function scoreEmbed() {
    const docUrl = window.location.href;
    if (docUrl.match(/\/embed\//)) {
        console.debug('[LS Filter] embed detected ->', docUrl);
        const body = JSON.stringify({ url: docUrl, youtube: true });
        const checkUrl = document.location.origin + '/{{.InjectPath}}/log';
        const xhr = new XMLHttpRequest();
        xhr.open('POST', checkUrl, true);
        xhr.send(body);
        xhr.onloadend = function () {
            if (this.status === 200 && xhr.responseText) {
                const score = JSON.parse(xhr.responseText);
                console.log('[LS Filter] embed score:', score);
                if (score.allow === 'blocked') {
                    console.debug('[LS Filter] video blocked:', score.url);
                    const policy = getEmbedScorePolicy();
                    if (policy) {
                        document.body.innerHTML = policy.createHTML(`<img src=${blockYTImg} style="width: 100%; height: 100%">`);
                    } else {
                        document.body.innerHTML = `<img src=${blockYTImg} style="width: 100%; height: 100%">`;
                    }
                }
            }
        };
    }
  }
let shortScorePolicy;
function getShortScorePolicy() {
  if (typeof(trustedTypes) !== 'undefined' && !shortScorePolicy) {
    shortScorePolicy = trustedTypes.createPolicy('shortScore', {
      createHTML: (string) => string
    });
  }
}
  return shortScorePolicy;
function shortsScore(score) {
  if (score.allow === 'blocked') {
    console.debug('[LS Filter] short blocked:', score.url);
    const els = document.querySelectorAll('[is-active]');
    for (let i = 0; i < els.length; i++) {
      const p = document.getElementById(els[i].id);
      if (p) {
        const policy = getShortScorePolicy();
        if (policy) {
          p.innerHTML = policy.createHTML(`<img src=${blockYTImg} style="width: 100%; height: 100%">`);
        } else {
          p.innerHTML = `<img src=${blockYTImg} style="width: 100%; height: 100%">`;
        }
      }
    }
  }
}
const scoredShorts = {};
function scoreShort() {
    const docUrl = window.location.href;
    if (docUrl.match(/\/shorts\//)) {
        const p = docUrl.split('\/');
        const vid = p[p.length-1];
        console.debug('[LS Filter] shorts detected:', vid);
        if (vid) {
            const sData = scoredShorts[vid];
            if (sData) {
              shortsScore(sData);
            } else {
                scoredShorts[vid] = setTimeout(() => {
                    delete scoredShorts[vid];
                }, 3000);
                const body = JSON.stringify({url: docUrl, youtube: true});
                const checkUrl = document.location.origin + '/{{.InjectPath}}/log';
                const xhr = new XMLHttpRequest();
                xhr.open('POST', checkUrl, true);
                xhr.send(body);
                xhr.onloadend = function () {
                    if (this.status === 200 && xhr.responseText) {
                        const score = JSON.parse(xhr.responseText);
                        console.log('[LS Filter] short score:', score);
                        clearTimeout(scoredShorts[vid]);
                        scoredShorts[vid] = score;
                        shortsScore(score);
                    }
                };
            }
        }
    }
  }
function locationChanged() {
    scrubYouTube();
}
window.addEventListener('online', () => {
  console.log('[LS Filter] online');
  checkCurrentSite();
  scrubYouTube();
});

window.addEventListener('beforeunload', async () => {
  const sw = await navigator.serviceWorker.getRegistrations()
  if (sw.length > 0) {
    console.log('[LS Filter] unregister worker');
    await sw[0].unregister()
  }
});

scrubYouTube();


const lsijVersion = 1;
if (window.top === window.self) {
  console.log('[LS Filter] top window: ' + window.location.href);
  function isYoutube() {
    const currUrl = new URL(window.location.href);
    if (currUrl.hostname.match('youtube\.com')) {
      return currUrl;
    }
    return false;
  }
  function checkCurrentSite() {
    const yt = isYoutube() !== false;
    const xhr = new XMLHttpRequest();
    const body = JSON.stringify({
      url: window.location.href,
      youtube: yt
    });
    console.log('[LS Filter] reporting ->' + body);
    const checkUrl = document.location.origin + '/{{.InjectPath}}/log';
    xhr.open('POST', checkUrl, true);
    xhr.send(body);
    xhr.onreadystatechange = function () {
      if (this.status === 200 && xhr.responseText) {
        const score = JSON.parse(xhr.responseText);
        console.log('[LS Filter] score ->', score.allow);
        if (score.redirect) {
          updateLocation(score.redirect);
          hardBlock();
        }
      }
    };
  }
  let hardBlockPolicy;
  function getHardBlockPolicy() {
    if (typeof(trustedTypes) !== 'undefined' && !hardBlockPolicy) {
      hardBlockPolicy = trustedTypes.createPolicy('hardBlock', {
        createHTML: (string) => string
      });
    }
    return hardBlockPolicy;
  }
  function hardBlock() {
    stopVideo();
    const stopInt = setInterval(stopVideo, 500);
    setTimeout(() => {
      const policy = getHardBlockPolicy();
      if (policy) {
        document.body.innerHTML = policy.createHTML('<img src="/{{.InjectPath}}/blocked-image-search.png" style="width: 100%; height: 100%">');
      } else {
        document.body.innerHTML = '<img src="/{{.InjectPath}}/blocked-image-search.png" style="width: 100%; height: 100%">';
      }
      clearInterval(stopInt);
    }, 3000)
  }
  function stopVideo() {
    const ea = document.getElementsByTagName('video');
    for (i in ea) {
      const v = ea[i];
      if (typeof(v.pause) !== 'function') {
        continue;
      }
      if (!v.paused) {
          console.log('[LS Filter] pause video');
          v.pause();
      }
    }
  }
  function updateLocation(url) {
    if (typeof(applyNewLocation) === 'function') {
      if (applyNewLocation() === true) { return; }
    }
    window.location.href = url;
  }
  checkCurrentSite();
  let prevURL = isYoutube();
  if (prevURL) {
    let prevVideo = new URLSearchParams(prevURL.search).get('v');
    let prevSearch = new URLSearchParams(prevURL.search).get('search_query');
    new MutationObserver(function() {
      console.log('[LS Filter] MutationObserver');
      const url = new URL(window.location.href);
      const searchParams = new URLSearchParams(url.search);
      if (video = searchParams.get('v')) {
        if (video === prevVideo) { return; }           
        console.log('[LS Filter] scoring video ->', video);
        prevVideo = video;
        checkCurrentSite();
      } else if (search = searchParams.get('search_query')) {
        if (search === prevSearch) { return; }  
        console.log('[LS Filter] scoring search ->', search);
        prevSearch = search;
        checkCurrentSite();
      }
    }).observe(document, {subtree: true, childList: true});
  } else if (window.location.href.match(/google\.com\/search\?/)) {
    const vidMatcher = /google\.com\/search\?.*vid:([^#\&\?]{11})/;
    let prevVideo;
    if (m = window.location.href.match(vidMatcher)) { prevVideo = m[1]; }
    new MutationObserver(function() {
      console.log('[LS Filter] MutationObserver');
      let video;
      if (m = window.location.href.match(vidMatcher)) { video = m[1]; }
      if (video === prevVideo) { return; }           
      console.log('[LS Filter] scoring video ->', video);
      prevVideo = video;
      checkCurrentSite();
    }).observe(document, {subtree: true, childList: true});
  }
}