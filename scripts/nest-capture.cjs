const { chromium } = require("@playwright/test");
const fs = require("fs");
const path = require("path");
const out = path.resolve("artifacts/nest");
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({
    executablePath:
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
  });
  for (const width of [390, 375]) {
    const page = await browser.newPage({
      viewport: { width, height: 844 },
      deviceScaleFactor: 1,
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(process.env.NEST_URL || "http://localhost:8085");
    await page.getByRole("button", { name: "Open Facebook menu" }).click();
    await page.getByRole("button", { name: "Nest", exact: true }).click();
    await page
      .getByRole("button", { name: "Add a goal", exact: true })
      .waitFor();
    const capture = async (name) => {
      await page.waitForTimeout(450);
      await page.screenshot({ path: path.join(out, `${name}-${width}.png`) });
    };
    await capture("welcome");
    await page.getByRole("button", { name: "Add a goal", exact: true }).click();
    await page
      .getByRole("button", { name: "Review preferences", exact: true })
      .click();
    await capture("intake");
    await page
      .getByRole("button", { name: "Find my matches", exact: true })
      .click();
    await page
      .getByRole("button", { name: "View home", exact: true })
      .waitFor();
    await page.waitForTimeout(1800);
    await capture("homes");
    await page.getByRole("button", { name: "Collapse map" }).click();
    await capture("homes-minimized");
    await page.getByRole("button", { name: /Show map/ }).click();
    await page.getByRole("button", { name: "Expand map" }).click();
    await capture("expanded-map");
    await page.getByRole("button", { name: "Back to your matches" }).click();
    await page.getByRole("button", { name: "View home", exact: true }).click();
    await capture("home-detail");
    await page.getByRole("button", { name: "Save item", exact: true }).click();
    await page
      .getByRole("button", { name: "See all criteria", exact: true })
      .click();
    await capture("criteria");
    await page
      .getByRole("button", { name: "Close sheet", exact: true })
      .click();
    await page
      .getByRole("button", { name: "View original post", exact: true })
      .click();
    await capture("source");
    await page
      .getByRole("button", { name: "Close sheet", exact: true })
      .click();
    await page.getByRole("button", { name: "Contact", exact: true }).click();
    await capture("contact");
    await page.getByRole("button", { name: "Done", exact: true }).click();
    await page.getByRole("button", { name: "Back to your matches" }).click();
    await page.getByRole("tab", { name: "Roommates", exact: true }).click();
    await capture("roommates");
    await page.getByRole("button", { name: "View profile" }).click();
    await capture("person-detail");
    await page.getByRole("button", { name: "Back to your matches" }).click();
    await page.getByRole("tab", { name: "Community", exact: true }).click();
    await page.waitForTimeout(800);
    await capture("community");
    await page.getByRole("button", { name: "View event" }).click();
    await capture("event");
    await page
      .getByRole("button", { name: "Close sheet", exact: true })
      .click();
    await page.getByRole("button", { name: "Edit interests" }).click();
    await capture("interests");
    await page
      .getByRole("button", { name: "Close sheet", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Saved items", exact: true })
      .click();
    await capture("saved");
    fs.writeFileSync(
      path.join(out, `errors-${width}.json`),
      JSON.stringify(errors, null, 2),
    );
    console.log(
      `Captured ${width}px screens, runtime errors: ${errors.length}`,
    );
    await page.close();
  }
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
