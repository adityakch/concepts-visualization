import { useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import App from "./App.jsx";
import DeepApp from "./DeepApp.jsx";

function DeepPage() {
  return (
    <div className="app">
      <header className="hero">
        <div className="eyebrow">Google Drive · the write path, in depth</div>
        <h1>Anatomy of an Upload — Deep Dive</h1>
        <p>
          The same fourteen-call path, with the machinery underneath it. Open any stage to see the
          load balancers, key hierarchy, sandboxes and permission internals that actually implement
          it — every component named from a Google publication.
        </p>
      </header>
      <ReactFlowProvider>
        <DeepApp />
      </ReactFlowProvider>
      <footer>
        <p className="note">
          Component names are drawn from Google's published papers and whitepapers — Maglev
          (NSDI&nbsp;2016), Zanzibar (ATC&nbsp;2019), the infrastructure security design overview,
          and Cloud encryption docs. Client-side encryption and DLP are Google&nbsp;Workspace
          enterprise features. Google does not publish exact internal call ordering, so the sequence
          is a faithful reading rather than documented ground truth.
        </p>
        Sources:{" "}
        <a href="https://research.google/pubs/maglev-a-fast-and-reliable-software-network-load-balancer/" target="_blank" rel="noopener noreferrer">
          Maglev
        </a>{" "}
        ·{" "}
        <a href="https://www.usenix.org/system/files/atc19-pang.pdf" target="_blank" rel="noopener noreferrer">
          Zanzibar
        </a>{" "}
        ·{" "}
        <a href="https://cloud.google.com/docs/security/infrastructure/design" target="_blank" rel="noopener noreferrer">
          Infrastructure Security Design
        </a>{" "}
        ·{" "}
        <a href="https://cloud.google.com/docs/security/encryption/default-encryption" target="_blank" rel="noopener noreferrer">
          Encryption at Rest
        </a>
      </footer>
    </div>
  );
}

export default function Root() {
  const [view, setView] = useState("overview");
  return (
    <>
      <nav className="views" aria-label="Diagram detail level">
        <button
          className={view === "overview" ? "on" : ""}
          aria-pressed={view === "overview"}
          onClick={() => setView("overview")}
        >
          Overview
        </button>
        <button
          className={view === "deep" ? "on" : ""}
          aria-pressed={view === "deep"}
          onClick={() => setView("deep")}
        >
          Deep dive
        </button>
      </nav>
      {view === "overview" ? <App /> : <DeepPage />}
    </>
  );
}
