"use client";

import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";

export default function RootShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const v = localStorage.getItem("sidebar-collapsed");
    if (v === "1") setCollapsed(true);
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem("sidebar-collapsed", next ? "1" : "0");
      return next;
    });
  };

  return (
    <div style={{ display: "flex", width: "100vw", height: "100vh", overflow: "hidden" }}>
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <main
        style={{
          flex: 1,
          minWidth: 0,
          height: "100%",
          position: "relative",
          background: "#f7f7f7",
        }}
      >
        {children}
      </main>
    </div>
  );
}
