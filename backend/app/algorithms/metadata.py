from typing import Literal

from pydantic import BaseModel


AlgorithmCategory = Literal["sorting", "searching", "graph"]


class TimeComplexity(BaseModel):
    best: str
    average: str
    worst: str


class AlgorithmMetadata(BaseModel):
    id: str
    label: str
    name: str
    category: AlgorithmCategory
    description: str
    time_complexity: TimeComplexity
    space_complexity: str
    notes: list[str]


class AlgorithmsResponse(BaseModel):
    sorting: list[AlgorithmMetadata]
    searching: list[AlgorithmMetadata]
    graph: list[AlgorithmMetadata]


def metadata(
    algorithm_id: str,
    name: str,
    category: AlgorithmCategory,
    description: str,
    best: str,
    average: str,
    worst: str,
    space: str,
    *notes: str,
) -> AlgorithmMetadata:
    return AlgorithmMetadata(
        id=algorithm_id,
        label=name,
        name=name,
        category=category,
        description=description,
        time_complexity=TimeComplexity(
            best=best,
            average=average,
            worst=worst,
        ),
        space_complexity=space,
        notes=list(notes),
    )


SORTING_ALGORITHM_METADATA = [
    metadata(
        "bubble_sort",
        "Bubble Sort",
        "sorting",
        "Repeatedly compares neighboring values and swaps pairs that are out of order.",
        "O(n)",
        "O(n²)",
        "O(n²)",
        "O(1)",
        "Stable and in-place.",
        "The early-exit check makes already sorted input linear.",
    ),
    metadata(
        "selection_sort",
        "Selection Sort",
        "sorting",
        "Selects the smallest remaining value and places it at the next sorted position.",
        "O(n²)",
        "O(n²)",
        "O(n²)",
        "O(1)",
        "In-place but not stable in its usual form.",
        "Performs few swaps, but always scans the unsorted suffix.",
    ),
    metadata(
        "insertion_sort",
        "Insertion Sort",
        "sorting",
        "Builds a sorted prefix by inserting each new value into its correct position.",
        "O(n)",
        "O(n²)",
        "O(n²)",
        "O(1)",
        "Stable and in-place.",
        "Works well for small or nearly sorted inputs.",
    ),
    metadata(
        "merge_sort",
        "Merge Sort",
        "sorting",
        "Recursively divides the array and merges sorted sections back together.",
        "O(n log n)",
        "O(n log n)",
        "O(n log n)",
        "O(n)",
        "Stable in this implementation.",
        "Requires auxiliary arrays while merging.",
    ),
    metadata(
        "quick_sort",
        "Quick Sort",
        "sorting",
        "Partitions values around a pivot, then recursively sorts both partitions.",
        "O(n log n)",
        "O(n log n)",
        "O(n²)",
        "O(log n) average, O(n) worst",
        "In-place apart from recursion, but not stable.",
        "Uses the final element as pivot, so ordered inputs can produce the worst case.",
    ),
    metadata(
        "heap_sort",
        "Heap Sort",
        "sorting",
        "Builds a max heap and repeatedly moves its largest value to the array's end.",
        "O(n log n)",
        "O(n log n)",
        "O(n log n)",
        "O(log n)",
        "In-place apart from recursive heapify calls.",
        "Not stable.",
    ),
    metadata(
        "shell_sort",
        "Shell Sort",
        "sorting",
        "Runs insertion-style passes over shrinking gaps before a final adjacent pass.",
        "O(n log n)",
        "O(n²)",
        "O(n²)",
        "O(1)",
        "In-place and not stable.",
        "Bounds depend on the gap sequence; this implementation repeatedly halves the gap.",
    ),
    metadata(
        "cocktail_shaker_sort",
        "Cocktail Shaker Sort",
        "sorting",
        "Alternates forward and backward bubble passes to move extremes in both directions.",
        "O(n)",
        "O(n²)",
        "O(n²)",
        "O(1)",
        "Stable and in-place.",
        "Still quadratic for typical and adverse inputs.",
    ),
    metadata(
        "gnome_sort",
        "Gnome Sort",
        "sorting",
        "Walks forward through ordered pairs and steps backward whenever it swaps a pair.",
        "O(n)",
        "O(n²)",
        "O(n²)",
        "O(1)",
        "Stable and in-place.",
        "Simple, but inefficient for large unsorted arrays.",
    ),
    metadata(
        "comb_sort",
        "Comb Sort",
        "sorting",
        "Compares values across a shrinking gap to remove small values near the array's end.",
        "O(n log n)",
        "O(n²)",
        "O(n²)",
        "O(1)",
        "In-place and not stable.",
        "Performance depends on the shrink factor and input distribution.",
    ),
    metadata(
        "counting_sort",
        "Counting Sort",
        "sorting",
        "Counts each integer value and writes values back in ascending order.",
        "O(n + k)",
        "O(n + k)",
        "O(n + k)",
        "O(k)",
        "Here k is the range between the minimum and maximum values.",
        "Supports negative integers, but a very wide value range uses substantial memory.",
    ),
]


