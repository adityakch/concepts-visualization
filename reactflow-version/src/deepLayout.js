import ELK from "elkjs/lib/elk.bundled.js";
import { ZONES, COMPONENTS, STEPS } from "./data.js";
import { DEEP, EXTRA_COMPONENTS, EXTRA_STEPS } from "./deepData.js";

const elk = new ELK();

export const NODE_W = 168;
export const NODE_H = 74;
export const SUB_W = 152;
export const SUB_H = 62;

export const ZONE_PAD = { top: 82, right: 38, bottom: 52, left: 38 };
// An expanded component becomes a container: its label sits at the top, so its
// children need clearance underneath.
export const COMP_PAD = { top: 62, right: 22, bottom: 22, left: 22 };

export const ALL_COMPONENTS = [...COMPONENTS, ...EXTRA_COMPONENTS];
export const ALL_STEPS = [...STEPS, ...EXTRA_STEPS];

const rootOptions = {
  "elk.algorithm": "layered",
  "elk.direction": "RIGHT",
  "elk.hierarchyHandling": "INCLUDE_CHILDREN",
  "elk.layered.spacing.nodeNodeBetweenLayers": "116",
  "elk.spacing.nodeNode": "56",
  "elk.layered.spacing.edgeNodeBetweenLayers": "30",
  "elk.spacing.edgeNode": "24",
  "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
  "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
};

const zoneOptions = {
  "elk.padding": `[top=${ZONE_PAD.top},left=${ZONE_PAD.left},bottom=${ZONE_PAD.bottom},right=${ZONE_PAD.right}]`,
  "elk.spacing.nodeNode": "104",
};

// Internals of one component lay out left-to-right in their own little graph.
const compOptions = {
  "elk.algorithm": "layered",
  "elk.direction": "RIGHT",
  "elk.padding": `[top=${COMP_PAD.top},left=${COMP_PAD.left},bottom=${COMP_PAD.bottom},right=${COMP_PAD.right}]`,
  "elk.layered.spacing.nodeNodeBetweenLayers": "46",
  "elk.spacing.nodeNode": "26",
};

/**
 * Lay out the deep graph.
 *
 * @param {Set<string>} expanded ids of components currently drilled into.
 * Expanded components become ELK compound nodes holding their internals; the
 * rest stay leaf nodes. Request-path edges always attach to the component
 * itself, never to an internal, so expanding never rewires the main flow.
 */
export async function buildDeepLayout(expanded) {
  const graph = {
    id: "root",
    layoutOptions: rootOptions,
    children: ZONES.map((z) => ({
      id: z.id,
      layoutOptions: zoneOptions,
      children: ALL_COMPONENTS.filter((c) => c.zone === z.id).map((c) => {
        const deep = DEEP[c.id];
        if (!expanded.has(c.id) || !deep) {
          return { id: c.id, width: NODE_W, height: NODE_H };
        }
        return {
          id: c.id,
          layoutOptions: compOptions,
          children: deep.internals.map((s) => ({
            id: s.id,
            width: SUB_W,
            height: SUB_H,
          })),
          edges: (deep.edges ?? []).map(([a, b], i) => ({
            id: `${c.id}-ie${i}`,
            sources: [a],
            targets: [b],
          })),
        };
      }),
    })),
    edges: ALL_STEPS.map((s, i) => ({
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
      const comp = ALL_COMPONENTS.find((c) => c.id === child.id);
      const isOpen = expanded.has(child.id) && !!DEEP[child.id];

      nodes.push({
        id: child.id,
        type: "component",
        position: { x: child.x ?? 0, y: child.y ?? 0 },
        parentId: zone.id,
        data: { ...comp, expanded: isOpen, hasDepth: !!DEEP[child.id] },
        style: isOpen ? { width: child.width, height: child.height } : undefined,
        zIndex: 1,
      });

      // Internals are children of the component node.
      for (const sub of child.children ?? []) {
        const meta2 = DEEP[child.id].internals.find((s) => s.id === sub.id);
        nodes.push({
          id: sub.id,
          type: "internal",
          position: { x: sub.x ?? 0, y: sub.y ?? 0 },
          parentId: child.id,
          data: { ...meta2, ownerId: child.id, ownerColor: comp.role },
          zIndex: 2,
          draggable: false,
        });
      }
    }
  }

  const edges = ALL_STEPS.map((s, i) => ({
    id: `e${i}`,
    source: s.source,
    target: s.target,
    type: "flow",
    zIndex: 3,
    data: { ...s, index: i },
  }));

  // Internal wiring, drawn only while its component is open.
  for (const id of expanded) {
    const deep = DEEP[id];
    if (!deep) continue;
    (deep.edges ?? []).forEach(([a, b, label], i) => {
      edges.push({
        id: `${id}-ie${i}`,
        source: a,
        target: b,
        type: "internal",
        zIndex: 4,
        data: { label, ownerId: id },
      });
    });
  }

  return { nodes, edges };
}
