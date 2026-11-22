import "./dom";

import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import { cleanup, render, screen } from "@testing-library/react";

import PageHeader from "../page/page-header";
import PageShell, { PageShellActions } from "../page/page-shell";

afterEach(cleanup);

describe("PageHeader", () => {
  test("renders an h1 with subtitle and actions by default", () => {
    render(<PageHeader title="Projects" subtitle="All managed projects" actions={<button>{"New"}</button>} />);
    assert.equal(screen.getByRole("heading", { level: 1 }).textContent, "Projects");
    assert.ok(screen.getByText("All managed projects"));
    assert.ok(screen.getByRole("button", { name: "New" }));
  });

  test("honours the requested heading level", () => {
    render(<PageHeader title="Nested" headingLevel={2} />);
    assert.ok(screen.getByRole("heading", { level: 2, name: "Nested" }));
  });

  test("omits the optional regions", () => {
    render(<PageHeader title="Bare" />);
    assert.equal(screen.queryByRole("button"), null);
    assert.equal(document.querySelector("p"), null);
  });
});

describe("PageShell", () => {
  test("renders no header without a title", () => {
    render(<PageShell>{"body only"}</PageShell>);
    assert.equal(screen.queryByRole("heading"), null);
    assert.ok(screen.getByText("body only"));
  });

  test("renders the header when a title is supplied", () => {
    render(
      <PageShell title="Overview" subtitle="Platform health">
        {"content"}
      </PageShell>,
    );
    assert.ok(screen.getByRole("heading", { level: 1, name: "Overview" }));
    assert.ok(screen.getByText("Platform health"));
  });

  test("merges layout actions with page actions", () => {
    render(
      <PageShellActions actions={<button>{"Switch"}</button>}>
        <PageShell title="Overview" actions={<button>{"Refresh"}</button>}>
          {"content"}
        </PageShell>
      </PageShellActions>,
    );
    assert.ok(screen.getByRole("button", { name: "Switch" }));
    assert.ok(screen.getByRole("button", { name: "Refresh" }));
  });

  test("centres the default canvas width", () => {
    const { container } = render(<PageShell width="default">{"content"}</PageShell>);
    const root = container.firstElementChild as HTMLElement;
    assert.ok(root.className.includes("max-w-6xl"));
  });
});