SEARCHING_ALGORITHM_METADATA = [
    metadata(
        "linear_search",
        "Linear Search",
        "searching",
        "Checks values from left to right until the target is found or input is exhausted.",
        "O(1)",
        "O(n)",
        "O(n)",
        "O(1)",
        "Works with unsorted input.",
        "Returns the first matching position encountered.",
    ),
    metadata(
        "binary_search",
        "Binary Search",
        "searching",
        "Repeatedly halves the candidate interval by comparing its midpoint with the target.",
        "O(1)",
        "O(log n)",
        "O(log n)",
        "O(1)",
        "Requires values sorted in ascending order.",
        "With duplicates, the returned match is not guaranteed to be the first occurrence.",
    ),
]


GRAPH_ALGORITHM_METADATA = [
    metadata(
        "bfs",
        "Breadth-First Search",
        "graph",
        "Explores nodes level by level with a queue and finds a minimum-edge path.",
        "O(V + E)",
        "O(V + E)",
        "O(V + E)",
        "O(V + E)",
        "Finds shortest paths by edge count, not by total edge weight.",
        "Supports directed and undirected graphs.",
    ),
    metadata(
        "dfs",
        "Depth-First Search",
        "graph",
        "Explores one branch deeply before backtracking to another branch.",
        "O(V + E)",
        "O(V + E)",
        "O(V + E)",
        "O(V + E)",
        "Does not guarantee a shortest path.",
        "Supports directed and undirected graphs.",
    ),
    metadata(
        "dijkstra",
        "Dijkstra's Algorithm",
        "graph",
        "Uses a priority queue to find a minimum-cost path from the start node.",
        "O((V + E) log V)",
        "O((V + E) log V)",
        "O((V + E) log V)",
        "O(V + E)",
        "Requires non-negative edge weights.",
        "Supports directed and undirected graphs.",
    ),
    metadata(
        "a_star",
        "A* Search",
        "graph",
        "Prioritizes nodes using path cost plus a heuristic estimate to the target.",
        "O(E)",
        "O(E log V)",
        "O(E log V)",
        "O(V + E)",
        "Requires non-negative edge weights.",
        "Optimality requires an admissible heuristic; a zero heuristic behaves like Dijkstra's algorithm.",
    ),
    metadata(
        "topological_sort",
        "Topological Sort",
        "graph",
        "Uses Kahn's algorithm to order nodes after all of their prerequisites.",
        "O(V + E)",
        "O(V + E)",
        "O(V + E)",
        "O(V + E)",
        "Requires a directed acyclic graph for a complete ordering.",
        "Reports a cycle when no complete topological order exists.",
    ),
    metadata(
        "kruskal",
        "Kruskal's Minimum Spanning Tree",
        "graph",
        "Adds edges in increasing weight order while avoiding cycles with disjoint sets.",
        "O(E log E)",
        "O(E log E)",
        "O(E log E)",
        "O(V + E)",
        "Treats edges as undirected.",
        "Returns a minimum spanning forest when the graph is disconnected.",
    ),
    metadata(
        "prim",
        "Prim's Minimum Spanning Tree",
        "graph",
        "Grows a spanning tree by repeatedly accepting the lightest edge to a new node.",
        "O(E log V)",
        "O(E log V)",
        "O(E log V)",
        "O(V + E)",
        "Treats edges as undirected and uses the selected start node first.",
        "Returns a minimum spanning forest when the graph is disconnected.",
    ),
]


ALGORITHM_METADATA = [
    *SORTING_ALGORITHM_METADATA,
    *SEARCHING_ALGORITHM_METADATA,
    *GRAPH_ALGORITHM_METADATA,
]
