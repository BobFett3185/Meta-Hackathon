const { chromium, expect } = require("@playwright/test");
(async () => {
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROME_PATH ||
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 375, height: 744 },
    });
    await page.goto(process.env.NEST_URL || "http://localhost:8086");
    const openNest = async () => {
      await page.getByRole("button", { name: "Open Facebook menu" }).click();
      await page.getByRole("button", { name: "Nest", exact: true }).click();
    };
    const state = () =>
      page.evaluate(() => JSON.parse(localStorage.getItem("nest.demo.v1")));
    await openNest();
    await page.getByRole("button", { name: "Add a goal", exact: true }).click();
    await page
      .getByRole("button", { name: "Review preferences", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Find my matches", exact: true })
      .click();
    await page.getByRole("button", { name: "Next home" }).click();
    await expect.poll(async () => (await state()).selectedId).toBe("home-2");
    await expect(
      page
        .getByRole("button", { name: "Map pin $1,200", exact: true })
        .locator("div")
        .filter({ hasText: "$1,200" })
        .first(),
    ).toHaveCSS("background-color", "rgb(8, 102, 255)");
    await page
      .getByRole("button", { name: "Map pin $1,450", exact: true })
      .click();
    await expect(page.getByText("3 of 5", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "View home", exact: true }).click();
    await page.getByRole("button", { name: "Save item", exact: true }).click();
    await page
      .getByRole("button", { name: "Back to your matches", exact: true })
      .click();
    await expect(page.getByText("3 of 5", { exact: true })).toBeVisible();
    await page
      .getByRole("button", { name: "Collapse map", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Edit search", exact: true })
      .click();
    await page
      .getByRole("textbox", { name: "Your moving goal" })
      .fill("Seattle June–August 2027 under $100 per person");
    await page
      .getByRole("button", { name: "Close sheet", exact: true })
      .click();
    expect((await state()).goal.budgetAmount).toBe(1500);
    expect((await state()).draft.rawPrompt).toContain("$100");
    await page.reload();
    await openNest();
    await expect(page.getByText("3 of 5", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Show map/ })).toBeVisible();
    expect((await state()).saved.homes).toEqual(["home-3"]);
    expect((await state()).homeArea).toBe(null);
    await page
      .getByRole("button", { name: "Edit search", exact: true })
      .click();
    await expect(
      page.getByRole("textbox", { name: "Your moving goal" }),
    ).toHaveValue("Seattle June–August 2027 under $100 per person");
    await page
      .getByRole("button", { name: "Review preferences", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Find my matches", exact: true })
      .click();
    await expect(
      page.getByText("No listings meet all your must-haves.", { exact: true }),
    ).toBeVisible();
    await page.getByRole("tab", { name: "Community", exact: true }).click();
    await page
      .getByRole("button", { name: "Edit interests", exact: true })
      .click();
    await page.getByRole("checkbox", { name: "Hiking", exact: true }).click();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Meet Leo", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Meet Maya", exact: true }),
    ).toHaveCount(0);
    expect((await state()).interests).toEqual(["Hiking"]);
    console.log(
      "PASS: menu entry, shared intake, gallery/map sync, detail return, saved persistence, minimized map persistence, draft isolation, no results, interest filtering.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
