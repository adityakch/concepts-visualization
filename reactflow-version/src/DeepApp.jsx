import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  MarkerType,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";

import { buildDeepLayout, ALL_COMPONENTS, ALL_STEPS } from "./deepLayout.js";
import { DEEP } from "./deepData.js";
import { deepNodeTypes, InternalEdge } from "./deepNodes.jsx";
import { FlowEdge } from "./edges.jsx";
import { ROLE } from "./data.js";

const byId = Object.fromEntries(ALL_COMPONENTS.map((c) => [c.id, c]));
const internalById = {};
for (const [owner, d] of Object.entries(DEEP)) {
  for (const s of d.internals) internalById[s.id] = { ...s, ownerId: owner };
}

const edgeTypes = { flow: FlowEdge, internal: InternalEdge };

export default function DeepApp() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [expanded, setExpanded] = useState(() => new Set());
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  const [step, setStep] = useState(-1);
  const [picked, setPicked] = useState(null); // component id
  const [pickedSub, setPickedSub] = useState(null); // internal id
  const [playing, setPlaying] = useState(false);
  const [showThreats, setShowThreats] = useState(false);
  const [showRejects, setShowRejects] = useState(false);
  const [showState, setShowState] = useState(false);

  const timer = useRef(null);

  // Re-run ELK whenever the expanded set changes. Layout is the library's job,
  // so drilling in is just "change the input and re-layout".
  useEffect(() => {
    let alive = true;
    setBusy(true);
    buildDeepLayout(expanded).then(({ nodes: n, edges: e }) => {
      if (!alive) return;
      setNodes(n);
      setEdges(e);
      setReady(true);
      setBusy(false);
    });
    return () => {
      alive = false;
    };
  }, [expanded, setNodes, setEdges]);

  const toggleExpand = useCallback((id) => {
    if (!DEEP[id]) return;
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => setExpanded(new Set(Object.keys(DEEP))), []);
  const collapseAll = useCallback(() => setExpanded(new Set()), []);

  useEffect(() => {
    if (!playing) return;
    timer.current = setInterval(() => {
      setStep((s) => {
        if (s >= ALL_STEPS.length - 1) {
          setPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, 1900);
    return () => clearInterval(timer.current);
  }, [playing]);

  const goto = useCallback((i) => {
    setPlaying(false);
    setPicked(null);
    setPickedSub(null);
    setStep(Math.max(0, Math.min(ALL_STEPS.length - 1, i)));
  }, []);

  const reset = useCallback(() => {
    setPlaying(false);
    setStep(-1);
    setPicked(null);
    setPickedSub(null);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target instanceof Element && e.target.matches("input,textarea")) return;
      if (e.key === "ArrowRight") goto(step + 1);
      else if (e.key === "ArrowLeft") goto(step - 1);
      else if (e.key === "Escape") reset();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [step, goto, reset]);

  const active = step >= 0 ? ALL_STEPS[step] : null;
  const activeIds = active ? [active.source, active.target] : [];

  const decoratedNodes = useMemo(
    () =>
      nodes.map((n) => {
        if (n.type === "zone") return n;
        if (n.type === "internal") {
          return { ...n, selected: pickedSub === n.id };
        }
        const isActive = activeIds.includes(n.id) || picked === n.id;
        const anySel = !!active || !!picked;
        return {
          ...n,
          selected: picked === n.id,
          data: {
            ...n.data,
            showThreats,
            showRejects,
            isActive,
            isDimmed: anySel && !isActive && !n.data.expanded,
          },
        };
      }),
    [nodes, activeIds, picked, pickedSub, active, showThreats, showRejects],
  );

  const decoratedEdges = useMemo(
    () =>
      edges.map((e) => {
        if (e.type === "internal") return e;
        const isActive = step >= 0 && e.data.index === step;
        const touches = picked && (e.source === picked || e.target === picked);
        const anySel = step >= 0 || !!picked;
        const lit = isActive || touches;
        const color =
          e.data.kind === "ret" ? ROLE.idn.color : ROLE[byId[e.target].role].color;
        return {
          ...e,
          markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color },
          data: {
            ...e.data,
            targetRole: byId[e.target].role,
            showState,
            isActive: lit,
            isDimmed: anySel && !lit,
          },
        };
      }),
    [edges, step, picked, showState],
  );

  // ---- panel ---------------------------------------------------------------
  let detail = null;
  if (pickedSub && internalById[pickedSub]) {
    const s = internalById[pickedSub];
    const owner = byId[s.ownerId];
    detail = {
      tag: "Inside " + owner.name,
      counter: "",
      title: s.name,
      sub: s.sub,
      what: s.what,
      color: ROLE[owner.role].color,
    };
  } else if (active) {
    detail = {
      tag: `Step ${step + 1}`,
      counter: `${step + 1} of ${ALL_STEPS.length}`,
      title: active.title,
      sub: active.sub,
      what: active.what,
      principles: active.principles,
      threat: active.threat,
      threatDetail: active.threatDetail,
      fail: active.fail,
      state: active.state,
      color: ROLE[byId[active.target].role].color,
    };
  } else if (picked) {
    const c = byId[picked];
    detail = {
      tag: ROLE[c.role].label,
      counter: DEEP[picked] ? `${DEEP[picked].internals.length} internals` : "",
      title: c.name,
      sub: c.sub,
      what: c.what,
      principles: c.principles,
      threat: c.threat,
      threatDetail: c.threatDetail,
      fail: c.fail,
      color: ROLE[c.role].color,
    };
  }

  const openCount = expanded.size;

  return (
    <>
      <div className="toolbar">
        <button className="tb" onClick={() => goto(step - 1)} disabled={step <= 0}>
          ←
        </button>
        <button className="tb play" onClick={() => setPlaying((p) => !p)}>
          {playing ? "❙❙ Pause" : "▶ Play request"}
        </button>
        <button
          className="tb"
          onClick={() => goto(step + 1)}
          disabled={step >= ALL_STEPS.length - 1}
        >
          →
        </button>
        <button className="tb" onClick={reset}>
          Reset
        </button>
        <span className="tbstep">
          step <b>{step >= 0 ? step + 1 : "—"}</b> / {ALL_STEPS.length}
        </span>
        <span className="tbsep" />
        <button className="tb" onClick={expandAll}>
          Expand all
        </button>
        <button className="tb" onClick={collapseAll} disabled={openCount === 0}>
          Collapse all
        </button>
        <span className="tbstep">
          <b>{openCount}</b> / {Object.keys(DEEP).length} open
        </span>
        <span className="tbsep" />
        <button
          className="tb"
          aria-pressed={showThreats}
          data-tone="threat"
          onClick={() => setShowThreats((v) => !v)}
        >
          <i /> Threats
        </button>
        <button
          className="tb"
          aria-pressed={showRejects}
          data-tone="threat"
          onClick={() => setShowRejects((v) => !v)}
        >
          <i /> Rejection paths
        </button>
        <button
          className="tb"
          aria-pressed={showState}
          data-tone="store"
          onClick={() => setShowState((v) => !v)}
        >
          <i /> Data state
        </button>
      </div>

      <div className="stage">
        <div className="canvas">
          {busy && <div className="loading">Re-running ELK layout…</div>}
          <ReactFlow
            nodes={decoratedNodes}
            edges={decoratedEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={deepNodeTypes}
            edgeTypes={edgeTypes}
            onNodeClick={(_, n) => {
              if (n.type === "internal") {
                setPlaying(false);
                setStep(-1);
                setPicked(null);
                setPickedSub(n.id);
                return;
              }
              if (n.type !== "component") return;
              setPlaying(false);
              setStep(-1);
              setPickedSub(null);
              setPicked(n.id);
              toggleExpand(n.id);
            }}
            onPaneClick={reset}
            // A readable starting zoom rather than fitView. The deep graph is
            // far too large to fit and stay legible, so it opens at the start of
            // the request and is explored by panning — the minimap and zoom
            // controls handle navigation.
            defaultViewport={{ x: 40, y: 40, zoom: 0.8 }}
            minZoom={0.15}
            maxZoom={2.4}
            proOptions={{ hideAttribution: false }}
          >
            <Background variant={BackgroundVariant.Dots} gap={26} size={1} color="#1c2532" />
            <Controls showInteractive={false} />
            <MiniMap
              pannable
              zoomable
              nodeColor={(n) =>
                n.type === "component" ? ROLE[n.data.role].color : "transparent"
              }
              maskColor="rgba(8,11,17,.78)"
              style={{
                background: "#0d1420",
                border: "1px solid #1D2634",
                width: 148,
                height: 82,
                opacity: 0.92,
              }}
            />
          </ReactFlow>
        </div>

        <aside className="panel">
          {!detail ? (
            <div className="empty">
              <b>Click a stage to open it up.</b>
              <p>
                Each stage with a <span className="inline-plus">+</span> holds its real internals —
                the load balancers, key hierarchy, sandboxes and permission machinery underneath.
                Opening one re-runs the layout rather than shuffling anything by hand.
              </p>
              <p>
                Click an internal box for what that specific mechanism does. Everything named here
                comes from a Google publication; where ordering isn't published, the note says so.
              </p>
              <div className="found">
                <span className="ft">Where the depth lives</span>
                <div className="frow">
                  <b>Traffic</b>
                  <span>ECMP → Maglev L4 → GFE L7, health checks and draining.</span>
                </div>
                <div className="frow">
                  <b>Authorization</b>
                  <span>Zanzibar relation tuples, consistency tokens, Spanner-backed.</span>
                </div>
                <div className="frow">
                  <b>Crypto</b>
                  <span>Per-chunk DEKs, envelope wrap, HSM root, rotation.</span>
                </div>
                <div className="frow">
                  <b>Isolation</b>
                  <span>gVisor sandboxing, verified boot, binary provenance.</span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ "--pc": detail.color, "--ps": detail.color + "22" }}>
              <div className="phead">
                <span className="ptag">{detail.tag}</span>
                {detail.counter && <span className="pn">{detail.counter}</span>}
              </div>
              <h2>{detail.title}</h2>
              <div className="psub">{detail.sub}</div>
              <p className="pwhat">{detail.what}</p>

              {detail.principles && (
                <div className="psec">
                  <span className="pt">Principles at work</span>
                  <div className="ppr">
                    {detail.principles.map((p) => (
                      <span key={p}>{p}</span>
                    ))}
                  </div>
                </div>
              )}
              {detail.threat && (
                <div className="psec">
                  <span className="pt">Threat it answers</span>
                  <div className="pth">{detail.threat}</div>
                  <p className="px">{detail.threatDetail}</p>
                </div>
              )}
              {detail.fail && (
                <div className="psec">
                  <span className="pt">If it refuses</span>
                  <p className="px">{detail.fail}</p>
                </div>
              )}
              {detail.state && (
                <div className="psec">
                  <span className="pt">Your file on this hop</span>
                  <p className="pst">{detail.state}</p>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
