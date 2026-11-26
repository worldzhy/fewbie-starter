import "./dom";

import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import PageHeader from "../page/page-header";
import PageShell, { PageShellActions } from "../page/page-shell";
import { PaginationBar } from "../page/pagination-bar";

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

describe("PaginationBar", () => {
  const labels = {
    previous: "Previous",
    next: "Next",
    pageOf: (page: number, totalPages: number) => `Page ${page} of ${totalPages}`,
    recordCount: (total: number) => `${total} records`,
  };

  test("clamps the current page and disables the edges", () => {
    render(<PaginationBar page={9} pageSize={20} total={5} onPageChange={() => {}} labels={labels} />);
    assert.ok(screen.getByText("Page 1 of 1"));
    assert.ok(screen.getByText("5 records"));
    assert.ok((screen.getByRole("button", { name: /Previous/ }) as HTMLButtonElement).disabled);
    assert.ok((screen.getByRole("button", { name: /Next/ }) as HTMLButtonElement).disabled);
  });

  test("reports the requested zero-based page", () => {
    let nextPage = -1;
    render(
      <PaginationBar page={1} pageSize={20} total={45} onPageChange={(page) => (nextPage = page)} labels={labels} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    assert.equal(nextPage, 2);
    fireEvent.click(screen.getByRole("button", { name: /Previous/ }));
    assert.equal(nextPage, 0);
  });
});
