import { useEffect, useState } from "react";

export const getHeadingsSelector = (contentId, headingIndices) => {
  const cid = contentId ? `#${contentId} ` : "";
  const indices = (headingIndices || [2, 3]).sort();
  return indices.map((i) => `${cid}h${i}`).join(", ");
};

export const getContentElement = (contentId) => {
  return contentId ? document.getElementById(contentId) : document.body;
};

export const createEntry = (id, title, items) => {
  return { id, href: `#${id}`, title, items };
};

export const getNestedHeadings = (headingElements, headingIndices) => {
  const nestedHeadings = [];
  const indices = (headingIndices || [2, 3]).sort();

  headingElements.forEach((heading) => {
    const { innerText: title, id } = heading;

    if (indices.length > 0) {
      if (heading.nodeName === `H${indices[0]}`) {
        nestedHeadings.push(createEntry(id, title, []));
      } else if (indices.length > 1) {
        if (
          heading.nodeName === `H${indices[1]}` &&
          nestedHeadings.length > 0
        ) {
          nestedHeadings[nestedHeadings.length - 1].items.push(
            createEntry(id, title, [])
          );
        } else if (indices.length > 2) {
          if (
            heading.nodeName === `H${indices[2]}` &&
            nestedHeadings.length > 0
          ) {
            const level2Headings =
              nestedHeadings[nestedHeadings.length - 1].items;
            nestedHeadings[nestedHeadings.length - 1].items[
              level2Headings.length - 1
            ].items.push(createEntry(id, title, null));
          }
        }
      }
    }
  });

  return nestedHeadings;
};

export const useHeadingsData = (contentId, headingIndices) => {
  const [nestedHeadings, setNestedHeadings] = useState([]);

  useEffect(() => {
    const contentId = "content"
    const updateHeadings = () => {
      const headingElements = Array.from(
        document.querySelectorAll(
          getHeadingsSelector(contentId, headingIndices)
        )
      );

      const newNestedHeadings = getNestedHeadings(
        headingElements,
        headingIndices
      );
      setNestedHeadings(newNestedHeadings);
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

  return { nestedHeadings };
};
