'use client';

import React, { useEffect, useRef, useState } from 'react';
import Highcharts from 'highcharts';

interface HighchartsWrapperProps {
  options: any;
}

export default function HighchartsWrapper({ options }: HighchartsWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const chartInstanceRef = useRef<Highcharts.Chart | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (!containerRef.current) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }

    chartInstanceRef.current = Highcharts.chart(containerRef.current, options);
    if (isMounted) setIsLoaded(true);

    return () => {
      isMounted = false;
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [options]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;

    const reflow = () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.reflow();
      }
    };

    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const observer = new ResizeObserver(() => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(reflow, 80);
    });
    observer.observe(container);

    return () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="w-full h-full relative">
      <div ref={containerRef} className="w-full h-full" />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400 font-medium">
          Loading charts...
        </div>
      )}
    </div>
  );
}
