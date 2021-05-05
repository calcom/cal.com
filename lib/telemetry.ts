import React, {useContext} from 'react'
import {jitsuClient, JitsuClient} from "@jitsu/sdk-js";


/**
 * Telemetry client
 */
export type TelemetryClient = {
    /**
     * Use it as: withJitsu((jitsu) => {return jitsu.track()}). If telemetry is disabled, the callback will ignored
     *
     * ATTENTION: always return the value of jitsu.track() or id() call. Otherwise unhandled rejection can happen,
     * which is handled in Next.js with a popup.
     */
    withJitsu: (callback: (jitsu: JitsuClient) => void | Promise<void>) => void
}

const emptyClient: TelemetryClient = {withJitsu: () => {}};

function useTelemetry(): TelemetryClient {
    return useContext(TelemetryContext);
}

function createTelemetryClient(): TelemetryClient {
    if (process.env.NEXT_PUBLIC_TELEMETRY_KEY) {
        return {
            withJitsu: (callback) => {
                if (!process.env.NEXT_PUBLIC_TELEMETRY_KEY) {
                    //telemetry is disabled
                    return;
                }
                if (!window) {
                    console.warn("Jitsu has been called during SSR, this scenario isn't supported yet");
                    return;
                } else if (!window['jitsu']) {
                    window['jitsu'] = jitsuClient({
                        log_level: 'ERROR',
                        tracking_host: "https://t.calendso.com",
                        key: "js.2pvs2bbpqq1zxna97wcml.oi2jzirnbj1ev4tc57c5r",
                        cookie_name: "__clnds",
                        capture_3rd_party_cookies: false,
                    });
                }
                let res = callback(window['jitsu']);
                if (res && typeof res['catch'] === "function") {
                    res.catch(e => {
                        console.debug("Unable to send telemetry event", e)
                    });
                }
            }
        }
    } else {
        return emptyClient;
    }
}


const TelemetryContext = React.createContext<TelemetryClient>(emptyClient)

const TelemetryProvider = TelemetryContext.Provider

export { TelemetryContext, TelemetryProvider, createTelemetryClient, useTelemetry };
