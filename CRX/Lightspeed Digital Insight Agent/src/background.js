/* eslint-disable max-len */
/* eslint-disable import/extensions */
import {
  getProfileData, getDeviceSerial, getHostname, getDeviceType, getPlatform,
  getCPU, getStorage, getMemory, getOS, getOSVersion,
} from './js/identity.js';
import {
  logger, getDefaultConfig, getManagedValue, getManifest, CriticalError, wait, getRandomInt,
} from './js/utils.js';
import { getConfig, checkKey, sendData } from './js/api.js';
import speedTest from './js/speed_test.js';

// global variables
let activities = {};
let config = {};
// no status set initially, so that it sets the correct logo
let enabled = null;
let currentIP = null;
let currentLatitude;
let currentLongitude;
const OFFSCREEN_DOCUMENT_PATH = '/location.html';
// A global promise to avoid concurrency issues
let creating;
let locating;
// Track last online status
let currentConnectionStatus = navigator.onLine;
let lastOfflineDetails = {};

// Alarms
const min1 = 60000;
const min5 = 300000;
const min10 = 600000;
const min15 = 900000;
let sendActivityInt = min15;
let agentStatusInt = min10;
let speedLocationInt = min5;
let lastActivityInt = min15;
let speedTestInProgress = false;
let lastSend;
let userIdle = false;
let keepAliveInterval;

function getLocalStorage(name) {
  return new Promise((resolve) => {
    chrome.storage.local.get([name], (data) => {
      if (data) {
        logger.info('[getLocalStorage] -> ', data[name]);
        resolve(data[name]);
      }
    });
  });
}

async function setLastSend(name) {
  lastSend[name] = Date.now();
  await chrome.storage.local.set({ lastSend });
}

function timeToRun(last, int) {
  const now = Date.now();
  return (now - last) > int;
}

async function hasDocument() {
  // Check all windows controlled by the service worker to see if one
  // of them is the offscreen document with the given path
  const matchedClients = await clients.matchAll();

  return matchedClients.some(
    (c) => c.url === chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH),
  );
}

async function setupOffscreenDocument(path) {
  // if we do not have a document, we are already setup and can skip
  if (!(await hasDocument())) {
    // create offscreen document
    if (creating) {
      await creating;
    } else {
      creating = chrome.offscreen.createDocument({
        url: path,
        reasons: [
          chrome.offscreen.Reason.GEOLOCATION
            || chrome.offscreen.Reason.DOM_SCRAPING,
        ],
        justification: 'Get geolocation for Digital Equity',
      });

      await creating;
      creating = null;
    }
  }
}

async function closeOffscreenDocument() {
  if (!(await hasDocument())) {
    return;
  }
  await chrome.offscreen.closeDocument();
}

async function getGeolocation() {
  await setupOffscreenDocument(OFFSCREEN_DOCUMENT_PATH);

  const geolocation = await chrome.runtime.sendMessage({
    type: 'get-geolocation',
    target: 'offscreen',
  });

  await closeOffscreenDocument();
  if (geolocation.error) {
    throw new Error(geolocation.error.message);
  }
  return geolocation;
}

const platform = getPlatform();

logger.info(`Got platform: ${platform}`);

const isCollectionEnabled = () => config.active;

const enableExtension = () => {
  if (enabled === true || process?.env?.NODE_ENV === 'test') {
    // already enabled, nothing to do here
    return;
  }
  enabled = true;
  chrome.action.setIcon({
    path: {
      16: 'images/digital-insight(16x16).png',
      32: 'images/digital-insight(32x32).png',
      48: 'images/digital-insight(48x48).png',
      128: 'images/digital-insight(128x128).png',
    },
  });
  chrome.action.setPopup({
    popup: 'popup.html',
  });
};

