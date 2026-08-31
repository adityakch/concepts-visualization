// ---------------------------------------------------------------------------
// Low-level internals for each stage of the upload path.
//
// Every component named here comes from a Google publication — the Maglev and
// Zanzibar papers, the infrastructure security whitepaper, or Cloud docs. Where
// a mechanism is documented but its internal ordering is not, the note says so.
//
// Shape: DEEP[componentId] = { internals: [...], edges: [[from, to, label]] }
// `internals` are revealed only when that component is expanded, so the top
// level stays readable.
// ---------------------------------------------------------------------------

export const DEEP = {
  client: {
    internals: [
      {
        id: "c-origin",
        name: "Origin sandbox + CSP",
        sub: "browser-enforced",
        what: "The same-origin policy and Content Security Policy decide which code may touch the file at all. This is the browser's guarantee, not Google's — everything downstream assumes it held.",
      },
      {
        id: "c-chunker",
        name: "Client chunker",
        sub: "resumable slicing",
        what: "The client slices the file and uploads it in ordered chunks, so a dropped connection resumes from the last acknowledged offset instead of restarting.",
      },
      {
        id: "c-cse",
        name: "Client-side encryption",
        sub: "external KMS · enterprise",
        what: "Where an organization enables CSE, the client fetches a key from a third-party key service the customer controls, encrypts the file locally, and uploads only ciphertext. Google holds the bytes but never the key.",
      },
    ],
    edges: [
      ["c-origin", "c-chunker", "file handle"],
      ["c-chunker", "c-cse", "chunks"],
    ],
  },

  dns: {
    internals: [
      {
        id: "d-auth",
        name: "Authoritative DNS",
        sub: "google.com zone",
        what: "Answers for Google's zones, served from the same global anycast footprint as the rest of the edge.",
      },
      {
        id: "d-anycast",
        name: "Anycast + BGP",
        sub: "one IP, many sites",
        what: "The same address is announced from every edge site, so BGP routes each client to the topologically nearest one. A site withdrawing its announcement drains traffic away automatically.",
      },
      {
        id: "d-steer",
        name: "Regional steering",
        sub: "capacity-aware",
        what: "Selects a serving region with capacity and acceptable latency, which is also how traffic is shifted away from a region under attack or in maintenance.",
      },
    ],
    edges: [
      ["d-auth", "d-anycast", "answer"],
      ["d-anycast", "d-steer", "route"],
    ],
  },

  gfe: {
    internals: [
      {
        id: "g-ecmp",
        name: "ECMP fanout",
        sub: "router → LB pool",
        what: "Border routers spread incoming packets evenly across the Maglev pool using equal-cost multipath. No single load balancer is a bottleneck or a single point of failure.",
      },
      {
        id: "g-maglev",
        name: "Maglev (L4)",
        sub: "consistent hashing",
        what: "Google's software network load balancer. Consistent hashing plus connection tracking mean that when a Maglev machine fails, existing TCP connections still land on the same backend rather than breaking.",
      },
      {
        id: "g-l7",
        name: "GFE reverse proxy (L7)",
        sub: "TLS 1.3 · HTTP/2 · QUIC",
        what: "Terminates TLS with a validated certificate and forward secrecy, then speaks HTTP/2 or QUIC to the client and re-encrypts inward. This is the actual boundary of the public internet.",
      },
      {
        id: "g-dos",
        name: "DoS + abuse filtering",
        sub: "multi-layer",
        what: "Volumetric floods are absorbed across the global edge; application-layer abuse is scored and throttled here so it never reaches Drive's own services.",
      },
      {
        id: "g-health",
        name: "Health check + draining",
        sub: "failure isolation",
        what: "Unhealthy backends are pulled from rotation, and connections are drained rather than cut, so a bad deploy degrades capacity instead of erroring users.",
      },
    ],
    edges: [
      ["g-ecmp", "g-maglev", "packets"],
      ["g-maglev", "g-l7", "TCP flow"],
      ["g-l7", "g-dos", "requests"],
      ["g-maglev", "g-health", "probe"],
    ],
  },

  api: {
    internals: [
      {
        id: "a-stubby",
        name: "Stubby / gRPC endpoint",
        sub: "over ALTS",
        what: "Internal RPC. ALTS gives mutual authentication and encryption between services, so the call is authenticated on its own merits rather than because it came from inside the network.",
      },
      {
        id: "a-loas",
        name: "Workload identity",
        sub: "per-service credential",
        what: "Each job runs as a named service identity rather than a machine or a shared secret, which is what makes per-service authorization decisions possible at all.",
      },
      {
        id: "a-quota",
        name: "Rate limit + quota",
        sub: "per user, per app",
        what: "Global limits enforced before real work begins, so one caller cannot exhaust shared capacity. This is also the control that blunts credential-stuffing and scraping.",
      },
    ],
    edges: [
      ["a-stubby", "a-loas", "identity"],
      ["a-loas", "a-quota", "attributed call"],
    ],
  },

  identity: {
    internals: [
      {
        id: "i-token",
        name: "Token / cookie validation",
        sub: "signature + expiry",
        what: "Verifies the session cookie or OAuth access token presented on this request: signature, expiry, issuer, and audience.",
      },
      {
        id: "i-bind",
        name: "Binding + short TTL",
        sub: "replay resistance",
        what: "Short lifetimes and binding a credential to its context shrink the window in which a stolen token is worth anything.",
      },
      {
        id: "i-scope",
        name: "Scope resolution",
        sub: "drive.file vs drive",
        what: "Resolves what the calling application was actually granted. A narrow scope like drive.file confines an integration to the files it created itself.",
      },
      {
        id: "i-2sv",
        name: "2SV / passkey signals",
        sub: "phishing resistance",
        what: "Security-key and passkey authentication binds the login to the origin, which is what makes it resistant to phishing rather than merely harder to phish.",
      },
    ],
    edges: [
      ["i-token", "i-bind", "verified"],
      ["i-bind", "i-scope", "principal"],
      ["i-token", "i-2sv", "auth level"],
    ],
  },

  zanzibar: {
    internals: [
      {
        id: "z-tuple",
        name: "Relation tuples",
        sub: "object#relation@user",
        what: "Permissions are stored as relationships rather than lists on the object — 'this document, viewer, this user'. Sharing a folder is a tuple, not a rewrite of every file inside it.",
      },
      {
        id: "z-check",
        name: "Check evaluation",
        sub: "10M+ QPS",
        what: "A permission question is answered by walking the relation graph, including inherited access through folders and groups.",
      },
      {
        id: "z-zookie",
        name: "Zookie consistency token",
        sub: "no stale allows",
        what: "A consistency token pins a check to a point in time at least as fresh as the last ACL change the caller saw. It is the mechanism that stops a revoked permission from being honoured by a lagging replica.",
      },
      {
        id: "z-spanner",
        name: "Spanner-backed store",
        sub: "globally replicated",
        what: "Tuples live in Spanner, replicated worldwide with external consistency, so an authorization decision is the same in every region.",
      },
    ],
    edges: [
      ["z-tuple", "z-check", "graph walk"],
      ["z-zookie", "z-check", "freshness bound"],
      ["z-spanner", "z-tuple", "storage"],
    ],
  },

  upload: {
    internals: [
      {
        id: "u-session",
        name: "Session URI issuance",
        sub: "unguessable · short TTL",
        what: "A resumable upload gets a capability URL: unguessable, expiring, and bound to the identity that opened it, so possession alone is not enough to hijack the transfer.",
      },
      {
        id: "u-checksum",
        name: "Chunk checksum",
        sub: "integrity per chunk",
        what: "Each chunk is verified on arrival. A mismatch re-requests that chunk rather than corrupting the assembled file.",
      },
      {
        id: "u-quota",
        name: "Quota service",
        sub: "storage accounting",
        what: "Storage consumption is checked against the account's quota before the write is allowed to proceed.",
      },
      {
        id: "u-borg",
        name: "Borg-scheduled workers",
        sub: "autoscaled fleet",
        what: "Upload handlers are cluster-scheduled jobs, scaled and rescheduled automatically. Any individual worker is disposable, which is what makes the tier resilient.",
      },
    ],
    edges: [
      ["u-session", "u-checksum", "chunk stream"],
      ["u-checksum", "u-quota", "accepted bytes"],
      ["u-borg", "u-session", "hosts"],
    ],
  },

  scanner: {
    internals: [
      {
        id: "s-gvisor",
        name: "gVisor sandbox",
        sub: "untrusted parsing",
        what: "Uploaded files are parsed inside a user-space kernel sandbox. Parsers are historically where memory-safety bugs live, so the code that touches attacker-controlled bytes is isolated from the host kernel.",
      },
      {
        id: "s-sig",
        name: "Signature + heuristics",
        sub: "known and novel",
        what: "Known-bad detection plus behavioural heuristics for what has not been seen before.",
      },
      {
        id: "s-sb",
        name: "Safe Browsing signals",
        sub: "cross-product reputation",
        what: "Reputation gathered across Google's products, which is what lets a payload first seen in mail be recognised in Drive.",
      },
      {
        id: "s-verdict",
        name: "Verdict cache",
        sub: "content-addressed",
        what: "Verdicts are cached by content hash, so a file already judged is not rescanned — and a newly-malicious verdict can be applied retroactively to copies already stored.",
      },
    ],
    edges: [
      ["s-gvisor", "s-sig", "parsed content"],
      ["s-sig", "s-sb", "lookup"],
      ["s-sig", "s-verdict", "verdict"],
    ],
  },

  dlp: {
    internals: [
      {
        id: "p-detect",
        name: "Content detectors",
        sub: "pattern + context",
        what: "Classifiers for card numbers, credentials, and regulated identifiers, scored with context so that a number that merely looks like a card is not treated as one.",
      },
      {
        id: "p-label",
        name: "Drive labels",
        sub: "classification state",
        what: "The sensitivity classification is attached to the file as a label, which is what later sharing rules are evaluated against.",
      },
      {
        id: "p-policy",
        name: "Policy engine",
        sub: "org rules",
        what: "Administrator rules decide the consequence: allow, warn, block external sharing, or quarantine.",
      },
    ],
    edges: [
      ["p-detect", "p-label", "classification"],
      ["p-label", "p-policy", "evaluate"],
    ],
  },

  chunk: {
    internals: [
      {
        id: "k-split",
        name: "Chunker",
        sub: "fixed-size pieces",
        what: "The file is split into storage chunks. Splitting is what makes per-chunk keys and wide distribution possible in the first place.",
      },
      {
        id: "k-dek",
        name: "Per-chunk DEK",
        sub: "AES-256, unique",
        what: "Every chunk gets its own freshly generated data encryption key, so compromising one key exposes one chunk rather than one file — or one fleet.",
      },
      {
        id: "k-envelope",
        name: "Envelope encryption",
        sub: "DEK wrapped by KEK",
        what: "The DEK is encrypted by a key encryption key and stored, wrapped, next to its chunk. The data travels with a lock; the key to that lock lives elsewhere.",
      },
      {
        id: "k-mac",
        name: "Integrity check",
        sub: "tamper-evident",
        what: "Chunks carry integrity metadata, so silent corruption or tampering is detected on read rather than served as if it were the original.",
      },
    ],
    edges: [
      ["k-split", "k-dek", "chunk"],
      ["k-dek", "k-envelope", "wrap"],
      ["k-split", "k-mac", "checksum"],
    ],
  },

  keystore: {
    internals: [
      {
        id: "y-hier",
        name: "Key hierarchy",
        sub: "DEK → KEK → root",
        what: "Keys are layered. Rotating a KEK re-wraps the keys beneath it without rewriting a byte of stored data — which is what makes rotation affordable at this scale.",
      },
      {
        id: "y-hsm",
        name: "HSM-backed root",
        sub: "hardware custody",
        what: "The root of the hierarchy is held in hardware security modules, so the top key cannot simply be read out of a machine's memory.",
      },
      {
        id: "y-rotate",
        name: "Rotation schedule",
        sub: "crypto agility",
        what: "Regular rotation limits how much data any one key protects, and keeping algorithms swappable is what allows migration when a primitive weakens.",
      },
      {
        id: "y-authz",
        name: "Unwrap authorization",
        sub: "checked + logged",
        what: "Every unwrap is an authorization decision against the calling service's identity, and every decision is recorded. Reaching the storage layer is not the same as being allowed to decrypt it.",
      },
    ],
    edges: [
      ["y-hsm", "y-hier", "roots"],
      ["y-hier", "y-authz", "unwrap"],
      ["y-rotate", "y-hier", "re-wrap"],
    ],
  },

  colossus: {
    internals: [
      {
        id: "l-curator",
        name: "Curator",
        sub: "chunk metadata",
        what: "Tracks where each chunk lives and its replication state — the control plane that sits above the disks.",
      },
      {
        id: "l-d",
        name: "D servers",
        sub: "disk layer",
        what: "The processes that actually own disks and serve chunk reads and writes.",
      },
      {
        id: "l-ec",
        name: "Erasure coding",
        sub: "durability without 3x",
        what: "Encoding gives redundancy across machines and failure domains far more cheaply than whole copies, which is what makes durability affordable at exabyte scale.",
      },
      {
        id: "l-scrub",
        name: "Background scrubbing",
        sub: "silent-corruption repair",
        what: "Stored data is continuously re-verified and repaired, so bit rot is corrected long before anyone reads the file.",
      },
    ],
    edges: [
      ["l-curator", "l-d", "placement"],
      ["l-d", "l-ec", "encode"],
      ["l-curator", "l-scrub", "verify"],
    ],
  },

  metadata: {
    internals: [
      {
        id: "m-splits",
        name: "Spanner splits",
        sub: "Paxos groups",
        what: "Metadata is sharded into splits, each replicated by a Paxos group, so no single machine holds or gates a user's file index.",
      },
      {
        id: "m-truetime",
        name: "TrueTime commits",
        sub: "external consistency",
        what: "Globally meaningful commit timestamps let a permission or metadata change be ordered correctly worldwide — which is exactly what a revocation depends on.",
      },
      {
        id: "m-index",
        name: "Chunk index",
        sub: "file → chunks",
        what: "The map from a file to its chunks and their wrapped keys. Without this record the stored chunks are unreassemblable noise.",
      },
      {
        id: "m-acl",
        name: "ACL pointer",
        sub: "→ Zanzibar",
        what: "The file's permissions are relations in Zanzibar rather than a list copied onto the row, so a share or a revocation takes effect without rewriting file metadata.",
      },
    ],
    edges: [
      ["m-splits", "m-truetime", "ordering"],
      ["m-splits", "m-index", "rows"],
      ["m-index", "m-acl", "permissions"],
    ],
  },

  audit: {
    internals: [
      {
        id: "t-ingest",
        name: "Log ingestion",
        sub: "structured events",
        what: "Access and admin events are emitted as structured records from every service on the path.",
      },
      {
        id: "t-immutable",
        name: "Append-only retention",
        sub: "tamper-evident",
        what: "Logs are written append-only and retained on a policy, so an intruder cannot quietly erase their own trail.",
      },
      {
        id: "t-detect",
        name: "Detection rules",
        sub: "alerting",
        what: "Rules and anomaly detection turn the stream into alerts. This is the layer that assumes prevention has already failed somewhere.",
      },
    ],
    edges: [
      ["t-ingest", "t-immutable", "persist"],
      ["t-ingest", "t-detect", "evaluate"],
    ],
  },

  fleet: {
    internals: [
      {
        id: "f-titan",
        name: "Titan chip",
        sub: "hardware root of trust",
        what: "A purpose-built security chip establishes machine identity and the first link in the boot chain, in hardware rather than in software that could be replaced.",
      },
      {
        id: "f-boot",
        name: "Verified boot",
        sub: "signed chain",
        what: "Each boot component's signature is checked before it runs, and a machine failing verification is refused entry to the production fleet.",
      },
      {
        id: "f-provenance",
        name: "Binary provenance",
        sub: "build → deploy",
        what: "Deployed binaries must trace back to reviewed source and a trusted build system, which is what closes the door on shipping code nobody reviewed.",
      },
      {
        id: "f-isolation",
        name: "Job isolation",
        sub: "tenancy separation",
        what: "Cluster-scheduled jobs run under separate identities with kernel and container isolation, so a compromised job does not inherit its neighbours' access.",
      },
    ],
    edges: [
      ["f-titan", "f-boot", "measures"],
      ["f-boot", "f-isolation", "trusted host"],
      ["f-provenance", "f-isolation", "what may run"],
    ],
  },
};

