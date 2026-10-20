import { expect, test } from "@playwright/test";

test("home page renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Lend \$25 to a circle/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Kopa Circles" })).toBeVisible();
});
