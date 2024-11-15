
const a = document.createElement('A');
a.href = window.location.href;
function requestMetaData(params, cb) {
  axios.post(
    '/getMeta', 
    {id: params.id, host: params.h}
  ).then((resp) => {
    cb(resp.data);
  }).catch((err) => {
    console.error('Error obtaining block info: ', err);
  });
}
function performOverride(params) {
  axios.post(
    '/override',
    { id: params.id }
  ).then((resp) => {
    if (resp.data.url) {
      window.location = resp.data.url;
    }
  }).catch((err) => {
    console.error('Error performing override: ', err);
  });
}
function lockoutOverride(params, e) {
  e.preventDefault();
  e.stopPropagation();
  const code = document.getElementById('code').value;
  axios.post(
    '/lockoutOverride',
    { 
      id: params.id,
      code: code,
      host: params.h
    }
  ).then((resp) => {
    if (resp.data.url) {
      window.location = resp.data.url;
    }
  }).catch((err) => {
    console.error('Error performing lockout override: ', err);
  });
}
function isEmail(username) {
  return username.match(
    /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  );
};
function openReview(response, e) {
  const reviewLink = document.getElementById('submitReview');
  if (reviewLink) {
    document.getElementById('reviewButton').className += ' hidden';
    reviewLink.parentElement.className = reviewLink.parentElement.className.replace(/hidden/, '');
    reviewLink.onclick = submitReview.bind(null, response);
  }
}
function submitReview(response, e) {
  e.preventDefault();
  e.stopPropagation();
  let valid = true;
  const reviewReason = document.getElementById('reviewReason');
  if (!reviewReason.value || reviewReason.value.trim() === '') {
    reviewReason.value = '';
    reviewReason.placeholder = 'Reason (required)';
    valid = false;
  }
  const reviewEmail = document.getElementById('reviewEmail');
  if (reviewEmail.value && reviewEmail.value !== '' && !isEmail(reviewEmail.value)) {
    reviewEmail.value = '';
    reviewEmail.placeholder = 'Email (valid or blank)';
    valid = false;
  }
  if (!valid) { return; }

  response.sfr_email = reviewEmail.value;
  response.sfr_name = document.getElementById('reviewName').value.trim();
  response.sfr_reason = reviewReason.value;

  axios.post('/submitReview', response).then((resp) => {
    document.getElementById('submitReview').parentElement.className += ' hidden';
  }).catch((err) => {
    console.error('Error submitting review: ', err);
  });
}
function modifyPage() {
  const queryPairs = window.location.search.replace(/\?/, '').split('&');
  const params = {};
  for (let i = 0, l = queryPairs.length; i < l; i++) {
    const keyVal = queryPairs[i].split('=');
    for (let i = 0, l = keyVal.length; i < l; i++) {
      params[keyVal[0]] = keyVal[1];
    }
  }
  if (params.id) {
    requestMetaData(params,
      (response) => {
        // get categories
        const categories = JSON.parse(document.getElementById('categories').value);

        // get translations
        const translations = JSON.parse(document.getElementById('translations').value);

        // get locale
        let locale = response.locale || 'en';
        if (typeof (translations[locale]) === 'undefined') {
          locale = 'en';
        }

        // do translations
        const itemsToTranslate = document.querySelectorAll('[data-translation]');
        itemsToTranslate.forEach((el) => {
          if (el.hasAttribute('placeholder')) {
            el.setAttribute('placeholder', translations[locale][el.dataset.translation]);
          } else {
            el.innerText = translations[locale][el.dataset.translation];
          }
        });
        const trans = translations[locale];
        const local_trans = {"err":"of a filtering error"};

        a.href = response.url;
        document.getElementById('host').innerText = response.host || a.hostname;
        document.getElementById('username').innerText = response.username;
        document.getElementById('ip').innerText = response.ip;
        const stripe = document.getElementsByClassName('blockScreen-stripe')[0];
        let reasonText = '';
        switch (response.reason) {
        case 'yt':
          reasonText = trans.org_youtube_rules;
          break;
        case 'url':
          reasonText = trans.custom_block_list;
          break;
        case 'ext':
          reasonText = trans.file_ext_blocked;
          break;
        case 'wz':
          reasonText = trans.webzone_rule;
          break;
        case 'search':
          reasonText = trans.search_term_used;
          break;
        case 'err':
          reasonText = local_trans.err;
          break;
        case 'lockout':
          const overrideButton = document.getElementById('override');
          document.getElementsByClassName('blockScreen')[0].className += ' lockoutScreen';
          document.getElementById('minutes').innerText = response.lockoutTime;
          overrideButton.className = overrideButton.className.replace(/hidden/, '');
          overrideButton.onclick = lockoutOverride.bind(null, params);
          return;
        case 'off':
          if (stripe) {
            stripe.innerText = trans.access_disabled;
            stripe.style['font-size'] = '145%';
            stripe.style['font-weight'] = 'bolder';
            stripe.style.color = '#FFF';
          }
          break;
        case 'parent':
          if (stripe) {
            stripe.innerText = 'Parental Pause Active';
            stripe.style['font-size'] = '145%';
            stripe.style['font-weight'] = 'bolder';
            stripe.style.color = '#FFF';
          }
          break;
        default:
          reasonText = trans.categorized_as + ' ' + categories[response.catId];
        }
        document.getElementById('reason').innerText = reasonText;

        const orDurDiv = document.getElementById('override-time');
        if (orDurDiv) { orDurDiv.style.display = 'none'; }
        if (response.overridable) {
          if (response.override && response.override.timeout) {
            const orDur = document.getElementById('override-duration');
            if (orDur) { orDur.innerText = response.override.timeout / 60000; }
            if (orDurDiv) { orDurDiv.style.display = 'block'; }
          }
          const overrideLink = document.getElementById('override');
          if (overrideLink) {
            overrideLink.className = overrideLink.className.replace(/hidden/, '');
            overrideLink.onclick = performOverride.bind(null, params);
          }
        }
        if (response.reviewable) {
          if (['cat','yt','url','search'].includes(response.reason)) {
            const reviewButton = document.getElementById('reviewButton');
            if (reviewButton) {
              reviewButton.className = reviewButton.className.replace(/hidden/, '');
              reviewButton.onclick = openReview.bind(null, response);
              if (isEmail(response.username)) {
                document.getElementById('reviewEmail').value = response.username;
              }
            }
          }
        }
      }
    );
  }
}
window.onload = modifyPage;