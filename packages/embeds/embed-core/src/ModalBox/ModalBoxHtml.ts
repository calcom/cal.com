import type { AllPossibleLayouts, EmbedPageType } from "../types";
import { generateSkeleton } from "../ui/skeleton";
import { type ExternalThemeClass, getInternalThemeClass } from "../ui/themeClass";

function getStyle() {
  return `
  <style>
    /* 
      Modal box is added as a child of the top-most element which is body(the container)
      If the container has grid layout being used. Even if the cal-modal-box is visiblity:hidden, it causes it to take up space in the grid layout
      It causes that space to keep on increasing as modal box is opened and closed repeatedly
      We set position:absolute to move it out of the regular flow of the grid layout
    */
    :host {
      position: absolute;
    }
    
    .my-backdrop {
      position:fixed;
      width:100%;
      height:100%;
      top:0;
      left:0;
      z-index:999999999999;
      display:block;
      background-color:rgb(5,5,5, 0.8)
    }

    .modal-box {
      margin:0 auto;
      margin-top:20px;
      margin-bottom:20px;
      position:absolute;
      width:100%;
      top:50%;
      left:50%;
      transform: translateY(-50%) translateX(-50%);
      overflow: auto;
    }

    .message-container {
      min-height: 200px;
      width: 600px;
    }

    .header {
      position: relative;
      float:right;
      top: 10px;
    }
    .close {
      font-size: 30px;
      left: -20px;
      position: relative;
      color:white;
      cursor: pointer;
    }
    /*Modal background is black only, so hardcode white */
    .loader {
      --cal-brand:white;
    }
  </style>
      `;
}

const html = ({
  layout = "month_view",
  pageType,
  externalThemeClass,
}: {
  layout?: AllPossibleLayouts;
  pageType: EmbedPageType | null;
  externalThemeClass: ExternalThemeClass;
}) => {
  const { skeletonContent, skeletonContainerStyle, skeletonStyle } = getSkeletonData({
    layout,
    pageType,
  });

  const themeClass = getInternalThemeClass(externalThemeClass);

  // Keep message-container outside modal-box as that restricts the content to be shown through its overflow:auto unnecessarily
  return `
${getStyle()}
<div class="my-backdrop">
  <div class="header">
    <button type="button" class="close" aria-label="Close">&times;</button>
  </div>
  <div id="message-container" style="left: 50%; top: 50%; transform: translate(-50%, -50%);" class="message-container flex items-center p-24 justify-center dark:bg-cal-muted rounded-md border-subtle border bg-default text-default  absolute z-highest">
    <div id="message"></div>
  </div>
  <div class="modal-box">
    <div class="body${themeClass ? " " + themeClass : ""}" id="skeleton-container" style="${skeletonContainerStyle}">
      <div id="wrapper" class="z-999999999999 absolute flex w-full items-center">
        <div class="loader modal-loader border-brand-default dark:border-darkmodebrand">
          <span class="loader-inner bg-brand dark:bg-darkmodebrand"></span>
        </div>
      </div>
      <div id="skeleton" style="${skeletonStyle}" class="absolute z-highest">
        ${skeletonContent}
      </div>
      <slot></slot>
    </div>
  </div>

</div>`;
};

export const getSkeletonData = ({
  layout,
  pageType,
}: {
  layout: AllPossibleLayouts;
  pageType: EmbedPageType | null;
}) => {
  const mobileStyleForSkeleton = "width:100%;";
  const desktopStyleForSkeleton = "left:50%; transform:translate(-50%,0%)";
  const styleForSkeleton = layout === "mobile" ? mobileStyleForSkeleton : desktopStyleForSkeleton;
  // height is set via JS to be same as skeleton inside it
  // Width 100% so that the entire width is available just like for iframe
  const styleForSkeletonContainer = "width:100%;";
  return {
    skeletonContent: generateSkeleton({ layout, pageType }),
    skeletonContainerStyle: styleForSkeletonContainer,
    skeletonStyle: styleForSkeleton,
  };
};
export default html;
