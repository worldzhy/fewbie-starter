"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "cn";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/fewbie/ui/alert-dialog";
import { Input } from "@/fewbie/ui/input";

// Options accepted by the imperative confirm() call.
export interface ConfirmOptions {
  // Dialog title node.
  title?: React.ReactNode;
  // Body content node (alias of `description` for the legacy confirm API).
  description?: React.ReactNode;
  // Aliased to `description` when both are provided `description` wins.
  content?: React.ReactNode;
  // Confirm button text (default "OK" or "Confirm" depending on destructive flag).
  confirmationText?: string;
  // Cancel button text (default "Cancel").
  cancellationText?: string;
  // Hide the cancel button entirely (single-action alert, e.g. test result).
  hideCancelButton?: boolean;
  // Render the confirm button in destructive style.
  destructive?: boolean;
  // Disable the confirm button, e.g. for actions the product does not
  // support yet while still showing the explanatory dialog.
  disableConfirmButton?: boolean;
  // Disable the close-on-outside-click and escape key. Defaults to false: the
  // dialog stays dismissible unless the caller explicitly locks it.
  disableCloseOnDismiss?: boolean;
  // Require the user to type the exact `expected` text before the confirm
  // button becomes clickable. Used for irreversible deletes where the target
  // name must be acknowledged.
  requireText?: {
    // Text the user has to type, matched exactly (case-sensitive).
    expected: string;
    // Prompt rendered above the input.
    label: React.ReactNode;
    placeholder?: string;
  };
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<void>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

// Storage slot for the pending promise resolvers while a dialog is visible.
// We resolve the promise when the user clicks confirm, and reject on cancel
// or dismiss so callers can wire `.then(() => act()).catch(() => {})`.
interface PendingState {
  options: ConfirmOptions;
  resolve: () => void;
  reject: () => void;
}

/**
 * Provider that exposes an imperative `useConfirm()` hook backed by the
 * alert-dialog primitives, so each page does not need to manage its own
 * confirm state.
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const t = useTranslations("framework.common");
  const [pending, setPending] = useState<PendingState | null>(null);
  // Keep the latest pending promise resolvers in a ref so we can settle them
  // from effect-less callbacks without stale state closures.
  const pendingRef = useRef<PendingState | null>(null);
  // Current input value for the `requireText` gate, reset on every new dialog.
  const [requiredTextValue, setRequiredTextValue] = useState("");

  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<void>((resolve, reject) => {
      // Replace any in-flight pending dialog. The previous promise rejects as a
      // "superseded" cancel — callers that wire `.catch(() => {})` swallow it.
      const previous = pendingRef.current;
      pendingRef.current = { options, resolve, reject };
      setRequiredTextValue("");
      setPending({ options, resolve, reject });
      if (previous) {
        previous.reject();
      }
    });
  }, []);

  const handleConfirm = useCallback(() => {
    pendingRef.current?.resolve();
    pendingRef.current = null;
    setPending(null);
  }, []);

  const handleCancel = useCallback(() => {
    pendingRef.current?.reject();
    pendingRef.current = null;
    setPending(null);
  }, []);

  // Auto-cleanup on unmount: reject any pending dialog so no promise leaks.
  useEffect(() => {
    return () => {
      pendingRef.current?.reject();
      pendingRef.current = null;
    };
  }, []);

  const isOpen = pending !== null;
  const options = pending?.options ?? {};
  const body = options.description ?? options.content;
  const confirmationText = options.confirmationText ?? (options.destructive ? t("delete") : t("ok"));
  const cancellationText = options.cancellationText ?? t("cancel");
  // When `requireText` is set, the confirm action stays disabled until the
  // typed value matches the expected text exactly.
  const isConfirmDisabled =
    options.disableConfirmButton ||
    (options.requireText !== undefined && requiredTextValue !== options.requireText.expected);
  // AlertDialog stops propagation by default; when `disableCloseOnDismiss`
  // is set we render `onOpenChange` as a no-op so escape/overlay cannot cancel.
  const handleOpenChange = options.disableCloseOnDismiss
    ? undefined
    : (open: boolean) => {
        if (!open) handleCancel();
      };
  // A cancel button is the only close affordance a Radix AlertDialog has. Hiding
  // it while the confirm action is disabled used to leave the dialog with no way
  // out at all (R82-18); the fallback keeps one escape hatch.
  const showCancel = !options.hideCancelButton || isConfirmDisabled;

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            {/* AlertDialogTitle must not be empty: Radix warns about a dialog
                without an accessible name (R82-18). */}
            <AlertDialogTitle>{options.title ?? t("confirm")}</AlertDialogTitle>
            {body ? (
              <AlertDialogDescription asChild>
                <div>{body}</div>
              </AlertDialogDescription>
            ) : null}
          </AlertDialogHeader>
          {options.requireText ? (
            <div className="space-y-2">
              <label htmlFor="confirm-required-text" className="block text-sm font-medium">
                {options.requireText.label}
              </label>
              <Input
                id="confirm-required-text"
                value={requiredTextValue}
                onChange={(event) => setRequiredTextValue(event.target.value)}
                placeholder={options.requireText.placeholder}
                autoComplete="off"
                autoFocus
              />
            </div>
          ) : null}
          <AlertDialogFooter>
            {showCancel ? <AlertDialogCancel onClick={handleCancel}>{cancellationText}</AlertDialogCancel> : null}
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={isConfirmDisabled}
              className={cn(
                options.destructive && "bg-destructive text-destructive-foreground hover:bg-destructive/90",
              )}
            >
              {confirmationText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

/**
 * Hook used by pages that need an imperative confirm dialog. Must be called
 * within a `ConfirmProvider` subtree.
 *
 * @example
 * const confirm = useConfirm();
 * await confirm({ title: 'Delete user?', description: 'This cannot be undone.', destructive: true });
 */
export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return ctx.confirm;
}
