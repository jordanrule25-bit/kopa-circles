import { expect, test, type Page } from "@playwright/test";

// Critical flow 2 of 3: an agent forms a circle, checks limits and submits it for listing.
// Needs the fictional seed data (pnpm db:seed). All people here are fictional.

const run = Date.now().toString().slice(-6);
const phone = (i: number) => `07${run}${String(i).padStart(2, "0")}`;
const nationalId = (i: number) => `9${run}${i}`;

// prototype SAMPLE_MEMBERS: name, business, weekly inflow (KSh), active bureau loans
const MEMBERS = [
  ["Okoth J.", "Clean cookstoves", "6500", "1"],
  ["Anyango P.", "Phone accessories", "9000", "0"],
  ["Odhiambo T.", "Shoe repair", "4800", "2"],
  ["Auma L.", "Tea kiosk", "5200", "1"],
  ["Ochieng V.", "Fish smoking", "7000", "3"],
] as const;

async function addMember(page: Page, i: number, [name, business, inflow, loans]: readonly string[]) {
  await page.getByLabel("Name", { exact: true }).fill(name!);
  await page.getByLabel("Business", { exact: true }).fill(business!);
  await page.getByLabel("Mobile number").fill(phone(i));
  await page.getByLabel("National ID number").fill(nationalId(i));
  await page.getByLabel("Weekly inflow (KSh)").fill(inflow!);
  await page.getByLabel("Active loans at the credit bureau").fill(loans!);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Add member" }).click();
}

test("agent forms a circle, sees limits and submits it for listing", async ({ page }) => {
  await page.goto("/agent");
  await page.getByRole("link", { name: "New circle" }).click();

  const circleName = `Test Circle ${run}`;
  await page.getByLabel("Circle name").fill(circleName);
  await page.getByLabel("Their story").fill("Fictional test circle created by the Playwright agent flow.");
  await page.getByRole("button", { name: "Create circle" }).click();
  await expect(page.getByRole("heading", { name: circleName })).toBeVisible();
  await expect(page.getByTestId("circle-status")).toHaveText("Forming");

  for (const [i, m] of MEMBERS.entries()) {
    await addMember(page, i, m);
    await expect(page.getByRole("cell", { name: m[0] })).toBeVisible();
  }

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
  await page.goto("/agent/circles/new");
  await page.getByLabel("Circle name").fill(`Dup Check ${run}`);
  await page.getByLabel("Their story").fill("Fictional test circle for the duplicate member check.");
  await page.getByRole("button", { name: "Create circle" }).click();

  await addMember(page, 50, ["Akinyi D.", "Tailoring", "6000", "0"]);
  await expect(page.getByRole("cell", { name: "Akinyi D." })).toBeVisible();

  await page.goto("/agent/circles/new");
  await page.getByLabel("Circle name").fill(`Dup Check B ${run}`);
  await page.getByLabel("Their story").fill("Fictional test circle for the duplicate member check.");
  await page.getByRole("button", { name: "Create circle" }).click();

  await addMember(page, 50, ["Akinyi D.", "Tailoring", "6000", "0"]);
  await expect(page.getByText(/already in an active circle/)).toBeVisible();
});
