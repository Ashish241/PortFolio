"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

type CookieBannerProps = {
  onConsent: () => void;
};

export function CookieBanner({ onConsent }: CookieBannerProps) {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie_consent");
    if (consent === "true") {
      onConsent();
    } else if (consent === null) {
      setShowBanner(true);
    }
  }, [onConsent]);

  const handleAccept = () => {
    localStorage.setItem("cookie_consent", "true");
    onConsent();
    setShowBanner(false);
  };

  const handleDecline = () => {
    localStorage.setItem("cookie_consent", "false");
    setShowBanner(false);
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-secondary text-secondary-foreground p-4 shadow-lg">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-center sm:text-left">
          We use cookies to enhance your experience. By clicking "Accept", you agree to our use of cookies for analytics.
        </p>
        <div className="flex gap-2">
          <Button onClick={handleAccept} size="sm">Accept</Button>
          <Button onClick={handleDecline} variant="outline" size="sm">Decline</Button>
        </div>
      </div>
    </div>
  );
}
