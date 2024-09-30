/* eslint-disable import/extensions */
import md5 from './md5.js';
import { CriticalError, logger, uuid } from './utils.js';

let deviceSerial;
let deviceHostname;
let platformInfo;
let deviceCPU;
let deviceStorage;
let deviceMemory;
let deviceOS;
let deviceOSVersion;

const getProfileData = () => new Promise((resolve, reject) => {
  chrome.identity.getProfileUserInfo(({ email }) => {
    if (!email) {
      reject(new CriticalError('Profile email could not be identified. Is sync enabled?'));
    } else {
      const [username, domain] = email.split('@');
      resolve({
        email,
        hash: md5(email.trim().toLowerCase()),
        username,
        domain,
      });
    }
  });
});

let deviceId;
const getGeneratedDeviceSerial = () => new Promise((resolve) => {
  if (!deviceId) {
    chrome.storage.local.get('deviceId', (items) => {
      ({ deviceId } = items);
      if (deviceId) {
        resolve(deviceId);
      } else {
        deviceId = uuid();
        chrome.storage.local.set({ deviceId }, () => {
          resolve(deviceId);
        });
      }
    });
  } else {
    resolve(deviceId);
  }
});

const getDeviceSerial = () => {
  if (!deviceSerial) {
    deviceSerial = new Promise((resolve) => {
      if (!chrome.enterprise
        || !chrome.enterprise.deviceAttributes
        || !chrome.enterprise.deviceAttributes.getDeviceSerialNumber) {
        logger.info('No access to deviceAttributes. Generating DeviceId');
        resolve(getGeneratedDeviceSerial());
      }
      chrome.enterprise.deviceAttributes.getDeviceSerialNumber((serialNumber) => {
        if (!serialNumber) {
          logger.info('Empty serial number. Generating DeviceId');
          resolve(getGeneratedDeviceSerial());
        } else {
          logger.info('Got serial number:', serialNumber);
          resolve(serialNumber);
        }
      });
    });
  }
  return deviceSerial;
};

const getHostname = () => {
  if (!deviceHostname) {
    // chrome.enterprise.deviceAttributes.getDeviceHostname
    deviceHostname = new Promise((resolve) => {
      if (!chrome.enterprise
        || !chrome.enterprise.deviceAttributes
        || !chrome.enterprise.deviceAttributes.getDeviceHostname) {
        logger.info('Empty hostname.');
        resolve(undefined);
      }
      chrome.enterprise.deviceAttributes.getDeviceHostname((hostname) => {
        if (!hostname) {
          logger.info('Empty hostname');
          resolve(undefined);
        } else {
          logger.info('Got device hostname:', hostname);
          resolve(hostname);
        }
      });
    });
  }
  return deviceHostname;
};

const getPlatform = () => {
  const { userAgent } = navigator;
  if (/Edg\//.test(userAgent)) {
    return 'edge';
  }
  if (/Chrome\//.test(userAgent)) {
    return 'chrome';
  }
  return 'unknown';
};

const getOS = () => {
  if (!deviceOS) {
    deviceOS = new Promise((resolve) => {
      chrome.runtime.getPlatformInfo(({ os }) => {
        resolve(os);
      });
    });
  }
  return deviceOS;
};

// Get OS version only for windows 10 and 11
const getOSVersion = async () => {
  if (!deviceOSVersion) {
    deviceOSVersion = new Promise((resolve) => {
      navigator.userAgentData.getHighEntropyValues(['platformVersion'])
        .then((ua) => {
          const plat = navigator.userAgentData.platform;
          if (plat === 'Windows') {
            const majorPlatformVersion = parseInt(ua.platformVersion.split('.')[0], 10);
            if (majorPlatformVersion >= 13) {
              resolve(`${plat} 11`);
            } else if (majorPlatformVersion > 0) {
              resolve(`${plat} 10`);
            } else {
              resolve(undefined);
            }
          } else {
            resolve(undefined);
          }
        });
    });
  }
  return deviceOSVersion;
};

const getDeviceType = () => {
  if (!platformInfo) {
    platformInfo = new Promise((resolve) => {
      const platform = getPlatform();
      chrome.runtime.getPlatformInfo(({ os, arch }) => {
        resolve(`${os};${arch};${platform === 'chrome' ? 'Google' : 'Microsoft'}`);
      });
    });
  }
  return platformInfo;
};

const getCPU = () => {
  if (!deviceCPU) {
    deviceCPU = new Promise((resolve) => {
      if (!chrome.system
        || !chrome.system.cpu
        || !chrome.system.cpu.getInfo) {
        logger.info('Empty CPU.');
        resolve(undefined);
      }
      chrome.system.cpu.getInfo((info) => {
        if (!info) {
          logger.info('Empty CPU.');
          resolve(undefined);
        } else {
          logger.info('Got cpu info:', info);
          resolve(info);
        }
      });
    });
  }
  return deviceCPU;
};

const getStorage = () => {
  if (!deviceStorage) {
    deviceStorage = new Promise((resolve) => {
      if (!chrome.system
        || !chrome.system.storage
        || !chrome.system.storage.getInfo) {
        logger.info('Empty storage.');
        resolve(undefined);
      }
      chrome.system.storage.getInfo((info) => {
        if (!info) {
          logger.info('Empty storage.');
          resolve(undefined);
        } else {
          logger.info('Got storage info:', info);
          resolve(info);
        }
      });
    });
  }
  return deviceStorage;
};

const getMemory = () => {
  if (!deviceMemory) {
    deviceMemory = new Promise((resolve) => {
      if (!chrome.system
        || !chrome.system.memory
        || !chrome.system.memory.getInfo) {
        logger.info('Empty memory.');
        resolve(undefined);
      }
      chrome.system.memory.getInfo((info) => {
        if (!info) {
          logger.info('Empty memory.');
          resolve(undefined);
        } else {
          logger.info('Got memory info:', info);
          resolve(info);
        }
      });
    });
  }
  return deviceMemory;
};

export {
  getProfileData,
  getDeviceSerial,
  getHostname,
  getDeviceType,
  getPlatform,
  getCPU,
  getStorage,
  getMemory,
  getOS,
  getOSVersion,
};
