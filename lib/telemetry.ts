import React, {useContext} from 'react'
import {jitsuClient, JitsuClient} from "@jitsu/sdk-js";

/**
 * Enumeration of all event types that are being sent
 * to telemetry collection.
 */
export const telemetryEventTypes = {
    pageView: 'page_view',
    dateSelected: 'date_selected',
    timeSelected: 'time_selected',
    bookingConfirmed: 'booking_confirmed',
    bookingCancelled: 'booking_cancelled'
}

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

function isLocalhost(host: string) {
    return "localhost" === host || "127.0.0.1" === host;
}

/**
 * Collects page parameters and makes sure no sensitive data made it to telemetry
 * @param route current next.js route
 */
export function collectPageParameters(route?: string): any {
    let host = document.location.hostname;
    let maskedHost = isLocalhost(host) ? "localhost" : "masked";
    //starts with ''
    let docPath = route ?? "";
    return {
        page_url: route,
        page_title: "",
        source_ip: "",
        url: document.location.protocol + "//" + host + (docPath ?? ""),
        doc_host: maskedHost,
        doc_search: "",
        doc_path: docPath,
        referer: "",
    }
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
                        key: process.env.NEXT_PUBLIC_TELEMETRY_KEY,
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
