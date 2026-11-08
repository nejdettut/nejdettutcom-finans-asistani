import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Finans Asistanı — nejdettut.com",
  description:
    "Harcamalarını serbest metin olarak yaz: yapay zekâ harcama kalemlerini ayıklar, kategorize eder, bütçe skorunu hesaplar ve tasarruf önerileri üretir.",
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
