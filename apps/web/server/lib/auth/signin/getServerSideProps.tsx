import type { GetServerSidePropsContext } from "next";
import { getCsrfToken, getProviders } from "next-auth/react";

export async function getServerSideProps(context: GetServerSidePropsContext) {
  // Handle CSRF token fetch gracefully - it may fail during SSR if server can't reach itself
  let csrfToken: string | undefined;
  try {
    csrfToken = await getCsrfToken(context);
  } catch (error) {
    // Log but don't fail - CSRF token will be fetched client-side if needed
    let errorMessage: string;
    if (error instanceof Error) {
      errorMessage = error.message;
    } else {
      errorMessage = String(error);
    }
    console.warn("Failed to fetch CSRF token during SSR:", errorMessage);
    csrfToken = undefined;
  }

  const providers = await getProviders();
  return {
    props: {
      csrfToken,
      providers,
    },
  };
}
