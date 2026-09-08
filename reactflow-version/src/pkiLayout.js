import ELK from "elkjs/lib/elk.bundled.js";
import { PKI_ZONES, PKI_COMPONENTS, PKI_STEPS, PKI_DEEP, PKI_ROLE } from "./pkiData.js";

const elk = new ELK();

export const NODE_W = 176;
export const NODE_H = 76;
export const SUB_W = 152;
export const SUB_H = 62;

export const ZONE_PAD = { top: 82, right: 38, bottom: 52, left: 38 };
export const COMP_PAD = { top: 62, right: 22, bottom: 22, left: 22 };

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

const compOptions = {
  "elk.algorithm": "layered",
  "elk.direction": "RIGHT",
  "elk.padding": `[top=${COMP_PAD.top},left=${COMP_PAD.left},bottom=${COMP_PAD.bottom},right=${COMP_PAD.right}]`,
  "elk.layered.spacing.nodeNodeBetweenLayers": "46",
  "elk.spacing.nodeNode": "26",
};

/**
 * Lay out the PKI lifecycle. Identical structure to the upload deep view — the
 * drill-down path is wired up so that populating PKI_DEEP later adds sections
 * without touching this file.
 */
export async function buildPkiLayout(expanded = new Set()) {
  const graph = {
    id: "root",
    layoutOptions: rootOptions,
    children: PKI_ZONES.map((z) => ({
      id: z.id,
      layoutOptions: zoneOptions,
      children: PKI_COMPONENTS.filter((c) => c.zone === z.id).map((c) => {
        const deep = PKI_DEEP[c.id];
        if (!expanded.has(c.id) || !deep) {
          return { id: c.id, width: NODE_W, height: NODE_H };
        }
        return {
          id: c.id,
          layoutOptions: compOptions,
          children: deep.internals.map((s) => ({ id: s.id, width: SUB_W, height: SUB_H })),
          edges: (deep.edges ?? []).map(([a, b], i) => ({
            id: `${c.id}-ie${i}`,
            sources: [a],
            targets: [b],
          })),
        };
      }),
    })),
    edges: PKI_STEPS.map((s, i) => ({
      id: `pe${i}`,
      sources: [s.source],
      targets: [s.target],
    })),
  };

  const laid = await elk.layout(graph);
  const nodes = [];

  for (const zone of laid.children ?? []) {
    const meta = PKI_ZONES.find((z) => z.id === zone.id);
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
      const comp = PKI_COMPONENTS.find((c) => c.id === child.id);
      const isOpen = expanded.has(child.id) && !!PKI_DEEP[child.id];

      nodes.push({
        id: child.id,
        type: "component",
        position: { x: child.x ?? 0, y: child.y ?? 0 },
        parentId: zone.id,
        data: {
          ...comp,
          color: PKI_ROLE[comp.role].color,
          expanded: isOpen,
          hasDepth: !!PKI_DEEP[child.id],
        },
        style: isOpen ? { width: child.width, height: child.height } : undefined,
        zIndex: 1,
      });

      for (const sub of child.children ?? []) {
        const meta2 = PKI_DEEP[child.id].internals.find((s) => s.id === sub.id);
        nodes.push({
          id: sub.id,
          type: "internal",
          position: { x: sub.x ?? 0, y: sub.y ?? 0 },
          parentId: child.id,
          data: { ...meta2, ownerId: child.id, color: PKI_ROLE[comp.role].color },
          zIndex: 2,
          draggable: false,
        });
      }
    }
  }

  const byId = Object.fromEntries(PKI_COMPONENTS.map((c) => [c.id, c]));
  const edges = PKI_STEPS.map((s, i) => ({
    id: `pe${i}`,
    source: s.source,
    target: s.target,
    type: "flow",
    zIndex: 3,
    data: {
      ...s,
      index: i,
      color: PKI_ROLE[byId[s.target].role].color,
      // Anchor/return edges take the colour of where the trust comes from.
      retColor: PKI_ROLE[byId[s.source].role].color,
    },
  }));

  for (const id of expanded) {
    const deep = PKI_DEEP[id];
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
