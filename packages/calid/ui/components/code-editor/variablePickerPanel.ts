import { type Extension, StateEffect, StateField } from "@codemirror/state";
import { EditorView, type Panel, showPanel } from "@codemirror/view";

const variablePickerTheme = EditorView.baseTheme({
  ".cm-variable-picker": {
    borderTop: "1px solid #e5e7eb",
    backgroundColor: "#f9fafb",
    padding: "0 8px",
    display: "flex",
    flexDirection: "column",
    gap: "0",
    maxHeight: "120px",
    overflowY: "auto",
  },
  ".cm-variable-picker--collapsed": {
    maxHeight: "28px",
    overflowY: "hidden",
  },
  ".cm-variable-picker--readonly": {
    opacity: "0.9",
  },
  ".cm-variable-picker-header": {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    height: "28px",
    flexShrink: "0",
  },
  ".cm-variable-picker-label": {
    fontSize: "11px",
    fontWeight: "600",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    userSelect: "none",
  },
  ".cm-variable-picker-chevron": {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "20px",
    height: "20px",
    padding: "0",
    border: "none",
    borderRadius: "3px",
    backgroundColor: "transparent",
    color: "#9ca3af",
    cursor: "pointer",
    "& svg": {
      transition: "transform 150ms ease",
      transform: "rotate(0deg)",
    },
  },
  ".cm-variable-picker-chevron--collapsed svg": {
    transform: "rotate(0deg) !important",
  },
  ".cm-variable-picker-chevron:not(.cm-variable-picker-chevron--collapsed) svg": {
    transform: "rotate(180deg)",
  },
  ".cm-variable-picker-chevron:hover": {
    backgroundColor: "#f3f4f6",
    color: "#374151",
  },
  ".cm-variable-picker-chips": {
    display: "flex",
    flexWrap: "wrap",
    gap: "4px",
    padding: "0 0 6px 0",
  },
  ".cm-variable-picker-chip": {
    fontFamily: "monospace",
    fontSize: "12px",
    padding: "2px 6px",
    borderRadius: "4px",
    border: "1px solid #d1d5db",
    backgroundColor: "#ffffff",
    color: "#1d4ed8",
    cursor: "pointer",
    lineHeight: "1.4",
    "&:hover": {
      backgroundColor: "#dbeafe",
      borderColor: "#93c5fd",
    },
  },
  ".cm-variable-picker-chip:disabled": {
    color: "#9ca3af",
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
    cursor: "not-allowed",
    pointerEvents: "none",
  },
});

export function variablePickerPanel(variables: string[]): Extension {
  const toggleEffect = StateEffect.define<boolean>();

  const panelState = StateField.define<boolean>({
    create: () => true,
    update(value, tr) {
      for (const effect of tr.effects) {
        if (effect.is(toggleEffect)) return effect.value;
      }
      return value;
    },
    provide: (field) => showPanel.from(field, () => createPanel),
  });

  function createPanel(view: EditorView): Panel {
    const dom = document.createElement("div");
    dom.className = "cm-variable-picker";

    const header = document.createElement("div");
    header.className = "cm-variable-picker-header";

    const label = document.createElement("span");
    label.textContent = "Variables";
    label.className = "cm-variable-picker-label";

    const chevronBtn = document.createElement("button");
    chevronBtn.type = "button";
    chevronBtn.className = "cm-variable-picker-chevron";
    chevronBtn.setAttribute("aria-label", "Toggle variable picker");
    chevronBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
           xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M2 4.5L6 8.5L10 4.5" stroke="currentColor"
              stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;

    header.appendChild(label);
    header.appendChild(chevronBtn);
    dom.appendChild(header);

    const chipContainer = document.createElement("div");
    chipContainer.className = "cm-variable-picker-chips";

    const isReadOnly = view.state.readOnly;
    if (isReadOnly) dom.classList.add("cm-variable-picker--readonly");

    for (const variable of variables) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.textContent = `{${variable}}`;
      chip.className = "cm-variable-picker-chip";
      chip.title = `Insert {${variable}}`;
      chip.disabled = isReadOnly;

      chip.addEventListener("mousedown", (event) => {
        event.preventDefault();

        if (view.state.readOnly) return;

        const token = `{${variable}}`;
        const { from, to } = view.state.selection.main;

        view.dispatch(
          view.state.update({
            changes: { from, to, insert: token },
            selection: { anchor: from + token.length },
          })
        );
        view.focus();
      });

      chipContainer.appendChild(chip);
    }

    dom.appendChild(chipContainer);

    function syncExpanded(expanded: boolean) {
      if (expanded) {
        chipContainer.style.display = "";
        chevronBtn.classList.remove("cm-variable-picker-chevron--collapsed");
        chevronBtn.setAttribute("aria-expanded", "true");
        dom.classList.remove("cm-variable-picker--collapsed");
      } else {
        chipContainer.style.display = "none";
        chevronBtn.classList.add("cm-variable-picker-chevron--collapsed");
        chevronBtn.setAttribute("aria-expanded", "false");
        dom.classList.add("cm-variable-picker--collapsed");
      }
    }

    chevronBtn.addEventListener("mousedown", (event) => {
      event.preventDefault();
      const currentlyExpanded = view.state.field(panelState);
      view.dispatch({ effects: toggleEffect.of(!currentlyExpanded) });
    });

    syncExpanded(view.state.field(panelState));

    return {
      dom,
      top: false,
      update(update) {
        if (update.startState.field(panelState) !== update.state.field(panelState)) {
          syncExpanded(update.state.field(panelState));
        }
      },
    };
  }

  return [panelState, variablePickerTheme];
}
