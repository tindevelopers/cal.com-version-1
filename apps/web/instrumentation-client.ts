// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import process from "node:process";
import * as Sentry from "@sentry/nextjs";
import { initBotId } from "botid/client/core";

// Suppress React 19 element.ref deprecation warning in development (client-side)
// This warning is caused by Next.js 16.1.0/Turbopack using React 19 internally
// while the app uses React 18.2.0. It's a deprecation warning, not an error.
// TODO: Remove this when dependencies are updated for React 19 compatibility
if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
  const originalWarn = console.warn;
  const originalError = console.error;

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

if (process.env.NODE_ENV === "production") {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN_CLIENT,

    sampleRate: parseFloat(process.env.SENTRY_SAMPLE_RATE ?? "1.0") || 1.0,
    // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.0") || 0.0,

    // Define how likely Replay events are sampled.
    // This sets the sample rate to be 10%. You may want this to be 100% while
    // in development and sample at a lower rate in production
    // replaysSessionSampleRate: parseFloat(process.env.SENTRY_REPLAYS_SESSION_SAMPLE_RATE ?? "0.0") || 0.0,

    // Define how likely Replay events are sampled when an error occurs.
    // replaysOnErrorSampleRate: parseFloat(process.env.SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE ?? "0.0") || 0.0,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: !!process.env.SENTRY_DEBUG,
    beforeSend(event, hint) {
      if (
        event.exception?.values?.some(
          (e) =>
            // Ignore fake error "UnhandledRejection: Non-Error promise rejection captured with value: Object Not Found Matching Id:3, MethodName:update, ParamCount:4"
            // Raised GH issue: https://github.com/getsentry/sentry-javascript/issues/3440
            e.value?.includes("Non-Error promise rejection captured with") ||
            e.value?.includes("Object Not Found Matching Id")
        )
      ) {
        return null;
      }

      event.tags = {
        ...event.tags,
        errorSource: "client",
      };
      return event;
    },
  });
}

function onRouterTransitionStart(url: string, navigationType: "push" | "replace" | "traverse"): void {
  if (process.env.NODE_ENV === "production") {
    Sentry.captureRouterTransitionStart(url, navigationType);
  }
}

export { onRouterTransitionStart };

if (
  process.env.NEXT_PUBLIC_VERCEL_USE_BOTID_IN_BOOKER === "1" &&
  typeof window !== "undefined" &&
  typeof window.crypto?.getRandomValues === "function" &&
  typeof window.crypto?.randomUUID === "function"
) {
  initBotId({
    protect: [
      {
        path: "/api/book/event",
        method: "POST",
      },
    ],
  });
}
