"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ProtonCalendarSetup() {
    const router = useRouter();
    const [url, setUrl] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage("");
        if (!url.trim()) {
            setErrorMessage("Please enter your Proton Calendar ICS URL");
            return;
        }
        setLoading(true);
        const res = await fetch("/api/integrations/protoncalendar/add", {
            method: "POST",
            body: JSON.stringify({ url }),
            headers: { "Content-Type": "application/json" },
        });
        const json = await res.json();
        setLoading(false);
        if (!res.ok) {
            setErrorMessage(json?.message || "Something went wrong");
        } else {
            router.push(json.url);
        }
    };

    return (
        <div style={{ minHeight: "100vh", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: "white", borderRadius: 12, padding: 40, maxWidth: 520, width: "100%", boxShadow: "0 4px 24px rgba(0,0,0,0.10)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
                    <Image src="/api/app-store/protoncalendar/icon.svg" alt="Proton Calendar" width={48} height={48} />
                    <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#111" }}>Connect Proton Calendar</h1>
                </div>
                <p style={{ color: "#6b7280", marginBottom: 24, fontSize: 14 }}>
                    Your ICS feed URL will be stored encrypted. Cal.com will use it to check your availability.
                </p>
                <form onSubmit={handleSubmit}>
                    <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: 14, color: "#374151" }}>
                        Proton Calendar ICS URL *
                    </label>
                    <input
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://calendar.proton.me/api/calendar/v1/..."
                        style={{
                            width: "100%", padding: "10px 14px", border: "1px solid #d1d5db",
                            borderRadius: 8, fontSize: 14, boxSizing: "border-box", marginBottom: 8,
                            outline: "none",
                        }}
                    />
                    <p style={{ color: "#9ca3af", fontSize: 12, marginBottom: 20 }}>
                        In Proton Calendar: Settings → Calendars → Share → Create link → copy the ICS URL.
                    </p>
                    {errorMessage && (
                        <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", color: "#dc2626", fontSize: 14, marginBottom: 16 }}>
                            {errorMessage}
                        </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                        <button
                            type="button"
                            onClick={() => router.back()}
                            style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #d1d5db", background: "white", cursor: "pointer", fontSize: 14 }}>
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#6d28d9", color: "white", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
                            {loading ? "Saving..." : "Save"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
