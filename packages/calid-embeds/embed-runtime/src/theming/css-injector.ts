import { ThemeClasses } from "./color";

const EMBED_TARGETS = ["cal-floating-button", "cal-modal-box", "cal-inline"];

function lightVars(): string {
  return `
${EMBED_TARGETS.join(",")} {
--cal-spacing-0: 0px; --cal-spacing-px: 1px; --cal-spacing-0_5: 0.125rem;
--cal-spacing-1: 0.25rem; --cal-spacing-1_5: 0.375rem; --cal-spacing-2: 0.5rem;
--cal-spacing-2_5: 0.625rem; --cal-spacing-3: 0.75rem; --cal-spacing-3_5: 0.875rem;
--cal-spacing-4: 1rem; --cal-spacing-5: 1.25rem; --cal-spacing-6: 1.5rem;
--cal-spacing-7: 1.75rem; --cal-spacing-8: 2rem; --cal-spacing-9: 2.25rem;
--cal-spacing-10: 2.5rem; --cal-spacing-11: 2.75rem; --cal-spacing-12: 3rem;
--cal-spacing-14: 3.5rem; --cal-spacing-16: 4rem; --cal-spacing-20: 5rem;
--cal-spacing-24: 6rem; --cal-spacing-28: 7rem; --cal-spacing-32: 8rem;
--cal-spacing-36: 9rem; --cal-spacing-40: 10rem; --cal-spacing-44: 11rem;
--cal-spacing-48: 12rem; --cal-spacing-52: 13rem; --cal-spacing-56: 14rem;
--cal-spacing-60: 15rem; --cal-spacing-64: 16rem; --cal-spacing-72: 18rem;
--cal-spacing-80: 20rem; --cal-spacing-96: 24rem;
  --cal-radius-none: 0px; --cal-radius-sm: 0.125rem; --cal-radius: 0.25rem;
  --cal-radius-md: 0.375rem; --cal-radius-lg: 0.5rem; --cal-radius-xl: 0.75rem;
  --cal-radius-2xl: 1rem; --cal-radius-3xl: 1.5rem; --cal-radius-full: 9999px;
  --cal-bg-emphasis: hsla(220, 13%, 91%, 1); --cal-bg: hsla(0, 0%, 100%, 1);
  --cal-bg-subtle: hsla(220, 14%, 94%, 1); --cal-bg-muted: hsla(210, 20%, 97%, 1);
  --cal-bg-inverted: hsla(210, 30%, 4%, 1);
  --cal-bg-primary: hsla(214, 30%, 16%, 1); --cal-bg-primary-emphasis: hsla(220, 6%, 25%, 1);
  --cal-bg-primary-muted: hsla(220, 14%, 94%, 1);
  --cal-bg-brand: hsla(214, 30%, 16%, 1); --cal-bg-brand-emphasis: hsla(220, 6%, 25%, 1);
  --cal-bg-brand-muted: hsla(220, 14%, 94%, 1);
  --cal-bg-semantic-info-subtle: hsla(212, 88%, 97%, 1); --cal-bg-semantic-info-emphasis: hsla(236, 80%, 25%, 1);
  --cal-bg-semantic-success-subtle: hsla(167, 54%, 93%, 1); --cal-bg-semantic-success-emphasis: hsla(158, 74%, 38%, 1);
  --cal-bg-semantic-attention-subtle: hsla(34, 100%, 92%, 1); --cal-bg-semantic-attention-emphasis: hsla(15, 79%, 34%, 1);
  --cal-bg-semantic-error-subtle: hsla(0, 93%, 94%, 1); --cal-bg-semantic-error-emphasis: hsla(0, 63%, 24%, 1);
  --cal-bg-visualization-1-subtle: hsla(326, 78%, 95%, 1); --cal-bg-visualization-1-emphasis: hsla(330, 81%, 60%, 1);
  --cal-bg-visualization-2-subtle: hsla(256, 86%, 91%, 1); --cal-bg-visualization-2-emphasis: hsla(256, 85%, 57%, 1);
  --cal-bg-visualization-3-subtle: hsla(217, 87%, 91%, 1); --cal-bg-visualization-3-emphasis: hsla(235, 100%, 63%, 1);
  --cal-bg-visualization-4-subtle: hsla(167, 54%, 93%, 1); --cal-bg-visualization-4-emphasis: hsla(158, 74%, 38%, 1);
  --cal-bg-visualization-5-subtle: hsla(55, 97%, 88%, 1); --cal-bg-visualization-5-emphasis: hsla(45, 93%, 47%, 1);
  --cal-bg-visualization-6-subtle: hsla(34, 100%, 92%, 1); --cal-bg-visualization-6-emphasis: hsla(25, 95%, 53%, 1);
  --cal-bg-visualization-7-subtle: hsla(0, 96%, 89%, 1); --cal-bg-visualization-7-emphasis: hsla(0, 84%, 60%, 1);
  --cal-bg-info: hsla(221, 91%, 93%, 1); --cal-bg-success: hsla(142, 76%, 94%, 1);
  --cal-bg-attention: hsla(33, 100%, 92%, 1); --cal-bg-error: hsla(3, 66%, 93%, 1);
  --cal-bg-dark-error: hsla(2, 55%, 30%, 1);
  --cal-border-emphasis: hsla(218, 11%, 65%, 1); --cal-border: hsla(216, 12%, 84%, 1);
  --cal-border-subtle: hsla(220, 13%, 91%, 1); --cal-border-muted: hsla(220, 14%, 94%, 1);
  --cal-border-error: hsla(0, 96%, 89%, 1); --cal-border-semantic-error: hsla(0, 96%, 89%, 1);
  --cal-border-booker: var(--cal-border-subtle);
  --cal-text-emphasis: hsla(210, 30%, 4%, 1); --cal-text: hsla(220, 6%, 25%, 1);
  --cal-text-subtle: hsla(220, 9%, 46%, 1); --cal-text-muted: hsla(218, 11%, 65%, 1);
  --cal-text-inverted: hsla(0, 0%, 100%, 1);
  --cal-text-semantic-info: hsla(236, 80%, 25%, 1); --cal-text-semantic-success: hsla(150, 84%, 22%, 1);
  --cal-text-semantic-attention: hsla(15, 79%, 34%, 1); --cal-text-semantic-error: hsla(0, 63%, 24%, 1);
  --cal-text-visualization-1: hsla(332, 79%, 25%, 1); --cal-text-visualization-2: hsla(270, 91%, 25%, 1);
  --cal-text-visualization-3: hsla(217, 91%, 25%, 1); --cal-text-visualization-4: hsla(142, 71%, 25%, 1);
  --cal-text-visualization-5: hsla(45, 93%, 25%, 1); --cal-text-visualization-6: hsla(24, 95%, 25%, 1);
  --cal-text-visualization-7: hsla(0, 84%, 25%, 1);
  --cal-border-semantic-attention-subtle: hsla(32, 98%, 83%, 1);
  --cal-border-semantic-error-subtle: hsla(0, 96%, 89%, 1);
  --cal-text-info: hsla(225, 57%, 33%, 1); --cal-text-success: hsla(144, 34%, 24%, 1);
  --cal-text-attention: hsla(16, 62%, 28%, 1); --cal-text-error: hsla(0, 63%, 31%, 1);
  --cal-brand: hsla(221, 39%, 11%, 1); --cal-brand-emphasis: hsla(0, 0%, 6%, 1);
  --cal-brand-text: hsla(0, 0%, 100%, 1);
}`;
}

