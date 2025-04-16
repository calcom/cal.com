import { Toaster } from "react-hot-toast";

import { Status } from "./Status";

export function MDXLayout({ children, frontmatter }: { children: React.ReactNode; frontmatter: any }) {
  return (
    <div className="prose max-w-none">
      <Toaster />
      {frontmatter.airtableId && (
        <Status
          airtableId={frontmatter.airtableId}
          designStatus={frontmatter.designStatus}
          devStatus={frontmatter.devStatus}
        />
      )}
      {children}
    </div>
  );
}
