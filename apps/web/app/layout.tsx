import { dir } from "i18next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import { headers, cookies } from "next/headers";
import React from "react";

import { getLocale } from "@calcom/features/auth/lib/getLocale";
import { loadTranslations } from "@calcom/lib/server/i18n";
import { IconSprites } from "@calcom/ui/components/icon";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import "../styles/globals.css";
import { AppRouterI18nProvider } from "./AppRouterI18nProvider";
import { SpeculationRules } from "./SpeculationRules";
import { Providers } from "./providers";

// Force dynamic rendering since we use headers() and cookies()
export const dynamic = "force-dynamic";

const interFont = Inter({ subsets: ["latin"], variable: "--font-sans", preload: true, display: "swap" });
const calFont = localFont({
  src: "../fonts/CalSans-SemiBold.woff2",
  variable: "--font-cal",
  preload: true,
  display: "block",
  weight: "600",
});

export const viewport = {
  width: "device-width",
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    {
      media: "(prefers-color-scheme: light)",
      color: "#f9fafb",
    },
    {
      media: "(prefers-color-scheme: dark)",
      color: "#1C1C1C",
    },
  ],
};

export const metadata = {
  icons: {
    icon: "/api/logo?type=favicon-32",
    apple: "/api/logo?type=apple-touch-icon",
    other: [
      {
        rel: "icon-mask",
        url: "/safari-pinned-tab.svg",
        color: "#000000",
      },
      {
        url: "/api/logo?type=favicon-16",
        sizes: "16x16",
        type: "image/png",
      },
      {
        url: "/api/logo?type=favicon-32",
        sizes: "32x32",
        type: "image/png",
      },
    ],
  },
  manifest: "/site.webmanifest",
  other: {
    "application-TileColor": "#ff0000",
  },
  twitter: {
    site: "@calcom",
    creator: "@calcom",
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const getInitialProps = async () => {
  try {
    const h = await headers();
    const isEmbed = h.get("x-isEmbed") === "true";
    const embedColorScheme = h.get("x-embedColorScheme");
    let newLocale = "en";
    try {
      newLocale = (await getLocale(buildLegacyRequest(await headers(), await cookies()))) ?? "en";
    } catch (error) {
      // Fallback to default locale if getLocale fails (e.g., database connection issues)
      console.error("Failed to get locale, using default:", error);
    }
    const direction = dir(newLocale) ?? "ltr";

    return {
      isEmbed,
      embedColorScheme,
      locale: newLocale,
      direction,
    };
  } catch (error) {
    // Fallback to safe defaults if anything fails
    console.error("Error in getInitialProps:", error);
    return {
      isEmbed: false,
      embedColorScheme: null,
      locale: "en",
      direction: "ltr",
    };
  }
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  try {
    const h = await headers();
    const nonce = h.get("x-csp-nonce") ?? "";

    const country = h.get("cf-ipcountry") || h.get("x-vercel-ip-country") || "Unknown";

    const { locale, direction, isEmbed, embedColorScheme } = await getInitialProps();

    const ns = "common";
    let translations;
    try {
      translations = await loadTranslations(locale, ns);
    } catch (error) {
      console.error("Failed to load translations, using empty object:", error);
      translations = {};
    }

  return (
    <html
      className="notranslate"
      translate="no"
      lang={locale}
      dir={direction}
      style={embedColorScheme ? { colorScheme: embedColorScheme as string } : undefined}
      suppressHydrationWarning
      data-nextjs-router="app">
      <head nonce={nonce}>
        {/* Suppress React 19 element.ref deprecation warning - must run before React initializes */}
        {process.env.NODE_ENV === "development" && (
          <script
            nonce={nonce}
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  if (typeof window === 'undefined') return;
                  
                  // Store original console methods immediately
                  const originalWarn = console.warn.bind(console);
                  const originalError = console.error.bind(console);
                  const originalLog = console.log.bind(console);
                  
                  const suppressReact19RefWarning = function(args) {
                    try {
                      const messageStr = Array.from(args).map(arg => 
                        typeof arg === 'string' ? arg : 
                        typeof arg === 'object' && arg !== null ? JSON.stringify(arg) : 
                        String(arg)
                      ).join(' ');
                      
                      return (
                        messageStr.includes('Accessing element.ref was removed in React 19') ||
                        messageStr.includes('ref is now a regular prop') ||
                        messageStr.includes('It will be removed from the JSX Element type') ||
                        messageStr.includes('element.ref was removed') ||
                        messageStr.includes('elementRefGetterWithDeprecationWarning') ||
                        messageStr.includes('element.ref')
                      );
                    } catch (e) {
                      return false;
                    }
                  };
                  
                  // Override console methods
                  console.warn = function() {
                    if (!suppressReact19RefWarning(arguments)) {
                      originalWarn.apply(console, arguments);
                    }
                  };
                  
                  console.error = function() {
                    if (!suppressReact19RefWarning(arguments)) {
                      originalError.apply(console, arguments);
                    }
                  };
                  
                  console.log = function() {
                    if (!suppressReact19RefWarning(arguments)) {
                      originalLog.apply(console, arguments);
                    }
                  };
                  
                  // Also try to intercept React's internal error handling
                  if (window.React && window.React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) {
                    const internals = window.React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
                    if (internals.ReactDebugCurrentFrame) {
                      const originalGetCurrentStack = internals.ReactDebugCurrentFrame.getCurrentStack;
                      if (originalGetCurrentStack) {
                        internals.ReactDebugCurrentFrame.getCurrentStack = function() {
                          try {
                            return originalGetCurrentStack.apply(this, arguments);
                          } catch (e) {
                            if (String(e).includes('element.ref')) return '';
                            throw e;
                          }
                        };
                      }
                    }
                  }
                })();
              `,
            }}
          />
        )}
        <style>{`
          :root {
            --font-sans: ${interFont.style.fontFamily.replace(/\'/g, "")};
            --font-cal: ${calFont.style.fontFamily.replace(/\'/g, "")};
          }
        `}</style>
      </head>
      <body
        className="dark:bg-default bg-subtle antialiased"
        style={
          isEmbed
            ? {
                background: "transparent",
                // Keep the embed hidden till parent initializes and
                // - gives it the appropriate styles if UI instruction is there.
                // - gives iframe the appropriate height(equal to document height) which can only be known after loading the page once in browser.
                // - Tells iframe which mode it should be in (dark/light) - if there is a a UI instruction for that
                visibility: "hidden",
                // This in addition to visibility: hidden is to ensure that elements with specific opacity set are not visible
                opacity: 0,
              }
            : {
                visibility: "visible",
                opacity: 1,
              }
        }>
        <IconSprites />
        <SpeculationRules
          // URLs In Navigation
          prerenderPathsOnHover={[
            "/event-types",
            "/availability",
            "/bookings/upcoming",
            "/teams",
            "/apps",
            "/apps/routing-forms/forms",
            "/workflows",
            "/insights",
          ]}
        />

        <Providers isEmbed={isEmbed} nonce={nonce} country={country}>
          <AppRouterI18nProvider translations={translations} locale={locale} ns={ns}>
            {children}
          </AppRouterI18nProvider>
        </Providers>
      </body>
    </html>
  );
  } catch (error) {
    // Fallback to minimal layout if anything fails
    console.error("Error in RootLayout:", error);
    return (
      <html lang="en">
        <head>
          <title>Error</title>
        </head>
        <body>
          <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
            <h1>500 - Internal Server Error</h1>
            <p>Something went wrong. Please try again later.</p>
          </div>
        </body>
      </html>
    );
  }
}
