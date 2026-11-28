import AxeBuilder from "@axe-core/playwright";
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

/**
 * Runs axe on the whole page and fails on serious and critical violations. Minor and moderate
 * findings are left to review, so the scan guards against regressions without blocking on them.
 */
async function expectNoSeriousViolations(page: Page, state: string) {
  // Cells and bars fade between colors when a step changes. Sampled mid-fade, their colors are a
  // blend that fails contrast although neither end state does, so scan the settled page.
  await page.evaluate(() =>
    Promise.all(
      document.getAnimations().filter((animation) => animation instanceof CSSTransition).map((animation) => animation.finished),
    ),
  );
  const { violations } = await new AxeBuilder({ page }).analyze();
  const blocking = violations
    .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
    .map((violation) => {
      const targets = violation.nodes.slice(0, 5).map((node) => node.target.join(" "));
      return `${violation.id} (${violation.impact}): ${violation.help} at ${targets.join(", ")}`;
    });
  expect(blocking, `axe found serious or critical violations ${state}`).toEqual([]);
}

async function openCategory(page: Page, name: string) {
  await page.goto("/");
  const tab = page.getByRole("navigation", { name: "Visualizer mode" }).getByRole("button", { name, exact: true });
  await tab.click();
  await expect(tab).toHaveAttribute("aria-current", "page");
  // The overview comes from GET /algorithms; scan once the page has settled.
  await expect(page.getByRole("heading", { name: "Algorithm overview" }).or(page.getByRole("heading", { name: "Ready to compare" }))).toBeVisible();
  await expectNoSeriousViolations(page, `before a ${name} run`);
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
  await expectNoSeriousViolations(page, "after the run");
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
    await expectNoSeriousViolations(page, "after the comparison");
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

test("the speed slider is a 44px target that moves with the arrow keys", async ({ page }) => {
  await page.goto("/");
  const slider = page.getByRole("slider", { name: /Animation speed/ });
  const box = await slider.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(44);

  await slider.focus();
  await page.keyboard.press("ArrowRight");
  await expect(slider).toHaveValue("340");
  await expect(slider).toHaveAttribute("aria-valuetext", "340 milliseconds per step");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await expect(slider).toHaveValue("300");
});

test("the step slider is a 44px target that moves with the arrow keys", async ({ page }) => {
  await page.goto("/");
  const slider = page.getByRole("slider", { name: /Choose a step/ });
  const box = await slider.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(44);

  await page.getByRole("button", { name: "Start visualization" }).click();
  await expect(slider).toBeEnabled();
  await page.getByRole("button", { name: "Pause playback" }).click();
  await slider.focus();
  await page.keyboard.press("Home");
  await expect(slider).toHaveValue("0");
  await page.keyboard.press("ArrowRight");
  await expect(slider).toHaveValue("1");
  await expect(slider).toHaveAttribute("aria-valuetext", /^Step 2 of \d+$/);
});
