import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  MarkerType,
  useNodesState,
  useEdgesState,
  useReactFlow,
  getNodesBounds,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { buildLayout } from "./layout.js";
import { nodeTypes } from "./nodes.jsx";
import { edgeTypes } from "./edges.jsx";
import { COMPONENTS, STEPS, ROLE, FOUNDATIONS } from "./data.js";
import { Icon } from "./icons.jsx";

const byId = Object.fromEntries(COMPONENTS.map((c) => [c.id, c]));

function Diagram() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [ready, setReady] = useState(false);

  const [step, setStep] = useState(-1); // -1 = nothing selected
  const [picked, setPicked] = useState(null); // component id
  const [playing, setPlaying] = useState(false);
  const [showThreats, setShowThreats] = useState(false);
  const [showRejects, setShowRejects] = useState(false);
  const [showState, setShowState] = useState(false);

  const { setViewport } = useReactFlow();
  const timer = useRef(null);
  const framed = useRef(false);

  // ---- ELK runs once, asynchronously, and hands back every coordinate ------
  useEffect(() => {
    let alive = true;
    buildLayout().then(({ nodes: n, edges: e }) => {
      if (!alive) return;
      setNodes(n);
      setEdges(e);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, [setNodes, setEdges]);

  // The trust boundaries run left to right, so the graph is much wider than it
  // is tall. Fitting it to the pane would shrink the labels past readability, so
  // instead: hold a readable zoom, anchor the view at the start of the request,
  // and let the reader pan right. Runs once — dragging a node must not re-frame.
  useEffect(() => {
    if (!ready || framed.current || nodes.length === 0) return;
    framed.current = true;
    const raf = requestAnimationFrame(() => {
      const bounds = getNodesBounds(nodes.filter((n) => n.type === "zone"));
      const pane = document.querySelector(".react-flow__pane");
      const paneH = pane ? pane.offsetHeight : 460;
      const zoom = 0.62;
      setViewport(
        {
          x: 28 - bounds.x * zoom,
          y: (paneH - bounds.height * zoom) / 2 - bounds.y * zoom,
          zoom,
        },
        { duration: 450 },
      );
    });
    return () => cancelAnimationFrame(raf);
  }, [ready, nodes, setViewport]);

  // ---- play / pause --------------------------------------------------------
  useEffect(() => {
    if (!playing) return;
    timer.current = setInterval(() => {
      setStep((s) => {
        if (s >= STEPS.length - 1) {
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
    setStep(Math.max(0, Math.min(STEPS.length - 1, i)));
  }, []);

  const reset = useCallback(() => {
    setPlaying(false);
    setStep(-1);
    setPicked(null);
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

  // ---- derive highlight state (no re-layout, only data updates) ------------
  const active = step >= 0 ? STEPS[step] : null;
  const activeIds = active ? [active.source, active.target] : [];

  const decoratedNodes = useMemo(
    () =>
      nodes.map((n) => {
        if (n.type !== "component") return n;
        const isActive = activeIds.includes(n.id) || picked === n.id;
        const anySelection = !!active || !!picked;
        return {
          ...n,
          selected: picked === n.id,
          data: {
            ...n.data,
            showThreats,
            showRejects,
            isActive,
            isDimmed: anySelection && !isActive,
          },
        };
      }),
    [nodes, activeIds, picked, active, showThreats, showRejects],
  );

  const decoratedEdges = useMemo(
    () =>
      edges.map((e) => {
        const isActive = step >= 0 && e.data.index === step;
        const touchesPicked =
          picked && (e.source === picked || e.target === picked);
        const anySelection = step >= 0 || !!picked;
        const lit = isActive || touchesPicked;
        const color =
          e.data.kind === "ret" ? ROLE.idn.color : ROLE[byId[e.target].role].color;
        return {
          ...e,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 16,
            height: 16,
            color,
          },
          data: {
            ...e.data,
            targetRole: byId[e.target].role,
            showState,
            isActive: lit,
            isDimmed: anySelection && !lit,
          },
        };
      }),
    [edges, step, picked, showState],
  );

  // ---- panel ---------------------------------------------------------------
  const detail = active
    ? {
        tag: `Step ${step + 1}`,
        counter: `${step + 1} of ${STEPS.length}`,
        title: active.title,
        sub: active.sub,
        what: active.what,
        principles: active.principles,
        threat: active.threat,
        threatDetail: active.threatDetail,
        fail: active.fail,
        state: active.state,
        color: ROLE[byId[active.target].role].color,
      }
    : picked
      ? {
          tag: ROLE[byId[picked].role].label,
          counter: "",
          title: byId[picked].name,
          sub: byId[picked].sub,
          what: byId[picked].what,
          principles: byId[picked].principles,
          threat: byId[picked].threat,
          threatDetail: byId[picked].threatDetail,
          fail: byId[picked].fail,
          state: null,
          color: ROLE[byId[picked].role].color,
        }
      : null;

  return (
    <div className="app">
      <header className="hero">
        <div className="eyebrow">Google Drive · the write path</div>
        <h1>Anatomy of an Upload</h1>
        <p>
          The same topology as the hand-built version — but every coordinate here is computed by
          ELK at runtime, and the trust boundaries are real container nodes that size themselves
          around their contents.
        </p>
      </header>

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
          disabled={step >= STEPS.length - 1}
        >
          →
        </button>
        <button className="tb" onClick={reset}>
          Reset
        </button>
        <span className="tbstep">
          step <b>{step >= 0 ? step + 1 : "—"}</b> / {STEPS.length}
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
          {!ready && <div className="loading">Running ELK layout…</div>}
          <ReactFlow
            nodes={decoratedNodes}
            edges={decoratedEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodeClick={(_, n) => {
              if (n.type !== "component") return;
              setPlaying(false);
              setStep(-1);
              setPicked(n.id);
            }}
            onPaneClick={reset}
            minZoom={0.2}
            maxZoom={2}
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
              <b>Play the request, or click any component.</b>
              <p>
                Thirteen numbered calls carry one file from a browser to encrypted chunks on
                disk. Dashed containers are trust boundaries — every arrow crossing one carries a
                🔒 badge naming what re-establishes trust.
              </p>
              <p>
                Nodes are draggable here. Drag one and the edges reroute themselves, which is the
                practical difference from the hand-placed SVG version.
              </p>
              <div className="found">
                <span className="ft">Always on, underneath all of it</span>
                {FOUNDATIONS.map((f) => (
                  <div key={f.name} className="frow">
                    <b>{f.name}</b>
                    <span>{f.text}</span>
                  </div>
                ))}
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

              <div className="psec">
                <span className="pt">Principles at work</span>
                <div className="ppr">
                  {detail.principles.map((p) => (
                    <span key={p}>{p}</span>
                  ))}
                </div>
              </div>
              <div className="psec">
                <span className="pt">Threat it answers</span>
                <div className="pth">{detail.threat}</div>
                <p className="px">{detail.threatDetail}</p>
              </div>
              <div className="psec">
                <span className="pt">If it refuses</span>
                <p className="px">{detail.fail}</p>
              </div>
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

      <div className="legend">
        {Object.entries(ROLE).map(([k, v]) => (
          <div className="lg" key={k}>
            <i style={{ background: v.color }} />
            {v.label}
          </div>
        ))}
        <div className="lg">
          <span className="ln" /> request / data flow
        </div>
        <div className="lg">
          <span className="ln d" /> service call &amp; return
        </div>
      </div>

      <footer>
        <p className="note">
          Built from Google's public security documentation. Client-side encryption and DLP are
          Google&nbsp;Workspace enterprise features, not consumer Drive. Component names reflect
          Google's published architecture; exact internal call ordering is not public, so the
          sequence is a faithful reading rather than documented ground truth.
        </p>
        Layout by{" "}
        <a href="https://github.com/kieler/elkjs" target="_blank" rel="noopener noreferrer">
          elkjs
        </a>{" "}
        · rendering by{" "}
        <a href="https://reactflow.dev" target="_blank" rel="noopener noreferrer">
          React Flow
        </a>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <Diagram />
    </ReactFlowProvider>
  );
}
