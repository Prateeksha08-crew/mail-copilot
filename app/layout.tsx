import "./globals.css";

export const metadata = {
  title: "Postbox — AI-controlled mail client",
  description: "Mail client with an assistant that drives the UI via Gmail API + Claude tool use.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
