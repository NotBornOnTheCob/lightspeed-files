/* eslint-disable import/extensions */
import { getPlatform } from './identity.js';
import { logger, getManagedValue } from './utils.js';

const platform = getPlatform();

const checkKey = async ({ verifyUrl: url }) => {
  // read the managed entitlement key
  const key = await getManagedValue('EntitlementKey');
  logger.info('Got key:', key);
  // validate it against the API
  const res = await fetch(`${url}/${key}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    const response = await res.json();
    throw new Error(response.ResponseStatus
      ? response.ResponseStatus.Message
      : res.statusText);
  }
  logger.info('Key is valid');
};

const getConfig = async ({ agentConfigUrl: url }) => {
  // read the managed entitlement key
  const key = await getManagedValue('EntitlementKey');
  // validate it against the API
  const res = await fetch(`${url}/${platform}/${key}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  const response = await res.json();
  if (!res.ok) {
    throw new Error(response.ResponseStatus
      ? response.ResponseStatus.Message
      : res.statusText);
  }
  return response;
};

const sendData = async ({ url, body }) => {
  logger.info('[sendData] Sending activity ->', body);
  const res = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    throw new Error(res.status);
  }
  return res;
};

export {
  checkKey,
  getConfig,
  sendData,
};
