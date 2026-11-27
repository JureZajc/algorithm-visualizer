import { expect, test as base, type Page } from "@playwright/test";

// Fails a test on any uncaught exception or console error, such as a CORS
// rejection or a failed request.
const test = base.extend<{ pageErrors: string[] }>({
  pageErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      await use(errors);
      expect(errors).toEqual([]);
    },
    { auto: true },
  ],
});

async function openCategory(page: Page, name: string) {
  await page.goto("/");
  const tab = page.getByRole("navigation", { name: "Visualizer mode" }).getByRole("button", { name, exact: true });
  await tab.click();
  await expect(tab).toHaveAttribute("aria-current", "page");
}

/** Starts the default input, jumps to the last step, and checks the result. */
async function runToEnd(page: Page, resultLabel: string, result: string) {
  await page.getByRole("button", { name: "Start visualization" }).click();
  const last = page.getByRole("button", { name: "Jump to last step" });
  await expect(last).toBeEnabled();
  await last.click();

  await expect(page.getByText(/^Step (\d+) \/ \1$/)).toBeVisible();
  await expect(last).toBeDisabled();
  const stats = page.getByRole("complementary", { name: "Visualization statistics" });
  await expect(stats.getByText(resultLabel, { exact: true })).toBeVisible();
  await expect(stats.getByText(result, { exact: true })).toBeVisible();
  // The overview comes from GET /algorithms.
  await expect(page.getByRole("heading", { name: "Algorithm overview" })).toBeVisible();
}

test.describe("smoke", () => {
  test("Sorting sorts the sample array", async ({ page }) => {
    await openCategory(page, "Sorting");
    await runToEnd(page, "Final sorted array", "[8, 17, 23, 29, 36, 42, 51, 58, 64, 75, 83, 92]");
  });

  test("Compare summarizes three sorting algorithms", async ({ page }) => {
    await openCategory(page, "Compare");
    await page.getByRole("button", { name: "Run comparison" }).click();
    await expect(page.getByRole("heading", { name: "Comparison summary" })).toBeVisible();

    const cards = page.getByRole("article");
    await expect(cards).toHaveCount(3);
    const totals = new Map<string, number>();
    for (const name of ["Bubble Sort", "Selection Sort", "Insertion Sort"]) {
      const card = cards.filter({ has: page.getByRole("heading", { name, exact: true }) });
      await expect(card).toHaveCount(1);
      totals.set(name, Number(await card.locator('dt:text-is("Total steps") + dd').textContent()));
      // "Unavailable" would mean the metadata from GET /algorithms is missing.
      await expect(card.locator('dt:text-is("Avg. time") + dd')).not.toHaveText("Unavailable");
    }
    const fewest = Math.min(...totals.values());
    expect(fewest).toBeGreaterThan(0);
    for (const [name, total] of totals) {
      const badge = cards.filter({ has: page.getByRole("heading", { name, exact: true }) }).getByText("Fewest steps");
      await expect(badge).toHaveCount(total === fewest ? 1 : 0);
    }
  });

  test("Searching finds the sample target", async ({ page }) => {
    await openCategory(page, "Searching");
    await runToEnd(page, "Search result", "Found 67 at index 6");
  });

  test("Graph finds the path through the sample graph", async ({ page }) => {
    await openCategory(page, "Graph / Pathfinding");
    await runToEnd(page, "Final path", "A → B → C → D → E");
  });

  test("Dynamic Programming fills the Fibonacci table", async ({ page }) => {
    await openCategory(page, "Dynamic Programming");
    await runToEnd(page, "DP result", "21");
  });

  test("Backtracking places four queens", async ({ page }) => {
    await openCategory(page, "Backtracking");
    await runToEnd(page, "Backtracking result", "4 queens placed");
  });

  test("Trees builds the sample binary search tree", async ({ page }) => {
    await openCategory(page, "Trees");
    await runToEnd(page, "Final inorder", "[1, 3, 4, 6, 7, 8, 10, 13, 14]");
  });

  test("Hash Tables inserts the sample keys", async ({ page }) => {
    await openCategory(page, "Hash Tables");
    await runToEnd(page, "Insert result", "4 keys inserted");
  });
});
