/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import {
  getUserProfile,
  getResumes,
  getJobs,
} from "./jobpilot-store";

// ── Types ────────────────────────────────────────────────────────────────────

export type EvidenceLevel = "strong" | "moderate" | "weak";

export type TechnologyEvidence = {
  name: string;
  level: EvidenceLevel;
  occurrences: number;
  sources: string[];
};

export type Project = {
  name: string;
  categories: string[];
  technologies: string[];
  description: string;
  source: "experience" | "resume" | "github" | "kaggle" | "website";
};

export type DomainStrength = {
  domain: string;
  level: "strong" | "moderate" | "weak" | "none";
  projectCount: number;
  evidence: string[];
};

export type GapAnalysis = {
  domain: string;
  gap: "none" | "low" | "medium" | "high";
  required: string[];
  found: string[];
  explanation: string;
};

export type CareerReadiness = {
  role: string;
  match: "strong" | "moderate" | "weak";
  evidence: string[];
  missing: string[];
};

export type PortfolioSummary = {
  projects: Project[];
  technologies: TechnologyEvidence[];
  domains: DomainStrength[];
  primaryFocus: string;
  strongAreas: string[];
  weakAreas: string[];
};

export type SkillDemand = {
  skill: string;
  missingCount: number;
  totalJobs: number;
  frequency: number;
};

export type PortfolioIntelligence = {
  summary: PortfolioSummary;
  gapAnalysis: GapAnalysis[];
  careerReadiness: CareerReadiness[];
  skillDemand: SkillDemand[];
  recommendations: string[];
};

// ── Technology catalog ───────────────────────────────────────────────────────

const TECH_CATEGORIES: Record<string, string[]> = {
  "Programming Languages": ["python", "javascript", "typescript", "java", "c++", "c#", "go", "rust", "scala", "r", "ruby", "php", "swift", "kotlin", "perl", "matlab", "sql"],
  "ML/DL Frameworks": ["pytorch", "tensorflow", "keras", "jax", "scikit-learn", "sklearn", "xgboost", "lightgbm", "catboost", "transformers", "huggingface", "langchain", "llamaindex", "openai", "spacy", "nltk", "sentence-transformers"],
  "Cloud Platforms": ["aws", "gcp", "google cloud", "azure", "cloud", "sagemaker", "vertex ai", "lambda", "ec2", "s3", "bedrock"],
  "MLOps & DevOps": ["docker", "kubernetes", "k8s", "terraform", "ansible", "jenkins", "ci/cd", "github actions", "gitlab ci", "mlflow", "kubeflow", "airflow", "prefect", "dagster", "wandb", "weights & biases", "neptune", "clearml"],
  "Data Engineering": ["spark", "pyspark", "kafka", "flink", "beam", "hadoop", "hive", "snowflake", "dbt", "airbyte", "fivetran", "dataflow", "bigquery", "redshift", "databricks"],
  "Databases": ["postgresql", "postgres", "mysql", "mongodb", "redis", "elasticsearch", "cassandra", "dynamodb", "cosmosdb", "neo4j", "sqlite", "sql server"],
  "Data Science & Analysis": ["pandas", "numpy", "scipy", "matplotlib", "seaborn", "plotly", "tableau", "power bi", "looker", "streamlit", "gradio", "dash", "jupyter"],
  "NLP & Gen AI": ["transformers", "bert", "gpt", "llm", "rag", "embedding", "vector database", "chroma", "pinecone", "weaviate", "qdrant", "prompt", "fine-tuning", "rlhf", "langchain", "llamaindex"],
  "Computer Vision": ["opencv", "yolo", "detectron", "mmdetection", "image", "object detection", "segmentation", "cnn", "resnet", "vit", "clip"],
  "Tools & Platforms": ["git", "github", "gitlab", "bitbucket", "linux", "bash", "make", "gradle", "maven", "npm", "pip", "conda", "poetry", "jira", "confluence", "notion", "slack"],
};

// ── Known project category keywords ──────────────────────────────────────────

