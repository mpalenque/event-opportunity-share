export type Confidence = "high" | "medium" | "low" | "unknown";

export type AgencyPartner = {
  name: string;
  role: string;
  scope: string;
  experientialRelevance: string;
  evidence: string;
};

export type ResearchSource = {
  title: string;
  url: string;
  note: string;
  publishedAt: string;
};

export type AccountResearch = {
  status: string;
  companyOverview: string;
  eventAgendaSummary: string;
  eventBudgetEstimate: string;
  boothFootprint: string;
  experientialActivations: string;
  creativeTechnologyUsage: string;
  agenciesAndPartners: string[];
  agencyPartnerAnalysis: AgencyPartner[];
  opportunityHypothesis: string;
  opportunityScore: number;
  successPotentialRank: number;
  successPotentialRationale: string;
  confidence: Confidence;
  sourceCount: number;
  updatedAt: string | null;
  sources: ResearchSource[];
};

export type AccountRecord = {
  id: string;
  accountName: string;
  studio: string;
  businessUnit: string;
  industry: string;
  companySize: string;
  accountManager: string;
  projectManagers: string[];
  research: AccountResearch;
};

export type Dataset = {
  generatedAt: string;
  summary: {
    totalResearchedAccounts: number;
    avgOpportunityScore: number;
    highConfidenceCount: number;
    mediumConfidenceCount: number;
    lowConfidenceCount: number;
    topStudios: Array<{ name: string; count: number }>;
    topIndustries: Array<{ name: string; count: number }>;
  };
  accounts: AccountRecord[];
};
