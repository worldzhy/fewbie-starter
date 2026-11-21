"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import { onError } from "@/lib/api-client";

/**
 * Default subscriber for the api-client error channel.
 *
 * The client buffers failed requests until someone subscribes, and drops the
 * oldest after five, so without this component the "default error toast" the
 * client documents never appeared (R82-17). Mounted once by the root layout.
 */
export function ApiErrorToast() {
  useEffect(
    () =>
      onError((error) => {
        if (error.message) toast.error(error.message);
      }),
    [],
  );
  return null;
}