const PROJECT_CATEGORIES: { category: string; keywords: string[] }[] = [
  { category: "Machine Learning", keywords: ["machine learning", "ml", "prediction", "classification", "regression", "clustering", "feature", "model", "training", "inference", "supervised", "unsupervised"] },
  { category: "Natural Language Processing", keywords: ["nlp", "natural language", "text", "sentiment", "ner", "named entity", "translation", "summarization", "qa", "question answering", "chatbot", "conversation", "token", "embedding", "semantic"] },
  { category: "Computer Vision", keywords: ["computer vision", "image", "object detection", "segmentation", "face", "ocr", "video", "cnn", "yolo", "resnet", "visual", "camera"] },
  { category: "LLM & GenAI", keywords: ["llm", "gpt", "generative", "genai", "rag", "retrieval augmented", "prompt", "transformer", "fine-tun", "gpt-3", "gpt-4", "claude", "llama", "mistral", "chatgpt"] },
  { category: "MLOps", keywords: ["mlops", "pipeline", "deployment", "ci/cd", "docker", "kubernetes", "monitoring", "model serving", "mlflow", "kubeflow", "airflow", "orchestration", "production"] },
  { category: "Data Engineering", keywords: ["data engineering", "etl", "pipeline", "spark", "kafka", "data warehouse", "data lake", "streaming", "batch processing", "schema", "dbt", "airbyte"] },
  { category: "Data Science & Analytics", keywords: ["data science", "analytics", "analysis", "visualization", "dashboard", "report", "a/b test", "experiment", "statistics", "hypothesis"] },
  { category: "Cloud & Infrastructure", keywords: ["cloud", "aws", "gcp", "azure", "infrastructure", "deployment", "serverless", "lambda", "s3", "ec2", "terraform"] },
  { category: "Full Stack / Web", keywords: ["web", "full stack", "frontend", "backend", "api", "rest", "graphql", "react", "angular", "vue", "node", "django", "flask", "fastapi"] },
  { category: "Research", keywords: ["research", "paper", "publication", "conference", "journal", "thesis", "experiment", "novel", "state-of-the-art", "sota"] },
  { category: "Robotics / IoT", keywords: ["robot", "ros", "iot", "embedded", "sensor", "hardware", "firmware", "arduino", "raspberry"] },
];

// ── Known roles for career readiness ─────────────────────────────────────────

const ROLE_PROFILES: { role: string; required: string[]; preferred: string[] }[] = [
  { role: "Data Scientist", required: ["python", "machine learning", "statistics", "sql", "data visualization"], preferred: ["pandas", "numpy", "scikit-learn", "deep learning", "nlp", "a/b testing"] },
  { role: "Machine Learning Engineer", required: ["python", "machine learning", "deep learning", "software engineering", "docker"], preferred: ["pytorch", "tensorflow", "kubernetes", "mlflow", "ci/cd", "cloud", "sql"] },
  { role: "MLOps Engineer", required: ["docker", "kubernetes", "ci/cd", "python", "cloud", "mlflow"], preferred: ["terraform", "airflow", "kubeflow", "monitoring", "jenkins", "github actions"] },
  { role: "Data Engineer", required: ["sql", "python", "etl", "data modeling", "spark"], preferred: ["kafka", "airflow", "snowflake", "dbt", "cloud", "data warehouse"] },
  { role: "NLP Engineer", required: ["python", "nlp", "transformers", "deep learning", "pytorch"], preferred: ["bert", "gpt", "llm", "rag", "embedding", "langchain", "spacy"] },
  { role: "Computer Vision Engineer", required: ["python", "computer vision", "deep learning", "opencv", "pytorch"], preferred: ["yolo", "image segmentation", "object detection", "cnn", "video processing"] },
  { role: "GenAI Engineer", required: ["python", "llm", "prompt engineering", "rag", "transformers"], preferred: ["langchain", "vector database", "fine-tuning", "gpt", "claude", "embedding"] },
  { role: "Research Scientist", required: ["machine learning", "deep learning", "python", "research", "experimentation"], preferred: ["publication", "pytorch", "nlp", "cv", "mathematics", "statistics"] },
  { role: "Data Analyst", required: ["sql", "data visualization", "excel", "statistics", "python"], preferred: ["tableau", "power bi", "pandas", "looker", "a/b testing"] },
];

// ── Extraction helpers ───────────────────────────────────────────────────────

