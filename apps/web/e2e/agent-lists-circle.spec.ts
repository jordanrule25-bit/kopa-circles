import { expect, test } from "@playwright/test";
import { addMember, MEMBERS, run, signInAs } from "./helpers";

// Critical flow: an agent forms a circle, checks limits and submits it for listing.
// Needs the fictional seed data (pnpm db:seed). All people here are fictional.
const tag = run();

test.beforeEach(async ({ page }) => signInAs(page, "sample-agent-eldoret"));

test("agent forms a circle, sees limits and submits it for listing", async ({ page }) => {
  await page.goto("/agent");
  await page.getByRole("link", { name: "New circle" }).click();

  const circleName = `Test Circle ${tag}`;
  await page.getByLabel("Circle name").fill(circleName);
  await page.getByLabel("Their story").fill("Fictional test circle created by the Playwright agent flow.");
  await page.getByRole("button", { name: "Create circle" }).click();
  await expect(page.getByRole("heading", { name: circleName })).toBeVisible();
  await expect(page.getByTestId("circle-status")).toHaveText("Forming");

  for (const [i, m] of MEMBERS.entries()) await addMember(page, `07${tag}0${i}`, `9${tag}${i}`, m);

  // Ochieng has 3 bureau loans; the other four get the $150 first-loan cap.
  await expect(page.getByRole("row", { name: /Ochieng V\./ })).toContainText("Declined");
  await expect(page.getByRole("row", { name: /Okoth J\./ })).toContainText("$150 · KSh 19,350");
  await expect(page.getByTestId("verdict")).toContainText("4 of 5 members qualify for KSh 77,400 in total");

  await page.getByRole("button", { name: "Submit for listing" }).click();
  await expect(page.getByTestId("circle-status")).toHaveText("Waiting for approval");
  await expect(page.getByText("4 loans listed for KSh 77,400")).toBeVisible();
  await expect(page.getByRole("row", { name: /Ochieng V\./ })).toContainText("did not qualify");
});

test("a person can't join two active circles", async ({ page }) => {
  for (const suffix of ["A", "B"]) {
    await page.goto("/agent/circles/new");
    await page.getByLabel("Circle name").fill(`Dup Check ${suffix} ${tag}`);
    await page.getByLabel("Their story").fill("Fictional test circle for the duplicate member check.");
    await page.getByRole("button", { name: "Create circle" }).click();
    await page.getByRole("heading", { name: `Dup Check ${suffix} ${tag}` }).waitFor();
    if (suffix === "A") {
      await addMember(page, `07${tag}50`, `7${tag}5`, ["Akinyi D.", "Tailoring", "6000", "0"]);
    }
  }
  await page.getByLabel("Name", { exact: true }).fill("Akinyi D.");
  await page.getByLabel("Business", { exact: true }).fill("Tailoring");
  await page.getByLabel("Mobile number").fill(`07${tag}50`);
  await page.getByLabel("National ID number").fill(`7${tag}5`);
  await page.getByLabel("Weekly inflow (KSh)").fill("6000");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Add member" }).click();
  await expect(page.getByText(/already in an active circle/)).toBeVisible();
});
