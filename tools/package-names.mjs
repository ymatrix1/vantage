// The npm names and the repository URL, in ONE place (D93). Changing the scope or the product name is a
// one-line change here. packages/cli/src/install.ts looks the native package up by the same name and has
// a test that keeps the two in step.

/** npm scope that owns every published package. */
export const SCOPE = "@ymatrix1";
/** The product package. Its `bin` is still called `vantage`. */
export const MAIN_NAME = `${SCOPE}/vantage`;
/** Exactly the GitHub repository (npm trusted publishing and provenance compare it). */
export const REPOSITORY_URL = "https://github.com/ymatrix1/vantage";
/** File name of the workflow that publishes. A trusted publisher on npmjs.com names this exact file. */
export const PUBLISH_WORKFLOW = "release.yml";
/** GitHub environment the publish job runs in; the trusted publisher may name it too. */
export const PUBLISH_ENVIRONMENT = "npm-publish";

export const nativeName = (target) => `${SCOPE}/vantage-hook-${target}`;