function darkVars(): string {
  const selectors = EMBED_TARGETS.map((t) => `${t}.${ThemeClasses.DARK}`).join(",");
  return `
${selectors} {
  --cal-bg-emphasis: hsla(0, 0%, 25%, 1); --cal-bg: hsla(0, 0%, 6%, 1);
  --cal-bg-subtle: hsla(0, 0%, 15%, 1); --cal-bg-muted: hsla(0, 0%, 9%, 1);
  --cal-bg-inverted: hsla(0, 0%, 98%, 1);
  --cal-bg-primary: hsla(0, 0%, 96%, 1); --cal-bg-primary-emphasis: hsla(0, 0%, 64%, 1);
  --cal-bg-primary-muted: hsla(0, 0%, 15%, 1);
  --cal-bg-brand: hsla(0, 0%, 98%, 1); --cal-bg-brand-emphasis: hsla(0, 0%, 96%, 1);
  --cal-bg-brand-muted: hsla(0, 0%, 96%, 1);
  --cal-bg-semantic-info-subtle: hsla(236, 80%, 8%, 1); --cal-bg-semantic-info-emphasis: hsla(229, 90%, 74%, 1);
  --cal-bg-semantic-success-subtle: hsla(148, 88%, 16%, 1); --cal-bg-semantic-success-emphasis: hsla(158, 74%, 38%, 1);
  --cal-bg-semantic-attention-subtle: hsla(21, 86%, 8%, 1); --cal-bg-semantic-attention-emphasis: hsla(27, 96%, 61%, 1);
  --cal-bg-semantic-error-subtle: hsla(0, 70%, 8%, 1); --cal-bg-semantic-error-emphasis: hsla(0, 91%, 71%, 1);
  --cal-bg-visualization-1-subtle: hsla(336, 74%, 35%, 1); --cal-bg-visualization-1-emphasis: hsla(330, 81%, 60%, 1);
  --cal-bg-visualization-2-subtle: hsla(252, 83%, 23%, 1); --cal-bg-visualization-2-emphasis: hsla(256, 85%, 57%, 1);
  --cal-bg-visualization-3-subtle: hsla(236, 74%, 35%, 1); --cal-bg-visualization-3-emphasis: hsla(235, 100%, 63%, 1);
  --cal-bg-visualization-4-subtle: hsla(150, 84%, 22%, 1); --cal-bg-visualization-4-emphasis: hsla(158, 74%, 38%, 1);
  --cal-bg-visualization-5-subtle: hsla(28, 73%, 26%, 1); --cal-bg-visualization-5-emphasis: hsla(45, 93%, 47%, 1);
  --cal-bg-visualization-6-subtle: hsla(15, 75%, 23%, 1); --cal-bg-visualization-6-emphasis: hsla(25, 95%, 53%, 1);
  --cal-bg-visualization-7-subtle: hsla(0, 70%, 35%, 1); --cal-bg-visualization-7-emphasis: hsla(0, 84%, 60%, 1);
  --cal-bg-info: hsla(228, 56%, 33%, 1); --cal-bg-success: hsla(133, 34%, 24%, 1);
  --cal-bg-attention: hsla(16, 62%, 28%, 1); --cal-bg-error: hsla(2, 55%, 30%, 1);
  --cal-bg-dark-error: hsla(2, 55%, 30%, 1);
  --cal-border: hsla(0, 0%, 30%, 1); --cal-border-muted: hsla(0, 0%, 9%, 1);
  --cal-border-subtle: hsla(0, 0%, 15%, 1); --cal-border-emphasis: hsla(0, 0%, 45%, 1);
  --cal-border-booker: var(--cal-border-subtle);
  --cal-border-semantic-error: hsla(0, 63%, 24%, 1);
  --cal-border-semantic-attention-subtle: hsla(15, 75%, 23%, 1);
  --cal-border-semantic-error-subtle: hsla(0, 63%, 24%, 1);
  --cal-border-error: hsla(0, 63%, 24%, 1);
  --cal-text-emphasis: hsla(0, 0%, 98%, 1); --cal-text: hsla(0, 0%, 83%, 1);
  --cal-text-subtle: hsla(0, 0%, 64%, 1); --cal-text-muted: hsla(0, 0%, 64%, 1);
  --cal-text-inverted: hsla(0, 0%, 0%, 1);
  --cal-text-semantic-info: hsla(229, 90%, 74%, 1); --cal-text-semantic-success: hsla(161, 49%, 54%, 1);
  --cal-text-semantic-attention: hsla(27, 96%, 61%, 1); --cal-text-semantic-error: hsla(0, 91%, 71%, 1);
  --cal-text-semantic-info-emphasis: hsla(217, 91%, 25%, 1); --cal-text-semantic-success-emphasis: hsla(142, 71%, 25%, 1);
  --cal-text-semantic-attention-emphasis: hsla(24, 95%, 25%, 1); --cal-text-semantic-error-emphasis: hsla(0, 84%, 25%, 1);
  --cal-text-info: hsla(218, 83%, 93%, 1); --cal-text-success: hsla(134, 76%, 94%, 1);
  --cal-text-attention: hsla(37, 86%, 92%, 1); --cal-text-error: hsla(3, 66%, 93%, 1);
  --cal-brand: hsla(0, 0%, 100%, 1); --cal-brand-emphasis: hsla(218, 11%, 65%, 1);
  --cal-brand-text: hsla(0, 0%, 0%, 1);
}`;
}

export function injectAppCssVars(): void {
  try {
    const el = document.createElement("style");
    el.id = "cal-css-vars";
    el.textContent = lightVars() + darkVars();
    document.head.appendChild(el);
  } catch (e) {
    console.error("Error adding app css vars - Report this issue to support", e);
  }
}
