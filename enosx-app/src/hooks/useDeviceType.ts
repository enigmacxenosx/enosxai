import { useState, useEffect } from 'react';

export type DeviceType = 'phone' | 'tablet' | 'desktop' | 'tv';

function detectDevice(): DeviceType {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'desktop';

  const ua = navigator.userAgent;
  const width = window.innerWidth;
  const isTV = /SmartTV|Tizen|WebOS|HbbTV|GoogleTV|AppleTV|Android TV|Roku|FireTV/i.test(ua);
  if (isTV) return 'tv';

  const isPhone = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || width < 768;
  if (isPhone) return 'phone';

  const isTablet = (width >= 768 && width < 1024) || (width < 1366 && 'ontouchstart' in window);
  return isTablet ? 'tablet' : 'desktop';
}

export function useDeviceType(): DeviceType {
  const [deviceType, setDeviceType] = useState<DeviceType>(detectDevice);

  useEffect(() => {
    const checkDevice = () => {
      setDeviceType(detectDevice());
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return deviceType;
}