const disableExtension = () => {
  if (enabled === false) {
    // already disabled, nothing to do here
    return;
  }
  enabled = false;
  chrome.action.setIcon({
    path: {
      16: 'images/digital-insight(16x16)-disabled.png',
      32: 'images/digital-insight(32x32)-disabled.png',
      48: 'images/digital-insight(48x48)-disabled.png',
      128: 'images/digital-insight(128x128)-disabled.png',
    },
  });
  chrome.action.setPopup({
    popup: 'popup-disabled.html',
  });
};

const checkCollectionStatus = () => {
  if (!isCollectionEnabled()) {
    // do not send activity if collection is disabled
    // mark the extension as disabled
    disableExtension();
    return;
  }
  enableExtension();
};

const setCount = (activity) => ({
  ...activity,
  Count: activity.Intervals.length,
});

const getActivities = () => activities;
const clearActivities = () => {
  activities = {};
};

const getActiveActivityKey = () => Object.keys(activities).find(
  (url) => activities[url].Intervals.find((interval) => !interval.End),
);

const checkActivityValues = (activityValues) => {
  if (!activityValues || activityValues.length === 0) {
    throw new Error('No activities to send');
  }
};

const getActivityToSend = () => {
  const activeActivityKey = getActiveActivityKey();
  let activeActivity;
  logger.info('Active activity', activeActivityKey);
  if (activeActivityKey) {
    activeActivity = activities[activeActivityKey];
    // eslint-disable-next-line no-use-before-define
    setActivityScreenTimeEnd();
  }
  const discardTimestamp = Date.now() - (config.maxAge * 60 * 1000);
  const allActivities = Object.values(activities)
    .filter(({ Timestamp }) => Timestamp > discardTimestamp);
  const chunkSize = config.payloadActivityMaxCount || 500;
  // take the first X values, to reduce the payload size
  const activityValues = allActivities.slice(0, chunkSize).map(setCount);
  checkActivityValues(activityValues);
  // cleanup the object, so that everything collected while the request in progress is recorded
  clearActivities();
  if (activeActivity) {
    // set the one that was already in progress
    const Start = Date.now();
    const h = (new Date(Start)).getHours();
    const { Url } = activeActivity;
    const activeKey = `${h}-${Url}`;
    activities[activeKey] = {
      Intervals: [],
      Timestamp: Start,
      Url,
    };
    // eslint-disable-next-line no-use-before-define
    setIntervalStart(activeKey, Start, Url);
  }
  logger.info(`Sending ${activityValues.length} out of ${allActivities.length}`);
  return { activityValues, allActivities };
};

const getPIIData = (userData, hostname) => (config.collectPII ? {
  Email: userData.email,
  Username: userData.username,
  Domain: userData.domain,
  Hostname: hostname,
} : undefined);

const getRemainingActivities = (allActivities) => {
  const chunkSize = config.payloadActivityMaxCount || 500;
  // clear/reduce activity
  const restActivities = allActivities.slice(chunkSize);
  // recreate the object by url
  return restActivities.reduce((mapping, item) => {
    // eslint-disable-next-line no-param-reassign
    mapping[item.Url] = item;
    return mapping;
  }, {});
};

const addInProgressActivites = (remainingActivities) => {
  // add all that have been tracked while the request was in progress
  Object.keys(activities).forEach((url) => {
    if (!remainingActivities[url]) {
      // eslint-disable-next-line no-param-reassign
      remainingActivities[url] = activities[url];
    }
  });
};

const saveActivitiesInStorage = () => new Promise((resolve) => {
  chrome.storage.local.set({ activities: JSON.stringify(activities) }, resolve);
});

const readActivitiesFromStorage = () => new Promise((resolve) => {
  chrome.storage.local.get(['activities'], (result) => resolve(JSON.parse(result.activities || '{}')));
});

const recreateActivitiesAfterSend = (allActivities) => {
  const remainingActivities = getRemainingActivities(allActivities);
  addInProgressActivites(remainingActivities);
  // update the object
  activities = remainingActivities;
  saveActivitiesInStorage();
};

