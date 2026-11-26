import "./dom";

import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import { cleanup, render } from "@testing-library/react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiError } from "@/lib/api-client/failure";
import { notifyError } from "@/lib/api-client/error-channel";
import { ApiErrorMessageProvider, ApiErrorToast, resolveApiErrorMessage } from "../feedback/api-error-toast";
import { QueryProvider, getQueryClient } from "../providers/query-provider";

afterEach(cleanup);

/** Replace one sonner toast method for the duration of `run`. */
async function captureToasts(run: () => Promise<void> | void): Promise<string[]> {
  const original = toast.error;
  const messages: string[] = [];
  toast.error = ((message: string) => {
    messages.push(message);
    return 0;
  }) as typeof toast.error;
  try {
    await run();
  } finally {
    toast.error = original;
  }
  return messages;
}

describe("resolveApiErrorMessage", () => {
  test("falls back to the server message when the host maps nothing", () => {
    const error = new ApiError("Upstream failed", 500);
    assert.equal(resolveApiErrorMessage(error), "Upstream failed");
    assert.equal(
      resolveApiErrorMessage(error, () => undefined),
      "Upstream failed",
    );
  });

  test("prefers the host mapping", () => {
    const error = new ApiError("Request failed with status code 403", 403);
    assert.equal(
      resolveApiErrorMessage(error, () => "You do not have permission to do that"),
      "You do not have permission to do that",
    );
  });

  test("treats a blank mapping as a gap and keeps the server message", () => {
    const error = new ApiError("Request failed with status code 403", 403);
    assert.equal(
      resolveApiErrorMessage(error, () => "   "),
      "Request failed with status code 403",
    );
  });

  test("returns nothing when neither side has text", () => {
    const error = new ApiError("   ", 500);
    assert.equal(
      resolveApiErrorMessage(error, () => ""),
      undefined,
    );
  });
});

describe("ApiErrorToast", () => {
  test("renders the host-mapped copy for a failed request", async () => {
    const messages = await captureToasts(async () => {
      render(
        <ApiErrorMessageProvider mapError={() => "No permission"}>
          <ApiErrorToast />
        </ApiErrorMessageProvider>,
      );
      notifyError(new ApiError("Request failed with status code 403", 403));
    });
    assert.deepEqual(messages, ["No permission"]);
  });

  test("renders the server message when the host mapped nothing", async () => {
    const messages = await captureToasts(async () => {
      render(<ApiErrorToast />);
      notifyError(new ApiError("Service unavailable", 503));
    });
    assert.deepEqual(messages, ["Service unavailable"]);
  });

  test("stays silent for a failure without text", async () => {
    const messages = await captureToasts(async () => {
      render(<ApiErrorToast />);
      notifyError(new ApiError("   ", 500));
    });
    assert.deepEqual(messages, []);
  });
});

describe("QueryProvider", () => {
  test("serves every consumer the same tab-wide client", () => {
    let fromContext: unknown;
    function Probe() {
      fromContext = useQueryClient();
      return null;
    }
    render(
      <QueryProvider>
        <Probe />
      </QueryProvider>,
    );
    assert.equal(fromContext, getQueryClient());
    assert.equal(getQueryClient(), getQueryClient());
  });
});
