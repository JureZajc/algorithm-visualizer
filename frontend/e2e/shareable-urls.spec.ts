import { expect, test as base, type Page } from "@playwright/test";

// Fails a test on any uncaught exception or console error in the first page.
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

function categoryTab(page: Page, name: string) {
  return page.getByRole("navigation", { name: "Visualizer mode" }).getByRole("button", { name, exact: true });
}

/** Restoring fills in the controls; no steps are loaded until the user starts a run. */
async function expectNoRun(page: Page) {
  const counter = page.getByText(/^Step \d+ \/ \d+$/);
  if (await counter.count()) await expect(counter).toHaveText("Step 0 / 0");
  await expect(page.getByText(/^Step [1-9]\d* \/ /)).toHaveCount(0);
}

interface Case {
  tab: string;
  category: string;
  /** Changes the algorithm and the input through the controls. */
  edit: (page: Page) => Promise<void>;
  /** Values the address must hold once the edit is written. */
  expected: Record<string, string>;
  /** Checks the controls in a page opened from the copied address. */
  check: (page: Page) => Promise<void>;
}

const CASES: Case[] = [
  {
    tab: "Sorting",
    category: "sorting",
    edit: async (page) => {
      await page.getByRole("combobox", { name: "Sorting algorithm" }).selectOption("heap_sort");
      await page.getByRole("combobox", { name: "Sample preset" }).selectOption("reversed");
    },
    expected: { algorithm: "heap_sort", numbers: "96,88,79,71,63,54,45,37,28,19,11,5" },
    check: async (page) => {
      await expect(page.getByRole("combobox", { name: "Sorting algorithm" })).toHaveValue("heap_sort");
      await expect(page.getByTitle("Index 0: 96")).toBeAttached();
      await expect(page.getByTitle("Index 11: 5")).toBeAttached();
    },
  },
  {
    tab: "Compare",
    category: "compare",
    edit: async (page) => {
      await page.getByRole("checkbox", { name: "Merge Sort" }).check();
      await page.getByRole("checkbox", { name: "Bubble Sort" }).uncheck();
      await page.getByRole("combobox", { name: "Sample preset" }).selectOption("small");
    },
    expected: { algorithms: "selection_sort,insertion_sort,merge_sort", numbers: "37,12,48,5,29,21" },
    check: async (page) => {
      await expect(page.getByRole("checkbox", { name: "Merge Sort" })).toBeChecked();
      await expect(page.getByRole("checkbox", { name: "Bubble Sort" })).not.toBeChecked();
      await expect(page.getByText("[37, 12, 48, 5, 29, 21]")).toBeVisible();
      await expect(page.getByRole("heading", { name: "Ready to compare" })).toBeVisible();
    },
  },
  {
    tab: "Searching",
    category: "searching",
    edit: async (page) => {
      await page.getByRole("combobox", { name: "Sample preset" }).selectOption("binary-search");
      await page.getByRole("spinbutton", { name: /Target value/ }).fill("27");
    },
    expected: { algorithm: "binary_search", numbers: "5,12,19,27,36,48,59,71,84,96", target: "27" },
    check: async (page) => {
      await expect(page.getByRole("combobox", { name: "Searching algorithm" })).toHaveValue("binary_search");
      await expect(page.getByRole("spinbutton", { name: /Target value/ })).toHaveValue("27");
      await expect(page.getByTitle("Index 9: 96")).toBeAttached();
    },
  },
  {
    tab: "Graph / Pathfinding",
    category: "graph",
    edit: async (page) => {
      await page.getByRole("combobox", { name: "Graph", exact: true }).selectOption("weighted-graph");
      await page.getByRole("combobox", { name: "Algorithm", exact: true }).selectOption("dijkstra");
      await page.getByRole("combobox", { name: "Target node" }).selectOption("E");
    },
    expected: { algorithm: "dijkstra", graph: "weighted-graph", start: "A", target: "E", directed: "false" },
    check: async (page) => {
      await expect(page.getByRole("combobox", { name: "Graph", exact: true })).toHaveValue("weighted-graph");
      await expect(page.getByRole("combobox", { name: "Algorithm", exact: true })).toHaveValue("dijkstra");
      await expect(page.getByRole("combobox", { name: "Target node" })).toHaveValue("E");
    },
  },
  {
    tab: "Dynamic Programming",
    category: "dynamic_programming",
    edit: async (page) => {
      await page.getByRole("combobox", { name: "Dynamic programming algorithm" }).selectOption("coin_change");
      await page.getByLabel(/^Coins/).fill("2, 5, 10");
      await page.getByLabel(/^Amount/).fill("27");
    },
    expected: { algorithm: "coin_change", coins: "2,5,10", amount: "27" },
    check: async (page) => {
      await expect(page.getByRole("combobox", { name: "Dynamic programming algorithm" })).toHaveValue("coin_change");
      await expect(page.getByLabel(/^Coins/)).toHaveValue("2, 5, 10");
      await expect(page.getByLabel(/^Amount/)).toHaveValue("27");
    },
  },
  {
    tab: "Backtracking",
    category: "backtracking",
    edit: async (page) => {
      await page.getByRole("combobox", { name: "Backtracking algorithm" }).selectOption("maze_solver");
      await page.getByRole("combobox", { name: "Maze pattern" }).selectOption("open");
      await page.getByRole("button", { name: "Wall", exact: true }).click();
      await page.getByRole("button", { name: "Edit row 2, column 2: empty" }).click();
    },
    expected: { algorithm: "maze_solver", rows: "7", cols: "7", maze: "open" },
    check: async (page) => {
      await expect(page.getByRole("combobox", { name: "Backtracking algorithm" })).toHaveValue("maze_solver");
      await expect(page.getByRole("combobox", { name: "Maze pattern" })).toHaveValue("open");
      await expect(page.getByRole("button", { name: "Edit row 2, column 2: wall" })).toBeVisible();
    },
  },
  {
    tab: "Trees",
    category: "trees",
    edit: async (page) => {
      await page.getByRole("combobox", { name: "Tree algorithm" }).selectOption("bst_search");
      await page.getByLabel(/^Values/).fill("50, 30, 70, 20, 40");
      await page.getByLabel(/^Target/).fill("40");
    },
    expected: { algorithm: "bst_search", values: "50,30,70,20,40", target: "40" },
    check: async (page) => {
      await expect(page.getByRole("combobox", { name: "Tree algorithm" })).toHaveValue("bst_search");
      await expect(page.getByLabel(/^Values/)).toHaveValue("50, 30, 70, 20, 40");
      await expect(page.getByLabel(/^Target/)).toHaveValue("40");
    },
  },
  {
    tab: "Hash Tables",
    category: "hash_tables",
    edit: async (page) => {
      await page.getByRole("combobox", { name: "Hash table operation" }).selectOption("hash_search_linear_probing");
      await page.getByLabel(/^Values/).fill("7, pear, 18, plum");
      await page.getByLabel(/^Table size/).fill("7");
      await page.getByLabel(/^Target/).fill("plum");
    },
    expected: { algorithm: "hash_search_linear_probing", values: "7,pear,18,plum", table_size: "7", target: "plum" },
    check: async (page) => {
      await expect(page.getByRole("combobox", { name: "Hash table operation" })).toHaveValue("hash_search_linear_probing");
      await expect(page.getByLabel(/^Values/)).toHaveValue("7, pear, 18, plum");
      await expect(page.getByLabel(/^Table size/)).toHaveValue("7");
      await expect(page.getByLabel(/^Target/)).toHaveValue("plum");
    },
  },
];

