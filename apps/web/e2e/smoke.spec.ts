import { expect, test } from "@playwright/test";

test("home page renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Small loans that grow together." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Kopa Circles" })).toBeVisible();
});
