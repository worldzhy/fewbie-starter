"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type NavigationProgress = {
  /**
   * Client navigation that marks the route transition pending immediately, so
   * the progress bar appears on click rather than once the destination route
   * has been compiled and fetched.
   *
   * Accepts Next.js router options (scroll, shallow, ...) plus a convenience
   * `replace` flag that mirrors `router.replace` vs `router.push` selection.
   */
  navigate: (href: string, options?: { replace?: boolean; scroll?: boolean; shallow?: boolean }) => void;
};

const NavigationProgressContext = createContext<NavigationProgress | null>(null);

/**
 * Upper bound for the bar raised by a link click. A navigation that never
 * commits (failed fetch, cancelled render) must not leave the bar running.
 */
const LINK_PROGRESS_TIMEOUT_MS = 30_000;

/**
 * App-wide navigation feedback. Route payloads can take seconds to arrive
 * (dev compiles the destination on demand), and a navigation that shows
 * nothing until then reads as a click that did not register.
 */
export function NavigationProgressProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isNavigating, startTransition] = useTransition();
  const [linkNavigating, setLinkNavigating] = useState(false);
  const [renderedPathname, setRenderedPathname] = useState(pathname);
  const linkTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A committed route change is what retires the bar raised by a link click.
  // Adjusting state while rendering on the new pathname keeps the update in the
  // same render as the route change instead of cascading from an effect.
  if (renderedPathname !== pathname) {
    setRenderedPathname(pathname);
    if (linkNavigating) setLinkNavigating(false);
  }

  const navigate = useCallback(
    (href: string, options?: { replace?: boolean; scroll?: boolean; shallow?: boolean }) => {
      const { replace, ...nextOptions } = options ?? {};
      startTransition(() => {
        if (replace) router.replace(href, nextOptions);
        else router.push(href, nextOptions);
      });
    },
    [router],
  );

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      // Modified clicks open another tab/window and downloads leave the tab:
      // neither navigates in place, so neither raises the bar.
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const clicked = event.target instanceof Element ? event.target.closest("a") : null;
      if (!clicked || clicked.target === "_blank" || clicked.hasAttribute("download")) return;
      const destination = new URL(clicked.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      // Query- and hash-only navigation keeps the current route segment mounted:
      // there is no route change to retire the bar on.
      if (destination.pathname === pathname) return;

      setLinkNavigating(true);
      if (linkTimeout.current !== null) clearTimeout(linkTimeout.current);
      linkTimeout.current = setTimeout(() => setLinkNavigating(false), LINK_PROGRESS_TIMEOUT_MS);
    }

    // Next's <Link> exposes no pending state to the layout rendering it, so the
    // click is the earliest point where feedback can start for link navigation.
    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      // Unmounting mid-navigation must not leave the timeout holding a state
      // setter for a component that no longer exists.
      if (linkTimeout.current !== null) {
        clearTimeout(linkTimeout.current);
        linkTimeout.current = null;
      }
    };
  }, [pathname]);

  const visible = isNavigating || linkNavigating;

  return (
    <NavigationProgressContext.Provider value={{ navigate }}>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none fixed inset-x-0 top-0 z-100 h-0.5 bg-primary/25 transition-opacity duration-200",
          visible ? "opacity-100" : "opacity-0",
        )}
      >
        <div className={cn("h-full w-full bg-primary", visible && "animate-pulse")} />
      </div>
      {children}
    </NavigationProgressContext.Provider>
  );
}

/** Programmatic navigation with the same pending feedback as link navigation. */
export function useRouteNavigate() {
  const context = useContext(NavigationProgressContext);
  if (!context) {
    throw new Error("useRouteNavigate must be used within NavigationProgressProvider");
  }
  return context.navigate;
}
