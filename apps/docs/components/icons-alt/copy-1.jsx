export const svgs = {
  copied: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="animate-path">
      <title>Copied</title>
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="48"
        d="M96,288L192,384L416,128"
      />
    </svg>
  ),
  copy: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
      <title>Copy</title>
      <rect
        x="128"
        y="128"
        width="336"
        height="336"
        rx="57"
        ry="57"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="48"
      />
      <path
        d="M383.5 128l.5-24a56.16 56.16 0 00-56-56H112a64.19 64.19 0 00-64 64v216a56.16 56.16 0 0056 56h24"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="48"
      />
    </svg>
  ),
}

export function Copy({ icon, color = 'inherit' }) {
  return (
    <span className="icon">
      {svgs[icon] || null}
      <style jsx>
        {`
          .icon {
            display: inline-block;
            position: relative;
            font-size: inherit;
            width: 1em;
            height: 1em;
            min-width: 16px;
            box-sizing: content-box;
            color: ${color};
          }

          .icon :global(svg) {
            z-index: 10; // make icons in callouts show correctly
            position: relative;
            display: block;
            fill: currentcolor;
            stroke: currentcolor;
            width: 100%;
            height: 100%;
          }
        `}
      </style>
    </span>
  )
}
