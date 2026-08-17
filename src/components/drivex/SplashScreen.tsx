import { useEffect, useState, type ReactNode } from "react";

import { DriveXLogo } from "@/components/drivex/DriveXLogo";

const SESSION_KEY = "drivex.splash.seen";

export function SplashScreen({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (window.sessionStorage.getItem(SESSION_KEY)) return;
    window.sessionStorage.setItem(SESSION_KEY, "1");
    setVisible(true);
    const fade = window.setTimeout(() => setFading(true), 1500);
    const hide = window.setTimeout(() => setVisible(false), 2100);
    return () => {
      window.clearTimeout(fade);
      window.clearTimeout(hide);
    };
  }, []);

  return (
    <>
      {children}
      {visible && (
        <div
          aria-hidden
          className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background transition-opacity duration-500 ${
            fading ? "opacity-0" : "opacity-100"
          }`}
        >
          <div className="absolute h-64 w-64 animate-ping rounded-full bg-primary/10" />
          <div className="absolute h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative animate-[splash-in_700ms_cubic-bezier(0.16,1,0.3,1)_both]">
            <DriveXLogo size={112} priority />
          </div>
          <p className="relative mt-5 text-lg font-semibold tracking-tight animate-[splash-up_700ms_200ms_cubic-bezier(0.16,1,0.3,1)_both]">
            DriveX <span className="text-primary">Rental</span>
          </p>
          <span className="relative mt-4 h-0.5 w-32 overflow-hidden rounded-full bg-border">
            <span className="block h-full w-full origin-left animate-[splash-bar_1500ms_linear_both] bg-primary" />
          </span>
        </div>
      )}
    </>
  );
}
