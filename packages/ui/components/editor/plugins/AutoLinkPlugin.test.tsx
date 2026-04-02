import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PlaygroundAutoLinkPlugin from "./AutoLinkPlugin";

const mockAutoLinkPlugin = vi.fn(() => null);

vi.mock("@lexical/react/LexicalAutoLinkPlugin", () => ({
  // @ts-expect-error - it needs props, somehow it not detect it.
  AutoLinkPlugin: (props: any) => mockAutoLinkPlugin(props),
}));

function setup() {
  const initialConfig = {
    namespace: "test-editor",
    onError: (error: Error) => console.error(error),
  };

  return render(
    <LexicalComposer initialConfig={initialConfig}>
      <RichTextPlugin
        contentEditable={<ContentEditable />}
        placeholder={<div>Enter some text...</div>}
        ErrorBoundary={LexicalErrorBoundary}
      />
      <PlaygroundAutoLinkPlugin />
    </LexicalComposer>
  );
}

describe("PlaygroundAutoLinkPlugin", () => {
  beforeEach(() => {
    mockAutoLinkPlugin.mockClear();
  });

  it("renders without crashing", () => {
    setup();
    expect(screen.getByText("Enter some text...")).toBeTruthy();
  });

  it("passes correct matchers to AutoLinkPlugin", () => {
    setup();
    expect(mockAutoLinkPlugin).toHaveBeenCalledWith(
      expect.objectContaining({
        matchers: expect.arrayContaining([expect.any(Function), expect.any(Function)]),
      })
    );
  });

  it("correctly matches URLs", () => {
    setup();
    // @ts-expect-error - it's definitely not undefined
    const matchers = mockAutoLinkPlugin.mock.calls[0][0].matchers;
    const urlMatcher = matchers[0];

    const validUrls = ["https://www.example.com", "http://example.com", "www.example.com"];

    validUrls.forEach((url) => {
      const result = urlMatcher(url);
      expect(result).toEqual({
        index: 0,
        length: url.length,
        text: url,
        url: url,
      });
    });

    expect(urlMatcher("not a url")).toBeNull();
  });

  it("correctly matches email addresses", () => {
    setup();
    // @ts-expect-error - it's definitely not undefined
    const matchers = mockAutoLinkPlugin.mock.calls[0][0].matchers;
    const emailMatcher = matchers[1];

    const validEmails = ["test@example.com", "test.name@example.co.uk", "test+alias@example.com"];

    validEmails.forEach((email) => {
      const result = emailMatcher(email);
      expect(result).toEqual({
        index: 0,
        length: email.length,
        text: email,
        url: `mailto:${email}`,
      });
    });

    expect(emailMatcher("not an email")).toBeNull();
  });
});
