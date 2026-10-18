import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Free AI Work — Limited Daily Spots',
  description: 'Free quality AI songs, landing pages and creative assets. Limited owner-selected request spots.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
