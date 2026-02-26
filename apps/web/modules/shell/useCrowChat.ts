import { useCallback, useEffect, useRef, useState } from "react";

export type CrowSSEEvent = {
  type: string;
  content?: string;
  tool_name?: string;
  display_name?: string;
  arguments?: Record<string, unknown>;
  conversation_id?: string;
  links?: string[];
  result?: unknown;
};

export type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  href: string | null;
  sources?: string[];
};

export type CrowChatState = {
  mode: "search" | "chat";
  messages: ChatMessage[];
  conversationId: string | null;
  streaming: boolean;
  checkingDocs: boolean;
  error: boolean;
};

const INITIAL_STATE: CrowChatState = {
  mode: "search",
  messages: [],
  conversationId: null,
  streaming: false,
  checkingDocs: false,
  error: false,
};

export function useCrowChat({
  apiUrl,
  productId,
  triggerQuery,
  searchQuery,
  onEnterChatMode,
  onClearSearch,
}: {
  apiUrl: string;
  productId: string;
  triggerQuery: string;
  searchQuery: string;
  onEnterChatMode: () => void;
  onClearSearch: () => void;
}): {
  state: CrowChatState;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
} {
  const [state, setState] = useState<CrowChatState>(INITIAL_STATE);
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const hasSentInitialRef = useRef(false);

  const sendMessage = useCallback(
    async (message: string, convId: string | null) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setState((s) => ({
        ...s,
        streaming: true,
        error: false,
        messages: [
          ...s.messages,
          { role: "user", text: message, href: null },
          { role: "assistant", text: "", href: null },
        ],
      }));

      try {
        const res = await fetch(`${apiUrl}/api/chat/message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product_id: productId,
            message,
            conversation_id: convId,
            context: { page: window.location.pathname },
          }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          setState((s) => ({ ...s, streaming: false, error: s.mode === "search" }));
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let capturedConvId = convId;
        // Accumulate top-3 source URLs from MCP tool results across the stream
        const pendingSources: string[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") {
              setState((s) => {
                const msgs = [...s.messages];
                const last = msgs[msgs.length - 1];
                if (last?.role === "assistant" && pendingSources.length > 0) {
                  msgs[msgs.length - 1] = { ...last, sources: pendingSources };
                }
                return { ...s, mode: "chat", streaming: false, conversationId: capturedConvId, messages: msgs };
              });
              onEnterChatMode();
              return;
            }
            try {
              const event = JSON.parse(data) as CrowSSEEvent;
              if (event.type === "conversation_id" && event.conversation_id) {
                capturedConvId = event.conversation_id;
              } else if (event.type === "content" && event.content) {
                setState((s) => {
                  const msgs = [...s.messages];
                  const last = msgs[msgs.length - 1];
                  if (last?.role === "assistant") {
                    msgs[msgs.length - 1] = { ...last, text: last.text + event.content! };
                  }
                  return { ...s, messages: msgs };
                });
              } else if (event.type === "client_tool_call" && event.tool_name === "navigateToPage") {
                // url is preferred (direct path); page is a named-route fallback the AI may pass instead
                const href = ((event.arguments?.url as string) || (event.arguments?.page as string)) ?? null;
                if (href) {
                  setState((s) => {
                    const msgs = [...s.messages];
                    const last = msgs[msgs.length - 1];
                    if (last?.role === "assistant") {
                      msgs[msgs.length - 1] = { ...last, href };
                    }
                    return { ...s, messages: msgs };
                  });
                }
              } else if (event.type === "tool_result" && pendingSources.length < 3) {
                // Extract up to 3 cal.com/help URLs from the MCP search result blob
                const blob = JSON.stringify(event);
                const urlPattern = /https:\/\/cal\.com\/help\/[^\s"')<>\\]+/g;
                let m: RegExpExecArray | null;
                // biome-ignore lint/suspicious/noAssignInExpressions: standard regex exec loop
                while ((m = urlPattern.exec(blob)) !== null) {
                  if (!pendingSources.includes(m[0])) pendingSources.push(m[0]);
                  if (pendingSources.length >= 3) break;
                }
              } else if (event.type === "tool_call_start") {
                setState((s) => ({ ...s, checkingDocs: true }));
              } else if (event.type === "tool_call_complete") {
                setState((s) => ({ ...s, checkingDocs: false }));
              }
            } catch {
              // ignore malformed SSE frames
            }
          }
        }

        setState((s) => ({ ...s, mode: "chat", streaming: false, conversationId: capturedConvId }));
        onEnterChatMode();
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setState((s) => ({ ...s, streaming: false, error: s.mode === "search" }));
        }
      }
    },
    [apiUrl, productId, onEnterChatMode]
  );

  // Fire once on mount with the trigger query (user explicitly selected "AI Answer").
  // The ref guard prevents React 18 Strict Mode's double-invoke from sending twice.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional mount-only effect
  useEffect(() => {
    if (hasSentInitialRef.current) return;
    hasSentInitialRef.current = true;
    if (!triggerQuery.trim() || !apiUrl || !productId) return;
    void sendMessage(triggerQuery, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // empty deps: fires once when user selects AI Answer

  // Enter key: send follow-up when in chat mode
  useEffect(() => {
    if (state.mode !== "chat") return;

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Enter" && searchQuery.trim() && !state.streaming) {
        e.preventDefault();
        e.stopPropagation();
        const msg = searchQuery.trim();
        onClearSearch();
        sendMessage(msg, state.conversationId);
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [state.mode, state.streaming, state.conversationId, searchQuery, onClearSearch, sendMessage]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages]);

  return { state, messagesEndRef };
}
