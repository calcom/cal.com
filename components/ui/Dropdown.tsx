import { useEffect, useState } from "react";

export default function Dropdown(props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.addEventListener("keyup", (e) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    });
  }, [open]);

  return (
    <div onClick={() => setOpen(!open)} {...props}>
      {props.children[0]}
      {open && props.children[1]}
    </div>
  );
}
