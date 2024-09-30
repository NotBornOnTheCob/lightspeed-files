let config = {};

const uuid = () => ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));

const logger = {
  info() { },
  init(enabled) {
    if (enabled) {
      this.info = console.log.bind(console);
    }
  },
};

const getManagedValue = (key, defaultValue = '') => new Promise((resolve, reject) => {
  chrome.storage.managed.get({
    [key]: defaultValue,
  }, (items) => {
    if (items[key] !== '') {
      resolve(items[key]);
    } else {
      reject(new Error(`${key} not found in managed settings`));
    }
  });
});

const getDefaultConfig = async () => {
  const env = await getManagedValue('Env', 'prod');
  const url = chrome.runtime.getURL(`env/${env}.json`);

  const response = await fetch(url);
  config = await response.json();
  logger.info('[getDefaultConfig] -> ', config);
  return config;
};

let manifestData;
const getManifest = () => {
  if (!manifestData) {
    const manifest = chrome.runtime.getManifest();
    manifestData = {
      version: manifest.version,
    };
  }
  return manifestData;
};

class CriticalError extends Error { }

async function wait(timeout) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, timeout);
  });
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export {
  logger,
  uuid,
  getManagedValue,
  getDefaultConfig,
  getManifest,
  CriticalError,
  wait,
  getRandomInt,
};
