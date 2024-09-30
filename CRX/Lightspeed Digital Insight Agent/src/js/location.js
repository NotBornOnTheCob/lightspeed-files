// eslint-disable-next-line no-use-before-define
chrome.runtime.onMessage.addListener(handleMessages);

// getCurrentPosition returns a prototype based object, so the properties
// end up being stripped off when sent over to our service worker. To get
// around this, we deeply clone it
function clone(obj) {
  const copy = {};

  // Return the value of any non true object (typeof(null) is "object") directly.
  // null will throw an error if you try to for/in it. We can just return
  // the value early.
  if (obj === null || !(obj instanceof Object)) {
    return obj;
  }
  for (const p in obj) {
    copy[p] = clone(obj[p]);
  }

  return copy;
}

async function getGeolocation() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (loc) => resolve(clone(loc)),
      // in case the user doesnt have or is blocking `geolocation`
      (err) => reject(err),
    );
  });
}
function handleMessages(message, sender, sendResponse) {
  // Return early if this message isn't meant for the offscreen document.
  if (message.target !== 'offscreen') {
    return false;
  }

  if (message.type !== 'get-geolocation') {
    console.warn(`Unexpected message type received: '${message.type}'.`);
    return;
  }

  getGeolocation().then((geolocation) => sendResponse(geolocation)).catch((err) => {
    console.error('Error getting geolocation:', err);
    sendResponse({
      error: true,
      message: err.message,
    });
    return false;
  });

  // we need to explictly return true in our chrome.runtime.onMessage handler
  // in order to allow the requestor to handle the request asynchronous.
  return true;
}
