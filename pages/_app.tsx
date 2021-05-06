import '../styles/globals.css';
import {createTelemetryClient, TelemetryProvider} from '../lib/telemetry';
import { Provider } from 'next-auth/client';
import { useRouter } from 'next/router';

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  return (
      <TelemetryProvider value={createTelemetryClient()}>
        <Provider session={pageProps.session} options={{
          basePath: router.basePath + '/api/auth'
        }}>
            <Component {...pageProps} />
        </Provider>
      </TelemetryProvider>
  );
}

export default MyApp;
