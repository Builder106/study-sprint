import { assertEquals, assertNotEquals } from "jsr:@std/assert";
import { validatePassword } from "./password.ts";

Deno.test("validatePassword - too short", () => {
  assertNotEquals(validatePassword("ab1cd"), null);
  assertNotEquals(validatePassword("Abc1!"), null); // 5 chars
  assertNotEquals(validatePassword(""), null);
  assertNotEquals(validatePassword("abc1234"), null); // 7 chars, just under min
});

Deno.test("validatePassword - all digits rejected", () => {
  assertNotEquals(validatePassword("12345678"), null);
  assertNotEquals(validatePassword("98765432100"), null);
});

Deno.test("validatePassword - common prefix rejected", () => {
  assertNotEquals(validatePassword("password123"), null);
  assertNotEquals(validatePassword("Password!"), null); // case-insensitive prefix
  assertNotEquals(validatePassword("qwerty789"), null);
  assertNotEquals(validatePassword("admin2024"), null);
  assertNotEquals(validatePassword("letmein!"), null);
  assertNotEquals(validatePassword("welcome1"), null);
  assertNotEquals(validatePassword("123456abc"), null);
  assertNotEquals(validatePassword("iloveyouforever"), null);
  assertNotEquals(validatePassword("abc123456"), null);
});

Deno.test("validatePassword - valid passwords return null", () => {
  assertEquals(validatePassword("Correct-Horse-Battery"), null);
  assertEquals(validatePassword("my$ecurePass9"), null);
  assertEquals(validatePassword("Tr0ub4dor&3"), null);
  assertEquals(validatePassword("xK9#mLqZ"), null); // 8 chars, mixed
});

Deno.test("validatePassword - exactly min length with letters is valid", () => {
  assertEquals(validatePassword("abcdefg1"), null); // 8 chars, has letters
});
