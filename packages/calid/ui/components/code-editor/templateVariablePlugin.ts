import { type EditorState, type Extension, StateField, type Transaction } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView } from "@codemirror/view";

export const PREVIEW_TEMPLATE_KEYS = new Set([
  "EVENT_TYPE_NAME",
  "EVENT_NAME",
  "ORGANIZER_NAME",
  "ORGANIZER_FIRST_NAME",
  "ATTENDEE_NAME",
  "ATTENDEE_FIRST_NAME",
  "ATTENDEE_LAST_NAME",
  "ATTENDEE_EMAIL",
  "EVENT_DATE",
  "EVENT_TIME",
  "START_TIME",
  "EVENT_END_TIME",
  "TIMEZONE",
  "LOCATION",
  "ADDITIONAL_NOTES",
  "MEETING_URL",
  "ONLINE_MEETING_URL",
  "CANCEL_URL",
  "RESCHEDULE_URL",
  "RATING_URL",
  "NO_SHOW_URL",
  "ATTENDEE_TIMEZONE",
  "EVENT_START_TIME_IN_ATTENDEE_TIMEZONE",
  "EVENT_END_TIME_IN_ATTENDEE_TIMEZONE",
  "CANCELLATION_REASON",
  "RESPONSES",
]);

const knownVarMark = Decoration.mark({ class: "cm-template-var-known" });
const unknownVarMark = Decoration.mark({ class: "cm-template-var-unknown" });
const conditionalMark = Decoration.mark({ class: "cm-template-conditional" });

const buildDecorations = (state: EditorState): DecorationSet => {
  const text = state.doc.toString();
  const ranges: ReturnType<typeof knownVarMark.range>[] = [];

  const variableTokenRegex = /\{([A-Z][A-Z0-9_]*(?:\.[a-zA-Z0-9_.]+)*)\}/g;
  const conditionalOpenRegex = /\{#if\s+[^}]+\}/g;
  const conditionalElseRegex = /\{else\}/g;
  const conditionalCloseRegex = /\{\/if\}/g;

  for (const match of text.matchAll(variableTokenRegex)) {
    if (match.index === undefined) continue;

    const fullMatch = match[0];
    const tokenPath = match[1] || "";
    if (tokenPath === "else") continue;
    const baseKey = tokenPath.split(".")[0];
    const mark = PREVIEW_TEMPLATE_KEYS.has(baseKey) ? knownVarMark : unknownVarMark;
    ranges.push(mark.range(match.index, match.index + fullMatch.length));
  }

  for (const match of text.matchAll(conditionalOpenRegex)) {
    if (match.index === undefined) continue;
    ranges.push(conditionalMark.range(match.index, match.index + match[0].length));
  }

  for (const match of text.matchAll(conditionalElseRegex)) {
    if (match.index === undefined) continue;
    ranges.push(conditionalMark.range(match.index, match.index + match[0].length));
  }

  for (const match of text.matchAll(conditionalCloseRegex)) {
    if (match.index === undefined) continue;
    ranges.push(conditionalMark.range(match.index, match.index + match[0].length));
  }

  ranges.sort((a, b) => a.from - b.from);
  return Decoration.set(ranges);
};

const templateVariableField = StateField.define<DecorationSet>({
  create(state) {
    return buildDecorations(state);
  },
  update(value, transaction: Transaction) {
    if (!transaction.docChanged) {
      return value;
    }

    return buildDecorations(transaction.state);
  },
  provide: (field) => EditorView.decorations.from(field),
});

const templateVariableTheme = EditorView.baseTheme({
  ".cm-template-var-known": {
    backgroundColor: "#dbeafe",
    color: "#1d4ed8",
    borderRadius: "3px",
    padding: "0 2px",
  },
  ".cm-template-var-unknown": {
    backgroundColor: "#fee2e2",
    color: "#b91c1c",
    borderRadius: "3px",
    padding: "0 2px",
  },
  ".cm-template-conditional": {
    backgroundColor: "#fef9c3",
    color: "#854d0e",
    borderRadius: "3px",
    padding: "0 2px",
  },
});

export const templateVariablePlugin: Extension[] = [templateVariableField, templateVariableTheme];
