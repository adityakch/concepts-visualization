// ---------------------------------------------------------------------------
// PKI — the certificate lifecycle, with Web PKI and Enterprise PKI contrasted.
//
// The zones are actors rather than phases: the subject on the left does the
// same work in both worlds, the two PKI worlds sit in parallel in the middle,
// and the relying party on the right verifies. The flow runs left to right and
// loops back on renewal.
//
// `PKI_DEEP` is intentionally empty for now — the drill-down machinery is wired
// up, so adding a section later is a data change, not a code change.
// ---------------------------------------------------------------------------

export const PKI_ROLE = {
  subject: { label: "Subject / operator", color: "#7C93B8" },
  web: { label: "Web PKI", color: "#4C8DFF" },
  ent: { label: "Enterprise PKI", color: "#A78BFA" },
  rp: { label: "Relying party", color: "#34D399" },
};

// Zones are lifecycle PHASES, not actors.
//
// Actors were the first attempt and it failed structurally: ELK lays out by
// dependency layer, and the subject's nodes span layers 0 through 6, so an
// actor-shaped container had to stretch the full width and swallowed the
// others. Phases occupy contiguous layer ranges, so they nest cleanly.
//
// Who is doing the work is carried by node colour instead — which also puts the
// public and private paths side by side inside each phase, where the contrast
// is easiest to read.
const ZC = "#46536b";

export const PKI_ZONES = [
  { id: "ph-request", label: "1 · Request", color: ZC },
  { id: "ph-validate", label: "2 · Identity validation", color: ZC },
  { id: "ph-issue", label: "3 · Issuance", color: ZC },
  { id: "ph-deploy", label: "4 · Deploy & use", color: ZC },
  { id: "ph-verify", label: "5 · Verification", color: ZC },
  { id: "ph-renew", label: "6 · Renewal", color: ZC },
];

