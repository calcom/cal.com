import type { EmbedThemeConfig, AllPossibleLayouts, BookerLayouts, EmbedPageType } from "./types";
import {
  getThemeClassForEmbed,
  getTrueLayout,
  isThemePreferenceProvided,
  removeDarkColorSchemeChangeListener,
  addDarkColorSchemeChangeListener,
  getMaxHeightForModal,
} from "./ui-utils";

type ShadowRootWithStyle = ShadowRoot & {
  host: HTMLElement & { style: CSSStyleDeclaration };
};

export class EmbedElement extends HTMLElement {
  // Theme is set once by the user
  public theme!: EmbedThemeConfig | null;
  public isModal!: boolean;
  public skeletonContainerHeightTimer: number | null = null;
  // Theme Class is derived from `this.theme` as well as system color scheme preference
  public themeClass!: string;
  public layout!: AllPossibleLayouts;
  public getSkeletonData!: (_args: { layout: AllPossibleLayouts; pageType: EmbedPageType | null }) => {
    skeletonContent: string;
    skeletonContainerStyle: string;
    skeletonStyle: string;
  };

  private boundResizeHandler: () => void;
  private boundPrefersDarkThemeChangedHandler: (e: MediaQueryListEvent) => void;
  private isSkeletonSupportedPageType() {
    const pageType = this.getPageType();
    return (
      pageType === "user.event.booking.slots" ||
      pageType === "team.event.booking.slots" ||
      pageType === "user.event.booking.form" ||
      pageType === "team.event.booking.form"
    );
  }
  public assertHasShadowRoot(): asserts this is HTMLElement & { shadowRoot: ShadowRootWithStyle } {
    if (!this.shadowRoot) {
      throw new Error("No shadow root");
    }
  }

  public getPageType(): EmbedPageType {
    return this.dataset.pageType as EmbedPageType;
  }
  public getLayout(): AllPossibleLayouts {
    return getTrueLayout({ layout: (this.dataset.layout as BookerLayouts | undefined) ?? null });
  }

  getSkeletonContainerElement(): HTMLElement {
    this.assertHasShadowRoot();
    const element = this.shadowRoot.querySelector<HTMLElement>("#skeleton-container");
    if (!element) {
      throw new Error("No skeleton container element");
    }
    return element;
  }

  getSkeletonElement(): HTMLElement {
    this.assertHasShadowRoot();
    const element = this.shadowRoot.querySelector<HTMLElement>("#skeleton");
    if (!element) {
      throw new Error("No skeleton element");
    }
    return element;
  }

  private ensureContainerTakesSkeletonHeightWhenVisible() {
    const skeletonEl = this.getSkeletonElement();
    const skeletonContainerEl = this.getSkeletonContainerElement();
    const isModal = this.isModal;
    // skeletonEl is absolute positioned, so, we manually adjust the height of the Skeleton Container, so that the content around it doesn't do layout shift when actual iframe appears in its place
    const heightOfSkeleton = parseFloat(getComputedStyle(skeletonEl).height);
    if (isModal) {
      const skeletonContainerContainingIframeToo = skeletonContainerEl;
      if (heightOfSkeleton) {
        // maxHeight need to be set only if skeleton inside the container is visible
        skeletonContainerContainingIframeToo.style.maxHeight = `${getMaxHeightForModal()}px`;
        skeletonContainerContainingIframeToo.style.height = `${heightOfSkeleton}px`;
      } else {
        // Reset props and be done with requestAnimationFrame
        skeletonContainerContainingIframeToo.style.height = "";
        skeletonContainerContainingIframeToo.style.maxHeight = "";
        return;
      }
    } else {
      const skeletonContainerNotContainingIframe = skeletonContainerEl;
      const heightOfIframeByDefault = 300;
      const diff = heightOfSkeleton - heightOfIframeByDefault;
      if (heightOfSkeleton) {
        if (diff > 0) {
          // Skeleton is positioned overlapping the iframe(hidden with height of 300px already) so we add to container height only the difference
          skeletonContainerNotContainingIframe.style.height = `${diff}px`;
        }
      } else {
        // We will be here when skeleton is display:none
        // Reset height - and be done with requestAnimationFrame
        skeletonContainerNotContainingIframe.style.height = "";
        return;
      }
    }
    const rafId = requestAnimationFrame(this.ensureContainerTakesSkeletonHeightWhenVisible.bind(this));
    this.skeletonContainerHeightTimer = rafId;
    return rafId;
  }

