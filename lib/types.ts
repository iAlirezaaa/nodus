export type NodeKind = 'note' | 'image' | 'video' | 'audio' | 'pdf' | 'file' | 'link' | 'project';
export type NodeColor = 'sage' | 'blue' | 'amber' | 'rose' | 'violet' | 'gray';
export interface AssetMeta { id: string; name: string; mime: string; size: number; url: string; }
export interface Board { id: string; title: string; description: string; parentNodeId: string | null; createdAt: string; }
export interface GraphNode { id: string; boardId: string; kind: NodeKind; title: string; text: string; x: number; y: number; width: number; height: number; color: NodeColor; asset: AssetMeta | null; url: string; childBoardId: string | null; createdAt: string; }
export interface GraphEdge { id: string; boardId: string; sourceId: string; targetId: string; label: string; }
export interface Workspace { version: 1; homeBoardId: string; boards: Board[]; nodes: GraphNode[]; edges: GraphEdge[]; }
export interface Viewport { x: number; y: number; zoom: number; }
export type Language = 'fa' | 'en';
export const NODE_WIDTH = 244;
export const NODE_HEIGHT = 172;
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
