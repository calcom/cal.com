export const navigateInTopWindow = (url: string) => {
  // In some weird unknown case, window.top.location could be null as per typescript. In such case, we still do the redirect but in same window
  const location = window.top ? window.top.location : window.location;
  location.href = url;
};
