import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk, Geist, Geist_Mono, Cairo } from "next/font/google";
import "./globals.css";
import ClientLayout from "../components/ClientLayout";
import { headers } from 'next/headers';

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const viewport: Viewport = {
  themeColor: "#0b0b0b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export const metadata: Metadata = {
  title: "APEX LUXE | Elite Performance Sportswear",
  description:
    "Technically superior athletic apparel designed for the modern elite. Precision engineering meets high-end minimalism. Engineered for excellence.",
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://apexluxe.com",
    title: "APEX LUXE | Elite Performance Sportswear",
    description: "Technically superior athletic apparel designed for the modern elite. Precision engineering meets high-end minimalism.",
    siteName: "APEX LUXE",
    images: [
      {
        url: "https://apexluxe.com/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "APEX LUXE Elite Sportswear",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "APEX LUXE | Elite Performance Sportswear",
    description: "Technically superior athletic apparel designed for the modern elite. Precision engineering meets high-end minimalism.",
    images: ["https://apexluxe.com/og-image.jpg"],
    creator: "@apexluxe",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "APEX LUXE",
    startupImage: "/icons/icon-512x512.png",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#0b0b0b",
    "msapplication-TileImage": "/icons/icon-192x192.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const tenantSlug = headersList.get('x-tenant-id');
  const locale = headersList.get('x-locale') || 'en';

  let tenantSettings: any = null;
  if (tenantSlug) {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'}/saas/tenant/details`,
        {
          headers: {
            'X-Tenant-Id': tenantSlug,
          },
          next: { revalidate: 60 },
        }
      );
      if (res.ok) {
        const details = await res.json();
        tenantSettings = details.settings;
      }
    } catch (e) {
      console.error('Failed to pre-fetch tenant settings', e);
    }
  }

  const isLightTheme = tenantSettings?.themeName === 'light-minimal';
  const themeClass = isLightTheme ? 'light' : 'dark';
  const isRtl = locale === 'ar';
  const dir = isRtl ? 'rtl' : 'ltr';
  const rtlClass = isRtl ? 'rtl-layout' : '';

  return (
    <html
      lang={locale}
      dir={dir}
      data-theme={themeClass}
      suppressHydrationWarning
      className={`${inter.variable} ${spaceGrotesk.variable} ${geist.variable} ${geistMono.variable} ${cairo.variable} h-full antialiased ${themeClass} ${rtlClass}`}
    >
      <head>
        {tenantSettings && (
          <style dangerouslySetInnerHTML={{ __html: `
            :root, [data-theme="dark"], .dark {
              --background: ${tenantSettings.primaryColor || '#0b0b0b'};
              --tertiary: ${tenantSettings.secondaryColor || '#d4ff3f'};
              --foreground: ${tenantSettings.accentColor || '#f4f4f0'};
              --on-background: ${tenantSettings.accentColor || '#f4f4f0'};
            }
            [data-theme="light"], .light {
              --background: ${tenantSettings.primaryColor || '#fcfcfc'};
              --tertiary: ${tenantSettings.secondaryColor || '#d4ff3f'};
              --foreground: ${tenantSettings.accentColor || '#121212'};
              --on-background: ${tenantSettings.accentColor || '#121212'};
            }
            ${tenantSettings.customCss || ''}
          `}} />
        )}
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground selection:bg-tertiary selection:text-on-tertiary">
        <ClientLayout locale={locale}>{children}</ClientLayout>
      </body>
    </html>
  );
}
