// This is a placeholder for Google Analytics.
// In a real application, you would replace this with your actual GA tracking code.
"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CookieBanner } from "./cookie-banner";

const GA_MEASUREMENT_ID = "G-XXXXXXXXXX"; // Replace with your Measurement ID

export function Analytics() {
  const [consent, setConsent] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (consent) {
      const url = `${pathname}?${searchParams.toString()}`;
      // You can track page views here if needed
      // window.gtag('config', GA_MEASUREMENT_ID, { page_path: url });
      console.log(`Analytics enabled. Page view: ${url}`);
    }
  }, [pathname, searchParams, consent]);

  return (
    <>
      <CookieBanner onConsent={() => setConsent(true)} />
      {consent && (
        <>
          <Script
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          />
          <Script
            id="google-analytics"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_MEASUREMENT_ID}');
              `,
            }}
          />
        </>
      )}
    </>
  );
}
