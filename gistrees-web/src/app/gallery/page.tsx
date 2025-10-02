"use client";

import dynamic from "next/dynamic";

// Клиентский динамический импорт допустим — отключаем SSR для галереи
const Gallery = dynamic(() => import("@/components/Gallery"), { ssr: false });

export default function GalleryPage() {
  return <Gallery />;
}
