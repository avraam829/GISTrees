import type { Metadata } from "next";
import RootShell from "@/components/RootShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "GisTrees",
  description: "Фото с координатами на карте",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body style={{ margin: 0 }}>
        <RootShell>{children}</RootShell>
      </body>
    </html>
  );
}
