'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';

export default function MetricoolScript() {
  const [shouldTrack, setShouldTrack] = useState(false);

  useEffect(() => {
    // Only enable tracking on the customer-facing site (seaofblue.ca)
    if (window.location.hostname.includes('seaofblue.ca')) {
      setShouldTrack(true);
    }
  }, []);

  if (!shouldTrack) return null;

  return (
    <Script id="metricool-tracker" strategy="afterInteractive">
      {`function loadScript(a){var b=document.getElementsByTagName("head")[0],c=document.createElement("script");c.type="text/javascript",c.src="https://tracker.metricool.com/resources/be.js",c.onreadystatechange=a,c.onload=a,b.appendChild(c)}loadScript(function(){beTracker.t({hash:"acc15a34f4415e69a2c0c299db342c55"})});`}
    </Script>
  );
}
