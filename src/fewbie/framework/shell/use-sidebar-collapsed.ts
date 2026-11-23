"use client";

import * as React from "react";

const SIDEBAR_COLLAPSED_STORAGE_KEY = "fewbie:sidebar-collapsed";

// External store so every sidebar shell shares one preference without
// setState-in-effect hydration churn. Sidebars render expanded on the server;
// the stored value is applied after hydration.
const collapsedListeners = new Set<() => void>();

function subscribeCollapsed(callback: () => void): () => void {
  collapsedListeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    collapsedListeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function getCollapsedSnapshot(): boolean {
  return window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "1";
}

function setStoredCollapsed(value: boolean) {
  window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, value ? "1" : "0");
  collapsedListeners.forEach((listener) => listener());
}

/** Persisted collapsed state shared by every sidebar instance. */
export function useSidebarCollapsed(): [boolean, (value: boolean) => void] {
  const collapsed = React.useSyncExternalStore(subscribeCollapsed, getCollapsedSnapshot, () => false);
  return [collapsed, setStoredCollapsed];
}
