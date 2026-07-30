import { useState, useEffect } from 'react';

export type DeviceType = 'phone' | 'tablet' | 'desktop' | 'tv';

export function useDeviceType(): DeviceType {
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');

  useEffect(() => {
    const checkDevice = () => {
      const ua = navigator.userAgent;
      const width = window.innerWidth;
      const height = window.innerHeight;

      // TV detection
      const isTV = /SmartTV|Tizen|WebOS|HbbTV|GoogleTV|AppleTV|Android TV|Roku|FireTV/i.test(ua) || 
                   (width >= 1920 && !('ontouchstart' in window) && height >= 1080 && width / height > 1.7);
      
      if (isTV) {
        setDeviceType('tv');
        return;
      }

      // Mobile detection
      const isPhone = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || width < 768;
      if (isPhone) {
        setDeviceType('phone');
        return;
      }

      // Tablet detection
      const isTablet = (width >= 768 && width < 1024) || (width < 1366 && 'ontouchstart' in window);
      if (isTablet) {
        setDeviceType('tablet');
        return;
      }

      setDeviceType('desktop');
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return deviceType;
}
