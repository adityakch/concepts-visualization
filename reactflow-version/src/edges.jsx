import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from "@xyflow/react";
import { ROLE } from "./data.js";

/**
 * One call in the request. Carries its step number, the protocol label, an
 * optional trust-boundary lock badge, and (when toggled) the data state.
 */
export function FlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data = {},
  markerEnd,
}) {
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 14,
  });

  const target = data.targetRole ? ROLE[data.targetRole].color : "#2A3446";
  const color = data.kind === "ret" ? ROLE.idn.color : target;
  const dash = data.kind === "call" ? "7 5" : data.kind === "ret" ? "3 4" : undefined;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{
          stroke: color,
          strokeWidth: data.isActive ? 3.4 : 1.9,
          strokeDasharray: dash,
          opacity: data.isDimmed ? 0.12 : 1,
          transition: "stroke-width .2s, opacity .25s",
        }}
      />
      <EdgeLabelRenderer>
        <div
          className={[
            "elabel",
            data.isActive ? "is-active" : "",
            data.isDimmed ? "is-dimmed" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          style={{
            transform: `translate(-50%,-50%) translate(${labelX}px,${labelY}px)`,
            "--c": color,
          }}
        >
          <span className="enum">{data.index + 1}</span>
          <span className="etxt">{data.label}</span>
          {data.lock && <span className="elock">🔒 {data.lock}</span>}
          {data.showState && data.state && <span className="estate">{data.state}</span>}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const edgeTypes = { flow: FlowEdge };
