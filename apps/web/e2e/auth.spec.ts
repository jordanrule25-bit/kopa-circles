import { expect, test } from "@playwright/test";
import { run } from "./helpers";

// Real sign-in flows. In development, links and codes land in the dev outbox.

test("protected pages send signed-out visitors to sign in", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/portfolio");
  await expect(page).toHaveURL(/\/signin/);
  await page.goto("/agent");
  await expect(page).toHaveURL(/\/signin\/agent/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/signin\?need=admin/);
});

test("a new lender signs up with an email link", async ({ page }) => {
  await page.context().clearCookies();
  const email = `e2e-${run()}@example.com`;
  await page.goto("/signin");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();

  await page.goto("/dev/outbox");
  const message = page.getByTestId("dev-message").filter({ hasText: email }).first();
  await message.getByRole("link").click();
  await expect(page).toHaveURL(/\/portfolio/);
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();

  // The same link can't be used twice.
  await page.goto("/dev/outbox");
  const href = await page.getByTestId("dev-message").filter({ hasText: email }).first().getByRole("link").getAttribute("href");
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.goto(href!);
  await expect(page).toHaveURL(/error=link/);
});

test("an agent signs in with a texted code", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/signin/agent");
  await page.getByLabel("Your mobile number").fill("0700 000 004"); // fictional Eldoret sample agent
  await page.getByRole("button", { name: "Text me a code" }).click();
  await expect(page.getByLabel("Code")).toBeVisible();

  const outbox = await page.context().newPage();
  await outbox.goto("/dev/outbox");
  const text = await outbox.getByTestId("dev-message").filter({ hasText: "+254700000004" }).first().innerText();
  const code = text.match(/\b(\d{6})\b/)![1]!;
  await outbox.close();

  await page.getByLabel("Code").fill(code);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/agent$/);
  await expect(page.getByRole("heading", { name: "My circles" })).toBeVisible();
});
