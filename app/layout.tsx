import type { Metadata, Viewport } from 'next';
import './globals.css';
import { APP_DESCRIPTION, APP_NAME, APP_NAME_JA } from '@/lib/constants';
import { ThemeScript } from '@/components/layout/ThemeScript';
import { ServiceWorkerRegister } from '@/components/layout/ServiceWorkerRegister';

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME_JA}（${APP_NAME}） | ${APP_DESCRIPTION}`,
    template: `%s | ${APP_NAME_JA}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: APP_NAME_JA,
    statusBarStyle: 'default',
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: '/icons/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FF6134' },
    { media: '(prefers-color-scheme: dark)', color: '#101216' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-dvh bg-ink-50 text-ink-900 dark:bg-ink-950 dark:text-ink-100">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
