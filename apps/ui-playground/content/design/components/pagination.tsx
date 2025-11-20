"use client";

import { RenderComponentWithSnippet } from "@/app/components/render";
import { useState } from "react";

import { Pagination } from "@calcom/ui/components/pagination";

export const BasicExample = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const totalItems = 61;

  return (
    <RenderComponentWithSnippet>
      <div className="w-full">
        <Pagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </RenderComponentWithSnippet>
  );
};

export const CustomPageSizesExample = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const totalItems = 25;

  return (
    <RenderComponentWithSnippet>
      <div className="w-full">
        <Pagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[5, 10, 15, 25]}
        />
      </div>
    </RenderComponentWithSnippet>
  );
};

export const WithCallbacksExample = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const totalItems = 100;

  const handleNext = () => {
    console.log("Next page clicked");
  };

  const handlePrevious = () => {
    console.log("Previous page clicked");
  };

  return (
    <RenderComponentWithSnippet>
      <div className="w-full">
        <Pagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          onNext={handleNext}
          onPrevious={handlePrevious}
        />
      </div>
    </RenderComponentWithSnippet>
  );
};

export const LargeDatasetExample = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const totalItems = 1000;

  return (
    <RenderComponentWithSnippet>
      <div className="w-full">
        <Pagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </RenderComponentWithSnippet>
  );
};
