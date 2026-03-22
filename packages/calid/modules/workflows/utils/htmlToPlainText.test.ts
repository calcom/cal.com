import { describe, expect, it } from "vitest";

import { htmlToPlainText } from "./htmlToPlainText";

describe("htmlToPlainText", () => {
  it("converts br tags to new lines", () => {
    expect(htmlToPlainText("Hello<br>World<br/>Again<br />Done")).toBe("Hello\nWorld\nAgain\nDone");
  });

  it("strips tags and preserves list semantics", () => {
    const html = "<div><p>Intro</p><ul><li>One</li><li>Two</li></ul></div>";
    expect(htmlToPlainText(html)).toBe("Intro\n- One\n- Two");
  });

  it("decodes basic html entities", () => {
    const html = "&amp; &lt; &gt; &nbsp; &quot;test&quot; &#39;ok&#39;";
    expect(htmlToPlainText(html)).toBe("& < >   \"test\" 'ok'");
  });

  it("collapses runs of more than two newlines and trims outer whitespace", () => {
    const html = "  <p>A</p><p></p><div></div><p>B</p>  ";
    expect(htmlToPlainText(html)).toBe("A\n\nB");
  });
});

