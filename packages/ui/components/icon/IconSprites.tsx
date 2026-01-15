import SVG from "react-inlinesvg";

// eslint-disable-next-line turbo/no-undeclared-env-vars
const vercelCommitHash = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA;
const commitHash = vercelCommitHash ? `-${vercelCommitHash.slice(0, 7)}` : "";

export function IconSprites() {
  // Use relative path instead of NEXT_PUBLIC_WEBAPP_URL to avoid CORS issues
  // The sprite.svg is served from the same domain, so we don't need the full URL
  return (
    <SVG
      src={`/icons/sprite.svg?v=${process.env.NEXT_PUBLIC_CALCOM_VERSION}-${commitHash}`}
    />
  );
}

export default IconSprites;
