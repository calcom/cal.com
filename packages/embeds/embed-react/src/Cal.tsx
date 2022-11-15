import { useEffect, useRef } from "react";

import { useCalApi } from "./cal-context";

export type CalProps = {
  calOrigin?: string;
  calLink: string;
  initConfig?: {
    debug?: boolean;
    uiDebug?: boolean;
  };
  config?: any;
} & React.HTMLAttributes<HTMLDivElement>;

export const Cal = function Cal(props: CalProps) {
  const { calLink, calOrigin, config, initConfig = {}, ...restProps } = props;
  if (!calLink) {
    throw new Error("calLink is required");
  }
  const initializedRef = useRef(false);
  const [calApi, calApiLoaded] = useCalApi();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!calApiLoaded || initializedRef.current) {
      return;
    }
    initializedRef.current = true;
    const element = ref.current;
    calApi("init", {
      ...initConfig,
      origin: calOrigin,
    });
    calApi("inline", {
      elementOrSelector: element,
      calLink,
      config,
    });
  }, [calApi, calLink, config, calOrigin, initConfig]);

  if (!calApiLoaded) {
    return null;
  }

  return <div ref={ref} {...restProps} />;
};
