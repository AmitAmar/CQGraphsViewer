export interface Node { key: string, color: string, arr: number[] }
export interface Link { key: number, from: string, to: string, text:string}

export interface ApiGraph {'nodes' : Node[], 'edges' : Link[]};
