const dns = require('dns').promises;
const ipaddr = require('ipaddr.js');
const net = require('net');

const MAX_URL_LENGTH = 2048;

const BLOCKED_HOSTNAMES = new Set([
  'localhost'
]);

const BLOCKED_SUFFIXES = ['.local', '.internal'];

const BLOCKED_CIDRS = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
  ['255.255.255.255', 32],
  ['::1', 128],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8]
].map(([addr, prefix]) => [ipaddr.parse(addr), prefix]);

class UrlSafetyError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'UrlSafetyError';
    this.code = code;
  }
}

function isBlockedHostname(hostname) {
  const normalized = hostname.trim().toLowerCase();
  if (BLOCKED_HOSTNAMES.has(normalized)) {
    return true;
  }
  return BLOCKED_SUFFIXES.some((suffix) => normalized.endsWith(suffix));
}

function isBlockedIp(address) {
  try {
    if (!ipaddr.isValid(address)) {
      return false;
    }
    const parsed = ipaddr.parse(address);
    return BLOCKED_CIDRS.some(([block, prefix]) => parsed.match([block, prefix]));
  } catch (_err) {
    return false;
  }
}

async function resolveHostAddresses(hostname) {
  if (ipaddr.isValid(hostname)) {
    return [hostname];
  }

  try {
    const records = await dns.lookup(hostname, { all: true });
    return records.map((record) => record.address);
  } catch (err) {
    throw new UrlSafetyError('DNS_LOOKUP_FAILED', err.message);
  }
}

async function assertUrlIsSafe(targetUrl) {
  if (typeof targetUrl !== 'string' || targetUrl.trim().length === 0) {
    throw new UrlSafetyError('INVALID_URL', 'Target URL is required.');
  }
  const trimmedUrl = targetUrl.trim();

  if (trimmedUrl.length > MAX_URL_LENGTH) {
    throw new UrlSafetyError('INVALID_URL', 'URL is too long.');
  }

  let url;
  try {
    url = new URL(trimmedUrl);
  } catch (_err) {
    throw new UrlSafetyError('INVALID_URL', 'URL format is invalid.');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new UrlSafetyError('INVALID_URL', 'Only HTTP/HTTPS protocols are allowed.');
  }

  if (!url.hostname) {
    throw new UrlSafetyError('INVALID_URL', 'URL must include a valid hostname.');
  }

  if (isBlockedHostname(url.hostname)) {
    throw new UrlSafetyError('BLOCKED_HOST', 'Hostname is not allowed.');
  }

  if (url.port) {
    const portNumber = Number(url.port);
    if (!Number.isInteger(portNumber) || portNumber <= 0 || portNumber > 65535) {
      throw new UrlSafetyError('INVALID_URL', 'Port number is invalid.');
    }
  }

  if (net.isIP(url.hostname) && isBlockedIp(url.hostname)) {
    throw new UrlSafetyError('BLOCKED_IP', 'Target IP address is not allowed.');
  }

  const addresses = await resolveHostAddresses(url.hostname);
  for (const address of addresses) {
    if (isBlockedIp(address)) {
      throw new UrlSafetyError('BLOCKED_IP', 'Resolved IP address is not allowed.');
    }
  }

  return {
    url,
    addresses
  };
}

module.exports = {
  assertUrlIsSafe,
  UrlSafetyError,
  isBlockedIp
};
