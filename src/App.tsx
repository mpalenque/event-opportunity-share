import { useEffect, useMemo, useState } from "react";
import type { AccountRecord, Dataset } from "./types";

type View = "board" | "case";

function confidenceTag(value: string): string {
  const v = value.toLowerCase();
  if (v === "high") return "High";
  if (v === "medium") return "Medium";
  if (v === "low") return "Low";
  return "Unknown";
}

function formatDate(value: string | null): string {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function sortAccounts(accounts: AccountRecord[]): AccountRecord[] {
  return [...accounts].sort((a, b) => {
    const scoreDiff = b.research.opportunityScore - a.research.opportunityScore;
    if (scoreDiff !== 0) return scoreDiff;
    const rankDiff = b.research.successPotentialRank - a.research.successPotentialRank;
    if (rankDiff !== 0) return rankDiff;
    return a.accountName.localeCompare(b.accountName);
  });
}

function normalize(text: string): string {
  return text.toLowerCase().trim();
}

export function App() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [view, setView] = useState<View>("board");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");

  useEffect(() => {
    fetch("./data/opportunities.json")
      .then((res) => res.json())
      .then((data: Dataset) => {
        setDataset(data);
        if (data.accounts.length > 0) {
          setSelectedId(sortAccounts(data.accounts)[0].id);
        }
      })
      .catch((err) => {
        console.error("Failed to load dataset", err);
      });
  }, []);

  const sorted = useMemo(() => (dataset ? sortAccounts(dataset.accounts) : []), [dataset]);

  const filtered = useMemo(() => {
    const q = normalize(query);
    if (!q) return sorted;
    return sorted.filter((a) => {
      return [a.accountName, a.studio, a.industry, a.accountManager, a.companySize]
        .map(normalize)
        .some((field) => field.includes(q));
    });
  }, [query, sorted]);

  const selected = useMemo(
    () => filtered.find((a) => a.id === selectedId) ?? filtered[0] ?? null,
    [filtered, selectedId],
  );

  useEffect(() => {
    if (selected && selected.id !== selectedId) {
      setSelectedId(selected.id);
    }
  }, [selected, selectedId]);

  if (!dataset) {
    return (
      <main className="app-shell">
        <div className="loading-card">Loading shared opportunity dataset…</div>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Superside · experiential opportunity</p>
          <h1>Event Opportunity Board</h1>
          <p className="subtitle">
            Shareable snapshot of researched accounts. Read-only mode, no research actions.
          </p>
        </div>
        <nav className="view-switch" aria-label="View mode">
          <button className={view === "board" ? "active" : ""} onClick={() => setView("board")}>Board</button>
          <button className={view === "case" ? "active" : ""} onClick={() => setView("case")}>Case Deep Dive</button>
        </nav>
      </header>

      {view === "board" ? (
        <section className="board-view">
          <div className="metrics-grid">
            <Metric label="Researched Accounts" value={dataset.summary.totalResearchedAccounts} />
            <Metric label="Avg Opportunity Score" value={dataset.summary.avgOpportunityScore} />
            <Metric label="High Confidence" value={dataset.summary.highConfidenceCount} />
            <Metric label="Updated" value={new Date(dataset.generatedAt).toLocaleDateString()} />
          </div>

          <div className="panel-grid">
            <article className="panel">
              <div className="panel-head">
                <h2>Top Opportunity Accounts</h2>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search company, studio, industry…"
                />
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Account</th>
                      <th>Studio</th>
                      <th>Industry</th>
                      <th>Score</th>
                      <th>Rank</th>
                      <th>Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice(0, 150).map((account) => (
                      <tr key={account.id}>
                        <td>{account.accountName}</td>
                        <td>{account.studio}</td>
                        <td>{account.industry}</td>
                        <td>{account.research.opportunityScore}</td>
                        <td>{account.research.successPotentialRank}/10</td>
                        <td>{confidenceTag(account.research.confidence)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="panel stack">
              <h3>Top Studios</h3>
              <ul>
                {dataset.summary.topStudios.map((s) => (
                  <li key={s.name}><span>{s.name}</span><strong>{s.count}</strong></li>
                ))}
              </ul>
            </article>

            <article className="panel stack">
              <h3>Top Industries</h3>
              <ul>
                {dataset.summary.topIndustries.map((s) => (
                  <li key={s.name}><span>{s.name}</span><strong>{s.count}</strong></li>
                ))}
              </ul>
            </article>
          </div>
        </section>
      ) : (
        <section className="case-view">
          <aside className="case-list panel">
            <div className="panel-head sticky">
              <h2>Cases</h2>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search case…"
              />
            </div>
            <div className="case-items">
              {filtered.map((account) => {
                const active = selected?.id === account.id;
                return (
                  <button
                    key={account.id}
                    className={`case-item ${active ? "active" : ""}`}
                    onClick={() => setSelectedId(account.id)}
                  >
                    <span className="name">{account.accountName}</span>
                    <span className="meta">{account.studio} · Score {account.research.opportunityScore}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          <article className="case-detail panel">
            {!selected ? (
              <p className="empty">No case matches your search.</p>
            ) : (
              <>
                <header className="case-header">
                  <div>
                    <p className="eyebrow">{selected.studio} · {selected.industry}</p>
                    <h2>{selected.accountName}</h2>
                    <p className="subtitle">AM: {selected.accountManager} · PMs: {selected.projectManagers.length}</p>
                  </div>
                  <div className="score-pill">
                    <strong>{selected.research.opportunityScore}</strong>
                    <span>score</span>
                  </div>
                </header>

                <div className="chips">
                  <Chip label="Potential Rank" value={`${selected.research.successPotentialRank}/10`} />
                  <Chip label="Confidence" value={confidenceTag(selected.research.confidence)} />
                  <Chip label="Sources" value={selected.research.sourceCount} />
                  <Chip label="Company Size" value={selected.companySize} />
                  <Chip label="Updated" value={formatDate(selected.research.updatedAt)} />
                </div>

                <Section title="Company Overview" text={selected.research.companyOverview} />
                <Section title="Event Agenda Summary" text={selected.research.eventAgendaSummary} />
                <Section title="Event Budget Estimate" text={selected.research.eventBudgetEstimate} />
                <Section title="Booth Footprint" text={selected.research.boothFootprint} />
                <Section title="Experiential Activations" text={selected.research.experientialActivations} />
                <Section title="Creative Technology Usage" text={selected.research.creativeTechnologyUsage} />
                <Section title="Opportunity Hypothesis" text={selected.research.opportunityHypothesis} />
                <Section title="Success Potential Rationale" text={selected.research.successPotentialRationale || "Not provided."} />

                <section className="detail-section">
                  <h3>Agency & Partner Analysis</h3>
                  {selected.research.agencyPartnerAnalysis.length === 0 ? (
                    <p className="muted">No structured partner analysis saved.</p>
                  ) : (
                    <div className="partner-grid">
                      {selected.research.agencyPartnerAnalysis.map((partner, i) => (
                        <article key={`${partner.name}-${i}`} className="partner-card">
                          <h4>{partner.name}</h4>
                          <p><strong>Role:</strong> {partner.role}</p>
                          <p><strong>Scope:</strong> {partner.scope}</p>
                          <p><strong>Experiential relevance:</strong> {partner.experientialRelevance}</p>
                          <p><strong>Evidence:</strong> {partner.evidence}</p>
                        </article>
                      ))}
                    </div>
                  )}
                </section>

                <section className="detail-section">
                  <h3>Sources</h3>
                  {selected.research.sources.length === 0 ? (
                    <p className="muted">No sources captured.</p>
                  ) : (
                    <ul className="source-list">
                      {selected.research.sources.map((source, i) => (
                        <li key={`${source.url}-${i}`}>
                          <a href={source.url} target="_blank" rel="noreferrer">{source.title || source.url}</a>
                          <p>{source.note}</p>
                          <small>{source.publishedAt || "Unknown date"}</small>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </>
            )}
          </article>
        </section>
      )}
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="metric">
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}

function Chip({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="chip">
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}

function Section({ title, text }: { title: string; text: string }) {
  return (
    <section className="detail-section">
      <h3>{title}</h3>
      <p>{text || "Not available."}</p>
    </section>
  );
}
