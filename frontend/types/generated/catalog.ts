/**
 * This file was generated from the backend's GET /algorithms catalog.
 * Do not edit it by hand. Run `npm run generate:api` in frontend/ instead.
 */

/** Display labels, by category and algorithm id. */
export const CATALOG_LABELS = {
  "sorting": {
    "bubble_sort": "Bubble Sort",
    "selection_sort": "Selection Sort",
    "insertion_sort": "Insertion Sort",
    "merge_sort": "Merge Sort",
    "quick_sort": "Quick Sort",
    "heap_sort": "Heap Sort",
    "shell_sort": "Shell Sort",
    "cocktail_shaker_sort": "Cocktail Shaker Sort",
    "gnome_sort": "Gnome Sort",
    "comb_sort": "Comb Sort",
    "counting_sort": "Counting Sort"
  },
  "searching": {
    "linear_search": "Linear Search",
    "binary_search": "Binary Search"
  },
  "graph": {
    "bfs": "Breadth-First Search",
    "dfs": "Depth-First Search",
    "dijkstra": "Dijkstra's Algorithm",
    "a_star": "A* Search",
    "topological_sort": "Topological Sort",
    "kruskal": "Kruskal's Minimum Spanning Tree",
    "prim": "Prim's Minimum Spanning Tree"
  },
  "dynamic_programming": {
    "fibonacci": "Fibonacci DP",
    "coin_change": "Coin Change",
    "knapsack": "0/1 Knapsack",
    "lcs": "Longest Common Subsequence",
    "edit_distance": "Edit Distance",
    "unique_paths": "Grid Unique Paths"
  },
  "backtracking": {
    "n_queens": "N-Queens",
    "maze_solver": "Maze Solver",
    "permutations": "Permutations",
    "subsets": "Subsets",
    "sudoku_solver": "Sudoku Solver"
  },
  "trees": {
    "bst_insert": "BST Insert",
    "avl_insert": "AVL Tree Insert",
    "bst_search": "BST Search",
    "inorder_traversal": "Inorder Traversal",
    "preorder_traversal": "Preorder Traversal",
    "postorder_traversal": "Postorder Traversal"
  },
  "hash_tables": {
    "hash_insert_chaining": "Insert - Separate Chaining",
    "hash_search_chaining": "Search - Separate Chaining",
    "hash_insert_linear_probing": "Insert - Linear Probing",
    "hash_search_linear_probing": "Search - Linear Probing"
  }
} as const;

