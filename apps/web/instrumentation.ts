import * as Sentry from "@sentry/nextjs";
import type { Instrumentation } from "next";

export async function register(): Promise<void> {
  // Suppress React 19 element.ref deprecation warning in development
  // This warning is caused by Next.js 16.1.0/Turbopack using React 19 internally
  // while the app uses React 18.2.0. It's a deprecation warning, not an error.
  // TODO: Remove this when dependencies are updated for React 19 compatibility
  // Use global process object (available in both Node.js and Edge runtime)
  if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
    const originalWarn = console.warn;
    const originalError = console.error;

    // Suppress React 19 ref deprecation warnings
    const suppressReact19RefWarning = (args: unknown[]): boolean => {
      // Check all arguments, not just the first one
      for (const arg of args) {
        let message: string;
        if (typeof arg === "string") {
          message = arg;
        } else {
          message = String(arg);
        }
        if (
          message.includes("Accessing element.ref was removed in React 19") ||
          message.includes("ref is now a regular prop") ||
          message.includes("It will be removed from the JSX Element type") ||
          message.includes("element.ref was removed") ||
          message.includes("elementRefGetterWithDeprecationWarning")
        ) {
          return true;
        }
      }
      return false;
    };

    console.warn = (...args: unknown[]): void => {
      if (suppressReact19RefWarning(args)) {
        return;
      }
      originalWarn.apply(console, args);
    };

    console.error = (...args: unknown[]): void => {
      if (suppressReact19RefWarning(args)) {
        return;
      }
      originalError.apply(console, args);
    };
  }

  if (typeof process !== "undefined" && process.env.NODE_ENV === "production") {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN && process.env.NEXT_RUNTIME === "nodejs") {
      await import("./sentry.server.config");
    }
    if (process.env.NEXT_PUBLIC_SENTRY_DSN && process.env.NEXT_RUNTIME === "edge") {
      await import("./sentry.edge.config");
    }
  }
}

export const onRequestError: Instrumentation.onRequestError = (
  err,
  request,
  context
) => {
  if (typeof process !== "undefined" && process.env.NODE_ENV === "production") {
    Sentry.captureRequestError(err, request, context);
  }
};