const sendActivity = async () => {
  checkCollectionStatus();
  const activitiesCloneString = JSON.stringify(activities);
  const { activityValues, allActivities } = getActivityToSend();
  // build data
  // retrieve data identifiers
  const userData = await getProfileData();
  const machineId = await getDeviceSerial();
  const hostname = await getHostname();
  const deviceType = await getDeviceType();
  const key = await getManagedValue('EntitlementKey');
  const deviceOSVersion = await getOSVersion();

  const manifest = getManifest();

  const body = {
    Version: manifest.version,
    DeviceId: machineId,
    DeviceOSVersion: deviceOSVersion,
    UserId: userData.hash,
    ...getPIIData(userData, hostname),
    EntitlementKey: key,
    Platform: platform === 'chrome' ? 'catchon-extension' : platform,
    DeviceType: deviceType,
    ActivityList: activityValues,
    SentAt: Date.now(),
  };
  // send it
  try {
    const res = await sendData({
      url: config.endpointURL,
      body,
    });
    currentIP = res.headers.get('request-source');
    recreateActivitiesAfterSend(allActivities);
  } catch (e) {
    const statusCode = parseInt(e.message, 10);
    if (statusCode === 404 || statusCode >= 499) {
      // put back the old activities for retry
      activities = JSON.parse(activitiesCloneString);
      saveActivitiesInStorage();
    }
    throw e;
  }
};

const trySendActivity = async () => {
  if (!lastSend.lastSendActivity || timeToRun(lastSend.lastSendActivity, sendActivityInt)) {
    logger.info('[trySendActivity]');
    await setLastSend('lastSendActivity');
    try {
      await sendActivity();
    } catch (e) {
      logger.info(`Error sending activity: ${e.message}`);
      if (e instanceof CriticalError) {
        throw e;
      }
    }
  }
};

const updateSendInterval = () => {
  sendActivityInt = config.sendInterval * min1;
  logger.info('[updateSendInterval] send activity interval ->', sendActivityInt / 60000, 'min');
};

const setIntervalForSpeedAndLocation = () => {
  speedLocationInt = (config.sendInterval + 1) * min1;
  logger.info('[setIntervalForSpeedAndLocation] speedtest interval ->', speedLocationInt / 60000, 'min');
};

const updateLastActivityInterval = () => {
  lastActivityInt = (config.inactiveTimeout / 60) * min1;
  logger.info('[updateLastActivityInterval] idle timeout ->', lastActivityInt / 60000, 'min');
};

const updateCheckAgentStatus = () => {
  agentStatusInt = (config.checkinInterval / 60) * min1;
  logger.info('[updateCheckAgentStatus] agent check status interval ->', agentStatusInt / 60000, 'min');
};

const checkAgentStatus = async () => {
  if (!lastSend.lastAgentStatus || timeToRun(lastSend.lastAgentStatus, agentStatusInt)) {
    logger.info('[checkAgentStatus] start');
    try {
      const newConfig = await getConfig(config);
      await setLastSend('lastAgentStatus');
      Object.assign(config, newConfig);
      logger.info('[checkAgentStatus] -> ', config);
      await chrome.storage.local.set({ config });
      updateSendInterval();
      updateLastActivityInterval();
      // check for Speed and Location every x minutes
      setIntervalForSpeedAndLocation();
      checkCollectionStatus();
    } finally {
      updateCheckAgentStatus();
      logger.info('[checkAgentStatus] done');
    }
  }
};

const setIntervalStart = (key, Start, url) => {
  if (!activities[key]) {
    activities[key] = {
      Intervals: [],
      Timestamp: Start,
      Url: url,
    };
  }
  const openInterval = activities[key].Intervals.find(({ End }) => !End);
  if (!openInterval) {
    // track if there's not one that is already open
    logger.info('Start tracking activity for', key, { Start });
    activities[key].Intervals.push({
      Start,
    });
  }

  saveActivitiesInStorage();
};

