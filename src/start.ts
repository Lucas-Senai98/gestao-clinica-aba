import { createStart, createMiddleware } from "@tanstack/react-start";
import { isRedirect, isNotFound } from "@tanstack/react-router";
import { renderErrorPage } from "./lib/error-page";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (
      isRedirect(error) ||
      isNotFound(error) ||
      error instanceof Response ||
      (error != null &&
        typeof error === "object" &&
        ("statusCode" in error || "status" in error))
    ) {
      throw error;
    }
    console.error("Unhandled server error:", error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware],
}));

