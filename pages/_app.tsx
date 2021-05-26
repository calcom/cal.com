import '../styles/globals.css';
import { Provider } from 'next-auth/client';
import { appWithTranslation } from 'next-i18next'

function MyApp({ Component, pageProps }) {
  return (
      <Provider session={pageProps.session}>
        <Component {...pageProps} />
      </Provider>
  );
}

export default appWithTranslation(MyApp);
