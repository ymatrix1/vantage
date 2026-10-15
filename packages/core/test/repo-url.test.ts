// Synthetic remotes only. A repo link comes from a normalised remote and nothing else.
import { describe, expect, it } from "vitest";
import { normalizeRemoteUrl, projectNameOf, repoUrlOf, repoKey } from "../src/index.ts";

const AT = "@"; // built, not written out, so the repo scanner does not mistake a remote for an email

describe("repoUrlOf", () => {
  it.each([
    ["ssh remote", `git${AT}github.com:Acme/Web.git`, "https://github.com/acme/web"],
    ["https remote", "https://github.com/acme/web.git", "https://github.com/acme/web"],
    [
      "https with credentials and port",
      `https://user:pw${AT}git.example.com:8443/team/sub/web`,
      "https://git.example.com/team/sub/web",
    ],
    ["ssh url form", `ssh://git${AT}gitlab.com/acme/web.git`, "https://gitlab.com/acme/web"],
  ])("%s", (_n, remote, url) => {
    expect(repoUrlOf(normalizeRemoteUrl(remote))).toBe(url);
    expect(repoUrlOf(repoKey(remote, "abc123"))).toBe(url);
  });

  it("gives no link for a folder name, no remote, empty or odd characters", () => {
    for (const v of [
      null,
      undefined,
      "",
      "brave-joliot-995ebc",
      "no-remote",
      "no-remote#abc",
      "github.com/onlyowner",
      "github.com/a/b c",
      'github.com/a/"><b>',
      "javascript:alert(1)",
      "evil.com/a/b?x=1",
    ]) {
      expect(repoUrlOf(v)).toBeNull();
    }
  });
});

describe("projectNameOf", () => {
  it("is owner/repo for a remote and the folder name otherwise", () => {
    expect(projectNameOf("github.com/acme/web#abc")).toBe("acme/web");
    expect(projectNameOf("proj")).toBe("proj");
    expect(projectNameOf("no-remote#abc")).toBeNull();
    expect(projectNameOf(null)).toBeNull();
  });
});
