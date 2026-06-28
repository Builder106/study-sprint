import { assertEquals, assertStringIncludes } from "jsr:@std/assert";
import { getAvatarUrl } from "./avatar.ts";

Deno.test("getAvatarUrl - uses dicebear endpoint", () => {
  assertStringIncludes(getAvatarUrl("alice"), "dicebear.com");
});

Deno.test("getAvatarUrl - embeds seed in URL", () => {
  assertStringIncludes(getAvatarUrl("alice"), "seed=alice");
});

Deno.test("getAvatarUrl - null seed falls back to anon", () => {
  assertStringIncludes(getAvatarUrl(null), "seed=anon");
});

Deno.test("getAvatarUrl - undefined seed falls back to anon", () => {
  assertStringIncludes(getAvatarUrl(undefined), "seed=anon");
});

Deno.test("getAvatarUrl - empty string falls back to anon", () => {
  assertStringIncludes(getAvatarUrl(""), "seed=anon");
});

Deno.test("getAvatarUrl - whitespace-only falls back to anon", () => {
  assertStringIncludes(getAvatarUrl("   "), "seed=anon");
});

Deno.test("getAvatarUrl - spaces are percent-encoded", () => {
  assertStringIncludes(getAvatarUrl("alice smith"), "alice%20smith");
});

Deno.test("getAvatarUrl - same seed produces same URL", () => {
  assertEquals(getAvatarUrl("bob"), getAvatarUrl("bob"));
});

Deno.test("getAvatarUrl - different seeds produce different URLs", () => {
  const a = getAvatarUrl("alice");
  const b = getAvatarUrl("bob");
  assertEquals(a === b, false);
});
