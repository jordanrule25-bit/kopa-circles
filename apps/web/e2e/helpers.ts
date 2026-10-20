import type { Page } from "@playwright/test";

/** Dev login (DEV_LOGIN=1 only): a real session for a fictional seeded user. */
export async function signInAs(page: Page, userId: "sample-admin" | "sample-lender-demo" | "sample-agent-eldoret") {
  await page.context().clearCookies();
  await page.goto(`/dev/login-as?user=${userId}`);
}

/** Six random digits, so tests running in parallel never share phone numbers or IDs. */
export const run = () => String(Math.floor(100_000 + Math.random() * 900_000));

export async function addMember(page: Page, phone: string, nationalId: string, [name, business, inflow, loans]: readonly string[]) {
  await page.getByRole("link", { name: /^Add member \d of 5$/ }).click();
  await page.getByLabel("Name", { exact: true }).fill(name!);
  await page.getByLabel("Business", { exact: true }).fill(business!);
  await page.getByLabel("Mobile number").fill(phone);
  await page.getByLabel("National ID number").fill(nationalId);
  await page.getByLabel("Weekly inflow (KSh)").fill(inflow!);
  await page.getByLabel("Active loans at the credit bureau").fill(loans!);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Add member" }).click();
  await page.getByRole("listitem", { name }).waitFor();
}

// prototype SAMPLE_MEMBERS: name, business, weekly inflow (KSh), active bureau loans
export const MEMBERS = [
  ["Okoth J.", "Clean cookstoves", "6500", "1"],
  ["Anyango P.", "Phone accessories", "9000", "0"],
  ["Odhiambo T.", "Shoe repair", "4800", "2"],
  ["Auma L.", "Tea kiosk", "5200", "1"],
  ["Ochieng V.", "Fish smoking", "7000", "3"],
] as const;

/** Agent forms and submits a circle; returns its id. */
export async function formCircle(page: Page, name: string, tag: string) {
  await signInAs(page, "sample-agent-eldoret");
  await page.goto("/agent/circles/new");
  await page.getByLabel("Circle name").fill(name);
  await page.getByLabel("Their story").fill("Fictional test circle created by a Playwright flow.");
  await page.getByRole("button", { name: "Create circle" }).click();
  await page.getByRole("heading", { name }).waitFor();
  for (const [i, m] of MEMBERS.entries()) await addMember(page, `07${tag}${i}0`, `8${tag}${i}`, m);
  await page.getByRole("button", { name: "Submit for listing" }).click();
  await page.getByTestId("circle-status").getByText("Waiting for approval").waitFor();
  return new URL(page.url()).pathname.split("/").pop()!;
}
