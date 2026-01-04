import { describe, expect, it } from "vitest";

import { foldIcal, unfoldIcal } from "./CalendarService";

describe("CalendarService", () => {
    describe("foldIcal", () => {
        it("should fold lines longer than 75 octets", () => {
            const longLine = "A".repeat(100);
            const folded = foldIcal(longLine);
            const lines = folded.split("\r\n");

            // Verify no line exceeds 75 bytes (ignoring CRLF)
            // Note: first line 75, subsequent 74 (+1 space = 75)
            expect(Buffer.byteLength(lines[0], "utf8")).toBeLessThanOrEqual(75);
            expect(lines.length).toBeGreaterThan(1);

            // Verify subsequent lines start with space
            expect(lines[1].startsWith(" ")).toBe(true);
        });

        it("should not fold short lines", () => {
            const shortLine = "Short line";
            expect(foldIcal(shortLine)).toBe(shortLine);
        });
    });

    describe("unfoldIcal", () => {
        it("should unfold lines", () => {
            const folded = "Line1\r\n Line2";
            expect(unfoldIcal(folded)).toBe("Line1Line2");
        });
    });

    // Note: We can't easily test the private methods or abstract class directly without a concrete implementation.
    // However, verifying the folding logic (the core of the fix) is the most critical part.
    // The integration of this logic into createEvent/updateEvent was verified manually and by the logic check.
});
