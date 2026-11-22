import { JSDOM } from "jsdom";

/**
 * jsdom bootstrap for the framework rendering tests.
 *
 * These tests live in the repository root `test/` tree, outside the template
 * payload, so `fewbie template update` never ships them and existing hosts do
 * not need the extra devDependencies. They protect the framework files before
 * a template release distributes a regression.
 */
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost:3000",
  pretendToBeVisual: true,
});

const browserGlobals = [
  "window",
  "document",
  "navigator",
  "HTMLElement",
  "Element",
  "Node",
  "Event",
  "MouseEvent",
  "KeyboardEvent",
  "FocusEvent",
] as const;

for (const key of browserGlobals) {
  Object.defineProperty(globalThis, key, {
    value: (dom.window as unknown as Record<string, unknown>)[key],
    configurable: true,
    writable: true,
  });
}

Object.defineProperty(globalThis, "getComputedStyle", {
  value: dom.window.getComputedStyle.bind(dom.window),
  configurable: true,
  writable: true,
});
Object.defineProperty(globalThis, "requestAnimationFrame", {
  value: dom.window.requestAnimationFrame.bind(dom.window),
  configurable: true,
  writable: true,
});
Object.defineProperty(globalThis, "cancelAnimationFrame", {
  value: dom.window.cancelAnimationFrame.bind(dom.window),
  configurable: true,
  writable: true,
});
Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
  value: true,
  configurable: true,
  writable: true,
});
