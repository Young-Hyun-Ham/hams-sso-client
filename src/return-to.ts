const DEFAULT_RETURN_TO = "/";

export function normalizeReturnTo(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return DEFAULT_RETURN_TO;
  }

  try {
    const parsed = new URL(value, "https://local.invalid");

    if (parsed.origin !== "https://local.invalid") {
      return DEFAULT_RETURN_TO;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return DEFAULT_RETURN_TO;
  }
}
