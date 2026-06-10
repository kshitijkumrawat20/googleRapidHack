const dns = require('dns');
try {
  if (dns && typeof dns.setServers === 'function') {
    dns.setServers(['8.8.8.8', '8.8.4.4']);
  }
} catch (e) {
  // Fail-silent inside subprocess
}