const setActivityForTab = (tab, start) => {
  const { url } = tab;
  if (!url) {
    // wait for url to be set (new tab)
    return;
  }
  const h = (new Date(start)).getHours();
  const key = `${h}-${url}`;
  setIntervalStart(key, start, url);
};

// workaround for issue https://bugs.chromium.org/p/chromium/issues/detail?id=1213925
const ChromeWrapper = {
  chromeTabsQuery(params, callback) {
    chrome.tabs.query(params, (tabs) => {
      if (chrome.runtime.lastError) {
        setTimeout(() => {
          ChromeWrapper.chromeTabsQuery(params, callback);
        }, 50);
      } else {
        callback(tabs);
      }
    });
  },
};

const getActiveTabs = (id) => new Promise((resolve) => {
  // chrome.tabs.query({ active: true, windowId: id }, resolve);
  ChromeWrapper.chromeTabsQuery({ active: true, windowId: id }, resolve);
});

const setActivityScreenTimeStart = async (
  id = chrome.windows.WINDOW_ID_NONE,
  Start = Date.now(),
) => {
  if (!isCollectionEnabled()) {
    // do not collect activity if collection is disabled
    return;
  }
  const tabs = await getActiveTabs(id);
  if (tabs.length > 1) {
    // more than 1 tab active
    // this means that there are more windows, but none are active (WINDOW_ID_NONE)
    return;
  }
  const [tab] = tabs;
  setActivityForTab(tab, Start);
};

const getStartOfTheHour = () => {
  const currentTimestamp = Date.now();
  const date = new Date(currentTimestamp);
  const milis = date.getMilliseconds();
  const sec = date.getSeconds();
  const min = date.getMinutes();
  return currentTimestamp - min * 60 * 1000 - sec * 1000 - milis;
};

const setIntervalEnd = (key, end = Date.now()) => activities[key].Intervals.forEach((interval) => {
  if (!interval.End) {
    // eslint-disable-next-line no-param-reassign
    interval.End = end;
    activities[key].Timestamp = end;
    saveActivitiesInStorage();
    logger.info('End tracking activity for', key, interval);
  }
});

const isIntervalOpenInPreviousHour = (Intervals, hCurrent, h) => {
  const openInterval = Intervals.find(({ End }) => !End);
  return hCurrent > h && openInterval;
};

const setActivityScreenTimeEnd = () => {
  const hCurrent = (new Date(Date.now())).getHours();
  Object.keys(activities).forEach((key) => {
    const { Url: url, Intervals } = activities[key];
    const h = parseInt(key.replace(`-${url}`, ''), 10);
    if (isIntervalOpenInPreviousHour(Intervals, hCurrent, h)) {
      // close the interval in the previous hour if it started in the previous
      const start = getStartOfTheHour();
      const end = start - 1;
      setIntervalEnd(`${h}-${url}`, end);
      // and open another for the current hour
      setIntervalStart(`${hCurrent}-${url}`, start, url);
      // close the interval for the current hour
      setIntervalEnd(`${hCurrent}-${url}`);
    } else {
      // close the interval for the current hour
      setIntervalEnd(key);
    }
  });
};

const windowFocusListener = async (id) => {
  logger.info('onFocusChanged. window active', id);
  setActivityScreenTimeEnd();
  if (id === chrome.windows.WINDOW_ID_NONE) {
    return;
  }
  setActivityScreenTimeStart(id);
};

const tabActivatedListener = async ({ windowId }) => {
  logger.info('onActivated');
  setActivityScreenTimeEnd();
  setActivityScreenTimeStart(windowId);
};

const tabUpdatedListener = async (tabId, change, tab) => {
  const { url } = change;
  if (!url) {
    return;
  }
  const { windowId } = tab;
  logger.info('onUpdated');
  setActivityScreenTimeEnd();
  setActivityScreenTimeStart(windowId);
};

