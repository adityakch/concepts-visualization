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

import { buildPkiLayout } from "./pkiLayout.js";
import { PKI_COMPONENTS, PKI_STEPS, PKI_ROLE, PKI_DEEP } from "./pkiData.js";
import { deepNodeTypes, InternalEdge } from "./deepNodes.jsx";
import { FlowEdge } from "./edges.jsx";

const byId = Object.fromEntries(PKI_COMPONENTS.map((c) => [c.id, c]));
const edgeTypes = { flow: FlowEdge, internal: InternalEdge };

export default function PkiApp() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [expanded, setExpanded] = useState(() => new Set());
  const [busy, setBusy] = useState(false);

  const [step, setStep] = useState(-1);
  const [picked, setPicked] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [showThreats, setShowThreats] = useState(false);
  const [showRejects, setShowRejects] = useState(false);
  const [showState, setShowState] = useState(false);

  const timer = useRef(null);

  useEffect(() => {
    let alive = true;
    setBusy(true);
    buildPkiLayout(expanded).then(({ nodes: n, edges: e }) => {
      if (!alive) return;
      setNodes(n);
      setEdges(e);
      setBusy(false);
    });
    return () => {
      alive = false;
    };
  }, [expanded, setNodes, setEdges]);

  useEffect(() => {
    if (!playing) return;
    timer.current = setInterval(() => {
      setStep((s) => {
        if (s >= PKI_STEPS.length - 1) {
          setPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, 2000);
    return () => clearInterval(timer.current);
  }, [playing]);

  // Functional update rather than reading `step` from the closure: repeated
  // presses before a re-render would otherwise all compute the same target and
  // silently collapse into one move.
  const stepBy = useCallback((delta) => {
    setPlaying(false);
    setPicked(null);
    setStep((s) => Math.max(0, Math.min(PKI_STEPS.length - 1, s + delta)));
  }, []);

  const reset = useCallback(() => {
    setPlaying(false);
    setStep(-1);
    setPicked(null);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target instanceof Element && e.target.matches("input,textarea")) return;
      if (e.key === "ArrowRight") stepBy(1);
      else if (e.key === "ArrowLeft") stepBy(-1);
      else if (e.key === "Escape") reset();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [stepBy, reset]);

  const active = step >= 0 ? PKI_STEPS[step] : null;
  const activeIds = active ? [active.source, active.target] : [];

  const decoratedNodes = useMemo(
    () =>
      nodes.map((n) => {
        if (n.type !== "component") return n;
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
            isDimmed: anySel && !isActive,
          },
        };
      }),
    [nodes, activeIds, picked, active, showThreats, showRejects],
  );

  const decoratedEdges = useMemo(
    () =>
      edges.map((e) => {
        if (e.type === "internal") return e;
        const isActive = step >= 0 && e.data.index === step;
        const touches = picked && (e.source === picked || e.target === picked);
        const anySel = step >= 0 || !!picked;
        const lit = isActive || touches;
        const color = e.data.kind === "ret" ? e.data.retColor : e.data.color;
        return {
          ...e,
          markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color },
          data: { ...e.data, showState, isActive: lit, isDimmed: anySel && !lit },
        };
      }),
    [edges, step, picked, showState],
  );

  const detail = active
    ? {
        tag: `Step ${step + 1}`,
        counter: `${step + 1} of ${PKI_STEPS.length}`,
        title: active.title,
        sub: active.sub,
        what: active.what,
        principles: active.principles,
        threat: active.threat,
        threatDetail: active.threatDetail,
        fail: active.fail,
        state: active.state,
        color: PKI_ROLE[byId[active.target].role].color,
      }
    : picked
      ? {
          tag: PKI_ROLE[byId[picked].role].label,
          counter: "",
          title: byId[picked].name,
          sub: byId[picked].sub,
          what: byId[picked].what,
          principles: byId[picked].principles,
          threat: byId[picked].threat,
          threatDetail: byId[picked].threatDetail,
          fail: byId[picked].fail,
          color: PKI_ROLE[byId[picked].role].color,
        }
      : null;

  return (
    <>
      <div className="toolbar">
        <button className="tb" onClick={() => stepBy(-1)} disabled={step <= 0}>
          ←
        </button>
        <button className="tb play" onClick={() => setPlaying((p) => !p)}>
          {playing ? "❙❙ Pause" : "▶ Play lifecycle"}
        </button>
        <button
          className="tb"
          onClick={() => stepBy(1)}
          disabled={step >= PKI_STEPS.length - 1}
        >
          →
        </button>
        <button className="tb" onClick={reset}>
          Reset
        </button>
        <span className="tbstep">
          step <b>{step >= 0 ? step + 1 : "—"}</b> / {PKI_STEPS.length}
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
          <i /> Certificate state
        </button>
      </div>

      <div className="stage">
        <div className="canvas">
          {busy && <div className="loading">Running ELK layout…</div>}
          <ReactFlow
            nodes={decoratedNodes}
            edges={decoratedEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={deepNodeTypes}
            edgeTypes={edgeTypes}
            onNodeClick={(_, n) => {
              if (n.type !== "component") return;
              setPlaying(false);
              setStep(-1);
              setPicked(n.id);
              if (PKI_DEEP[n.id]) {
                setExpanded((prev) => {
                  const next = new Set(prev);
                  next.has(n.id) ? next.delete(n.id) : next.add(n.id);
                  return next;
                });
              }
            }}
            onPaneClick={reset}
            defaultViewport={{ x: 40, y: 40, zoom: 0.72 }}
            minZoom={0.15}
            maxZoom={2.4}
            proOptions={{ hideAttribution: false }}
          >
            <Background variant={BackgroundVariant.Dots} gap={26} size={1} color="#1c2532" />
            <Controls showInteractive={false} />
            <MiniMap
              pannable
              zoomable
              nodeColor={(n) => (n.type === "component" ? n.data.color : "transparent")}
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
              <b>Play the lifecycle, or click any stage.</b>
              <p>
                One certificate, cradle to grave — and the loop back to the start, because PKI is a
                cycle rather than a setup step.
              </p>
              <p>
                The two middle lanes are the contrast: the same lifecycle runs through a{" "}
                <b style={{ color: PKI_ROLE.web.color }}>public CA</b> and an{" "}
                <b style={{ color: PKI_ROLE.ent.color }}>internal CA</b>, and they differ in exactly
                one thing that matters — what the CA verifies before it signs, and who already
                trusts its root.
              </p>
              <div className="found">
                <span className="ft">The idea worth taking away</span>
                <div className="frow">
                  <b>Trust is held by the verifier</b>
                  <span>
                    A certificate is not trusted because a CA signed it. It is trusted because the
                    chain ends at a root the relying party already holds.
                  </span>
                </div>
                <div className="frow">
                  <b>Validation is the real boundary</b>
                  <span>
                    Anyone can write any name into a CSR. What separates the two worlds is how that
                    claim gets tested.
                  </span>
                </div>
                <div className="frow">
                  <b>Revocation is the weak link</b>
                  <span>
                    It often fails open, which is why short lifetimes do more real work than
                    revocation does.
                  </span>
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
                  <span className="pt">The certificate right now</span>
                  <p className="pst">{detail.state}</p>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>

      <div className="legend">
        {Object.entries(PKI_ROLE).map(([k, v]) => (
          <div className="lg" key={k}>
            <i style={{ background: v.color }} />
            {v.label}
          </div>
        ))}
        <div className="lg">
          <span className="ln" /> lifecycle flow
        </div>
        <div className="lg">
          <span className="ln d" /> side call &amp; trust anchor
        </div>
      </div>
    </>
  );
}
