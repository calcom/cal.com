import { EMBED_DARK_THEME_CLASS } from "./constants";

export const addAppCssVars = () => {
  const calElements = ["cal-floating-button", "cal-modal-box", "cal-inline"];
  try {
    const cssVarsStyle = `
    ${calElements.join(",")} {
    /* Spacing Scale */
    --cal-spacing-0: 0px;
    --cal-spacing-px: 1px;
    --cal-spacing-0_5: 0.125rem; /* 2px */
    --cal-spacing-1: 0.25rem;   /* 4px */
    --cal-spacing-1_5: 0.375rem; /* 6px */
    --cal-spacing-2: 0.5rem;    /* 8px */
    --cal-spacing-2_5: 0.625rem; /* 10px */
    --cal-spacing-3: 0.75rem;   /* 12px */
    --cal-spacing-3_5: 0.875rem; /* 14px */
    --cal-spacing-4: 1rem;      /* 16px */
    --cal-spacing-5: 1.25rem;   /* 20px */
    --cal-spacing-6: 1.5rem;    /* 24px */
    --cal-spacing-7: 1.75rem;   /* 28px */
    --cal-spacing-8: 2rem;      /* 32px */
    --cal-spacing-9: 2.25rem;   /* 36px */
    --cal-spacing-10: 2.5rem;   /* 40px */
    --cal-spacing-11: 2.75rem;  /* 44px */
    --cal-spacing-12: 3rem;     /* 48px */
    --cal-spacing-14: 3.5rem;   /* 56px */
    --cal-spacing-16: 4rem;     /* 64px */
    --cal-spacing-20: 5rem;     /* 80px */
    --cal-spacing-24: 6rem;     /* 96px */
    --cal-spacing-28: 7rem;     /* 112px */
    --cal-spacing-32: 8rem;     /* 128px */
    --cal-spacing-36: 9rem;     /* 144px */
    --cal-spacing-40: 10rem;    /* 160px */
    --cal-spacing-44: 11rem;    /* 176px */
    --cal-spacing-48: 12rem;    /* 192px */
    --cal-spacing-52: 13rem;    /* 208px */
    --cal-spacing-56: 14rem;    /* 224px */
    --cal-spacing-60: 15rem;    /* 240px */
    --cal-spacing-64: 16rem;    /* 256px */
    --cal-spacing-72: 18rem;    /* 288px */
    --cal-spacing-80: 20rem;    /* 320px */
    --cal-spacing-96: 24rem;    /* 384px */
  
    /* Border Radius */
    --cal-radius-none: 0px;
    --cal-radius-sm: 0.125rem;  /* 2px */
    --cal-radius: 0.25rem;      /* 4px */
    --cal-radius-md: 0.375rem;  /* 6px */
    --cal-radius-lg: 0.5rem;    /* 8px */
    --cal-radius-xl: 0.75rem;   /* 12px */
    --cal-radius-2xl: 1rem;     /* 16px */
    --cal-radius-3xl: 1.5rem;   /* 24px */
    --cal-radius-full: 9999px;
  
    /* Background Standard */
    --cal-bg-emphasis: hsla(220, 13%, 91%, 1); /* gray.200 - active items and emphasising */
    --cal-bg: hsla(0, 0%, 100%, 1); /* white - default background */
    --cal-bg-subtle: hsla(220, 14%, 94%, 1); /* gray.100 - hovering on items, subtle raising */
    --cal-bg-muted: hsla(210, 20%, 97%, 1); /* gray.50 - large items, sidebar, sections */
    --cal-bg-inverted: hsla(210, 30%, 4%, 1); /* gray.900 - tooltips */
  
    /* Background Primary */
    --cal-bg-primary: hsla(214, 30%, 16%, 1); /* stone-100 */
    --cal-bg-primary-emphasis: hsla(220, 6%, 25%, 1); /* stone-800 */
    --cal-bg-primary-muted: hsla(220, 14%, 94%, 1); /* stone-400 */
  
    /* Background Brand */
    --cal-bg-brand: hsla(214, 30%, 16%, 1); /* gray-50 */
    --cal-bg-brand-emphasis: hsla(220, 6%, 25%, 1); /* stone-100 */
    --cal-bg-brand-muted: hsla(220, 14%, 94%, 1); /* stone-100 */
    
    /* Background Semantic */
    --cal-bg-semantic-info-subtle: hsla(212, 88%, 97%, 1); /* blue-100 */
    --cal-bg-semantic-info-emphasis: hsla(236, 80%, 25%, 1); /* blue-500 */
    --cal-bg-semantic-success-subtle: hsla(167, 54%, 93%, 1); /* green-100 */
    --cal-bg-semantic-success-emphasis: hsla(158, 74%, 38%, 1); /* green-500 */
    --cal-bg-semantic-attention-subtle: hsla(34, 100%, 92%, 1); /* orange-100 */
    --cal-bg-semantic-attention-emphasis: hsla(15, 79%, 34%, 1); /* orange-500 */
    --cal-bg-semantic-error-subtle: hsla(0, 93%, 94%, 1); /* red-100 */
    --cal-bg-semantic-error-emphasis: hsla(0, 63%, 24%, 1); /* red-500 */
  
    /* Background Visualization */
    --cal-bg-visualization-1-subtle: hsla(326, 78%, 95%, 1); /* pink-100 */
    --cal-bg-visualization-1-emphasis: hsla(330, 81%, 60%, 1); /* pink-500 */
    --cal-bg-visualization-2-subtle: hsla(256, 86%, 91%, 1); /* purple-100 */
    --cal-bg-visualization-2-emphasis: hsla(256, 85%, 57%, 1); /* purple-500 */
    --cal-bg-visualization-3-subtle: hsla(217, 87%, 91%, 1); /* blue-100 */
    --cal-bg-visualization-3-emphasis: hsla(235, 100%, 63%, 1); /* blue-500 */
    --cal-bg-visualization-4-subtle: hsla(167, 54%, 93%, 1); /* green-100 */
    --cal-bg-visualization-4-emphasis: hsla(158, 74%, 38%, 1); /* green-500 */
    --cal-bg-visualization-5-subtle: hsla(55, 97%, 88%, 1); /* yellow-100 */
    --cal-bg-visualization-5-emphasis: hsla(45, 93%, 47%, 1); /* yellow-500 */
    --cal-bg-visualization-6-subtle: hsla(34, 100%, 92%, 1); /* orange-100 */
    --cal-bg-visualization-6-emphasis: hsla(25, 95%, 53%, 1); /* orange-500 */
    --cal-bg-visualization-7-subtle: hsla(0, 96%, 89%, 1); /* red-100 */
    --cal-bg-visualization-7-emphasis: hsla(0, 84%, 60%, 1); /* red-500 */
  
    /* Legacy Background Components - Consider deprecating */
    --cal-bg-info: hsla(221, 91%, 93%, 1); /* #dee9fc - info backgrounds */
    --cal-bg-success: hsla(142, 76%, 94%, 1); /* #e2fbe8 - success backgrounds */
    --cal-bg-attention: hsla(33, 100%, 92%, 1); /* #fceed8 - attention backgrounds */
    --cal-bg-error: hsla(3, 66%, 93%, 1); /* #f9e3e2 - error backgrounds */
    --cal-bg-dark-error: hsla(2, 55%, 30%, 1); /* Keeping existing dark error */
  
    /* Borders */
    --cal-border-emphasis: hsla(218, 11%, 65%, 1); /* gray.400 - input:hover */
    --cal-border: hsla(216, 12%, 84%, 1); /* gray.300 - inputs */
    --cal-border-subtle: hsla(220, 13%, 91%, 1); /* gray.200 - container borders */
    --cal-border-muted: hsla(220, 14%, 94%, 1); /* gray.100 */
    --cal-border-error: hsla(0, 96%, 89%, 1); /* Keeping existing error border */
    --cal-border-semantic-error: hsla(0, 96%, 89%, 1);
    --cal-border-booker: var(--cal-border-subtle);
  
    /* Content/Text Standard */
    --cal-text-emphasis: hsla(210, 30%, 4%, 1); /* gray-900 */
    --cal-text: hsla(220, 6%, 25%, 1); /* gray-700 */
    --cal-text-subtle: hsla(220, 9%, 46%, 1); /* gray-500 */
    --cal-text-muted: hsla(218, 11%, 65%, 1); /* gray-400 */
    --cal-text-inverted: hsla(0, 0%, 100%, 1); /* white */
  
    /* Content/Text Semantic */
    --cal-text-semantic-info: hsla(236, 80%, 25%, 1); /* blue-800 */
    --cal-text-semantic-success: hsla(150, 84%, 22%, 1); /* green-800 */
    --cal-text-semantic-attention: hsla(15, 79%, 34%, 1); /* orange-800 */
    --cal-text-semantic-error: hsla(0, 63%, 24%, 1); /* red-800 */
  
    /* Content/Text Visualization */
    --cal-text-visualization-1: hsla(332, 79%, 25%, 1); /* pink-800 */
    --cal-text-visualization-2: hsla(270, 91%, 25%, 1); /* purple-800 */
    --cal-text-visualization-3: hsla(217, 91%, 25%, 1); /* blue-800 */
    --cal-text-visualization-4: hsla(142, 71%, 25%, 1); /* green-800 */
    --cal-text-visualization-5: hsla(45, 93%, 25%, 1); /* yellow-800 */
    --cal-text-visualization-6: hsla(24, 95%, 25%, 1); /* orange-800 */
    --cal-text-visualization-7: hsla(0, 84%, 25%, 1); /* red-800 */
  
    /* Border/Semantic Subtle */
    --cal-border-semantic-attention-subtle: hsla(32, 98%, 83%, 1); 
    --cal-border-semantic-error-subtle: hsla(0, 96%, 89%, 1); 
  
    /* Legacy Content/Text Components - Consider deprecating */
    --cal-text-info: hsla(225, 57%, 33%, 1); /* #253985 - interactive text/icons */
    --cal-text-success: hsla(144, 34%, 24%, 1); /* #285231 */
    --cal-text-attention: hsla(16, 62%, 28%, 1); /* Keeping existing attention text */
    --cal-text-error: hsla(0, 63%, 31%, 1); /* Keeping existing error text */
  
    /* Brand */
    --cal-brand: hsla(221, 39%, 11%, 1); /* Keeping existing brand color */
    --cal-brand-emphasis: hsla(0, 0%, 6%, 1); /* Keeping existing brand emphasis */
    --cal-brand-text: hsla(0, 0%, 100%, 1); /* white */
  }
  
  ${calElements.map((element) => `${element}.${EMBED_DARK_THEME_CLASS}`).join(",")} {
  /* Background Standard */
  --cal-bg-emphasis: hsla(0, 0%, 25%, 1); /* stone-700 */
  --cal-bg: hsla(0, 0%, 6%, 1); /* stone-950 */
  --cal-bg-subtle: hsla(0, 0%, 15%, 1); /* stone-800 */
  --cal-bg-muted: hsla(0, 0%, 9%, 1); /* stone-900 */
  --cal-bg-inverted: hsla(0, 0%, 98%, 1); /* stone-50 */

  /* Background Primary */
  --cal-bg-primary: hsla(0, 0%, 96%, 1); /* stone-100 */
  --cal-bg-primary-emphasis: hsla(0, 0%, 64%, 1); /* stone-800 */
  --cal-bg-primary-muted: hsla(0, 0%, 15%, 1); /* stone-400 */

  /* Background Brand */
  --cal-bg-brand: hsla(0, 0%, 98%, 1); /* gray-50 */
  --cal-bg-brand-emphasis: hsla(0, 0%, 96%, 1); /* stone-100 */
  --cal-bg-brand-muted: hsla(0, 0%, 96%, 1); /* stone-100 */

  /* Background Semantic */
  --cal-bg-semantic-info-subtle: hsla(236, 80%, 8%, 1); /* blue-800 */
  --cal-bg-semantic-info-emphasis: hsla(229, 90%, 74%, 1); /* blue-500 */
  --cal-bg-semantic-success-subtle: hsla(148, 88%, 16%, 1); /* green-800 */
  --cal-bg-semantic-success-emphasis: hsla(158, 74%, 38%, 1); /* green-500 */
  --cal-bg-semantic-attention-subtle: hsla(21, 86%, 8%, 1); /* orange-800 */
  --cal-bg-semantic-attention-emphasis: hsla(27, 96%, 61%, 1); /* orange-500 */
  --cal-bg-semantic-error-subtle: hsla(0, 70%, 8%, 1); /* red-800 */
  --cal-bg-semantic-error-emphasis: hsla(0, 91%, 71%, 1); /* red-500 */

  /* Background Visualization */
  --cal-bg-visualization-1-subtle: hsla(336, 74%, 35%, 1); /* pink-200 */
  --cal-bg-visualization-1-emphasis: hsla(330, 81%, 60%, 1); /* pink-500 */
  --cal-bg-visualization-2-subtle: hsla(252, 83%, 23%, 1); /* purple-200 */
  --cal-bg-visualization-2-emphasis: hsla(256, 85%, 57%, 1); /* purple-500 */
  --cal-bg-visualization-3-subtle: hsla(236, 74%, 35%, 1); /* blue-200 */
  --cal-bg-visualization-3-emphasis: hsla(235, 100%, 63%, 1); /* blue-500 */
  --cal-bg-visualization-4-subtle: hsla(150, 84%, 22%, 1); /* green-200 */
  --cal-bg-visualization-4-emphasis: hsla(158, 74%, 38%, 1); /* green-500 */
  --cal-bg-visualization-5-subtle: hsla(28, 73%, 26%, 1); /* yellow-200 */
  --cal-bg-visualization-5-emphasis: hsla(45, 93%, 47%, 1); /* yellow-500 */
  --cal-bg-visualization-6-subtle: hsla(15, 75%, 23%, 1); /* orange-200 */
  --cal-bg-visualization-6-emphasis: hsla(25, 95%, 53%, 1); /* orange-500 */
  --cal-bg-visualization-7-subtle: hsla(0, 70%, 35%, 1); /* red-200 */
  --cal-bg-visualization-7-emphasis: hsla(0, 84%, 60%, 1); /* red-500 */

  /* Legacy Background Components - Consider deprecating */
  --cal-bg-info: hsla(228, 56%, 33%, 1); /* Keeping existing info background */
  --cal-bg-success: hsla(133, 34%, 24%, 1); /* Keeping existing success background */
  --cal-bg-attention: hsla(16, 62%, 28%, 1); /* Keeping existing attention background */
  --cal-bg-error: hsla(2, 55%, 30%, 1); /* Keeping existing error background */
  --cal-bg-dark-error: hsla(2, 55%, 30%, 1); /* Keeping existing dark error */

  /* Border Standard */
  --cal-border: hsla(0, 0%, 30%, 1); /* stone-600 */
  --cal-border-muted: hsla(0, 0%, 9%, 1); /* stone-500 */
  --cal-border-subtle: hsla(0, 0%, 15%, 1); /* stone-700 */
  --cal-border-emphasis: hsla(0, 0%, 45%, 1); /* stone-800 */
  --cal-border-booker: var(--cal-border-subtle);
  /* Border Semantic */
  --cal-border-semantic-error: hsla(0, 63%, 24%, 1); /* red-800 */

  /* Border/Semantic Subtle */
  --cal-border-semantic-attention-subtle: hsla(15, 75%, 23%, 1);
  --cal-border-semantic-error-subtle: hsla(0, 63%, 24%, 1);

  /* Legacy Border - Consider deprecating */
  --cal-border-error: hsla(0, 63%, 24%, 1); /* Keeping existing error border */

  /* Content/Text Standard */
  --cal-text-emphasis: hsla(0, 0%, 98%, 1); /* stone-50 */
  --cal-text: hsla(0, 0%, 83%, 1); /* stone-300 */
  --cal-text-subtle: hsla(0, 0%, 64%, 1); /* stone-400 */
  --cal-text-muted: hsla(0, 0%, 64%, 1); /* stone-400 */
  --cal-text-inverted: hsla(0, 0%, 0%, 1); /* black */

  /* Content/Text Semantic */
  --cal-text-semantic-info: hsla(229, 90%, 74%, 1); /* blue-100 */
  --cal-text-semantic-success: hsla(161, 49%, 54%, 1); /* green-100 */
  --cal-text-semantic-attention: hsla(27, 96%, 61%, 1); /* orange-100 */
  --cal-text-semantic-error: hsla(0, 91%, 71%, 1); /* red-100 */

  /* Content/Text Semantic Emphasis */
  --cal-text-semantic-info-emphasis: hsla(217, 91%, 25%, 1); /* blue-800 */
  --cal-text-semantic-success-emphasis: hsla(142, 71%, 25%, 1); /* green-800 */
  --cal-text-semantic-attention-emphasis: hsla(24, 95%, 25%, 1); /* orange-800 */
  --cal-text-semantic-error-emphasis: hsla(0, 84%, 25%, 1); /* red-800 */

  /* Legacy Content/Text Components - Consider deprecating */
  --cal-text-info: hsla(218, 83%, 93%, 1); /* Keeping existing info text */
  --cal-text-success: hsla(134, 76%, 94%, 1); /* Keeping existing success text */
  --cal-text-attention: hsla(37, 86%, 92%, 1); /* Keeping existing attention text */
  --cal-text-error: hsla(3, 66%, 93%, 1); /* Keeping existing error text */

  /* Brand */
  --cal-brand: hsla(0, 0%, 100%, 1); /* white */
  --cal-brand-emphasis: hsla(218, 11%, 65%, 1); /* Keeping existing brand emphasis */
  --cal-brand-text: hsla(0, 0%, 0%, 1); /* black */
}  
  `;

    // Create a style rule for above css
    const style = document.createElement("style");
    style.id = "cal-css-vars";
    style.textContent = cssVarsStyle;
    document.head.appendChild(style);
  } catch (error) {
    console.error("Error adding app css vars - Report this issue to support", error);
  }
};
