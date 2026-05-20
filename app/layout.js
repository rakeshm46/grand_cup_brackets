import './globals.css';

export const metadata = {
  title: 'Grand Cup 2 — Outlaws · Bracket',
  description: 'Track the legendary Grand Cup 2 trading bracket. Witness live trader matchups, outlaw bounties, real-time balance curves, and trade execution logs.',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  openGraph: {
    title: 'Grand Cup 2 — Outlaws · Bracket',
    description: 'Track the legendary Grand Cup 2 trading bracket. Witness live trader matchups, outlaw bounties, real-time balance curves, and trade execution logs.',
    type: 'website',
    images: [
      {
        url: '/preview.jpg',
        width: 1200,
        height: 630,
        alt: 'Grand Cup 2 Bracket',
      },
    ],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="share-body">
        {children}
      </body>
    </html>
  );
}