  getLoaderElement(): HTMLElement {
    this.assertHasShadowRoot();
    const loaderEl = this.shadowRoot.querySelector<HTMLElement>(".loader");

    if (!loaderEl) {
      throw new Error("No loader element");
    }

    return loaderEl;
  }

  public toggleLoader(show: boolean) {
    const skeletonEl = this.getSkeletonElement();

    const loaderEl = this.getLoaderElement();
    const skeletonContainerEl = this.getSkeletonContainerElement();
    const supportsSkeleton = this.isSkeletonSupportedPageType();

    if (!supportsSkeleton) {
      loaderEl.style.display = show ? "block" : "none";
      skeletonEl.style.display = "none";
    } else {
      skeletonEl.style.display = show ? "block" : "none";
      loaderEl.style.display = "none";
      if (!this.isModal && !show) {
        const skeletonContainerNotContainingIframe = skeletonContainerEl;
        // In non-modal layout, skeletonContainerEl is static positioned before the slot(i.e. iframe) and it takes space even if its content is hidden. So, we explicitly set display to none
        // Also, it doesn't contain anything other than skeleton, so it is safe to set display to none
        skeletonContainerNotContainingIframe.style.display = "none";
      }
    }
    this.ensureContainerTakesSkeletonHeightWhenVisible();
  }

  constructor(data: {
    isModal: boolean;
    getSkeletonData: (_args: { layout: AllPossibleLayouts; pageType: EmbedPageType | null }) => {
      skeletonContent: string;
      skeletonContainerStyle: string;
      skeletonStyle: string;
    };
  }) {
    super();
    if (process.env.INTEGRATION_TEST_MODE) {
      // @ts-expect-error - Integration test mode
      Object.assign(this.dataset, data.dataset);
    }
    this.isModal = data.isModal;
    this.layout = this.getLayout();
    this.theme = this.dataset.theme as EmbedThemeConfig | null;
    this.themeClass = getThemeClassForEmbed({ theme: this.theme });
    this.classList.add(this.themeClass);

    this.getSkeletonData = data.getSkeletonData;
    this.boundResizeHandler = this.resizeHandler.bind(this);
    this.boundPrefersDarkThemeChangedHandler = this.prefersDarkThemeChangedHandler.bind(this);
  }

  public resizeHandler() {
    const newLayout = getTrueLayout({ layout: this.layout ?? null });
    if (newLayout === this.layout) {
      return;
    }
    this.layout = newLayout;
    const { skeletonContent, skeletonContainerStyle, skeletonStyle } = this.getSkeletonData({
      layout: this.getLayout(),
      pageType: this.getPageType() ?? null,
    });

    const skeletonContainerEl = this.getSkeletonContainerElement();
    const skeletonEl = this.getSkeletonElement();

    skeletonContainerEl.setAttribute("style", skeletonContainerStyle);
    skeletonEl.setAttribute("style", skeletonStyle);

    skeletonEl.innerHTML = skeletonContent;
  }

  public prefersDarkThemeChangedHandler(e: MediaQueryListEvent) {
    const isDarkPreferred = e.matches;
    const allPossibleThemeClasses = ["dark", "light"];
    if (isThemePreferenceProvided(this.theme)) {
      // User has provided a theme preference, so we stick to that and don't react to system theme change
      return;
    }
    const newThemeClass = getThemeClassForEmbed({
      theme: isDarkPreferred ? "dark" : "light",
    });
    if (newThemeClass !== this.themeClass) {
      this.classList.remove(...allPossibleThemeClasses);
      this.classList.add(newThemeClass);
    }
  }
  connectedCallback() {
    // Make sure to show the loader initially.
    // toggleLoader takes care of deciding which loader default/skeleton to be shown
    this.toggleLoader(true);
    window.addEventListener("resize", this.boundResizeHandler);
    addDarkColorSchemeChangeListener(this.boundPrefersDarkThemeChangedHandler);
  }

  disconnectedCallback() {
    if (this.skeletonContainerHeightTimer) {
      cancelAnimationFrame(this.skeletonContainerHeightTimer);
    }
    window.removeEventListener("resize", this.boundResizeHandler);
    removeDarkColorSchemeChangeListener(this.boundPrefersDarkThemeChangedHandler);
  }
}