/** Input limits, by category, algorithm id, and request field. */
export const CATALOG_LIMITS = {
  "sorting": {
    "bubble_sort": {
      "numbers": {
        "max_items": 50,
        "items": {
          "minimum": -1000000,
          "maximum": 1000000
        }
      }
    },
    "selection_sort": {
      "numbers": {
        "max_items": 50,
        "items": {
          "minimum": -1000000,
          "maximum": 1000000
        }
      }
    },
    "insertion_sort": {
      "numbers": {
        "max_items": 50,
        "items": {
          "minimum": -1000000,
          "maximum": 1000000
        }
      }
    },
    "merge_sort": {
      "numbers": {
        "max_items": 50,
        "items": {
          "minimum": -1000000,
          "maximum": 1000000
        }
      }
    },
    "quick_sort": {
      "numbers": {
        "max_items": 50,
        "items": {
          "minimum": -1000000,
          "maximum": 1000000
        }
      }
    },
    "heap_sort": {
      "numbers": {
        "max_items": 50,
        "items": {
          "minimum": -1000000,
          "maximum": 1000000
        }
      }
    },
    "shell_sort": {
      "numbers": {
        "max_items": 50,
        "items": {
          "minimum": -1000000,
          "maximum": 1000000
        }
      }
    },
    "cocktail_shaker_sort": {
      "numbers": {
        "max_items": 50,
        "items": {
          "minimum": -1000000,
          "maximum": 1000000
        }
      }
    },
    "gnome_sort": {
      "numbers": {
        "max_items": 50,
        "items": {
          "minimum": -1000000,
          "maximum": 1000000
        }
      }
    },
    "comb_sort": {
      "numbers": {
        "max_items": 50,
        "items": {
          "minimum": -1000000,
          "maximum": 1000000
        }
      }
    },
    "counting_sort": {
      "numbers": {
        "max_items": 50,
        "items": {
          "minimum": -1000000,
          "maximum": 1000000
        }
      }
    }
  },
  "searching": {
    "linear_search": {
      "numbers": {
        "max_items": 50,
        "items": {
          "minimum": -1000000,
          "maximum": 1000000
        }
      },
      "target": {
        "minimum": -1000000,
        "maximum": 1000000
      }
    },
    "binary_search": {
      "numbers": {
        "max_items": 50,
        "items": {
          "minimum": -1000000,
          "maximum": 1000000
        }
      },
      "target": {
        "minimum": -1000000,
        "maximum": 1000000
      }
    }
  },
  "graph": {
    "bfs": {
      "nodes": {
        "max_items": 30,
        "items": {
          "min_length": 1,
          "max_length": 20
        }
      },
      "edges": {
        "max_items": 200
      }
    },
    "dfs": {
      "nodes": {
        "max_items": 30,
        "items": {
          "min_length": 1,
          "max_length": 20
        }
      },
      "edges": {
        "max_items": 200
      }
    },
    "dijkstra": {
      "nodes": {
        "max_items": 30,
        "items": {
          "min_length": 1,
          "max_length": 20
        }
      },
      "edges": {
        "max_items": 200
      }
    },
    "a_star": {
      "nodes": {
        "max_items": 30,
        "items": {
          "min_length": 1,
          "max_length": 20
        }
      },
      "edges": {
        "max_items": 200
      }
    },
    "topological_sort": {
      "nodes": {
        "max_items": 30,
        "items": {
          "min_length": 1,
          "max_length": 20
        }
      },
      "edges": {
        "max_items": 200
      }
    },
    "kruskal": {
      "nodes": {
        "max_items": 30,
        "items": {
          "min_length": 1,
          "max_length": 20
        }
      },
      "edges": {
        "max_items": 200
      }
    },
    "prim": {
      "nodes": {
        "max_items": 30,
        "items": {
          "min_length": 1,
          "max_length": 20
        }
      },
      "edges": {
        "max_items": 200
      }
    }
  },
  "dynamic_programming": {
    "fibonacci": {
      "n": {
        "minimum": 0,
        "maximum": 40
      }
    },
    "coin_change": {
      "coins": {
        "min_items": 1,
        "max_items": 8,
        "items": {
          "minimum": 1
        }
      },
      "amount": {
        "minimum": 0,
        "maximum": 50
      }
    },
    "knapsack": {
      "weights": {
        "min_items": 1,
        "max_items": 8,
        "items": {
          "minimum": 1
        }
      },
      "values": {
        "min_items": 1,
        "max_items": 8,
        "items": {
          "minimum": 0
        }
      },
      "capacity": {
        "minimum": 0,
        "maximum": 50
      }
    },
    "lcs": {
      "text_a": {
        "max_length": 12
      },
      "text_b": {
        "max_length": 12
      }
    },
    "edit_distance": {
      "text_a": {
        "max_length": 12
      },
      "text_b": {
        "max_length": 12
      }
    },
    "unique_paths": {
      "rows": {
        "minimum": 1,
        "maximum": 12
      },
      "cols": {
        "minimum": 1,
        "maximum": 12
      }
    }
  },
  "backtracking": {
    "n_queens": {
      "size": {
        "minimum": 1,
        "maximum": 10
      }
    },
    "maze_solver": {
      "rows": {
        "minimum": 2,
        "maximum": 15
      },
      "cols": {
        "minimum": 2,
        "maximum": 15
      },
      "start": {
        "min_items": 2,
        "max_items": 2
      },
      "end": {
        "min_items": 2,
        "max_items": 2
      }
    },
    "permutations": {
      "values": {
        "min_items": 1,
        "max_items": 6,
        "items": {
          "min_length": 1,
          "max_length": 12
        }
      }
    },
    "subsets": {
      "values": {
        "min_items": 1,
        "max_items": 10,
        "items": {
          "min_length": 1,
          "max_length": 12
        }
      }
    },
    "sudoku_solver": {
      "board": {
        "min_items": 9,
        "max_items": 9,
        "items": {
          "min_items": 9,
          "max_items": 9
        }
      }
    }
  },
  "trees": {
    "bst_insert": {
      "values": {
        "min_items": 1,
        "max_items": 31
      }
    },
    "avl_insert": {
      "values": {
        "min_items": 1,
        "max_items": 31
      }
    },
    "bst_search": {
      "values": {
        "min_items": 1,
        "max_items": 31
      }
    },
    "inorder_traversal": {
      "values": {
        "min_items": 1,
        "max_items": 31
      }
    },
    "preorder_traversal": {
      "values": {
        "min_items": 1,
        "max_items": 31
      }
    },
    "postorder_traversal": {
      "values": {
        "min_items": 1,
        "max_items": 31
      }
    }
  },
  "hash_tables": {
    "hash_insert_chaining": {
      "values": {
        "min_items": 1,
        "max_items": 31,
        "items": {
          "min_length": 1,
          "max_length": 32
        }
      },
      "table_size": {
        "minimum": 2,
        "maximum": 31
      },
      "target": {
        "min_length": 1,
        "max_length": 32
      }
    },
    "hash_search_chaining": {
      "values": {
        "min_items": 1,
        "max_items": 31,
        "items": {
          "min_length": 1,
          "max_length": 32
        }
      },
      "table_size": {
        "minimum": 2,
        "maximum": 31
      },
      "target": {
        "min_length": 1,
        "max_length": 32
      }
    },
    "hash_insert_linear_probing": {
      "values": {
        "min_items": 1,
        "max_items": 31,
        "items": {
          "min_length": 1,
          "max_length": 32
        }
      },
      "table_size": {
        "minimum": 2,
        "maximum": 31
      },
      "target": {
        "min_length": 1,
        "max_length": 32
      }
    },
    "hash_search_linear_probing": {
      "values": {
        "min_items": 1,
        "max_items": 31,
        "items": {
          "min_length": 1,
          "max_length": 32
        }
      },
      "table_size": {
        "minimum": 2,
        "maximum": 31
      },
      "target": {
        "min_length": 1,
        "max_length": 32
      }
    }
  }
} as const;
