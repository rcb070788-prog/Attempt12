import { useState, useRef, useEffect } from 'react';

export function useTitleBarVisibility() {
  const [titleBarVisible, setTitleBarVisible] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);
  const [titleBarHeight, setTitleBarHeight] = useState(56);
  const titleBarRef = useRef<HTMLDivElement>(null);
  const hideAfterLeaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!titleBarRef.current || !isDesktop) return;
    const ro = new ResizeObserver(() => {
      if (titleBarRef.current) {
        const h = titleBarRef.current.offsetHeight;
        if (h > 0) setTitleBarHeight(h);
      }
    });
    ro.observe(titleBarRef.current);
    const h = titleBarRef.current.offsetHeight;
    if (h > 0) setTitleBarHeight(h);
    return () => ro.disconnect();
  }, [isDesktop, titleBarVisible]);

  useEffect(() => {
    if (!isDesktop) return;
    const t = setTimeout(() => setTitleBarVisible(false), 10000);
    return () => clearTimeout(t);
  }, [isDesktop]);

  useEffect(() => {
    if (!isDesktop) return;
    const LEAVE_DELAY_MS = 800;
    const onMove = (e: MouseEvent) => {
      const h = window.innerHeight;
      const zone = Math.max(2 * titleBarHeight, h * 0.25);
      if (e.clientY < zone) {
        if (hideAfterLeaveRef.current) {
          clearTimeout(hideAfterLeaveRef.current);
          hideAfterLeaveRef.current = null;
        }
        setTitleBarVisible(true);
      } else {
        if (hideAfterLeaveRef.current) return;
        hideAfterLeaveRef.current = setTimeout(() => {
          hideAfterLeaveRef.current = null;
          setTitleBarVisible(false);
        }, LEAVE_DELAY_MS);
      }
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      if (hideAfterLeaveRef.current) clearTimeout(hideAfterLeaveRef.current);
    };
  }, [isDesktop, titleBarHeight]);

  return { titleBarVisible, titleBarRef, isDesktop };
}
