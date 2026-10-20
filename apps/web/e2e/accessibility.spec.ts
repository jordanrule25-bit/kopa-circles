import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { signInAs } from "./helpers";

// Automated accessibility audit (WCAG 2.1 A and AA) of the main pages for each role.
const PAGES: Array<[Parameters<typeof signInAs>[1], string[]]> = [
  ["sample-lender-demo", ["/", "/circles/sample-c5", "/circles/sample-c1", "/portfolio", "/platform", "/does-not-exist"]],
  ["sample-agent-eldoret", ["/agent", "/agent/circles/new"]],
  ["sample-admin", ["/admin", "/admin/listings", "/admin/repaying", "/admin/circles/sample-c6", "/admin/reserve"]],
];

for (const [user, paths] of PAGES) {
  for (const path of paths) {
    test(`${path} has no accessibility violations (${user})`, async ({ page }) => {
      await signInAs(page, user);
      await page.goto(path);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      const summary = results.violations.map((v) => `${v.impact} ${v.id}: ${v.help} (${v.nodes.length}) e.g. ${v.nodes[0]?.target.join(" ")}`);
      expect(summary).toEqual([]);
    });
  }
}
