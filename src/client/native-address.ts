const prefix = "dsh-resource://file/session/";

export type NativeFileAddress = { sessionId: string; path: string };

function encodeSegment(segment: string): string {
  return encodeURIComponent(segment).replace(/%3A/gi, ":");
}

export function nativeFileAddress(path: string, sessionId: string): string {
  const normalized = path.replace(/\\/g, "/").replace(/^(?:\.\/)+/, "");
  const encodedPath = normalized.split("/").map(encodeSegment).join("/");
  return `${prefix}${encodeSegment(sessionId)}/${encodedPath}`;
}

export function parseNativeFileAddress(address: string): NativeFileAddress | undefined {
  try {
    const withoutSuffix = address.split(/[?#]/, 1)[0];
    if (!withoutSuffix.startsWith(prefix)) return undefined;
    const [encodedSessionId, ...segments] = withoutSuffix.slice(prefix.length).split("/");
    if (!encodedSessionId || segments.length === 0) return undefined;
    const sessionId = decodeURIComponent(encodedSessionId);
    const path = segments.map(decodeURIComponent).join("/");
    return sessionId && path ? { sessionId, path } : undefined;
  } catch {
    return undefined;
  }
}

export function nativeFilePath(address: string): string | undefined {
  return parseNativeFileAddress(address)?.path;
}

export function nativeFileTitle(address: string): string {
  return nativeFilePath(address)?.split("/").filter(Boolean).at(-1) ?? "File";
}
