import { WEBAPP_URL } from "@calcom/lib/constants";

export function createPaymentLink({
    paymentUid,
    name,
    email,
    date,
}: {
    paymentUid: string;
    name?: string | null;
    email?: string | null;
    date: string;
}): string {
    const params = new URLSearchParams();

    params.append("date", date);

    if (email) {
        params.append("email", email);
    }

    if (name) {
        params.append("name", name);
    }

    const baseUrl = WEBAPP_URL;

    if (!baseUrl) {
        throw new Error("WEBAPP_URL environment variable is not set");
    }

    return `${baseUrl}/payment/${paymentUid}?${params.toString()}`;
}