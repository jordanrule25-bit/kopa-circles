import { expect, test } from "@playwright/test";
import { run, signInAs } from "./helpers";

// An agent loses signal while adding a member: the member is saved on the
// phone, then sent automatically once the connection is back.
test("a member added offline is saved and sent when back online", async ({ page, context }) => {
  const tag = run();
  const name = `Offline Circle ${tag}`;
  await signInAs(page, "sample-agent-eldoret");
  await page.goto("/agent/circles/new");
  await page.getByLabel("Circle name").fill(name);
  await page.getByLabel("Their story").fill("Fictional test circle for the offline flow.");
  await page.getByRole("button", { name: "Create circle" }).click();
  await page.getByRole("heading", { name }).waitFor();
  await page.getByRole("link", { name: "Add member 1 of 5" }).click();
  await page.getByLabel("Weekly inflow (KSh)").waitFor(); // page fully loaded before the signal drops

  await context.setOffline(true);
  await page.getByLabel("Name", { exact: true }).fill("Nafula K.");
  await page.getByLabel("Business", { exact: true }).fill("Sukuma wiki");
  await page.getByLabel("Mobile number").fill(`07${tag}77`);
  await page.getByLabel("National ID number").fill(`6${tag}7`);
  await page.getByLabel("Weekly inflow (KSh)").fill("6000");
  await expect(page.getByText("The limit will be checked when you’re back online.")).toBeVisible();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Add member" }).click();
  await expect(page.getByRole("heading", { name: "Saved on this phone" })).toBeVisible();

  await context.setOffline(false);
  await page.getByRole("link", { name: "Back to the circle" }).click();
  // Sent automatically, then shown as a real member with a limit.
  await expect(page.getByRole("listitem", { name: "Nafula K.", exact: true })).toContainText("$150", { timeout: 15_000 });
  await expect(page.getByRole("list", { name: "Saved on this phone" })).toHaveCount(0);
});
