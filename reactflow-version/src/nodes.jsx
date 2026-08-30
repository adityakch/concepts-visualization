import { Handle, Position, NodeToolbar } from "@xyflow/react";
import { ROLE, THREAT } from "./data.js";
import { Icon } from "./icons.jsx";

/** Trust-boundary container. ELK sizes it; this just draws the dashed shell. */
export function ZoneNode({ data }) {
  return (
    <div className="zone" style={{ "--zc": data.color }}>
      <span className="zone-label">{data.label}</span>
    </div>
  );
}

/** One service in the topology. */
export function ComponentNode({ data, selected }) {
  const role = ROLE[data.role];
  const showThreat = data.showThreats && data.chipThreat;
  const showReject = data.showRejects && data.reject;

  return (
    <>
      <NodeToolbar isVisible={!!showThreat} position={Position.Top} offset={8}>
        <div className="chip chip-threat">{data.chipThreat}</div>
      </NodeToolbar>

      <NodeToolbar isVisible={!!showReject} position={Position.Bottom} offset={8}>
        <div className="chip chip-reject">
          <span className="x">✕</span>
          {data.reject}
        </div>
      </NodeToolbar>

      <div
        className={[
          "cnode",
          selected ? "is-selected" : "",
          data.isActive ? "is-active" : "",
          data.isDimmed ? "is-dimmed" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ "--c": role.color, "--cs": role.color + "22" }}
      >
        <Handle type="target" position={Position.Left} />
        <div className="cnode-ic">
          <Icon name={data.icon} />
        </div>
        <div className="cnode-txt">
          <div className="cnode-nm">{data.name}</div>
          <div className="cnode-sb">{data.sub}</div>
          {data.enterprise && <div className="cnode-ent">enterprise only</div>}
        </div>
        <Handle type="source" position={Position.Right} />
      </div>
    </>
  );
}

export const nodeTypes = { zone: ZoneNode, component: ComponentNode };
export { THREAT };
