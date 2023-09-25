const SidebarWrapper = ({ children }) => (
  <aside className="sticky top-[32px] flex w-full flex-col gap-6 rounded-xl border bg-white px-6 py-6 shadow-[0_0_3px_rgba(0,0,0,0.02)]">
    {children}
  </aside>
);

export default SidebarWrapper;
