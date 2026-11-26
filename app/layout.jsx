import './globals.css';
export const metadata = {
  applicationName: 'Materiais',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Materiais', statusBarStyle: 'black-translucent' },
  other: { 'mobile-web-app-capable': 'yes', 'apple-mobile-web-app-capable': 'yes' },
  title: 'Domaine XXV — Acabamentos',
  icons: { icon: '/icon.svg', apple: '/icons/apple-touch-icon.png' },
  description: 'Percorra a moradia em 360° e escolha os acabamentos de cada divisão.',
};
export const viewport = {width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#0b0b0b'};
export default function RootLayout({children}) { return <html lang="pt"><body>{children}</body></html>; }
