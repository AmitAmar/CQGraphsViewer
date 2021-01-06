export interface Node {
  key: string,
  color: string,
  arr: number[]
}

export interface Link {
  key: number,
  from: string,
  to: string,
  text: string
}

export interface ApiGraph {
  arrange_by: string;
  nodes: Node[];
  edges: Link[];
  is_horizontal: boolean;
}

export interface Quantity {
  name: string
}
