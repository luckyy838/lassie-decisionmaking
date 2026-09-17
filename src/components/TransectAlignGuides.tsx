import * as React from 'react';
import { useEffect, useState } from 'react';
import { sampleLocations, NORMALIZED_HEIGHT } from '../constants';

export const TRANSECT_GUIDES_EVENT = 'lassie-transect-guides';

export function notifyTransectGuides() {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') {
    return;
  }
  window.dispatchEvent(new Event(TRANSECT_GUIDES_EVENT));
}

export default function TransectAlignGuides() {
  const [geom, setGeom] = useState({ show: false, x1: 0, x2: 0, width: 0, height: 0 });

  useEffect(() => {
    const measure = () => {
      const stack = document.querySelector('.chartStack-transect') as HTMLElement | null;
      const img = document.getElementById('pos-picker');
      if (!stack || !img) {
        setGeom(prev => prev.show ? { ...prev, show: false } : prev);
        return;
      }
      const stackRect = stack.getBoundingClientRect();
      const imgRect = img.getBoundingClientRect();
      if (imgRect.height < 20 || stackRect.width < 40) {
        setGeom(prev => prev.show ? { ...prev, show: false } : prev);
        return;
      }
      const scale = imgRect.height / NORMALIZED_HEIGHT;
      const first = sampleLocations[0];
      const last = sampleLocations[sampleLocations.length - 1];
      const x1 = imgRect.left + first[0] * scale - stackRect.left;
      const x2 = imgRect.left + last[0] * scale - stackRect.left;
      setGeom({
        show: x2 - x1 > 40,
        x1,
        x2,
        width: stackRect.width,
        height: stackRect.height
      });
    };
    measure();
    const t1 = window.setTimeout(measure, 80);
    const t2 = window.setTimeout(measure, 360);
    window.addEventListener('resize', measure);
    window.addEventListener(TRANSECT_GUIDES_EVENT, measure);
    let observer: any;
    const stack = document.querySelector('.chartStack-transect');
    if (stack && typeof (window as any).ResizeObserver !== 'undefined') {
      observer = new (window as any).ResizeObserver(measure);
      observer.observe(stack);
      const img = document.getElementById('pos-picker');
      if (img) {
        observer.observe(img);
      }
      const parent = document.getElementById('explanationChartParent');
      if (parent) {
        observer.observe(parent);
      }
    }
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener('resize', measure);
      window.removeEventListener(TRANSECT_GUIDES_EVENT, measure);
      if (observer) {
        observer.disconnect();
      }
    };
  }, []);

  if (!geom.show) {
    return null;
  }
  return (
    <svg
      className="transectAlignGuides"
      width={geom.width}
      height={geom.height}
      viewBox={`0 0 ${geom.width} ${geom.height}`}
      aria-hidden="true"
    >
      <line x1={geom.x1} y1={6} x2={geom.x1} y2={geom.height - 6} />
      <line x1={geom.x2} y1={6} x2={geom.x2} y2={geom.height - 6} />
    </svg>
  );
}
