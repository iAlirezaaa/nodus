export type NodeKind = 'note' | 'image' | 'video' | 'audio' | 'pdf' | 'file' | 'link' | 'project';
export type NodeColor = 'sage' | 'blue' | 'amber' | 'rose' | 'violet' | 'gray';
export type TaskStatus = 'todo' | 'doing' | 'done';
export type NodeAppearance = 'card' | 'sticky' | 'outline';
export type EdgeRoute = 'curve' | 'straight' | 'elbow';
export type EdgeStroke = 'solid' | 'dashed' | 'dotted';
export interface NodeAnnotation {
  id: string;
  field: 'title' | 'text';
  start: number;
  end: number;
  quote: string;
  body: string;
  color: NodeColor;
  resolved: boolean;
  orphaned?: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface AssetMeta { id: string; name: string; mime: string; size: number; url: string; }
export interface BoardLayout {
  kind: 'neural' | 'tree' | 'orbit' | 'grid' | 'timeline' | 'kanban';
  sort: 'created' | 'title' | 'kind' | 'color' | 'status';
  direction: 'asc' | 'desc'; spacing: number; language: Language;
  /** Fixed lane separation from the most recent arrangement, in world pixels. */
  columnStep?: number;
}
export interface Board { id: string; title: string; description: string; parentNodeId: string | null; createdAt: string; layout?: BoardLayout; }
export interface GraphNode { id: string; boardId: string; kind: NodeKind; title: string; text: string; x: number; y: number; width: number; height: number; color: NodeColor; asset: AssetMeta | null; url: string; childBoardId: string | null; createdAt: string; scheduledAt?: string; task?: { status: TaskStatus; parentId: string | null }; appearance?: NodeAppearance; annotations?: NodeAnnotation[]; }
export interface GraphEdge { id: string; boardId: string; sourceId: string; targetId: string; label: string; route?: EdgeRoute; stroke?: EdgeStroke; color?: NodeColor; width?: number; animated?: boolean; bend?: { x: number; y: number }; }
export interface Workspace { version: 1; homeBoardId: string; boards: Board[]; nodes: GraphNode[]; edges: GraphEdge[]; }
export interface Viewport { x: number; y: number; zoom: number; }
export type Language = 'fa' | 'en';
export const NODE_WIDTH = 244;
export const NODE_HEIGHT = 172;
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
