import { FC, useEffect, useState } from "react";

const Dropdown: FC = (props) => {
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
};

export default Dropdown;
