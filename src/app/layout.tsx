import type { Metadata, Viewport } from 'next';
import { Prompt } from 'next/font/google';
import './globals.css';

const promptFont = Prompt({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['thai', 'latin'],
  display: 'swap',
  variable: '--font-prompt'
});

export const metadata: Metadata = {
  title: 'MarketDrop | ระบบจัดการและส่งของสดตามบ้าน',
  description: 'Last-Mile Fresh Produce Delivery System - ตลาด ➔ ซื้อ ➔ ส่งหน้าบ้าน เรียลไทม์',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default', // dark status-bar text over the light header (translucent made it white-on-white)
    title: 'MarketDrop'
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg'
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // zoom stays allowed (accessibility); inputs are 16px on touch so iOS doesn't auto-zoom
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
  colorScheme: 'light',
  themeColor: '#ffffff' // matches the header
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`h-full antialiased ${promptFont.variable}`}>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-touch-fullscreen" content="yes" />
      </head>
      <body className={`min-h-full flex flex-col bg-[#f4f5f7] text-slate-800 font-sans selection:bg-emerald-200 selection:text-emerald-950 ${promptFont.className}`}>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.log('SW registration failed: ', err);
                  });
                });
              }
            `
          }}
        />
      </body>
    </html>
  );
}