export const PKI_COMPONENTS = [
  // ---- subject -----------------------------------------------------------
  {
    id: "keypair",
    zone: "ph-request",
    role: "subject",
    icon: "key",
    name: "Key pair generation",
    sub: "private key stays put",
    what: "The subject generates a public/private key pair locally. The private key is never sent to the CA, never leaves the machine, and ideally never leaves hardware at all — a CA issues a certificate for a public key, it is never given the matching secret.",
    principles: ["Key custody", "Least exposure"],
    threat: "Private key disclosure",
    threatDetail:
      "Everything in PKI rests on the private key staying private. Leak it and an attacker can impersonate the subject perfectly, holding a certificate that validates correctly for as long as it remains unrevoked.",
    fail: "A weak or predictable key makes the certificate worthless no matter how rigorous the CA was.",
    chipThreat: "key theft",
  },
  {
    id: "csr",
    zone: "ph-request",
    role: "subject",
    icon: "api",
    name: "Certificate signing request",
    sub: "public key + identity claim",
    what: "The CSR bundles the public key with the identity being claimed — a domain name, a device, a service — and is signed by the matching private key. That self-signature is proof of possession: it shows the requester actually holds the private key for the public key inside.",
    principles: ["Proof of possession", "Explicit identity claim"],
    threat: "Requesting a certificate for a name you don't control",
    threatDetail:
      "A CSR is only a claim, and anyone can write any name into one. Everything that follows exists to test that claim — which is why the validation step, not the CSR, is the real security boundary.",
    fail: "A malformed CSR or a failed proof of possession is rejected before validation begins.",
  },
  {
    id: "deploy",
    zone: "ph-deploy",
    role: "subject",
    icon: "upload",
    name: "Install & serve",
    sub: "leaf + intermediates",
    what: "The issued certificate is installed alongside its intermediate chain. Serving an incomplete chain is one of the most common real-world TLS failures — the leaf alone is not enough for a client to build a path to a root.",
    principles: ["Complete chain", "Correct key pairing"],
    threat: "Misconfiguration rather than attack",
    threatDetail:
      "Most certificate outages are self-inflicted: a missing intermediate, a mismatched key, or a chain served in the wrong order. The cryptography is rarely what breaks.",
    fail: "An incomplete chain fails validation on strict clients even though the certificate itself is perfectly valid.",
  },
  {
    id: "renew",
    zone: "ph-renew",
    role: "subject",
    icon: "scan",
    name: "Renewal",
    sub: "before expiry",
    what: "Certificates are deliberately short-lived, so renewal is continuous rather than occasional. Web PKI leaf certificates are capped at months and are renewed by automation; enterprise PKI uses auto-enrolment. Renewal loops back to a fresh key pair and CSR.",
    principles: ["Short lifetimes", "Automation over calendars"],
    threat: "Expiry outages, and stale keys",
    threatDetail:
      "Short lifetimes limit the damage window of an undetected key compromise — the certificate simply stops being valid. The trade is that renewal must be automated, because anything depending on a human remembering will eventually fail.",
    fail: "A missed renewal takes the service down. This is far more common than any attack on the PKI itself.",
    chipThreat: "expiry outage",
    reject: "expired — connection refused",
  },

  // ---- web pki -----------------------------------------------------------
  {
    id: "dv",
    zone: "ph-validate",
    role: "web",
    icon: "globe",
    name: "Domain validation",
    sub: "ACME HTTP-01 / DNS-01",
    what: "The CA tests the claim in the CSR by requiring the requester to prove control of the name — serving a token at a well-known URL, or publishing a DNS record. Control of the name is the only thing a public CA actually verifies for a DV certificate.",
    principles: ["Prove control, don't take claims", "Automatable"],
    threat: "Domain hijack and BGP interception",
    threatDetail:
      "If an attacker can transiently control DNS or route traffic for a domain, they can pass validation and be issued a genuine certificate. This is why CAs validate from multiple network vantage points.",
    fail: "Failing the challenge means no certificate — the request stops here.",
    chipThreat: "domain hijack",
    reject: "challenge failed",
  },
  {
    id: "pubca",
    zone: "ph-issue",
    role: "web",
    icon: "shield",
    name: "Public issuing CA",
    sub: "audited intermediate",
    what: "An intermediate CA signs the certificate. The offline root signs only intermediates, so the root's key can stay air-gapped, and a compromised intermediate can be revoked without invalidating every certificate the root ever anchored.",
    principles: ["Offline root", "Blast-radius reduction", "External audit"],
    threat: "CA compromise or mis-issuance",
    threatDetail:
      "Any publicly trusted CA can issue for any domain, so the whole system is only as strong as its weakest CA. This is the structural weakness of Web PKI, and why CAs are audited and can be distrusted outright by browser vendors.",
    fail: "A CA that mis-issues can be removed from root stores — which has happened, and is effectively a death sentence.",
    chipThreat: "CA mis-issuance",
  },
  {
    id: "ct",
    zone: "ph-issue",
    role: "web",
    icon: "log",
    name: "Certificate Transparency",
    sub: "public append-only log",
    what: "Before issuance the CA submits a pre-certificate to public logs and embeds the resulting timestamps in the certificate. Browsers refuse certificates lacking them, which makes every publicly trusted certificate publicly visible.",
    principles: ["Auditability", "Detection over prevention"],
    threat: "Silent mis-issuance",
    threatDetail:
      "CT does not prevent a CA from issuing a certificate it shouldn't — it makes it impossible to do so secretly. Domain owners can watch the logs and discover certificates they never requested.",
    fail: "A certificate without valid CT timestamps is rejected by browsers regardless of how correctly it was signed.",
  },
  {
    id: "webroot",
    zone: "ph-verify",
    role: "web",
    icon: "chip",
    name: "Browser / OS root store",
    sub: "the actual trust anchor",
    what: "The set of root certificates shipped by browser and OS vendors. This — not the CA — is what makes a certificate trusted: trust flows from the relying party's root store, and vendors decide who is in it.",
    principles: ["Trust is delegated, not inherent", "Vendor-curated"],
    threat: "A rogue or coerced root",
    threatDetail:
      "Anyone who can add a root to your store can mint certificates your machine will trust silently. This is exactly how corporate TLS interception works — and equally how a malicious actor with device access would.",
    fail: "No path to a trusted root means the chain fails, however genuine the certificate.",
    chipThreat: "rogue root injection",
  },

  // ---- enterprise pki ----------------------------------------------------
  {
    id: "entid",
    zone: "ph-validate",
    role: "ent",
    icon: "id",
    name: "Directory / device identity",
    sub: "AD, MDM enrolment",
    what: "An internal CA validates against an identity it already owns — a directory account, a domain-joined machine, an MDM-enrolled device. It doesn't need to prove control of a public name because it isn't asserting anything to the public internet.",
    principles: ["Reuse existing identity", "Closed population"],
    threat: "Enrolment abuse",
    threatDetail:
      "The weak point moves from domain control to enrolment: anyone who can enrol a device, or compromise an account with enrolment rights, can obtain a legitimate internal certificate.",
    fail: "No valid directory identity, no certificate.",
    chipThreat: "enrolment abuse",
    reject: "not enrolled",
  },
  {
    id: "entca",
    zone: "ph-issue",
    role: "ent",
    icon: "vault",
    name: "Internal issuing CA",
    sub: "HSM-backed, offline root",
    what: "A private CA the organization runs itself. It can issue for any name it likes — internal hostnames, service identities, user certificates — because nothing outside the organization has to accept them.",
    principles: ["Self-sovereign trust", "Hardware key custody", "Offline root"],
    threat: "Internal CA key compromise",
    threatDetail:
      "An attacker holding the internal CA key can mint a trusted certificate for any internal service and impersonate it to every managed device. The root key belongs in an HSM, offline, used only to sign issuing CAs.",
    fail: "A compromised issuing CA must be revoked and every certificate under it reissued.",
    chipThreat: "CA key compromise",
  },
  {
    id: "entroot",
    zone: "ph-verify",
    role: "ent",
    icon: "chip",
    name: "Internal root, pushed to devices",
    sub: "GPO / MDM distribution",
    what: "The internal root is self-signed and trusted by nobody by default. The organization creates trust by distributing it to managed devices — which is why internal certificates work inside the company and fail everywhere else.",
    principles: ["Trust by distribution", "Scoped to managed devices"],
    threat: "Over-broad trust distribution",
    threatDetail:
      "Every device holding this root will trust anything the internal CA signs. Push it too widely, or fail to constrain it, and you have created a CA that can impersonate the public internet to your fleet.",
    fail: "An unmanaged device has never seen this root, so internal certificates simply fail there.",
  },

  // ---- relying party -----------------------------------------------------
  {
    id: "handshake",
    zone: "ph-deploy",
    role: "rp",
    icon: "tls",
    name: "TLS handshake",
    sub: "certificate presented",
    what: "The server presents its certificate and chain, and proves it holds the matching private key by signing part of the handshake. Presenting a certificate is not enough — anyone can copy a public certificate; only the key holder can complete the handshake.",
    principles: ["Proof of possession", "Encryption in transit"],
    threat: "Certificate replay",
    threatDetail:
      "Certificates are public, so an attacker can present someone else's. The signature step is what defeats that: without the private key the handshake cannot be completed.",
    fail: "A server that cannot prove key possession fails the handshake outright.",
  },
  {
    id: "chain",
    zone: "ph-verify",
    role: "rp",
    icon: "check",
    name: "Chain validation",
    sub: "path · signature · name · expiry",
    what: "The client builds a path from the leaf up to a root it already trusts, then checks every link: signatures, validity dates, the requested hostname against the certificate's names, and the constraints each CA certificate carries.",
    principles: ["Verify the whole path", "Fail closed", "Name matching"],
    threat: "Accepting an invalid or unrelated certificate",
    threatDetail:
      "Historically the richest source of TLS bugs: clients that checked the signature but not the hostname, or accepted any certificate a trusted CA signed for any name. Each check is there because skipping it broke something real.",
    fail: "Any failed check aborts the connection. This is the one place PKI must fail closed rather than warn.",
    chipThreat: "invalid chain accepted",
    reject: "validation failed",
  },
  {
    id: "revcheck",
    zone: "ph-verify",
    role: "rp",
    icon: "log",
    name: "Revocation check",
    sub: "CRL · OCSP · stapling",
    what: "A certificate can be valid on its face but revoked early — key compromise, mis-issuance, decommissioning. The client checks published revocation state, ideally via a signed OCSP response stapled by the server itself.",
    principles: ["Revocation before expiry", "Privacy-preserving checks"],
    threat: "Revocation that never arrives",
    threatDetail:
      "This is PKI's weakest link. Live revocation lookups are slow, leak browsing behaviour to the CA, and often fail open — so a revoked certificate can keep working. Stapling and short lifetimes are the practical answers.",
    fail: "Many clients fail open on an unreachable responder, which is precisely why short certificate lifetimes matter more than revocation.",
    chipThreat: "revocation fails open",
    reject: "revoked",
  },
];

