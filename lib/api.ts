// Production requests go through the frontend origin so the auth cookie is
// available to both browser requests and the Next.js middleware.
export const apiBaseUrl =
  process.env.NODE_ENV === "production" ? "" : process.env.NEXT_PUBLIC_BASE_URL || ""
