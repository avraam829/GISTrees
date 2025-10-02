"use client";

import Image from "next/image";
import React from "react";

export type PopupData = {
  sha: string;
  url: string;
  lat: number;
  lon: number;
  device_id?: string | null;
  shot_time?: string | null;
  created_at?: string;
};

type Props = {
  data: PopupData;
  onDelete: (sha: string) => void;
  onClose: () => void;
};

export default function PhotoPopup({ data, onDelete }: Props) {
  const formatTime = (shot?: string | null, created?: string) => {
    const toLocal = (s?: string | null) => {
      if (!s) return null;
      const d = new Date(s);
      return isNaN(+d) ? null : d.toLocaleString();
    };
    return toLocal(shot) ?? toLocal(created) ?? "—";
  };

  const short = (s?: string | null, n = 16) => (s ? (s.length > n ? s.slice(0, n) + "…" : s) : "—");

  const copy = async (text: string) => { try { await navigator.clipboard.writeText(text); } catch {} };

  return (
    <div
      style={{
        display: "grid",
        gap: 10,
        maxWidth: 340,
        background: "#fff",
        borderRadius: 10,
        border: "1px solid #e5e7eb",
        boxShadow: "0 12px 28px rgba(0,0,0,.15)",
        overflow: "hidden",
      }}
    >
      <a href={data.url} target="_blank" rel="noreferrer" title="Открыть оригинал">
        <Image
          src={data.url}
          alt=""
          width={340}
          height={220}
          unoptimized
          style={{ display: "block", width: "100%", height: "auto", maxHeight: 240, objectFit: "cover" }}
        />
      </a>

      <div style={{ padding: 10, fontSize: 12, lineHeight: 1.35, color: "#111827" }}>
        <div><b>Кто:</b> {data.device_id || "—"}</div>
        <div><b>Время:</b> {formatTime(data.shot_time, data.created_at)}</div>
        <div>
          <b>Координаты:</b> {data.lat.toFixed(6)}, {data.lon.toFixed(6)}{" "}
          <button onClick={() => copy(`${data.lat},${data.lon}`)} title="Скопировать" style={btnMini}>копир.</button>
          <a
            href={`https://www.openstreetmap.org/?mlat=${data.lat}&mlon=${data.lon}#map=17/${data.lat}/${data.lon}`}
            target="_blank"
            rel="noreferrer"
            style={{ marginLeft: 6, textDecoration: "underline" }}
          >
            OSM
          </a>
        </div>
        <div>
          <b>SHA:</b> {short(data.sha, 16)}{" "}
          <button onClick={() => copy(data.sha)} title="Скопировать SHA" style={btnMini}>копир.</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, padding: "0 10px 10px 10px", flexWrap: "wrap" }}>
        <a href={data.url} target="_blank" rel="noreferrer" style={btnPrimary}>Открыть</a>
        <a href={data.url} download style={btnGhost}>Скачать</a>
        <button onClick={() => onDelete(data.sha)} style={btnDanger}>Удалить</button>
      </div>
    </div>
  );
}

const btnMini: React.CSSProperties = {
  fontSize: 11,
  padding: "2px 6px",
  border: "1px solid #ddd",
  borderRadius: 4,
  background: "#f8f8f8",
  cursor: "pointer",
};
const btnPrimary: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 6,
  background: "#2563eb",
  color: "#fff",
  textDecoration: "none",
  fontSize: 12,
};
const btnGhost: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid #ddd",
  textDecoration: "none",
  fontSize: 12,
  background: "#8295edff",
};
const btnDanger: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 6,
  background: "#dc2626",
  color: "#fff",
  border: "1px solid #b91c1c",
  fontSize: 12,
  cursor: "pointer",
};