export const PKI_STEPS = [
  {
    source: "keypair",
    target: "csr",
    kind: "main",
    label: "public key",
    title: "Bind the key to an identity",
    sub: "key pair → CSR",
    what: "The public half of the key pair is packaged with the identity being claimed and self-signed, proving the requester holds the private half.",
    principles: ["Proof of possession"],
    threat: "Unproven key ownership",
    threatDetail:
      "Without the self-signature, someone could request a certificate for a public key they do not control, and the resulting certificate would attest to a key belonging to someone else.",
    fail: "A CSR whose self-signature does not verify is discarded immediately.",
    state: "private key local, public key in the request",
  },
  {
    source: "csr",
    target: "dv",
    kind: "main",
    label: "request (public)",
    title: "Public path: prove domain control",
    sub: "CSR → domain validation",
    what: "For a publicly trusted certificate the CA must verify the claim independently. It has no prior relationship with the requester, so the only thing it can test is control of the name itself.",
    principles: ["Prove control", "No prior relationship assumed"],
    threat: "Issuance to the wrong party",
    threatDetail:
      "The entire trustworthiness of Web PKI rests on this step being hard to fake, because a certificate issued to an impostor is cryptographically indistinguishable from a genuine one.",
    fail: "An unmet challenge ends the request.",
    state: "claim unverified",
  },
  {
    source: "csr",
    target: "entid",
    kind: "main",
    label: "request (internal)",
    title: "Private path: use existing identity",
    sub: "CSR → directory identity",
    what: "An internal CA already knows who the requester is — it shares a directory or device management system with them. It validates against that relationship instead of testing control of a public name.",
    principles: ["Reuse existing identity", "Closed population"],
    threat: "Enrolment as the weak point",
    threatDetail:
      "The security question shifts from 'do you control this name?' to 'should this account or device exist?' — which makes enrolment and joiner/leaver process the real control.",
    fail: "An unknown or disabled identity is refused.",
    state: "claim tied to a known identity",
  },
  {
    source: "dv",
    target: "pubca",
    kind: "main",
    label: "control proven",
    title: "Public issuance",
    sub: "validation → issuing CA",
    what: "With control proven, an audited intermediate CA signs the certificate. The root that anchors it stays offline, signing only intermediates.",
    principles: ["Offline root", "External audit"],
    threat: "Mis-issuance by a trusted CA",
    threatDetail:
      "Because any public CA can issue for any name, one careless or compromised CA undermines everyone. Constraints, audits and public logging exist to contain that.",
    fail: "Policy violations block issuance; repeated failures cost a CA its place in root stores.",
    state: "about to be signed",
  },
  {
    source: "entid",
    target: "entca",
    kind: "main",
    label: "identity proven",
    title: "Internal issuance",
    sub: "identity → internal CA",
    what: "The organization's own issuing CA signs the certificate, with its key held in an HSM and its root kept offline.",
    principles: ["Hardware key custody", "Self-sovereign trust"],
    threat: "Internal CA compromise",
    threatDetail:
      "An internal CA key is a master key to every managed device's trust. It warrants the same protection a public CA gives its own.",
    fail: "A CA that cannot reach its HSM cannot sign — issuance stops rather than degrading.",
    state: "about to be signed",
  },
  {
    source: "pubca",
    target: "ct",
    kind: "call",
    label: "pre-certificate",
    title: "Log before issuing",
    sub: "CA → transparency logs",
    what: "The CA submits a pre-certificate to public append-only logs and embeds the returned timestamps. Browsers require them, so in practice logging is not optional.",
    principles: ["Auditability", "Detection over prevention"],
    threat: "Secret mis-issuance",
    threatDetail:
      "Transparency does not stop a bad certificate being created; it guarantees it cannot be created quietly. Domain owners monitor these logs for certificates they never asked for.",
    fail: "Missing timestamps mean browsers reject the certificate.",
    state: "publicly recorded",
  },
  {
    source: "pubca",
    target: "deploy",
    kind: "main",
    label: "signed certificate",
    title: "Certificate issued (public)",
    sub: "CA → subject",
    what: "The signed certificate is returned with its intermediate chain, ready to be installed.",
    principles: ["Complete chain"],
    threat: "Incomplete chain deployment",
    threatDetail:
      "The most common failure here is operational: installing the leaf without the intermediates, which breaks path building on clients that cannot fetch them.",
    fail: "A chain missing intermediates fails validation on strict clients.",
    state: "signed, public certificate",
  },
  {
    source: "entca",
    target: "deploy",
    kind: "main",
    label: "signed certificate",
    title: "Certificate issued (internal)",
    sub: "internal CA → subject",
    what: "The internal certificate is issued to the device or service, typically pushed automatically by the enrolment system rather than installed by hand.",
    principles: ["Automated distribution"],
    threat: "Long-lived, unmanaged certificates",
    threatDetail:
      "Internal PKI often accumulates forgotten certificates on forgotten hosts. Automation is what keeps the population known and rotating.",
    fail: "A failed push leaves the service without a usable certificate.",
    state: "signed, internal certificate",
  },
  {
    source: "deploy",
    target: "handshake",
    kind: "main",
    label: "presented on connect",
    title: "The certificate gets used",
    sub: "server → client",
    what: "On each connection the server presents its certificate and chain, and signs part of the handshake to prove it holds the private key.",
    principles: ["Proof of possession", "Encryption in transit"],
    threat: "Presenting a copied certificate",
    threatDetail:
      "Certificates are public documents. Possession of one proves nothing — the handshake signature is what ties the presenter to the key.",
    fail: "No valid signature, no connection.",
    state: "certificate on the wire",
  },
  {
    source: "handshake",
    target: "chain",
    kind: "main",
    label: "verify",
    title: "Build and check the path",
    sub: "client validation",
    what: "The client builds a path from the leaf to a root in its own store, then checks signatures, dates, hostname and constraints at every link.",
    principles: ["Verify the whole path", "Name matching", "Fail closed"],
    threat: "Skipped checks",
    threatDetail:
      "A signature check without a hostname check accepts any certificate from any trusted CA — a real and repeated class of vulnerability.",
    fail: "Any failed check aborts the connection.",
    state: "under verification",
  },
  {
    source: "webroot",
    target: "chain",
    kind: "ret",
    label: "anchors (public)",
    title: "Where public trust comes from",
    sub: "root store → validation",
    what: "The client's root store decides what is trusted. A certificate is not trusted because a CA signed it; it is trusted because the signing chain terminates in a root the client already holds.",
    principles: ["Trust is delegated by the relying party"],
    threat: "A rogue root in the store",
    threatDetail:
      "Add a root to a machine and you can silently impersonate anything to it. This is the mechanism behind both corporate interception and device-level attacks.",
    fail: "No path to a held root means no trust.",
    state: "trust anchor consulted",
  },
  {
    source: "entroot",
    target: "chain",
    kind: "ret",
    label: "anchors (internal)",
    title: "Where private trust comes from",
    sub: "internal root → validation",
    what: "Managed devices hold the internal root, so internal certificates validate on them and nowhere else. That boundary is the whole point of a private PKI.",
    principles: ["Trust by distribution", "Scoped trust"],
    threat: "Distributing the root too widely",
    threatDetail:
      "Every device holding this root trusts everything the internal CA signs. Its reach should match the population it is meant to serve, and no more.",
    fail: "An unmanaged device rejects internal certificates, correctly.",
    state: "trust anchor consulted",
  },
  {
    source: "chain",
    target: "revcheck",
    kind: "main",
    label: "still valid?",
    title: "Revocation",
    sub: "CRL · OCSP · stapling",
    what: "A structurally valid certificate may still have been revoked. The client checks revocation state — best delivered as a signed response stapled by the server, avoiding a live lookup.",
    principles: ["Revocation before expiry", "Privacy-preserving"],
    threat: "Revocation that fails open",
    threatDetail:
      "If a client cannot reach the responder it usually proceeds anyway, so revocation is unreliable in practice. Short certificate lifetimes are the real mitigation.",
    fail: "A revoked certificate should be refused — but only if the check actually succeeded.",
    state: "accepted or rejected",
  },
  {
    source: "deploy",
    target: "renew",
    kind: "call",
    label: "approaching expiry",
    title: "Renewal begins",
    sub: "before the clock runs out",
    what: "Renewal is triggered well before expiry, automatically. Certificates are short-lived by design, so this is a continuous background process rather than an annual task.",
    principles: ["Short lifetimes", "Automation"],
    threat: "Expiry outage",
    threatDetail:
      "Short lifetimes bound the damage of an unnoticed key compromise. The cost is that renewal must never depend on someone remembering.",
    fail: "A missed renewal is an outage — the most common PKI failure by far.",
    state: "still valid, but ageing",
  },
  {
    source: "renew",
    target: "csr",
    kind: "ret",
    label: "new key + CSR",
    title: "The loop closes",
    sub: "renewal → new request",
    what: "Renewal starts the cycle again with a fresh key pair and a new CSR. PKI is not a one-time setup; it is a loop that has to keep turning for as long as the service exists.",
    principles: ["Key rotation", "Continuous lifecycle"],
    threat: "Reusing the same key forever",
    threatDetail:
      "Renewing with the same key preserves any compromise across the boundary. Rotating the key is what makes a short lifetime meaningful.",
    fail: "A renewal loop that breaks silently is discovered at expiry, which is the worst time to discover it.",
    state: "back to the beginning",
  },
];

// Ready for the deep-dive sections to come. Empty means no stage shows a
// drill-down affordance yet.
export const PKI_DEEP = {};
