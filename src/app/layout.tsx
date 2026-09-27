import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ReduxProvider } from "@/store/provider";
import { AuthProvider } from "@/components/AuthProvider";
import { SWRegister, InstallPrompt } from "@/components/PWA";
import { ToastProvider } from "@/components/ui/toast";
import { PushNotificationPrompt } from "@/components/PushNotificationPrompt";
import { ScrollToTop } from "@/components/ScrollToTop";
import { site } from "@/lib/site";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: `${site.fullName} | Express Grocery Store`,
  description: site.description,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: site.name,
  },
  icons: {
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.className} min-h-full flex flex-col`}>
        <ReduxProvider>
          <ToastProvider>
            <AuthProvider>
              <ScrollToTop />
              {children}
              <PushNotificationPrompt />
            </AuthProvider>
          </ToastProvider>
        </ReduxProvider>
        <SWRegister />
        <InstallPrompt />
      </body>
    </html>
  );
}
