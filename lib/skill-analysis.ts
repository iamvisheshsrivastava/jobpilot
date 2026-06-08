// ── AI Prompt for Skill Extraction ──────────────────────────────────────────

export type SkillAnalysisResult = {
  matched: string[];
  missing: string[];
  related: string[];
  grouping?: Record<string, { matched: string[]; missing: string[]; related: string[] }>;
  suggestions?: string[];
};

/**
 * Build the system prompt for skill extraction.
 * Instructs the AI to output clean JSON only.
 */
export function buildSkillAnalysisSystemPrompt(): string {
  return `You are an ATS skill extraction expert. Your job is to analyze a job description, extract all required skills, and compare them against the candidate's profile.

Rules:
1. Extract ALL skills mentioned in the job description (technical skills, tools, languages, cloud platforms, frameworks, databases, soft skills).
2. Normalize variations (e.g. "Python 3" → "Python", "Amazon Web Services" → "AWS", "Structured Query Language" → "SQL").
3. Remove duplicates. Keep skill names concise.
4. Compare against the candidate's profile/CV.
5. Categorize each skill:
   - "matched": skill is present in candidate's profile
   - "missing": skill is required but not found in profile
   - "related": skill is not an exact match but could be related/transferable
6. Group skills into natural categories (e.g. Programming, Cloud, Databases, DevOps, Tools, Soft Skills).
7. Generate up to 5 practical resume improvement suggestions based on missing skills.

CRITICAL: Output ONLY valid JSON. No markdown, no code fences, no explanation. Use this exact schema:

{
  "matched": ["Skill1", "Skill2"],
  "missing": ["Skill3", "Skill4"],
  "related": ["Skill5", "Skill6"],
  "grouping": {
    "Programming": { "matched": ["Python"], "missing": ["Java"], "related": ["Scala"] },
    "Cloud": { "matched": [], "missing": ["AWS"], "related": [] },
    "Databases": { "matched": ["PostgreSQL"], "missing": ["MongoDB"], "related": [] },
    "DevOps": { "matched": ["Docker"], "missing": ["Kubernetes"], "related": [] },
    "Tools": { "matched": ["Git"], "missing": [], "related": [] },
    "Soft Skills": { "matched": ["Leadership"], "missing": [], "related": [] }
  },
  "suggestions": [
    "Highlight your AWS projects in your CV.",
    "Add Docker experience if applicable.",
    "Mention ETL pipeline experience."
  ]
}

If grouping is empty, use generic categories like "Technical Skills" and "Soft Skills".
Never invent skills the candidate doesn't have. Never claim match where the profile doesn't explicitly mention the skill.`;
}

/**
 * Build the user prompt with the job description and candidate profile.
 */
export function buildSkillAnalysisUserPrompt(
  jobDescription: string,
  profileText: string,
): string {
  return `=== JOB DESCRIPTION ===
${jobDescription}

=== CANDIDATE PROFILE/CV ===
${profileText}

Analyze the job description, extract all required skills, and compare them against the candidate's profile. Output JSON only.`;
}

/**
 * Flatten a user profile into text for skill comparison.
 */
export function flattenProfile(
  profile: {
    summary?: string;
    skills?: string[];
    experience?: { title?: string; company?: string; description?: string }[];
    education?: { degree?: string; field?: string; institution?: string }[];
    certifications?: string[];
    cvText?: string;
  },
): string {
  const parts: string[] = [];

  if (profile.summary) parts.push(`SUMMARY:\n${profile.summary}`);
  if (profile.skills?.length) parts.push(`SKILLS:\n${profile.skills.join(", ")}`);
  if (profile.experience?.length) {
    parts.push("EXPERIENCE:");
    for (const exp of profile.experience) {
      const line = [exp.title, exp.company, exp.description].filter(Boolean).join(" | ");
      if (line) parts.push(`- ${line}`);
    }
  }
  if (profile.education?.length) {
    parts.push("EDUCATION:");
    for (const edu of profile.education) {
      const line = [edu.degree, edu.field, edu.institution].filter(Boolean).join(" - ");
      if (line) parts.push(`- ${line}`);
    }
  }
  if (profile.certifications?.length) parts.push(`CERTIFICATIONS:\n${profile.certifications.join(", ")}`);
  if (profile.cvText) parts.push(`FULL CV TEXT:\n${profile.cvText.slice(0, 5000)}`);

  return parts.join("\n\n");
}

/**
 * Parse the LLM response into a SkillAnalysisResult.
 */
export function parseSkillAnalysisResult(raw: string): SkillAnalysisResult {
  // Try to extract JSON from the response (handle markdown code fences)
  let jsonStr = raw.trim();

  // Remove markdown code fences if present
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }

  try {
    const parsed = JSON.parse(jsonStr);
    return {
      matched: Array.isArray(parsed.matched) ? parsed.matched : [],
      missing: Array.isArray(parsed.missing) ? parsed.missing : [],
      related: Array.isArray(parsed.related) ? parsed.related : [],
      grouping: parsed.grouping || undefined,
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    };
  } catch {
    // Fallback: try to extract arrays manually
    return {
      matched: extractArray(raw, "matched"),
      missing: extractArray(raw, "missing"),
      related: extractArray(raw, "related"),
    };
  }
}

function extractArray(text: string, key: string): string[] {
  const regex = new RegExp(`"${key}"\\s*:\\s*\\[([^\\]]*)\\]`, "i");
  const match = text.match(regex);
  if (!match) return [];
  return match[1]
    .split(",")
    .map((s) => s.trim().replace(/^"|"$/g, "").replace(/^'|'$/g, ""))
    .filter(Boolean);
}