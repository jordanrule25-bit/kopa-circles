import { expect, test } from "@playwright/test";

// Placeholder until the three critical flows (lend, agent lists circle,
// weekly repayment run) exist in Milestones 1 and 2.
test("home page renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Kopa Circles" })).toBeVisible();
});
