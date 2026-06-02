# Opportunity Share (Standalone)

Static front-end project to share researched event opportunity data.

## What it includes

- Board view (global metrics + ranked accounts + top studios/industries)
- Case deep-dive view (full per-account research detail)
- Read-only mode (no research actions, no write-back)

## Data source

The app reads from:

- `public/data/opportunities.json`

This file was exported from `event-intelligence/data/event-intelligence.sqlite`.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Publish to GitHub Pages

1. Create a new GitHub repo, e.g. `opportunity-share`.
2. Push this folder content to that repo.
3. Install GitHub CLI if needed and authenticate (`gh auth login`).
4. Deploy:

```bash
npm run deploy
```

This uses `gh-pages` and publishes `dist/` to branch `gh-pages`.

Then in GitHub repo settings:

- Pages > Build and deployment > Source: `Deploy from a branch`
- Branch: `gh-pages` / root

## Refresh data after new research

Re-run this export from `event-intelligence/`:

```bash
node <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
const db = new Database(path.resolve('data/event-intelligence.sqlite'));
const rows = db.prepare(`
  SELECT
    a.id,
    a.account_name AS accountName,
    a.current_studio_name AS studio,
    a.current_business_unit_name AS businessUnit,
    a.account_industry AS industry,
    a.account_company_size AS companySize,
    a.account_manager AS accountManager,
    COALESCE((SELECT json_group_array(pm.project_manager) FROM account_project_managers pm WHERE pm.account_id = a.id), '[]') AS projectManagersJson,
    r.status,
    COALESCE(r.company_overview, '') AS companyOverview,
    COALESCE(r.event_agenda_summary, '') AS eventAgendaSummary,
    COALESCE(r.event_budget_estimate, '') AS eventBudgetEstimate,
    COALESCE(r.booth_footprint, '') AS boothFootprint,
    COALESCE(r.experiential_activations, '') AS experientialActivations,
    COALESCE(r.creative_technology_usage, '') AS creativeTechnologyUsage,
    COALESCE(r.agencies_and_partners, '[]') AS agenciesAndPartnersRaw,
    COALESCE(r.agency_partner_analysis, '[]') AS agencyPartnerAnalysisRaw,
    COALESCE(r.opportunity_hypothesis, '') AS opportunityHypothesis,
    r.opportunity_score AS opportunityScore,
    r.success_potential_rank AS successPotentialRank,
    COALESCE(r.success_potential_rationale, '') AS successPotentialRationale,
    COALESCE(r.confidence, 'unknown') AS confidence,
    COALESCE(r.source_count, 0) AS sourceCount,
    r.updated_at AS updatedAt,
    COALESCE((
      SELECT json_group_array(
        json_object(
          'title', s.title,
          'url', s.url,
          'note', s.note,
          'publishedAt', COALESCE(s.published_at, 'Unknown')
        )
      )
      FROM research_sources s
      WHERE s.account_id = a.id
    ), '[]') AS sourcesJson
  FROM accounts a
  JOIN research_records r ON r.account_id = a.id
  WHERE r.status = 'completed'
  ORDER BY COALESCE(r.opportunity_score,0) DESC, a.account_name ASC
`).all();
function safeJson(value, fallback){ try { return JSON.parse(value); } catch { return fallback; } }
const accounts = rows.map((r) => ({
  id: r.id,
  accountName: r.accountName,
  studio: r.studio || 'Unknown',
  businessUnit: r.businessUnit || 'Unknown',
  industry: r.industry || 'Unknown',
  companySize: r.companySize || 'Unknown',
  accountManager: r.accountManager || 'Unassigned',
  projectManagers: safeJson(r.projectManagersJson, []),
  research: {
    status: r.status,
    companyOverview: r.companyOverview,
    eventAgendaSummary: r.eventAgendaSummary,
    eventBudgetEstimate: r.eventBudgetEstimate,
    boothFootprint: r.boothFootprint,
    experientialActivations: r.experientialActivations,
    creativeTechnologyUsage: r.creativeTechnologyUsage,
    agenciesAndPartners: safeJson(r.agenciesAndPartnersRaw, []),
    agencyPartnerAnalysis: safeJson(r.agencyPartnerAnalysisRaw, []),
    opportunityHypothesis: r.opportunityHypothesis,
    opportunityScore: r.opportunityScore ?? 0,
    successPotentialRank: r.successPotentialRank ?? Math.max(1, Math.min(10, Math.round((r.opportunityScore ?? 0) / 10))),
    successPotentialRationale: r.successPotentialRationale,
    confidence: r.confidence,
    sourceCount: r.sourceCount,
    updatedAt: r.updatedAt,
    sources: safeJson(r.sourcesJson, []),
  }
}));
const byStudio = new Map();
const byIndustry = new Map();
for (const a of accounts) {
  byStudio.set(a.studio, (byStudio.get(a.studio) || 0) + 1);
  byIndustry.set(a.industry, (byIndustry.get(a.industry) || 0) + 1);
}
const payload = {
  generatedAt: new Date().toISOString(),
  summary: {
    totalResearchedAccounts: accounts.length,
    avgOpportunityScore: Math.round(accounts.reduce((s,a)=>s+a.research.opportunityScore,0) / Math.max(1, accounts.length)),
    highConfidenceCount: accounts.filter((a)=>a.research.confidence==='high').length,
    mediumConfidenceCount: accounts.filter((a)=>a.research.confidence==='medium').length,
    lowConfidenceCount: accounts.filter((a)=>a.research.confidence==='low').length,
    topStudios: Array.from(byStudio.entries()).map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count).slice(0,10),
    topIndustries: Array.from(byIndustry.entries()).map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count).slice(0,10)
  },
  accounts
};
fs.writeFileSync(path.resolve('..', 'opportunity-share', 'public', 'data', 'opportunities.json'), JSON.stringify(payload, null, 2));
NODE
```
