use std::cmp::Reverse;
use std::collections::{BinaryHeap, HashMap};

use crate::navigation::bearing::distance_meters;
use crate::navigation::graph::CampusGraph;

pub struct PathResult {
    pub node_indices: Vec<u32>,
    pub total_distance_meters: f64,
    pub found: bool,
}

impl PathResult {
    pub fn not_found() -> Self {
        Self {
            node_indices: vec![],
            total_distance_meters: 0.0,
            found: false,
        }
    }
}

pub fn find_path(
    graph: &CampusGraph,
    start_index: u32,
    goal_index: u32,
    wheelchair_only: bool,
) -> PathResult {
    if graph.nodes.is_empty() {
        return PathResult::not_found();
    }

    let node_count = graph.nodes.len() as u32;
    if start_index >= node_count || goal_index >= node_count {
        return PathResult::not_found();
    }

    if start_index == goal_index {
        return PathResult {
            node_indices: vec![start_index],
            total_distance_meters: 0.0,
            found: true,
        };
    }

    let goal_node = &graph.nodes[goal_index as usize];
    let heuristic = |node_idx: u32| -> f64 {
        let node = &graph.nodes[node_idx as usize];
        distance_meters(
            node.latitude,
            node.longitude,
            goal_node.latitude,
            goal_node.longitude,
        )
    };

    let mut open_set: BinaryHeap<Reverse<(u64, u32)>> = BinaryHeap::new();
    let mut g_score: HashMap<u32, f64> = HashMap::new();
    let mut came_from: HashMap<u32, u32> = HashMap::new();

    g_score.insert(start_index, 0.0);
    let h_start = heuristic(start_index);
    open_set.push(Reverse((f64::to_bits(h_start), start_index)));

    let mut best_goal_g: Option<f64> = None;

    while let Some(Reverse((_, current))) = open_set.pop() {
        let current_g = g_score[&current];

        if current == goal_index {
            match best_goal_g {
                Some(best) if current_g < best => best_goal_g = Some(current_g),
                None => best_goal_g = Some(current_g),
                _ => {}
            }
            continue;
        }

        for edge in &graph.edges {
            let neighbor = if edge.from_index == current {
                if wheelchair_only && !edge.wheelchair_accessible {
                    continue;
                }
                edge.to_index
            } else if edge.bidirectional && edge.to_index == current {
                if wheelchair_only && !edge.wheelchair_accessible {
                    continue;
                }
                edge.from_index
            } else {
                continue;
            };

            if neighbor >= node_count {
                continue;
            }

            let tentative_g = current_g + edge.distance_meters;
            let existing_g = g_score.get(&neighbor).copied();

            if existing_g.is_none() || tentative_g < existing_g.unwrap() {
                g_score.insert(neighbor, tentative_g);
                came_from.insert(neighbor, current);
                let f_score = tentative_g + heuristic(neighbor);
                open_set.push(Reverse((f64::to_bits(f_score), neighbor)));
            }
        }
    }

    match best_goal_g {
        Some(g) => {
            let mut path = vec![goal_index];
            let mut cursor = goal_index;
            while cursor != start_index {
                cursor = came_from[&cursor];
                path.push(cursor);
            }
            path.reverse();
            PathResult {
                node_indices: path,
                total_distance_meters: g,
                found: true,
            }
        }
        None => PathResult::not_found(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::navigation::graph::CampusGraph;

    #[test]
    fn start_equals_goal_returns_single_node_path() {
        let mut graph = CampusGraph::new();
        graph.add_node(0.0, 0.0, 0);
        graph.add_node(0.001, 0.0, 0);
        let result = find_path(&graph, 0, 0, false);
        assert!(result.found);
        assert_eq!(result.node_indices, vec![0]);
        assert!((result.total_distance_meters - 0.0).abs() < 0.0001);
    }

    #[test]
    fn direct_edge_returns_two_node_path() {
        let mut graph = CampusGraph::new();
        graph.add_node(0.0, 0.0, 0);
        graph.add_node(0.0009, 0.0, 0);
        graph.add_edge(0, 1, 100.0, true, true, false);
        let result = find_path(&graph, 0, 1, false);
        assert!(result.found);
        assert_eq!(result.node_indices, vec![0, 1]);
        assert!((result.total_distance_meters - 100.0).abs() < 0.0001);
    }

    #[test]
    fn shortest_path_chosen_over_longer_path() {
        let mut graph = CampusGraph::new();
        graph.add_node(0.0, 0.0, 0);
        graph.add_node(0.0018, 0.0, 0);
        graph.add_node(0.00045, 0.0, 0);
        graph.add_edge(0, 1, 200.0, true, true, false);
        graph.add_edge(0, 2, 50.0, true, true, false);
        graph.add_edge(2, 1, 60.0, true, true, false);
        let result = find_path(&graph, 0, 1, false);
        assert!(result.found);
        assert_eq!(result.node_indices, vec![0, 2, 1]);
        assert!((result.total_distance_meters - 110.0).abs() < 0.0001);
    }

    #[test]
    fn wheelchair_filter_skips_inaccessible_edges() {
        let mut graph = CampusGraph::new();
        graph.add_node(0.0, 0.0, 0);
        graph.add_node(0.001, 0.0, 0);
        graph.add_edge(0, 1, 100.0, true, false, false);
        let result = find_path(&graph, 0, 1, true);
        assert!(!result.found);
    }

    #[test]
    fn unreachable_goal_returns_not_found() {
        let mut graph = CampusGraph::new();
        graph.add_node(0.0, 0.0, 0);
        graph.add_node(0.001, 0.0, 0);
        let result = find_path(&graph, 0, 1, false);
        assert!(!result.found);
    }
}
