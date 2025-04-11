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
  // Theme Class is derived from theme as well as system color scheme preference
  public themeClass!: string;
  public layout!: AllPossibleLayouts;
  public getSkeletonData!: (_args: { layout: AllPossibleLayouts; pageType: EmbedPageType | null }) => {
    skeletonContent: string;
    skeletonContainerStyle: string;
    skeletonStyle: string;
  };

  private boundResizeHandler: () => void;
  private boundPrefersDarkThemeChangedHandler: (e: MediaQueryListEvent) => void;

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
      skeletonContainerEl.style.maxHeight = `${getMaxHeightForModal()}px`;
      if (heightOfSkeleton) {
        skeletonContainerEl.style.height = `${heightOfSkeleton}px`;
      } else {
        // Reset height - and be done with requestAnimationFrame
        skeletonContainerEl.style.height = "";
        return;
      }
    } else {
      const heightOfIframeByDefault = 300;
      const diff = heightOfSkeleton - heightOfIframeByDefault;
      if (heightOfSkeleton) {
        if (diff > 0) {
          // Skeleton is positioned over the iframe(hidden with height of 300px already) so we add to container height only the difference
          skeletonContainerEl.style.height = `${diff}px`;
        }
      } else {
        // We will be here when skeleton is display:none
        // Reset height - and be done with requestAnimationFrame
        skeletonContainerEl.style.height = "";
        return;
      }
    }
    requestAnimationFrame(this.ensureContainerTakesSkeletonHeightWhenVisible.bind(this));
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
    this.ensureContainerTakesSkeletonHeightWhenVisible();

    const supportsSkeleton = !!this.getPageType();

    if (!supportsSkeleton) {
      loaderEl.style.display = show ? "block" : "none";
      skeletonEl.style.display = "none";
    } else {
      skeletonEl.style.display = show ? "block" : "none";
      loaderEl.style.display = "none";
    }
  }

  constructor({
    isModal,
    getSkeletonData,
  }: {
    isModal: boolean;
    getSkeletonData: (_args: { layout: AllPossibleLayouts; pageType: EmbedPageType | null }) => {
      skeletonContent: string;
      skeletonContainerStyle: string;
      skeletonStyle: string;
    };
  }) {
    super();
    this.isModal = isModal;
    this.layout = this.getLayout();
    this.theme = this.dataset.theme as EmbedThemeConfig | null;
    this.themeClass = getThemeClassForEmbed({ theme: this.theme });
    this.classList.add(this.themeClass);

    this.getSkeletonData = getSkeletonData;
    this.boundResizeHandler = this.resizeHandler.bind(this);
    this.boundPrefersDarkThemeChangedHandler = this.prefersDarkThemeChangedHandler.bind(this);
  }

  public resizeHandler() {
    const newLayout = getTrueLayout({ layout: this.layout ?? null });
    if (newLayout !== this.layout) {
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
    this.layout = newLayout;
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
    window.addEventListener("resize", this.boundResizeHandler);
    addDarkColorSchemeChangeListener(this.boundPrefersDarkThemeChangedHandler);
  }

  disconnectedCallback() {
    window.removeEventListener("resize", this.boundResizeHandler);
    removeDarkColorSchemeChangeListener(this.boundPrefersDarkThemeChangedHandler);
  }
}
