import Script from "next/script";

import { getEventTypeAppData } from "@calcom/app-store/utils";
import { trackingApps } from "./eventTypeAnalytics";

export type AppScript = {attrs?: Record<string, string>} & ({src: undefined, content?: string} | {src?: string, content:undefined})

export default function BookingPageTagManager({
  eventType,
}: {
  eventType: Parameters<typeof getEventTypeAppData>[0];
}) {

  
  return (
    <>
      {Object.entries(trackingApps).map(([appId, scriptConfig]) => {
        const trackingId = getEventTypeAppData(eventType, appId as keyof typeof trackingApps)?.trackingId;
        if (!trackingId) {
          return null;
        }
        const parseValue = <T extends string|undefined, >(val: T ):T => val ? val.replace(/\{TRACKING_ID\}/g, trackingId) as T : val
        
        return scriptConfig.scripts.map((script, index)=>{
          const parsedAttributes: NonNullable<AppScript["attrs"]> = {};
          const attrs = script.attrs || {};
          Object.entries(attrs).forEach(([name, value]) => {
            if (typeof value === "string") {
              value = parseValue(value)
            }
            parsedAttributes[name] = value;
          });
          
          return <Script src={parseValue(script.src)} key={`${appId}-${index}`} {...{dangerouslySetInnerHTML:{
            __html: parseValue(script.content) || ""
          }, ...parsedAttributes}} defer />;
        })
      })}
    </>
  );
}
