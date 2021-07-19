
const withTM = require('next-transpile-modules')(['react-timezone-select']);

// TODO: Revisit this later with getStaticProps in App
if (process.env.NEXTAUTH_URL) {
    process.env.BASE_URL = process.env.NEXTAUTH_URL.replace('/api/auth', '');
}

if ( ! process.env.EMAIL_FROM ) {
    console.warn('\x1b[33mwarn', '\x1b[0m', 'EMAIL_FROM environment variable is not set, this may indicate mailing is currently disabled. Please refer to the .env.example file.');
}
if (process.env.BASE_URL) {
    process.env.NEXTAUTH_URL = process.env.BASE_URL + '/api/auth';
}

const validJson = (jsonString) => {
    try {
        const o = JSON.parse(jsonString);
        if (o && typeof o === "object") {
            return o;
        }
    }
    catch (e) { console.error(e); }
    return false;
}

if (process.env.GOOGLE_API_CREDENTIALS && ! validJson(process.env.GOOGLE_API_CREDENTIALS)) {
    console.warn('\x1b[33mwarn', '\x1b[0m', "- Disabled 'Google Calendar' integration. Reason: Invalid value for GOOGLE_API_CREDENTIALS environment variable. When set, this value needs to contain valid JSON like {\"web\":{\"client_id\":\"<clid>\",\"client_secret\":\"<secret>\",\"redirect_uris\":[\"<yourhost>/api/integrations/googlecalendar/callback>\"]}. You can download this JSON from your OAuth Client @ https://console.cloud.google.com/apis/credentials.");
}

module.exports = withTM({
  future: {
    webpack5: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      {
        source: '/settings',
        destination: '/settings/profile',
        permanent: true,
      }
    ]
  }
});
