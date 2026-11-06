import { afterEach, describe, expect, it, vi } from "vitest";
import { firstName, hostOf, initials, projectCover, projectImage, publicUrl, safeHref, siteBaseUrl, slugify } from "@/features/site-builder/lib/links";

afterEach(() => vi.unstubAllEnvs());

describe("safeHref (public pages render user-supplied links)", () => {
  it("allows only http and https", () => {
    expect(safeHref("https://github.com/x")).toBe("https://github.com/x");
    expect(safeHref("http://example.com")).toBe("http://example.com/");
    for (const bad of ["javascript:alert(1)", "data:text/html,<script>", "JAVASCRIPT:alert(1)", "ftp://x.com", "github.com/x", "", null, undefined]) {
      expect(safeHref(bad)).toBeUndefined();
    }
  });
});

describe("project covers", () => {
  it("prefers the owner's image, then a screenshot of the live site, then a named placeholder", () => {
    expect(projectCover({ title: "A", imageUrl: "https://img.example/a.png", liveUrl: "https://a.dev" })).toBe("https://img.example/a.png");
    expect(projectCover({ title: "A", liveUrl: "https://a.dev" })).toBe("https://image.thum.io/get/width/600/crop/800/https://a.dev/");
    expect(projectCover({ title: "Velox Ride" })).toContain("text=Velox+Ride");
  });

  it("never turns an unsafe link into an image source", () => {
    expect(projectImage({ imageUrl: "javascript:alert(1)", liveUrl: "data:x" })).toBeUndefined();
  });
});

describe("text helpers", () => {
  it("formats hosts, slugs, names and initials", () => {
    expect(hostOf("https://www.github.com/x")).toBe("github.com");
    expect(hostOf("javascript:x")).toBe("");
    expect(slugify("  CodeForge AI!! ")).toBe("codeforge-ai");
    expect(slugify("!!!")).toBe("item");
    expect(firstName("  Mohit Kumar Yadav ")).toBe("Mohit");
    expect(firstName("")).toBe("this developer");
    expect(initials("mohit kumar yadav")).toBe("MY");
    expect(initials("")).toBe("?");
  });
});

describe("public portfolio links", () => {
  it("uses NEXT_PUBLIC_BASE_URL without a trailing slash", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_URL", "https://osp.example.com/app/");
    expect(siteBaseUrl()).toBe("https://osp.example.com/app");
    expect(publicUrl("mohit")).toBe("https://osp.example.com/app/p/mohit");
  });

  it("ignores a malformed or non-http base URL", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_URL", "javascript:alert(1)");
    expect(siteBaseUrl()).toBe(""); // no window in unit tests: nothing hardcoded either
  });
});
