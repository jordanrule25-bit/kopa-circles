import { expect, test } from "@playwright/test";
import { formCircle, run, signInAs } from "./helpers";

// Critical flow: admin disburses a circle and records a weekly meeting,
// including a payment the circle covers for one member.
test("admin disburses and records a weekly meeting", async ({ page }) => {
  const tag = run();
  const name = `Repay Flow ${tag}`;
  const circleId = await formCircle(page, name, tag);

  await signInAs(page, "sample-admin");
  await page.goto("/admin");
  await page.getByTestId(`review-${circleId}`).getByRole("button", { name: "Approve listing" }).click();

  const raising = page.getByTestId(`raising-${circleId}`);
  await raising.getByLabel(/funded outside the platform/).check();
  await raising.getByRole("button", { name: "Mark disbursed" }).click();
  // Disbursed circles leave the raising list and appear under Repaying.
  await expect(raising).toHaveCount(0);
  await page.goto("/admin/repaying");
  await page.getByRole("link", { name }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();

  // The first installment isn't due yet, so "owed now" is the week-1 amount. Okoth pays half; the circle covers the rest.
  await page.getByLabel("Paid by Okoth J.").fill("398");
  await page.getByLabel("Circle covered for Okoth J.").fill("398");
  await page.getByRole("button", { name: "Save meeting" }).click();
  await expect(page.getByText(/Recorded KSh 3,184 collected/)).toBeVisible();

  await page.reload();
  await expect(page.getByRole("row", { name: /Okoth J\..*Clean cookstoves/ })).toContainText("KSh 398");
});
