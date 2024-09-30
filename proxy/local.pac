function FindProxyForURL(url, host) {
  // Variables defined to proxy or send direct
  var proxy = 'PROXY relay.lsaccess.me:62312';
  var direct = 'DIRECT';
  // Internal IP Ranges
  if (
    isInNet(host, "127.0.0.0", "255.0.0.0") ||
    isInNet(host, "10.0.0.0", "255.0.0.0") ||
    isInNet(host, "172.16.0.0", "255.240.0.0") ||
    isInNet(host, "192.168.0.0", "255.255.0.0") ||
    isInNet(host, "169.254.0.0", "255.255.0.0")
  ) {
    return direct;
  }
  // Send Plain Hostnames DIRECT
  if (isPlainHostName(host))
    return "DIRECT";
  // Send FTP traffic DIRECT
  if (url.substring(0, 4) === 'ftp:') {
    return direct;
  }
  // Entries to cover subdomains
  var no_proxy_subs = Array('[*DYNAMIC_SUBS*]'
  );
  // Entries to cover exact match domains
  var no_proxy_exact = Array('[*DYNAMIC_EXACT*]'
  );
  // Match the above lists to send direct
  for (var iter = 0; iter < no_proxy_subs.length; ++iter) {
    if (dnsDomainIs(host, no_proxy_subs[iter])) {
      return direct;
    }
  }
  for (var iter = 0; iter < no_proxy_exact.length; ++iter) {
    if (localHostOrDomainIs(host, no_proxy_exact[iter])) {
      return direct;
    }
  }
  // DEFAULT RULE: All other traffic sent to proxy.
  return proxy;
}