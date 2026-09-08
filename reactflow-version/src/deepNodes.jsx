import { Handle, Position, NodeToolbar } from "@xyflow/react";
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from "@xyflow/react";
import { ROLE } from "./data.js";
import { Icon } from "./icons.jsx";

export function ZoneNode({ data }) {
  return (
    <div className="zone" style={{ "--zc": data.color }}>
      <span className="zone-label">{data.label}</span>
    </div>
  );
}

/**
 * A stage. Collapsed it is a plain box; expanded it becomes a container that
 * holds its internals, with the header pinned at the top.
 */
export function ComponentNode({ data, selected }) {
  // data.color lets a different dataset (e.g. the PKI view) supply its own
  // palette instead of the upload path's ROLE map.
  const role = data.color ? { color: data.color } : ROLE[data.role];
  const open = data.expanded;

  return (
    <>
      <NodeToolbar isVisible={!!(data.showThreats && data.chipThreat)} position={Position.Top} offset={8}>
        <div className="chip chip-threat">{data.chipThreat}</div>
      </NodeToolbar>
      <NodeToolbar isVisible={!!(data.showRejects && data.reject)} position={Position.Bottom} offset={8}>
        <div className="chip chip-reject">
          <span className="x">✕</span>
          {data.reject}
        </div>
      </NodeToolbar>

      <div
        className={[
          "cnode",
          open ? "is-open" : "",
          data.floating ? "is-floating" : "",
          selected ? "is-selected" : "",
          data.isActive ? "is-active" : "",
          data.isDimmed ? "is-dimmed" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ "--c": role.color, "--cs": role.color + "22" }}
      >
        <Handle type="target" position={Position.Left} />

        <div className="cnode-head">
          <div className="cnode-ic">
            <Icon name={data.icon} size={open ? 18 : 22} />
          </div>
          <div className="cnode-txt">
            <div className="cnode-nm">{data.name}</div>
            {!open && <div className="cnode-sb">{data.sub}</div>}
            {!open && data.enterprise && <div className="cnode-ent">enterprise only</div>}
          </div>
          {data.hasDepth && (
            <span className="cnode-depth" title={open ? "Collapse" : "Show internals"}>
              {open ? "−" : "+"}
            </span>
          )}
        </div>

        <Handle type="source" position={Position.Right} />
      </div>
    </>
  );
}

/** One internal mechanism inside an expanded stage. */
export function InternalNode({ data, selected }) {
  const color = ROLE[data.ownerColor]?.color ?? "#98A4BA";
  return (
    <div
      className={["inode", selected ? "is-selected" : ""].filter(Boolean).join(" ")}
      style={{ "--c": color, "--cs": color + "1f" }}
    >
      <Handle type="target" position={Position.Left} />
      <div className="inode-nm">{data.name}</div>
      <div className="inode-sb">{data.sub}</div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

/** Thin connector between internals — deliberately quieter than a request hop. */
export function InternalEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data = {},
}) {
  const [path, lx, ly] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 8,
  });
  return (
    <>
      <BaseEdge id={id} path={path} style={{ stroke: "#3a465c", strokeWidth: 1.2 }} />
      {data.label && (
        <EdgeLabelRenderer>
          <div
            className="ilabel"
            style={{ transform: `translate(-50%,-50%) translate(${lx}px,${ly}px)` }}
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const deepNodeTypes = {
  zone: ZoneNode,
  component: ComponentNode,
  internal: InternalNode,
};
