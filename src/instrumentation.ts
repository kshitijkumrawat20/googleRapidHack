/**
 * Next.js Instrumentation Hook
 * 
 * Configures the Node.js DNS resolver to:
 * 1. Use Google Public DNS (8.8.8.8, 8.8.4.4) instead of system DNS
 * 2. Prefer IPv4 addresses over IPv6 (many campus/ISP networks block IPv6)
 * 
 * This is necessary because some ISP/campus networks fail to resolve
 * Google API domains (generativelanguage.googleapis.com) or have broken
 * IPv6 routing that causes ConnectTimeoutError.
 * 
 * Runs once when the Next.js server starts, before any API routes are hit.
 */

export async function register() {
  if (typeof window === 'undefined') {
    try {
      const dns = await import('dns');
      
      // Force IPv4-first resolution to avoid IPv6 timeout issues
      if (typeof dns.setDefaultResultOrder === 'function') {
        dns.setDefaultResultOrder('ipv4first');
      }
      
      // Use Google Public DNS servers
      dns.setServers(['8.8.8.8', '8.8.4.4']);
      
      console.log('🌐 DNS configured: Google DNS (8.8.8.8) + IPv4-first mode enabled.');
    } catch (e) {
      console.warn('⚠️ Failed to configure DNS:', e);
    }
  }
}
