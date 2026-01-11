import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Plant Guesser',
  description: 'Identify plants and fungi from around the world',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