const runtimeConnectListener = (port) => {
  if (port.name !== 'digital-insight') {
    return;
  }
  port.onMessage.addListener(async (msg) => {
    logger.info(msg);
    // make another attempt to make the user idle
    await setLastSend('lastActivityScreen');
    if (userIdle) {
      logger.info('[onMessage] user active');
      setActivityScreenTimeStart();
    }
    userIdle = false;
  });
};

const extensionUpdateAvailableListener = async () => {
  // send whatever data it has
  await trySendActivity();
  // reload
  chrome.runtime.reload();
};

async function getDEDeviceInfo() {
  // get more details
  const userData = await getProfileData();
  const machineId = await getDeviceSerial();
  const deviceType = await getDeviceType();
  const key = await getManagedValue('EntitlementKey');
  const manifest = getManifest();
  const processor = await getCPU();
  const storage = await getStorage();
  const memory = await getMemory();
  const deviceOS = await getOS();
  const deviceOSVersion = await getOSVersion();

  // build storage info from partitions array
  let storageInfo;
  if (!storage?.length) {
    storageInfo = { Error: 'No storage info available' };
  } else if (deviceOS !== 'mac') {
    storageInfo = storage
      .filter((d) => d.type === 'fixed')
      .reduce((acc, d) => {
        acc.Total += d.capacity;
        return acc;
      }, {
        Total: 0,
      });
  } else {
    const capacities = storage
      .filter((d) => d.type === 'fixed')
      .reduce((acc, d) => {
        // pick only unique capacities
        if (acc.indexOf(d.capacity) === -1) {
          acc.push(d.capacity);
        }
        return acc;
      }, []);
    storageInfo = capacities.reduce((acc, c) => {
      acc.Total += c;
      return acc;
    }, {
      Total: 0,
    });
  }

  return {
    Version: manifest.version,
    DeviceId: machineId,
    DeviceType: deviceType,
    DeviceOSVersion: deviceOSVersion,
    UserHash: userData.hash,
    EntitlementKey: key,
    Platform: platform === 'chrome' ? 'catchon-extension' : platform,
    SentAt: Date.now(),
    Processor: processor ? {
      ModelName: processor.modelName,
      CoreCount: processor.numOfProcessors,
      Family: processor.archName,
    } : { Error: 'No processor info available' },
    Disk: storageInfo,
    Memory: memory?.capacity ? {
      Total: memory.capacity,
      Free: memory.availableCapacity,
      UsedPercent: Math.floor(((memory.capacity - memory.availableCapacity) / memory.capacity) * 100),
    } : { Error: 'No memory info available' },
  };
}

