use crate::navigation::bearing::distance_meters;

pub struct LocationNode {
    pub latitude: f64,
    pub longitude: f64,
    pub floor_index: i32,
}

pub struct GraphEdge {
    pub from_index: u32,
    pub to_index: u32,
    pub distance_meters: f64,
    pub bidirectional: bool,
    pub wheelchair_accessible: bool,
    pub floor_transition: bool,
}

pub struct CampusGraph {
    pub nodes: Vec<LocationNode>,
    pub edges: Vec<GraphEdge>,
}

impl CampusGraph {
    pub fn new() -> Self {
        Self {
            nodes: Vec::new(),
            edges: Vec::new(),
        }
    }

    pub fn add_node(&mut self, latitude: f64, longitude: f64, floor_index: i32) -> u32 {
        self.nodes.push(LocationNode {
            latitude,
            longitude,
            floor_index,
        });
        (self.nodes.len() - 1) as u32
    }

    pub fn add_edge(
        &mut self,
        from: u32,
        to: u32,
        distance_meters: f64,
        bidirectional: bool,
        wheelchair_accessible: bool,
        floor_transition: bool,
    ) {
        self.edges.push(GraphEdge {
            from_index: from,
            to_index: to,
            distance_meters,
            bidirectional,
            wheelchair_accessible,
            floor_transition,
        });
    }

    pub fn neighbors(&self, node_index: u32) -> Vec<(u32, f64)> {
        let mut result = Vec::new();
        for edge in &self.edges {
            if edge.from_index == node_index {
                result.push((edge.to_index, edge.distance_meters));
            } else if edge.bidirectional && edge.to_index == node_index {
                result.push((edge.from_index, edge.distance_meters));
            }
        }
        result
    }

    pub fn node_count(&self) -> usize {
        self.nodes.len()
    }

    pub fn edge_count(&self) -> usize {
        self.edges.len()
    }

    pub fn nearest_node(&self, latitude: f64, longitude: f64, floor_index: i32) -> Option<u32> {
        if self.nodes.is_empty() || !latitude.is_finite() || !longitude.is_finite() {
            return None;
        }

        let mut nearest_same_floor: Option<(u32, f64)> = None;
        let mut nearest_cross_floor: Option<(u32, f64)> = None;

        for (i, node) in self.nodes.iter().enumerate() {
            let dist = distance_meters(latitude, longitude, node.latitude, node.longitude);
            if !dist.is_finite() {
                continue;
            }
            if node.floor_index == floor_index {
                match nearest_same_floor {
                    Some((_, best)) if dist < best => nearest_same_floor = Some((i as u32, dist)),
                    None => nearest_same_floor = Some((i as u32, dist)),
                    _ => {}
                }
            } else {
                match nearest_cross_floor {
                    Some((_, best)) if dist < best => nearest_cross_floor = Some((i as u32, dist)),
                    None => nearest_cross_floor = Some((i as u32, dist)),
                    _ => {}
                }
            }
        }

        match (nearest_same_floor, nearest_cross_floor) {
            (Some((same_idx, same_dist)), Some((cross_idx, cross_dist))) => {
                if same_dist <= cross_dist + 50.0 {
                    Some(same_idx)
                } else {
                    Some(cross_idx)
                }
            }
            (Some((same_idx, _)), None) => Some(same_idx),
            (None, Some((cross_idx, _))) => Some(cross_idx),
            (None, None) => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn add_node_increments_node_count_correctly() {
        let mut graph = CampusGraph::new();
        assert_eq!(graph.node_count(), 0);
        graph.add_node(0.0, 0.0, 0);
        assert_eq!(graph.node_count(), 1);
        graph.add_node(1.0, 1.0, 0);
        assert_eq!(graph.node_count(), 2);
    }

    #[test]
    fn add_edge_increments_edge_count_correctly() {
        let mut graph = CampusGraph::new();
        graph.add_node(0.0, 0.0, 0);
        graph.add_node(0.001, 0.0, 0);
        assert_eq!(graph.edge_count(), 0);
        graph.add_edge(0, 1, 111.0, true, true, false);
        assert_eq!(graph.edge_count(), 1);
        graph.add_edge(1, 0, 111.0, false, true, false);
        assert_eq!(graph.edge_count(), 2);
    }

    #[test]
    fn bidirectional_edge_appears_in_neighbors_of_both_endpoints() {
        let mut graph = CampusGraph::new();
        graph.add_node(0.0, 0.0, 0);
        graph.add_node(0.001, 0.0, 0);
        graph.add_edge(0, 1, 100.0, true, true, false);
        let n0 = graph.neighbors(0);
        let n1 = graph.neighbors(1);
        assert_eq!(n0.len(), 1);
        assert_eq!(n0[0].0, 1);
        assert_eq!(n0[0].1, 100.0);
        assert_eq!(n1.len(), 1);
        assert_eq!(n1[0].0, 0);
        assert_eq!(n1[0].1, 100.0);
    }

    #[test]
    fn one_way_edge_appears_only_in_neighbors_of_from_index() {
        let mut graph = CampusGraph::new();
        graph.add_node(0.0, 0.0, 0);
        graph.add_node(0.001, 0.0, 0);
        graph.add_edge(0, 1, 100.0, false, true, false);
        let n0 = graph.neighbors(0);
        let n1 = graph.neighbors(1);
        assert_eq!(n0.len(), 1);
        assert_eq!(n0[0].0, 1);
        assert_eq!(n1.len(), 0);
    }

    #[test]
    fn nearest_node_returns_correct_index_for_3_nodes_at_distinct_coordinates() {
        let mut graph = CampusGraph::new();
        graph.add_node(0.0, 0.0, 0);
        graph.add_node(0.01, 0.0, 0);
        graph.add_node(0.02, 0.0, 0);
        let nearest = graph.nearest_node(0.009, 0.0, 0);
        assert_eq!(nearest, Some(1));
    }
}
