import { useEffect, useState } from "react";

import { CalWindow, GlobalCal } from "@calcom/embed-core";
import EmbedSnippet from "@calcom/embed-snippet";

export const _useLoadCalApi = (embedJsUrl?: string) => {
  const [calApi, setCalApi] = useState<GlobalCal | null>(null);

  useEffect(() => {
    (async function () {
      const _calApi = await getCalApi(embedJsUrl);
      setCalApi(() => _calApi);
    })();

    // }, [embedJsUrl, setCalApi])
    // Since we don't support "reloading" embed on a different URL
    // just don't pass it to array dependency for now
    // TODO: unmount window.cal and replace it ?
  }, [setCalApi]);

  return calApi;
};

export const getCalApi = async (embedJsUrl?: string): Promise<GlobalCal> => {
  let _calApi: GlobalCal | null = null;

  do {
    _calApi = EmbedSnippet(embedJsUrl) ?? null;
    // _calApi = (window as CalWindow).Cal;
    await promiseTimeout(50);
  } while (_calApi == null);

  return _calApi;
};

const promiseTimeout = (delay: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, delay);
  });

export default _useLoadCalApi;