const checkForSpeedAndLocation = async () => {
  if (speedTestInProgress) {
    logger.info('[checkForSpeedAndLocation] Speed test is still in progress');
    return;
  }
  if (config?.speedTestURL && config?.chunkSize && config?.chunkCount) {
    const randomTime = getRandomInt(1, 55);
    logger.info(`[checkForSpeedAndLocation] Waiting ${randomTime} seconds`);
    await wait(randomTime * 1000);
    // get last time the check was done
    const localStorage = await chrome.storage.local.get(['lastCheckTime', 'lastCheckIP']);
    const now = new Date();
    if (
      // no check was done
      !localStorage.lastCheckTime
      // too much time has passed since last check
      || (localStorage.lastCheckTime && now.getTime() >= localStorage.lastCheckTime + (config.maxCheck * 60 * 1000))
      // min time has passed and IPs have changed
      || (localStorage.lastCheckTime && now.getTime() >= localStorage.lastCheckTime + (config.minCheck * 60 * 1000)
        && currentIP !== localStorage.lastCheckIP)
    ) {
      speedTestInProgress = true;
      await setLastSend('lastSpeedLocation');
      await chrome.storage.local.set({
        lastCheckTime: new Date().getTime(),
      });

      if (config.locationDataActive) {
        logger.info('[checkForSpeedAndLocation] get location');
        try {
          locating = await getGeolocation();

          logger.info('locating', locating);

          if (locating.error) {
            logger.info('[checkForSpeedAndLocation] Could not get location', locating.message);
            currentLatitude = null;
            currentLongitude = null;
          } else {
            const { coords } = locating;
            const { latitude, longitude } = coords;
            currentLatitude = latitude;
            currentLongitude = longitude;
          }
        } catch (e) {
          logger.info('[checkForSpeedAndLocation] Could not get location', e);
        } finally {
          locating = null;
        }
      }

      let speedTestData = {};
      // speed test
      logger.info('[checkForSpeedAndLocation] firing up the speed test');
      try {
        const speedConfig = {
          server: config.speedTestURL,
          chunkSize: config.chunkSize,
          chunkCount: config.chunkCount,
          maxPayloadSize: config.maxPayload,
          adaptiveThreshold: config.adaptiveLimit,
        };
        speedTestData = await speedTest(speedConfig);
        logger.info(speedTestData);
      } catch (e) {
        logger.info('[checkForSpeedAndLocation] Could not start speed test', e);
      }

      if (speedTestData?.Results?.TransactionId) {
        // Send equity data only if speed test was successful
        currentIP = speedTestData?.IP;
        await chrome.storage.local.set({
          lastCheckIP: currentIP,
        });

        const moreDeviceDetails = await getDEDeviceInfo();
        const body = {
          ...moreDeviceDetails,
          Connected: true,
          IP: currentIP,
          SpeedTest: speedTestData.Results,
          Location: config.locationDataActive && currentLatitude && currentLongitude ? {
            Lat: currentLatitude,
            Lon: currentLongitude,
          } : undefined,
        };

        try {
          // sent digital equity data
          const res = await sendData({
            url: config.digitalEquityURL,
            body,
          });
          logger.info(res);
        } catch (e) {
          logger.info(`Error sending digital equity data: ${e.message}`);
          if (e instanceof CriticalError) {
            throw e;
          }
        } finally {
          speedTestInProgress = false;
        }
      }
    }
  } else {
    logger.info('Cannot run speed test without all the configs.');
  }
};

const trySendDisconnectedData = async () => {
  if (config.speedTestActive) {
    logger.info('Send offline data if online and available');
    if (navigator.onLine) {
    // get offline info if available
      const localStorage = await chrome.storage.local.get(['offlineInfo']);

      if (localStorage.offlineInfo) {
        logger.info('Sending offline data');
        lastOfflineDetails = JSON.parse(localStorage.offlineInfo);
        logger.info(lastOfflineDetails);
        if (!lastOfflineDetails.DisconnectEnd) {
          lastOfflineDetails.DisconnectEnd = new Date().getTime();
        }

        const moreDeviceDetails = await getDEDeviceInfo();
        const body = {
          ...moreDeviceDetails,
          Connected: false,
          IP: lastOfflineDetails.LastIP,
          DisconnectedInterval: {
            Start: lastOfflineDetails.DisconnectStart,
            End: lastOfflineDetails.DisconnectEnd,
          },
        };

        try {
        // sent digital equity disconnected ata
          const res = await sendData({
            url: config.digitalEquityURL,
            body,
          });
          logger.info(res);
          // Reset disconnected data
          await chrome.storage.local.remove('offlineInfo');
        } catch (e) {
          logger.info(`Error sending digital equity disconnected data: ${e.message}`);
          if (e instanceof CriticalError) {
            throw e;
          }
        }
      } else {
        logger.info('No offline data to send');
      }
    }
  }
};

async function loadLastSend() {
  lastSend = await getLocalStorage('lastSend') || {};
}

