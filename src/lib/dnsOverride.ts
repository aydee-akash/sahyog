import dns from "node:dns";

let installed = false;

/**
 * Some networks (e.g. ISP DNS that blocks *.neon.tech) cannot resolve the
 * database host. When DNS_SERVERS is set (e.g. "8.8.8.8,1.1.1.1"), Node looks
 * hostnames up through those servers instead. Only the address lookup changes:
 * TLS still verifies the certificate against the real hostname. Not set in
 * production.
 */
export function installDnsOverride() {
  const servers = process.env.DNS_SERVERS?.split(",").map((s) => s.trim()).filter(Boolean);
  if (installed || !servers?.length) return;
  installed = true;

  const resolver = new dns.Resolver();
  resolver.setServers(servers);
  const systemLookup = dns.lookup;

  // Same call shapes as dns.lookup; falls back to the system resolver.
  const lookup = ((hostname: string, options: unknown, callback?: unknown) => {
    const cb = (typeof options === "function" ? options : callback) as (...args: unknown[]) => void;
    const opts = (typeof options === "object" && options) || {};
    const wantAll = (opts as { all?: boolean }).all === true;
    if (!hostname || hostname === "localhost" || /^[\d.:]+$/.test(hostname)) {
      return (systemLookup as (...a: unknown[]) => void)(hostname, options, callback);
    }
    resolver.resolve4(hostname, (err, addresses) => {
      if (err || !addresses.length) return (systemLookup as (...a: unknown[]) => void)(hostname, options, callback);
      if (wantAll) cb(null, addresses.map((address) => ({ address, family: 4 })));
      else cb(null, addresses[0], 4);
    });
  }) as typeof dns.lookup;

  dns.lookup = lookup;
}
