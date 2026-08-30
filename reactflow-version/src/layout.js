import ELK from "elkjs/lib/elk.bundled.js";
import { ZONES, COMPONENTS, STEPS } from "./data.js";

const elk = new ELK();

const NODE_W = 168;
const NODE_H = 74;

// Hierarchical layered layout, left-to-right. `hierarchyHandling: INCLUDE_CHILDREN`
// is what lets edges cross between trust-boundary containers while ELK still
// sizes each container around its own children.
const layoutOptions = {
  "elk.algorithm": "layered",
  "elk.direction": "RIGHT",
  "elk.hierarchyHandling": "INCLUDE_CHILDREN",
  "elk.layered.spacing.nodeNodeBetweenLayers": "76",
  "elk.spacing.nodeNode": "44",
  // NOTE: edge *routing* is React Flow's job here — edges.jsx recomputes each
  // path with getSmoothStepPath between handles, so ELK's routed bend points are
  // not consumed. These spacing values therefore only influence node placement.
  "elk.layered.spacing.edgeNodeBetweenLayers": "30",
  "elk.spacing.edgeNode": "24",
  "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
  "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
  "elk.edgeRouting": "POLYLINE",
};

const zoneOptions = {
  // Generous top padding: the zone label lives up there, and each node's
  // NodeToolbar (threat chip) renders above the node itself — without the room
  // the two collide. Bottom padding leaves space for the rejection chip.
  "elk.padding": "[top=82,left=28,bottom=52,right=28]",
  // Wide enough that neighbouring nodes' toolbars don't collide either.
  "elk.spacing.nodeNode": "88",
};

/**
 * Builds the ELK graph from the data, runs the layout, and converts the result
 * into React Flow nodes/edges. No coordinate in this file is hand-written —
 * every x/y comes back from ELK.
 */
export async function buildLayout() {
  const graph = {
    id: "root",
    layoutOptions,
    children: ZONES.map((z) => ({
      id: z.id,
      layoutOptions: zoneOptions,
      children: COMPONENTS.filter((c) => c.zone === z.id).map((c) => ({
        id: c.id,
        width: NODE_W,
        height: NODE_H,
      })),
    })),
    edges: STEPS.map((s, i) => ({
      id: `e${i}`,
      sources: [s.source],
      targets: [s.target],
    })),
  };

  const laid = await elk.layout(graph);

  const nodes = [];

  for (const zone of laid.children ?? []) {
    const meta = ZONES.find((z) => z.id === zone.id);
    nodes.push({
      id: zone.id,
      type: "zone",
      position: { x: zone.x ?? 0, y: zone.y ?? 0 },
      data: { label: meta.label, color: meta.color },
      style: { width: zone.width, height: zone.height },
      selectable: false,
      draggable: false,
      zIndex: 0,
    });

    for (const child of zone.children ?? []) {
      const comp = COMPONENTS.find((c) => c.id === child.id);
      nodes.push({
        id: child.id,
        type: "component",
        // Child coordinates from ELK are relative to the parent, which is
        // exactly what React Flow expects when parentId is set.
        position: { x: child.x ?? 0, y: child.y ?? 0 },
        parentId: zone.id,
        extent: "parent",
        data: { ...comp },
        zIndex: 1,
      });
    }
  }

  const edges = STEPS.map((s, i) => ({
    id: `e${i}`,
    source: s.source,
    target: s.target,
    type: "flow",
    zIndex: 2,
    data: { ...s, index: i },
  }));

  return { nodes, edges };
}