async function loadConfig() {
  const lc = await getLocalStorage('config');
  if (lc) {
    config = lc;
  } else {
    config = await getDefaultConfig();
    await checkKey(config);
  }
  logger.init(config.log);
}

const start = () => {
  // setup worker alarm
  logger.info('[main] creating worker alarm');
  chrome.alarms.create('worker', { periodInMinutes: 1 });

  // logic to keep alive
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
  }
  keepAliveInterval = setInterval(() => {
    chrome.runtime.getPlatformInfo(() => {
      logger.info('[keepAlive]');
    });
  }, 20000);
};

const main = async () => {
  // grab last send times
  await loadLastSend();
  // grab config
  await loadConfig();
  // load activities from storage
  activities = await readActivitiesFromStorage();
  // send every X seconds
  updateSendInterval();
  // do an initial check on init
  await checkAgentStatus();
  // Send disconnected data if available
  await trySendDisconnectedData();
};

let mainInt;
const runMainUntilSuccess = async () => {
  try {
    await main();
  } catch (e) {
    logger.info('Running main program failed with error: ', e);
    // try again after 1 minute
    clearTimeout(mainInt);
    mainInt = setTimeout(runMainUntilSuccess, min1);
    throw e;
  }
};

if (typeof process === 'undefined' || typeof process.env === 'undefined' || process.env.NODE_ENV !== 'test') {
  // run when loaded (eg: after restart)
  runMainUntilSuccess();
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'worker') {
    logger.info('[onAlarm] worker');
    await loadLastSend();

    // attempt agent check
    await checkAgentStatus();

    // attempt send
    await trySendActivity();

    if (lastSend.lastActivityScreen && timeToRun(lastSend.lastActivityScreen, lastActivityInt)) {
      logger.info('[onAlarm] user idle');
      await setActivityScreenTimeEnd();
      userIdle = true;
    }

    // check speedtest if enabled
    if (config.speedTestActive) {
      if (!lastSend.lastSpeedLocation || timeToRun(lastSend.lastSpeedLocation, speedLocationInt)) {
        if (navigator.onLine) {
          logger.info('[onAlarm] start speed test process');
          checkForSpeedAndLocation();
          trySendDisconnectedData();
        }
      }
    }
  }
});

navigator.connection.onchange = async () => {
  // Status changed
  if (config.speedTestActive) {
    if (navigator.onLine !== currentConnectionStatus) {
      if (navigator.onLine) {
        logger.info('Changed from offline to online');
        currentConnectionStatus = true;
        const localStorage = await chrome.storage.local.get(['offlineInfo']);

        if (localStorage.offlineInfo) {
          lastOfflineDetails = JSON.parse(localStorage.offlineInfo);

          // Mark end date of disconnection
          lastOfflineDetails.DisconnectEnd = new Date().getTime();
          await chrome.storage.local.set({ offlineInfo: JSON.stringify(lastOfflineDetails) });

          await trySendDisconnectedData();
        }
      } else if (!navigator.onLine) {
        logger.info('Changed from online to offline');
        currentConnectionStatus = false;
        const localStorage = await chrome.storage.local.get(['lastCheckIP']);
        const offlineDetails = {
          LastIP: localStorage.lastCheckIP,
          DisconnectStart: new Date().getTime(),
        };
        await chrome.storage.local.set({ offlineInfo: JSON.stringify(offlineDetails) });
      }
    }
  }
};

chrome.windows.onFocusChanged.addListener(windowFocusListener);
chrome.tabs.onActivated.addListener(tabActivatedListener);
chrome.tabs.onUpdated.addListener(tabUpdatedListener);
chrome.runtime.onConnect.addListener(runtimeConnectListener);
chrome.runtime.onUpdateAvailable.addListener(extensionUpdateAvailableListener);
chrome.runtime.onStartup.addListener(start);

start();

export {
  main,
  getActivities,
  setActivityScreenTimeStart,
  setActivityScreenTimeEnd,
  clearActivities,
};
