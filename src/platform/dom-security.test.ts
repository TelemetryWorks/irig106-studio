/**
 * Cookie domain-boundary regression for GHSA-5fpq-26gf-qwcr.
 * These isolated windows perform no network requests.
 */
import { Window } from "happy-dom";
import { describe, expect, it } from "vitest";

describe("DOM cookie domain isolation", () => {
  it.each(["not-example.test", "badexample.test"])(
    "rejects a cookie forged for example.test from %s",
    async (host) => {
      const window = new Window({ url: `https://${host}/` });
      try {
        window.document.cookie = "session=probe; Domain=example.test; Path=/; Secure";
        expect(window.document.cookie).toBe("");
      } finally {
        await window.happyDOM.close();
      }
    },
  );

  it("allows a parent-domain cookie from a real subdomain", async () => {
    const window = new Window({ url: "https://app.example.test/" });
    try {
      window.document.cookie = "session=probe; Domain=example.test; Path=/; Secure";
      expect(window.document.cookie).toBe("session=probe");
    } finally {
      await window.happyDOM.close();
    }
  });
});
