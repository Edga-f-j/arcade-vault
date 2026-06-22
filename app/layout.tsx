import type { Metadata, Viewport } from "next";
import { Press_Start_2P, Courier_Prime, JetBrains_Mono } from "next/font/google";
import { AuthProvider } from "./_context/AuthContext";
import Nav from "./_components/Nav";
import "./globals.css";

const pressStart2P = Press_Start_2P({
  weight: "400",
  variable: "--font-pixel",
  subsets: ["latin"],
});

const courierPrime = Courier_Prime({
  weight: ["400", "700"],
  variable: "--font-courier",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Arcade Vault",
  description: "Online gaming platform — play and compete for points",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${pressStart2P.variable} ${courierPrime.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <div className="av-bg" />
        <div className="av-noise" />
        <AuthProvider>
          <div id="root">
            <Nav />
            <main className="av-main">{children}</main>
            <footer style={{ borderTop: "1px solid var(--line)", padding: "20px 32px", textAlign: "center", color: "var(--ink-faint)", fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.16em" }}>
              © 2026 ARCADE VAULT · HECHO CON PIXELES Y NEÓN · v2.6.0
            </footer>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
