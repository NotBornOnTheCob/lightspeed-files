/* eslint-disable import/extensions */
/* eslint-disable no-undef */
import './wasm_exec.js';
import { logger } from './utils.js';

logger.info('loading speed_test v3.6.1');
const go = new Go();
const wasmPath = chrome.runtime.getURL('client.wasm');

WebAssembly.instantiateStreaming(fetch(wasmPath), go.importObject).then((result) => {
  logger.info(result);
  go.run(result.instance);
});

/* define the speedtest as a promise */
const speedTest = (config) => new Promise((resolve, reject) => {
  try {
    runSpeedtest(config, {
      deliver(val) {
        let result;
        logger.info(`i hit the callback: ${val}`);
        try {
          result = JSON.parse(val);
          if (result?.Results?.TransactionId) {
            resolve(result);
          } else {
            reject(new Error(val));
          }
        } catch (e) {
          logger.info(`Could not parse response:${e}`);
          reject(new Error(e));
        }
      },
    });
  } catch (e) {
    logger.info(e);
    reject(new Error(e));
  }
});

export default speedTest;
