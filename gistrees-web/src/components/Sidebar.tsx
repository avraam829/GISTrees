"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = { collapsed: boolean; onToggle: () => void };

const nav = [
  { href: "/", label: "Карта", emoji: "🗺️" },
  { href: "/processing", label: "Обработка", emoji: "⚙️" },
  { href: "/gallery", label: "Галерея", emoji: "🖼️" },
];

export default function Sidebar({ collapsed, onToggle }: Props) {
  const pathname = usePathname();
  const W = collapsed ? 56 : 220;

  return (
    <aside
      style={{
        width: W,
        transition: "width .18s ease",
        background: "#111827",
        color: "#e5e7eb",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid #0b1220",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          height: 54,
          padding: "0 10px",
          gap: 8,
          borderBottom: "1px solid #1f2937",
        }}
      >
        <button
          onClick={onToggle}
          title={collapsed ? "Развернуть" : "Свернуть"}
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            border: "1px solid #374151",
            background: "#0f172a",
            color: "#e5e7eb",
            cursor: "pointer",
          }}
        >
          {collapsed ? "»" : "«"}
        </button>
        {!collapsed && <div style={{ fontWeight: 700 }}>GisTrees</div>}
      </div>

      <nav style={{ padding: 8, display: "grid", gap: 6 }}>
        {nav.map((i) => {
          const active = pathname === i.href;
          return (
            <Link
              key={i.href}
              href={i.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 10,
                textDecoration: "none",
                color: active ? "#111827" : "#e5e7eb",
                background: active ? "#60a5fa" : "transparent",
                border: active ? "1px solid #93c5fd" : "1px solid transparent",
                fontWeight: 500,
              }}
            >
              <span style={{ width: 22, textAlign: "center" }}>{i.emoji}</span>
              {!collapsed && <span>{i.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div style={{ marginTop: "auto", padding: 10, fontSize: 12, opacity: 0.7 }}>
        {!collapsed && <>© {new Date().getFullYear()} GisTrees</>}
      </div>
    </aside>
  );
}
