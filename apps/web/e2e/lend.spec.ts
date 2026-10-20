import { expect, test } from "@playwright/test";
import { formCircle, run, signInAs } from "./helpers";

// Critical flow: a lender funds part of a circle and sees it in their portfolio.
test("lender lends $25 to a raising circle", async ({ page }) => {
  const tag = run();
  const name = `Lend Flow ${tag}`;
  const circleId = await formCircle(page, name, tag);

  await signInAs(page, "sample-admin");
  await page.goto("/admin");
  await page.getByTestId(`review-${circleId}`).getByRole("button", { name: "Approve listing" }).click();
  await expect(page.getByTestId(`raising-${circleId}`)).toBeVisible();

  await signInAs(page, "sample-lender-demo");
  await page.goto(`/circles/${circleId}`);
  const before = await page.getByTestId("balance").innerText();
  await page.getByRole("form", { name: `Lend to ${name}` }).getByText("$25", { exact: true }).click();
  await page.getByRole("button", { name: "Lend $25" }).click();
  await expect(page.getByText("Your loan share is in")).toBeVisible();
  await expect(page.getByTestId("balance")).not.toHaveText(before);

  await page.goto("/portfolio");
  await expect(page.getByRole("row", { name: new RegExp(name) })).toContainText("$25");
});
