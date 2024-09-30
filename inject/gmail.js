function gatherIntent() {
    const intent = [];
    const ea = document.querySelectorAll('[role="textbox"]');
    ea.forEach((e) => {
        intent.push(e.innerText);
    });
    return intent;
}

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