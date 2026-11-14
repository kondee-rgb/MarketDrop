import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MarketDrop | ระบบจัดการออเดอร์และส่งของสดตามบ้าน',
  description: 'Last-Mile Fresh Produce Delivery Management System - LINE Order Parser, Smart Route Sorting, Driver Mode, and Real-time Google Sheets Sync',
  icons: {
    icon: '/favicon.ico'
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Anuphan:wght@300;400;500;600;700;800&family=Kanit:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-slate-100 text-slate-900 font-sans selection:bg-emerald-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
