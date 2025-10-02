"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export type PhotoRow = {
  id: number;
  sha256: string;
  device_id?: string | null;
  shot_time?: string | null;
  created_at?: string;
  lat: number;
  lon: number;
  image_url: string;
};

export default function Gallery() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? "";
  const [items, setItems] = useState<PhotoRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${apiBase}/api/v1/photos?limit=1000`)
      .then((r) => r.json())
      .then((rows: PhotoRow[]) => setItems(rows))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [apiBase]);

  const remove = async (sha: string) => {
    if (!confirm("Удалить фото? Оно будет удалено из БД и с диска.")) return;
    const r = await fetch(`${apiBase}/api/v1/photos/${sha}`, { method: "DELETE" });
    if (r.ok) setItems((prev) => prev.filter((x) => x.sha256 !== sha));
    else alert(`Ошибка удаления: ${r.status}`);
  };

  return (
    <div style={{ width: "100%", height: "100%", overflow: "auto" }}>
      <div style={{ padding: 16 }}>
        <h1 style={{ margin: "6px 0 14px", color: "#111827" }}>Галерея</h1>
        {loading && <div>Загрузка…</div>}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 14,
          }}
        >
          {items.map((p) => (
            <Card key={p.sha256} p={p} onRemove={remove} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Card({ p, onRemove }: { p: PhotoRow; onRemove: (sha: string) => void }) {
  const [showMeta, setShowMeta] = useState(false);

  const time = (() => {
    const a = new Date(p.shot_time ?? p.created_at ?? "");
    return isNaN(+a) ? "—" : a.toLocaleString();
  })();

  const osmUrl = `https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lon}#map=17/${p.lat}/${p.lon}`;

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        overflow: "hidden",             // ничего не вылезет за рамку
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 8px 18px rgba(0,0,0,.06)",
      }}
    >
      {/* блок изображения фиксированной высоты */}
      <div style={{ position: "relative", height: 200, background: "#f3f4f6" }}>
        <a href={p.image_url} target="_blank" rel="noreferrer" title="Открыть оригинал">
          <Image
            src={p.image_url}
            alt=""
            width={600}
            height={400}
            unoptimized
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        </a>

        {/* легкая градиентная подложка, чтобы кнопка читалась на любом фото */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(0deg, rgba(0,0,0,.35) 0%, rgba(0,0,0,0) 55%)",
            pointerEvents: "none",
          }}
        />

        <button
          onClick={() => setShowMeta((s) => !s)}
          style={metaToggleBtn}
          title={showMeta ? "Скрыть метаданные" : "Показать метаданные"}
        >
          {showMeta ? "Скрыть мета" : "Показать мета"}
        </button>
      </div>

      {/* секция метаданных — под фото, хороший контраст, переносы, не налезает */}
      {showMeta && (
        <div
          style={{
            padding: "10px 12px",
            fontSize: 13,
            lineHeight: 1.35,
            color: "#111827",
            background: "#fafafa",
            borderTop: "1px solid #e5e7eb",
            wordBreak: "break-word",
          }}
        >
          <div><b>Кто:</b> {p.device_id || "—"}</div>
          <div><b>Время:</b> {time}</div>
          <div>
            <b>Координаты:</b> {p.lat.toFixed(6)}, {p.lon.toFixed(6)}{" "}
            <a
              href={osmUrl}
              target="_blank"
              rel="noreferrer"
              style={{ marginLeft: 6, textDecoration: "underline" }}
            >
              OSM
            </a>
          </div>
          <div style={{ wordBreak: "break-all" }}>
            <b>SHA:</b> {p.sha256}
          </div>
        </div>
      )}

      {/* кнопки всегда внутри карточки */}
      <div style={{ display: "flex", gap: 8, padding: 12 }}>
        <a href={p.image_url} target="_blank" rel="noreferrer" style={btnPrimary}>
          Открыть
        </a>
        <a href={p.image_url} download style={btnGhost}>
          Скачать
        </a>
        <button onClick={() => onRemove(p.sha256)} style={btnDanger}>
          Удалить
        </button>
      </div>
    </div>
  );
}

/* стили */
const metaToggleBtn: React.CSSProperties = {
  position: "absolute",
  left: 10,
  bottom: 10,
  padding: "8px 10px",
  borderRadius: 8,
  background: "rgba(17, 24, 39, .85)", // почти чёрный
  color: "#fff",
  border: "1px solid rgba(255,255,255,.25)",
  fontSize: 13,
  cursor: "pointer",
  backdropFilter: "blur(2px)",
};

const btnPrimary: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  background: "#2563eb",
  color: "#fff",
  textDecoration: "none",
  fontSize: 13,
};

const btnGhost: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  textDecoration: "none",
  fontSize: 13,
  background: "#fff",
  color: "#111827",
};

const btnDanger: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  background: "#dc2626",
  color: "#fff",
  border: "1px solid #b91c1c",
  fontSize: 13,
  cursor: "pointer",
};
