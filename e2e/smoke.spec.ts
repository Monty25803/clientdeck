import { test, expect } from "@playwright/test";

test("health is up", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.service).toBe("clientdeck");
});

test("first-run or login is reachable", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();
});

test("login page explains the product", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByText(/sign in|approve|milestone/i).first()).toBeVisible();
});