function findAllTechnologies(text: string): Map<string, number> {
  const found = new Map<string, number>();
  const lower = text.toLowerCase();
  for (const [, techs] of Object.entries(TECH_CATEGORIES)) {
    for (const tech of techs) {
      const regex = new RegExp(`\\b${tech.replace(/[.+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
      const matches = lower.match(regex);
      if (matches) {
        found.set(tech, (found.get(tech) || 0) + matches.length);
      }
    }
  }
  return found;
}

function detectProjectCategories(name: string, description: string): string[] {
  const combined = `${name} ${description}`.toLowerCase();
  const categories: string[] = [];
  for (const { category, keywords } of PROJECT_CATEGORIES) {
    if (keywords.some((kw) => combined.includes(kw))) {
      categories.push(category);
    }
  }
  return categories.length ? categories : ["General"];
}

function evidenceLevel(count: number, sources: number): EvidenceLevel {
  if (count >= 5 || sources >= 3) return "strong";
  if (count >= 2 || sources >= 1) return "moderate";
  return "weak";
}

// ── Build portfolio from all sources ──────────────────────────────────────────

export function buildPortfolio(userId: string): PortfolioSummary {
  const profile = getUserProfile(userId);
  const resumes = getResumes(userId);
  const jobs = getJobs(userId);

  const allTexts: string[] = [];
  const projects: Project[] = [];

  // Extract from experience
  for (const exp of profile.experience || []) {
    const text = `${exp.title} ${exp.company} ${exp.description}`;
    allTexts.push(text);
    projects.push({
      name: `${exp.title} at ${exp.company}`,
      categories: detectProjectCategories(exp.title, exp.description || ""),
      technologies: Array.from(findAllTechnologies(text).keys()),
      description: exp.description || "",
      source: "experience",
    });
  }

  // Extract from education
  for (const edu of profile.education || []) {
    const text = `${edu.degree} ${edu.field} ${edu.institution}`;
    allTexts.push(text);
  }

  // Extract from CV text
  if (profile.cvText) {
    allTexts.push(profile.cvText);
  }

  // Extract from resumes
  for (const resume of resumes) {
    allTexts.push(resume.content);
    // Extract projects from resume content
    const lines = resume.content.split("\n");
    let currentProject = "";
    for (const line of lines) {
      if (/^#+\s+|^[A-Z][^.]{3,80}(?::|\n)/.test(line) && line.length < 100) {
        if (currentProject) {
          projects.push({
            name: currentProject,
            categories: detectProjectCategories(currentProject, currentProject),
            technologies: Array.from(findAllTechnologies(currentProject).keys()),
            description: currentProject,
            source: "resume",
          });
        }
        currentProject = line.replace(/^#+\s*/, "").trim();
      } else if (currentProject) {
        currentProject += " " + line.trim();
      }
    }
    if (currentProject) {
      projects.push({
        name: currentProject.slice(0, 60),
        categories: detectProjectCategories(currentProject, currentProject),
        technologies: Array.from(findAllTechnologies(currentProject).keys()),
        description: currentProject.slice(0, 200),
        source: "resume",
      });
    }
  }

  // Merge profile skills and certifications
  allTexts.push((profile.skills || []).join(" "));
  allTexts.push((profile.certifications || []).join(" "));

  const combinedText = allTexts.join("\n");
  const techMap = findAllTechnologies(combinedText);

  // Build technology evidence
  const technologies: TechnologyEvidence[] = Array.from(techMap.entries())
    .map(([name, count]) => {
      const sources: string[] = [];
      if (profile.skills?.some((s) => s.toLowerCase().includes(name))) sources.push("profile");
      if (profile.cvText?.toLowerCase().includes(name)) sources.push("cv");
      if (resumes.some((r) => r.content.toLowerCase().includes(name))) sources.push("resume");
      if (profile.experience?.some((e) => (e.description || "").toLowerCase().includes(name))) sources.push("experience");
      return { name, level: evidenceLevel(count, sources.length), occurrences: count, sources };
    })
    .sort((a, b) => b.occurrences - a.occurrences);

  // Build domain strengths
  const domainMap = new Map<string, { count: number; evidence: string[] }>();
  for (const project of projects) {
    for (const cat of project.categories) {
      const entry = domainMap.get(cat) || { count: 0, evidence: [] };
      entry.count++;
      if (!entry.evidence.includes(project.name)) entry.evidence.push(project.name);
      domainMap.set(cat, entry);
    }
  }
  // Also check overall text
  for (const cat of PROJECT_CATEGORIES) {
    const entry = domainMap.get(cat.category) || { count: 0, evidence: [] };
    if (cat.keywords.some((kw: string) => combinedText.toLowerCase().includes(kw))) {
      entry.count += Math.max(1, entry.count);
    }
  }

  const domains: DomainStrength[] = Array.from(domainMap.entries())
    .map(([domain, data]) => ({
      domain,
      level: data.count >= 3 ? "strong" as const : data.count >= 1 ? "moderate" as const : "weak" as const,
      projectCount: data.count,
      evidence: data.evidence,
    }))
    .sort((a, b) => b.projectCount - a.projectCount);

  // Determine primary focus
  const strongDomains = domains.filter((d) => d.level === "strong");
  const primaryFocus = strongDomains[0]?.domain || "General";
  const strongAreas = domains.filter((d) => d.level === "strong" || d.level === "moderate").map((d) => d.domain);
  const weakAreas = domains.filter((d) => d.level === "weak" || d.level === "none").map((d) => d.domain);

  return { projects, technologies, domains, primaryFocus, strongAreas, weakAreas };
}

// ── Gap analysis ─────────────────────────────────────────────────────────────

export function analyzeGaps(
  portfolio: PortfolioSummary,
  jobDescription?: string,
  targetRole?: string,
): GapAnalysis[] {
  if (!jobDescription && !targetRole) return [];

  const text = jobDescription || "";
  const requiredTechs = text ? Array.from(findAllTechnologies(text).keys()) : [];
  const domainTechs = targetRole
    ? (ROLE_PROFILES.find((r) => r.role === targetRole)?.required || [])
    : [];

  const allRequired = Array.from(new Set(requiredTechs.concat(domainTechs)));
  const portfolioTechs = new Set(portfolio.technologies.map((t) => t.name));
  const portfolioDomains = new Set(portfolio.domains.map((d) => d.domain));

  const analysis: GapAnalysis[] = [];

  // Domain-level gap analysis
  const domains = ["Machine Learning", "MLOps", "Data Engineering", "Cloud & Infrastructure", "NLP & Gen AI", "Computer Vision", "Data Science & Analytics", "Full Stack / Web"];
  for (const domain of domains) {
    if (!allRequired.length && !text.toLowerCase().includes(domain.toLowerCase().split(" ")[0])) continue;
    const techsInDomain = Object.entries(TECH_CATEGORIES)
      .filter(([cat]) => cat.toLowerCase().includes(domain.toLowerCase().split(" ")[0]))
      .flatMap(([, techs]) => techs);

    const found = techsInDomain.filter((t) => portfolioTechs.has(t));
    const required = techsInDomain.filter((t) => !allRequired.length || allRequired.includes(t));
    const missing = required.filter((t) => !portfolioTechs.has(t));

    if (!required.length && !found.length) continue;

    const gapLevel = missing.length === 0 ? "none" :
      found.length === 0 ? "high" :
      missing.length > required.length / 2 ? "high" :
      missing.length > 0 ? "medium" : "low";

    if (gapLevel !== "none" || found.length > 0) {
      analysis.push({
        domain,
        gap: gapLevel as GapAnalysis["gap"],
        required: required.slice(0, 5),
        found: found.slice(0, 5),
        explanation: gapLevel === "high" ? `No ${domain.toLowerCase()} evidence detected.` :
          gapLevel === "medium" ? `Limited ${domain.toLowerCase()} evidence. Consider strengthening.` :
          `${domain} evidence present.`,
      });
    }
  }

  return analysis.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2, none: 3 };
    return order[a.gap] - order[b.gap];
  });
}

// ── Career readiness ─────────────────────────────────────────────────────────

export function assessCareerReadiness(portfolio: PortfolioSummary): CareerReadiness[] {
  const techSet = new Set(portfolio.technologies.map((t) => t.name));
  const domainSet = new Set(portfolio.domains.map((d) => d.domain));

  return ROLE_PROFILES.map((role) => {
    const requiredFound = role.required.filter((t) =>
      techSet.has(t) || domainSet.has(t) || portfolio.technologies.some((pt) => t.includes(pt.name) || pt.name.includes(t))
    );
    const preferredFound = role.preferred.filter((t) =>
      techSet.has(t) || domainSet.has(t) || portfolio.technologies.some((pt) => t.includes(pt.name) || pt.name.includes(t))
    );
    const missing = role.required.filter((t) => !requiredFound.includes(t));

    const match: CareerReadiness["match"] =
      requiredFound.length >= role.required.length * 0.75 ? "strong" :
      requiredFound.length >= role.required.length * 0.4 ? "moderate" : "weak";

    return {
      role: role.role,
      match,
      evidence: requiredFound.map((t) => `${t} (detected)`),
      missing,
    };
  }).sort((a, b) => {
    const order = { strong: 0, moderate: 1, weak: 2 };
    return order[a.match] - order[b.match];
  });
}

// ── Skill demand trends ──────────────────────────────────────────────────────

export function analyzeSkillDemand(userId: string): SkillDemand[] {
  const jobs = getJobs(userId);
  if (!jobs.length) return [];

  // Look at notes field for stored skill analysis results to find missing skills
  const missingCount = new Map<string, number>();
  const seenJobs = new Set<string>();

  for (const job of jobs) {
    if (!job.notes || seenJobs.has(job.id)) continue;
    seenJobs.add(job.id);

    // Parse stored analysis from notes
    const missingMatch = job.notes.match(/"missing"\s*:\s*\[([^\]]+)\]/i);
    if (missingMatch) {
      const skills = missingMatch[1].match(/"([^"]+)"/g);
      if (skills) {
        for (const s of skills) {
          const cleaned = s.replace(/"/g, "").trim().toLowerCase();
          if (cleaned) missingCount.set(cleaned, (missingCount.get(cleaned) || 0) + 1);
        }
      }
    }
  }

  // Also check AI analysis from job descriptions in notes
  for (const job of jobs) {
    const descTechs = findAllTechnologies(job.title + " " + (job.notes || "") + " " + (job.comments || ""));
    for (const [tech] of descTechs) {
      if (!missingCount.has(tech)) continue;
    }
  }

  return Array.from(missingCount.entries())
    .map(([skill, count]) => ({
      skill,
      missingCount: count,
      totalJobs: jobs.length,
      frequency: +(count / jobs.length).toFixed(2),
    }))
    .sort((a, b) => b.missingCount - a.missingCount)
    .slice(0, 15);
}

// ── Recommendations ──────────────────────────────────────────────────────────

export function generateRecommendations(
  portfolio: PortfolioSummary,
  gaps: GapAnalysis[],
  readiness: CareerReadiness[],
  demand: SkillDemand[],
): string[] {
  const recs: string[] = [];

  // From gap analysis
  const highGaps = gaps.filter((g) => g.gap === "high");
  for (const gap of highGaps.slice(0, 3)) {
    const missing = gap.required.filter((t) => !gap.found.includes(t));
    if (missing.length) {
      const toLearn = missing.slice(0, 3).join(", ");
      recs.push(`Build ${gap.domain.toLowerCase()} skills: Focus on ${toLearn}.`);
    }
  }

  // From career readiness
  const weakRoles = readiness.filter((r) => r.match === "weak");
  if (weakRoles.length) {
    const toFocus = weakRoles.slice(0, 2).map((r) => r.role).join(" and ");
    recs.push(`Your profile aligns least with ${toFocus}. Review missing requirements to expand your range.`);
  }

  // From skill demand
  if (demand.length >= 3) {
    const topDemand = demand[0];
    recs.push(`Highest demand gap: ${topDemand.skill} (missing in ${topDemand.missingCount} of ${topDemand.totalJobs} jobs). Consider learning this skill.`);
  }

  // Strength-based
  if (portfolio.strongAreas.length) {
    recs.push(`Leverage your strength in ${portfolio.strongAreas.slice(0, 3).join(", ")} when targeting roles.`);
  }

  if (recs.length === 0) {
    recs.push("Upload your resume and connect data sources to receive personalized recommendations.");
  }

  return recs.slice(0, 6);
}

// ── Main intelligence function ───────────────────────────────────────────────

export function generatePortfolioIntelligence(
  userId: string,
  jobDescription?: string,
  targetRole?: string,
): PortfolioIntelligence {
  const summary = buildPortfolio(userId);
  const gapAnalysis = analyzeGaps(summary, jobDescription, targetRole);
  const careerReadiness = assessCareerReadiness(summary);
  const skillDemand = analyzeSkillDemand(userId);
  const recommendations = generateRecommendations(summary, gapAnalysis, careerReadiness, skillDemand);

  return { summary, gapAnalysis, careerReadiness, skillDemand, recommendations };
}