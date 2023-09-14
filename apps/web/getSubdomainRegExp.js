const getDefaultSubdomain = (url) => {
  if (!url.startsWith("http:") && !url.startsWith("https:")) {
    // Make it a valid URL. Mabe we can simply return null and opt-out from orgs support till the use a URL scheme.
    url = `https://${url}`;
  }
  const _url = new URL(url);
  const regex = new RegExp(/^([a-z]+\:\/{2})?((?<subdomain>[\w-.]+)\.[\w-]+\.\w+)$/);
  //console.log(_url.hostname, _url.hostname.match(regex));
  return _url.hostname.match(regex)?.groups?.subdomain || null;
};
exports.getSubdomainRegExp = (url) => {
  const defaultSubdomain = getDefaultSubdomain(url);
  const subdomain = defaultSubdomain ? `(?!${defaultSubdomain})[^.]+` : "[^.]+";
  return subdomain;
};
