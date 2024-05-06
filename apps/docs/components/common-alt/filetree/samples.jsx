import { FileTree } from "@components/common-alt/filetree"
import { Bleed } from "@components/uicomp/bleed-1"
import { Wrapper } from "@components/uicomp/wrapper"

export const samples = {
  "local": {
    files: [
      { name: "motif.json" },
      { name: "tailwind.config.js" },
    ],
    folders: [
      {
        name: "components",
        open: true,
        files: [
          { name: "navbar.tsx" },
          { name: "icons.jsx" },
        ]
      },
      {
        name: "styles",
        open: true,
        files: [
          {
            name: "main.css"
          }
        ]
      },
      {
        name: "templates",
        open: true,
        files: [
          { name: "blog.mdx" },
          { name: "plain.mdx" },
        ]
      },
      {
        name: "pages",
        open: true,
        files: [
          { name: "about.mdx" },
          { name: "index.mdx" }
        ],
        folders: [
          { name: "Posts" }
        ]
      }
    ]
  },
  "project-structure": {
    files: [
      { name: "motif.json" },
      { name: "tailwind.config.js" },
    ],
    folders: [
      {
        name: "components",
        open: true,
        files: [
          { name: "Navbar.tsx" },
          { name: "Icons.jsx" },
        ]
      },
      {
        name: "data",
        open: true,
        files: [
          { name: "authors.json" },
          { name: "description.txt" },
        ]
      },
      {
        name: "styles",
        open: true,
        files: [
          {
            name: "main.css"
          }
        ]
      },
      {
        name: "templates",
        open: true,
        files: [
          { name: "blog-index" },
          { name: "blog-post" }
        ]
      },
      {
        name: "pages",
        open: true,
        files: [
          { name: "About", live: true },
          { name: "Index", live: true }
        ],
        folders: [
          {
            name: "Blog",
            open: true,
            files: [
                { name: "Index", live: true, },
              ],
            folders: [
              {
                name: "Posts",
                open: true,
                files: [
                { name: "My first post.mdoc", live: true, },
                { name: "My second post.mdoc", live: true, },
                { name: "Draft.mdoc", },
              ],
              }
            ]
          }
        ]
      }
    ]
  },
  templates: {
    files: [
      { name: "motif.json" },
      { name: "tailwind.config.js" },
    ],
    folders: [
      { name: "components" },
      { name: "styles" },
      {
        name: "templates",
        open: true,
        files: [
          { name: "blog-index" },
          { name: "blog-post" },
          { name: "home" }
        ]
      },
      {
        name: "pages",
      }
    ]
  },
  search: {
    files: [
      { name: "motif.json" },
      { name: "tailwind.config.js" },
    ],
    folders: [
      { name: "components" },
      { name: "styles" },
      {
        name: "templates",
        open: true,
        files: [
          { name: "home" },
          { name: "docs" },
        ]
      },
      {
        name: "pages",
        open: true,
        folders: [
          {
            name: "docs",
            open: true,
            folders: [
              { name: "guides" },
              { name: "reference" },
            ],
            files: [
              { name: "index" },
              { name: "troubleshooting" },
            ]
          },
        ],
        files: [
          { name: "index" },
          { name: "about" },
        ]
      }
    ]
  },
  markdoc: {
    files: [
      { name: "About", live: true },
      { name: "Index", live: true }
    ],
    folders: [
      {
        name: "Docs",
        open: true,
        files: [
            { name: "Index.mdoc", live: true, },
            { name: "Welcome.mdoc" }
          ]
      }
    ]
  },
}

export const BorderedFileTree = ({ tree }) => {
  return <div className="bg-white px-2 py-3 rounded-md border border-neutral-200 overflow-hidden">
      <FileTree tree={tree} />
    </div>
}

export const SampleFileTree = ({ sample, wrapped = true, bleed = true }) => {
  const _sample = samples[sample]
  if (!_sample) {
    return <></>
  }
  if (wrapped) {
    return <Wrapper bleed={bleed}>
      <BorderedFileTree tree={_sample} />
    </Wrapper>
  } else if (bleed) {
    return <Bleed>
        <BorderedFileTree tree={_sample} />
      </Bleed>
  }
  return <BorderedFileTree tree={_sample} />
}
