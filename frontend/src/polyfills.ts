import { Buffer } from "buffer";

const scope = globalThis as unknown as { Buffer?: typeof Buffer };
scope.Buffer ??= Buffer;
