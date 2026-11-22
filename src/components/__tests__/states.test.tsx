import "./dom";

import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { EmptyState } from "../../framework/states/empty-state";
import { ErrorState } from "../../framework/states/error-state";
import { LoadingState } from "../../framework/states/loading-state";

afterEach(cleanup);

describe("LoadingState", () => {
  test("exposes a polite status with the host label", () => {
    render(<LoadingState label="Loading projects" />);
    assert.equal(screen.getByRole("status").getAttribute("aria-live"), "polite");
    assert.ok(screen.getByText("Loading projects"));
  });

  test("renders without a label", () => {
    render(<LoadingState />);
    assert.ok(screen.getByRole("status"));
  });
});

describe("EmptyState", () => {
  test("renders host copy, description and action", () => {
    render(<EmptyState title="No projects" description="Create one to begin." action={<button>{"Create"}</button>} />);
    assert.ok(screen.getByText("No projects"));
    assert.ok(screen.getByText("Create one to begin."));
    assert.ok(screen.getByRole("button", { name: "Create" }));
  });

  test("hides the description and action when absent", () => {
    render(<EmptyState title="Nothing yet" />);
    assert.ok(screen.getByText("Nothing yet"));
    assert.equal(screen.queryByRole("button"), null);
  });
});

describe("ErrorState", () => {
  test("renders the failure copy", () => {
    render(<ErrorState title="Load failed" description="The backend did not respond." />);
    assert.ok(screen.getByText("Load failed"));
    assert.ok(screen.getByText("The backend did not respond."));
    assert.equal(screen.queryByRole("button"), null);
  });

  test("runs the retry callback", async () => {
    let calls = 0;
    render(<ErrorState title="Load failed" retryLabel="Try again" onRetry={() => (calls += 1)} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Try again" }));
    assert.equal(calls, 1);
  });
});
