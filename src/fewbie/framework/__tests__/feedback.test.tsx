import "./dom";

import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { InlineErrorText } from "../feedback/inline-error-text";
import { InlineResult } from "../feedback/inline-result";

afterEach(cleanup);

describe("InlineResult", () => {
  test("announces a success politely", () => {
    render(<InlineResult tone="success" title="Saved" detail="3 records updated" />);
    assert.equal(screen.getByRole("status").getAttribute("aria-live"), "polite");
    assert.ok(screen.getByText("Saved"));
    assert.ok(screen.getByText("3 records updated"));
  });

  test("uses the alert role for errors", () => {
    render(<InlineResult tone="error" title="Failed" />);
    assert.ok(screen.getByRole("alert"));
    assert.equal(screen.queryByRole("status"), null);
  });

  test("keeps the same semantics in the compact variant", () => {
    render(<InlineResult tone="error" title="Failed" detail="retry later" compact />);
    assert.ok(screen.getByRole("alert"));
    assert.ok(screen.getByText("retry later"));
  });

  test("omits the detail line when there is none", () => {
    render(<InlineResult tone="info" title="Heads up" />);
    assert.ok(screen.getByText("Heads up"));
    assert.equal(screen.queryByText(/detail/), null);
  });
});

describe("InlineErrorText", () => {
  test("renders the message without a retry control", () => {
    render(<InlineErrorText>{"Could not load"}</InlineErrorText>);
    assert.ok(screen.getByText(/Could not load/));
    assert.equal(screen.queryByRole("button"), null);
  });

  test("renders a retry control only when a handler exists", async () => {
    let calls = 0;
    render(
      <InlineErrorText onRetry={() => (calls += 1)} retryLabel="Retry">
        {"Could not load"}
      </InlineErrorText>,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    assert.equal(calls, 1);
  });
});