test.describe("shareable URLs", () => {
  for (const item of CASES) {
    test(`a copied ${item.tab} URL opens with the same algorithm and input`, async ({ page, browser }) => {
      await page.goto("/");
      const tab = categoryTab(page, item.tab);
      await tab.click();
      await expect(tab).toHaveAttribute("aria-current", "page");
      await item.edit(page);

      // The address follows the input without a navigation.
      await expect.poll(() => {
        const params = new URL(page.url()).searchParams;
        return Object.fromEntries(["category", ...Object.keys(item.expected)].map((key) => [key, params.get(key)]));
      }).toEqual({ category: item.category, ...item.expected });
      await item.check(page);
      const copied = page.url();

      // A new browser context shares no session storage, so only the address carries the state.
      const context = await browser.newContext();
      const shared = await context.newPage();
      const errors: string[] = [];
      shared.on("pageerror", (error) => errors.push(error.message));
      shared.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      await shared.goto(copied);
      await expect(categoryTab(shared, item.tab)).toHaveAttribute("aria-current", "page");
      await item.check(shared);
      await expectNoRun(shared);
      expect(new URL(shared.url()).search).toBe(new URL(copied).search);
      expect(errors).toEqual([]);
      await context.close();
    });
  }

  test("switching away and back restores a category's input", async ({ page }) => {
    await page.goto("/");
    await categoryTab(page, "Trees").click();
    await page.getByLabel(/^Values/).fill("9, 4, 12");
    await categoryTab(page, "Hash Tables").click();
    await expect(page).toHaveURL(/category=hash_tables/);
    await categoryTab(page, "Trees").click();
    await expect(page.getByLabel(/^Values/)).toHaveValue("9, 4, 12");

    // A reload keeps the address, and the session keeps the other categories.
    await page.reload();
    await expect(page.getByLabel(/^Values/)).toHaveValue("9, 4, 12");
    await categoryTab(page, "Hash Tables").click();
    await categoryTab(page, "Trees").click();
    await expect(page.getByLabel(/^Values/)).toHaveValue("9, 4, 12");
  });

  test("an invalid or oversized URL opens the defaults", async ({ page }) => {
    await page.goto(`/?category=trees&algorithm=bogus&values=1,1,1&target=${"9".repeat(5_000)}`);
    await expect(categoryTab(page, "Trees")).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("combobox", { name: "Tree algorithm" })).toHaveValue("bst_insert");
    await expect(page.getByLabel(/^Values/)).toHaveValue("8, 3, 10, 1, 6, 14, 4, 7, 13");
    await expect(page).toHaveURL(/\?category=trees&algorithm=bst_insert&values=8,3,10,1,6,14,4,7,13$/);
    await expectNoRun(page);
  });
});
