import { useEffect, useRef, useState } from "react"
import { minBy } from "lodash-es"
import { getContentElement, getHeadingsSelector } from "@utils/dom"

export const useIntersectionObserver = (
  setActiveId,
  contentId,
  headings,
  offset
) => {
  const [headingElements, setHeadingElements] = useState([]);
  const headingElementsRef = useRef({});

  useEffect(() => {
    const updateHeadings = () => {
      const elements = Array.from(
        document.querySelectorAll(getHeadingsSelector(contentId, headings))
      );
      setHeadingElements(elements);
    };

    updateHeadings();

    const observer = new MutationObserver(updateHeadings);
    const targetNode = getContentElement(contentId);
    observer.observe(targetNode, {
      attributes: true,
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, [contentId]);

  useEffect(() => {
    const onChange = (headings) => {
      headingElementsRef.current = headings.reduce((map, headingElement) => {
        map[headingElement.target.id] = headingElement;
        return map;
      }, headingElementsRef.current);

      let visibleHeadings = [];
      const domHeadingIds = (headingElements || []).map((h) => h.id);
      Object.keys(headingElementsRef.current)
        .filter((key) => domHeadingIds.includes(key))
        .forEach((key) => {
          const headingElement = headingElementsRef.current[key];
          if (headingElement.isIntersecting) {
            visibleHeadings.push(headingElement);
          }
        });

      if (visibleHeadings.length === 1) {
        setActiveId(visibleHeadings[0].target.id);
      } else if (visibleHeadings.length > 1) {
        const heading = minBy(visibleHeadings, (h) => {
          return headingElements.findIndex(
            (heading) => heading.id === h.target.id
          );
        });
        setActiveId(heading?.target.id);
      }
    };

    const observer = new IntersectionObserver(onChange, {
      rootMargin: `${-offset || 0}px`,
    });

    headingElements.forEach((element) => observer.observe(element));

    return () => {
      observer.disconnect();
    };
  }, [setActiveId, offset, headingElements]);
};
