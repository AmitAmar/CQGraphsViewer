export interface Node {
  key: string,
  color: string,
}

export interface Link {
  key: number,
  from: string,
  to: string,
  text: string
}

export interface ApiGraph {
  nodes: Node[];
  edges: Link[];
  arrange_by_horizontal: string;
  arrange_by_vertical: string;
}

export interface Quantity {
  name: string
}
