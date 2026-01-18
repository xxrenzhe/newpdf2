import { expect, test } from "./fixtures";
import { getToolsByCategory, TOOL_CATEGORIES, TOOLS } from "../../src/lib/tools";

test("home tools grid category tabs filter correctly", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/");

  const toolsSection = page.locator("#tools");
  await toolsSection.scrollIntoViewIfNeeded();
  await expect(page.getByRole("heading", { name: "All PDF Tools You Need" })).toBeVisible();

  await expect(toolsSection.locator("a.tool-card")).toHaveCount(TOOLS.length);

  for (const category of TOOL_CATEGORIES) {
    const button = toolsSection.getByRole("button", { name: category.label }).first();
    await expect(button).toBeVisible();
    await button.click();

    const expectedCount = getToolsByCategory(category.key).length;
    await expect(toolsSection.locator("a.tool-card")).toHaveCount(expectedCount);

    if (category.key !== "all") {
      const viewAll = toolsSection.getByRole("button", { name: `View all ${TOOLS.length} tools` });
      await expect(viewAll).toBeVisible();
      await viewAll.click();
      await expect(toolsSection.locator("a.tool-card")).toHaveCount(TOOLS.length);
    }
  }
});
