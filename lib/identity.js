const crypto = require('crypto');
const ipaddr = require('ipaddr.js');

const IP_HASH_SALT = process.env.IP_HASH_SALT || 'default_ip_salt';

function normalizeIp(rawIp) {
  if (!rawIp) {
    return null;
  }
  try {
    const parsed = ipaddr.parse(rawIp);
    if (parsed.kind() === 'ipv6' && parsed.isIPv4MappedAddress()) {
      return parsed.toIPv4Address().toString();
    }
    return parsed.toNormalizedString();
  } catch (_err) {
    return rawIp;
  }
}

function hashIp(ip) {
  if (!ip) {
    return null;
  }
  return crypto
    .createHash('sha256')
    .update(`${IP_HASH_SALT}:${ip}`)
    .digest('hex');
}

module.exports = {
  normalizeIp,
  hashIp
};
