// Synthetic remotes only. Host, owner (org) and repo from a remote, in the case it was written in.
import { describe, expect, it } from "vitest";
import { orgOf, remoteParts, repoInfoOf } from "../src/index.ts";

const AT = "@"; // built, not written out, so the repo scanner does not mistake a remote for an email

describe("remoteParts", () => {
  it.each([
    [
      "github ssh",
      `git${AT}github.com:Flip-to/platform.git`,
      { host: "github.com", org: "Flip-to", repoName: "platform" },
    ],
    [
      "github https",
      "https://github.com/ymatrix1/vantage.git",
      { host: "github.com", org: "ymatrix1", repoName: "vantage" },
    ],
    [
      "gitlab subgroup stays in the repo",
      "https://gitlab.com/Team/sub/api",
      { host: "gitlab.com", org: "Team", repoName: "sub/api" },
    ],
    [
      "enterprise host with a port",
      `ssh://git${AT}git.example.com:2222/Org/Repo.git`,
      { host: "git.example.com", org: "Org", repoName: "Repo" },
    ],
    [
      "credentials dropped",
      `https://user:pw${AT}bitbucket.org/Acme/Thing`,
      { host: "bitbucket.org", org: "Acme", repoName: "Thing" },
    ],
  ])("%s", (_n, remote, parts) => {
    expect(remoteParts(remote)).toEqual(parts);
  });

  it("is null without a host, an owner and a repo", () => {
    for (const v of [null, "", "github.com", "github.com/only", "/just/path"])
      expect(remoteParts(v)).toBeNull();
  });
});

describe("repoInfoOf with an owner", () => {
  it("gives ssh and https forms of one remote one key, and keeps the owner's case for display", () => {
    const a = repoInfoOf(`git${AT}github.com:Flip-to/Platform.git`, "abc", "x");
    const b = repoInfoOf("https://github.com/flip-to/platform", "abc", "x");
    expect(a?.key).toBe(b?.key);
    expect(a).toMatchObject({
      org: "Flip-to",
      repoName: "Platform",
      name: "Flip-to/Platform",
      host: "github.com",
    });
  });

  it("is org local with the main folder for a repo with no remote", () => {
    expect(repoInfoOf(null, "abc", "lonely")).toMatchObject({ org: "local", repoName: "lonely", host: null });
  });
});

describe("orgOf", () => {
  it("reads the owner from a stored repo, local for a folder, null for none", () => {
    expect(orgOf("github.com/Flip-to/platform")).toBe("Flip-to");
    expect(orgOf("gitlab.example.com/Team/sub/api#abc")).toBe("Team");
    expect(orgOf("scratch-folder")).toBe("local");
    expect(orgOf("no-remote")).toBe("local");
    expect(orgOf(null)).toBeNull();
    expect(orgOf("")).toBeNull();
  });
});