// Two components that only exist in the deep view.
export const EXTRA_COMPONENTS = [
  {
    id: "zanzibar",
    zone: "z-prod",
    role: "idn",
    icon: "scope",
    name: "Zanzibar",
    sub: "global authorization",
    what: "Google's authorization system, and the thing that actually answers 'may this user write here?'. It stores permissions as relationships rather than per-object lists, and serves checks for Drive alongside Google's other products.",
    principles: ["Least privilege", "External consistency", "Centralized policy"],
    threat: "Stale or inconsistent permissions",
    threatDetail:
      "The dangerous failure is a revoked permission still being honoured by a replica that has not caught up. Consistency tokens bound how stale a check may be, which turns a security property into a correctness one.",
    fail: "A check that cannot be answered within its freshness bound is refused rather than guessed — the decision fails closed.",
    chipThreat: "stale ACL / privilege escalation",
    reject: "403 denied",
  },
  {
    id: "fleet",
    zone: "z-prod",
    role: "audit",
    icon: "chip",
    name: "Fleet integrity",
    sub: "boot · identity · provenance",
    floating: true,
    what: "Not a hop in the request — the substrate every service above runs on. Hardware root of trust, verified boot, workload identity, and binary provenance together decide which code is even allowed to execute in production.",
    principles: ["Hardware root of trust", "Supply-chain integrity", "Isolation", "Assume breach"],
    threat: "Compromised host or unreviewed code",
    threatDetail:
      "Every control on the request path assumes it is running on a machine that booted the software it was supposed to. Remove that assumption and authorization, encryption, and logging are all equally worthless.",
    fail: "A machine failing verification never joins the fleet; a binary without valid provenance is not scheduled.",
    chipThreat: "supply chain / host compromise",
  },
];

// Extra request-path edges that only exist in the deep view.
export const EXTRA_STEPS = [
  {
    source: "identity",
    target: "zanzibar",
    kind: "call",
    label: "may they write?",
    title: "Permission check",
    sub: "Identity → Zanzibar",
    what: "Authentication established who the caller is; this asks whether that principal may create a file in this destination. The answer walks a relation graph that includes folder and group inheritance.",
    principles: ["Least privilege", "Zero trust", "External consistency"],
    threat: "Stale permission honoured after revocation",
    threatDetail:
      "Access removed a moment ago must not still be granted by a lagging replica. A consistency token pins the check to a point at least as fresh as the last change the caller observed.",
    fail: "No qualifying relation, or a check that cannot meet its freshness bound → 403, and nothing is written.",
    state: "authorized, unwritten",
  },
];
