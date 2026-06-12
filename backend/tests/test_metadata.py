from typing import get_args

from app.algorithms.graph.types import GraphAlgorithm
from app.algorithms.metadata import (
    ALGORITHM_METADATA,
    GRAPH_ALGORITHM_METADATA,
    SEARCHING_ALGORITHM_METADATA,
    SORTING_ALGORITHM_METADATA,
)
from app.algorithms.searching import SEARCHING_ALGORITHMS
from app.algorithms.sorting import SORTING_ALGORITHMS
from app.algorithms.types import SearchingAlgorithm, SortingAlgorithm


def test_metadata_covers_every_supported_algorithm_once() -> None:
    metadata_ids = [item.id for item in ALGORITHM_METADATA]

    assert len(metadata_ids) == len(set(metadata_ids))
    assert {item.id for item in SORTING_ALGORITHM_METADATA} == set(
        get_args(SortingAlgorithm)
    ) == set(SORTING_ALGORITHMS)
    assert {item.id for item in SEARCHING_ALGORITHM_METADATA} == set(
        get_args(SearchingAlgorithm)
    ) == set(SEARCHING_ALGORITHMS)
    assert {item.id for item in GRAPH_ALGORITHM_METADATA} == set(
        get_args(GraphAlgorithm)
    )


def test_metadata_has_consistent_display_fields_and_categories() -> None:
    expected_categories = {
        **{item.id: "sorting" for item in SORTING_ALGORITHM_METADATA},
        **{item.id: "searching" for item in SEARCHING_ALGORITHM_METADATA},
        **{item.id: "graph" for item in GRAPH_ALGORITHM_METADATA},
    }

    for item in ALGORITHM_METADATA:
        assert item.label == item.name
        assert item.category == expected_categories[item.id]
        assert item.description.strip()
        assert item.space_complexity.strip()
        assert item.notes
        assert all(note.strip() for note in item.notes)
        assert item.time_complexity.best.strip()
        assert item.time_complexity.average.strip()
        assert item.time_complexity.worst.strip()
