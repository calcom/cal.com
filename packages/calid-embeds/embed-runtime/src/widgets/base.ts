import {
  ThemeClasses,
  toThemeClass,
  effectiveLayout,
  isExplicitTheme,
  addDarkSchemeListener,
  removeDarkSchemeListener,
  modalMaxHeight,
} from "../theming/color";
import type { ThemeOption, LayoutOption, PageKind } from "../types/shared";

type ShadowWithHost = ShadowRoot & { host: HTMLElement & { style: CSSStyleDeclaration } };

type SkeletonProvider = (args: { layout: LayoutOption; pageKind: PageKind | null }) => {
  skeletonContent: string;
  skeletonContainerStyle: string;
  skeletonStyle: string;
};

function requireEl<T extends HTMLElement>(root: ShadowRoot, sel: string, label: string): T {
  const el = root.querySelector<T>(sel);
  if (!el) throw new Error(`No ${label} element`);
  return el;
}

export class EmbedWidgetBase extends HTMLElement {
  public userTheme!: ThemeOption | null;
  public isModal!: boolean;
  public skeletonTimer: number | null = null;
  public currentThemeClass!: string;
  public currentLayout!: LayoutOption;
  public skeletonProvider!: SkeletonProvider;

  private resizeHandler: () => void;
  private darkSchemeHandler: (e: MediaQueryListEvent) => void;

  public assertShadow(): asserts this is HTMLElement & { shadowRoot: ShadowWithHost } {
    if (!this.shadowRoot) throw new Error("No shadow root");
  }

  public getPageKind(): PageKind | undefined {
    return this.dataset.pageType as PageKind | undefined;
  }

  public getLayout(): LayoutOption {
    return effectiveLayout((this.dataset.layout as any) ?? null);
  }

  private supportsSkeleton(): boolean {
    return !!this.getPageKind();
  }

  getSkeletonContainer(): HTMLElement {
    this.assertShadow();
    return requireEl(this.shadowRoot, "#skeleton-container", "skeleton container");
  }

  getSkeletonEl(): HTMLElement {
    this.assertShadow();
    return requireEl(this.shadowRoot, "#skeleton", "skeleton");
  }

  getLoaderEl(): HTMLElement {
    this.assertShadow();
    return requireEl(this.shadowRoot, ".loader", "loader");
  }

  private syncSkeletonHeight(): void {
    const sk = this.getSkeletonEl();
    const container = this.getSkeletonContainer();
    const h = parseFloat(getComputedStyle(sk).height);

    if (this.isModal) {
      if (h) {
        container.style.maxHeight = `${modalMaxHeight()}px`;
        container.style.height = `${h}px`;
      } else {
        container.style.height = "";
        container.style.maxHeight = "";
        return;
      }
    } else {
      const base = 300;
      const overflow = h - base;
      if (h) {
        if (overflow > 0) container.style.height = `${overflow}px`;
      } else {
        container.style.height = "";
        return;
      }
    }

    this.skeletonTimer = requestAnimationFrame(this.syncSkeletonHeight.bind(this));
  }

  public toggleLoader(visible: boolean): void {
    const sk = this.getSkeletonEl();
    const loader = this.getLoaderEl();
    const container = this.getSkeletonContainer();
    const hasSkeleton = this.supportsSkeleton();

    if (!hasSkeleton) {
      loader.style.display = visible ? "block" : "none";
      sk.style.display = "none";
    } else {
      sk.style.display = visible ? "block" : "none";
      loader.style.display = "none";
      if (!this.isModal && !visible) container.style.display = "none";
    }

    this.syncSkeletonHeight();
  }

  public isSkeletonVisible(): boolean {
    return this.getSkeletonEl().style.display !== "none";
  }

  public applyTheme(theme: ThemeOption | null): void {
    const cls = toThemeClass(theme);
    if (cls === this.currentThemeClass) return;
    this.currentThemeClass = cls;
    this.classList.remove(ThemeClasses.DARK, ThemeClasses.LIGHT);
    this.classList.add(cls);
  }

  private onDarkChange(e: MediaQueryListEvent): void {
    if (isExplicitTheme(this.userTheme)) return;
    this.applyTheme(e.matches ? "dark" : "light");
  }

  private onResize(): void {
    const newLayout = effectiveLayout(this.currentLayout ?? null);
    if (newLayout === this.currentLayout) return;
    this.currentLayout = newLayout;

    if (!this.isSkeletonVisible()) return;

    const { skeletonContent, skeletonContainerStyle, skeletonStyle } = this.skeletonProvider({
      layout: this.getLayout(),
      pageKind: this.getPageKind() ?? null,
    });

    const container = this.getSkeletonContainer();
    const sk = this.getSkeletonEl();
    container.setAttribute("style", skeletonContainerStyle);
    sk.setAttribute("style", skeletonStyle);
    sk.innerHTML = skeletonContent;
  }

  constructor(opts: { modal: boolean; skeletonProvider: SkeletonProvider }) {
    super();
    if (process.env.INTEGRATION_TEST_MODE) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Object.assign(this.dataset, (opts as any).dataset);
    }
    this.isModal = opts.modal;
    this.currentLayout = this.getLayout();
    this.userTheme = this.dataset.theme as ThemeOption | null;
    this.applyTheme(this.userTheme);
    this.skeletonProvider = opts.skeletonProvider;
    this.resizeHandler = this.onResize.bind(this);
    this.darkSchemeHandler = this.onDarkChange.bind(this);
  }

  connectedCallback(): void {
    this.toggleLoader(true);
    window.addEventListener("resize", this.resizeHandler);
    addDarkSchemeListener(this.darkSchemeHandler);
  }

  disconnectedCallback(): void {
    if (this.skeletonTimer) cancelAnimationFrame(this.skeletonTimer);
    window.removeEventListener("resize", this.resizeHandler);
    removeDarkSchemeListener(this.darkSchemeHandler);
  }
}
