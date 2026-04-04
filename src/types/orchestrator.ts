/** Mirrors domain/orchestrator.rs types exactly. */

export type SubOrchestratorRole = 'code' | 'factual' | 'creative' | 'default'

export interface SubOrchestratorDef {
  model: string
  role: SubOrchestratorRole
  enabled: boolean
}

export interface OrchestratorConfig {
  sub_orchestrators: SubOrchestratorDef[]
  enable_reasoning: boolean
}

export const ROLE_LABELS: Record<SubOrchestratorRole, string> = {
  code: 'Code Specialist',
  factual: 'Factual Analyst',
  creative: 'Creative Writer',
  default: 'General Assistant',
}

// ── ReasoningStep — mirrors the #[serde(tag = "step")] enum ──────────────────

export interface PlanningStep {
  step: 'planning'
  content: string
}

export interface DelegatingStep {
  step: 'delegating'
  model: string
  role: string
  task: string
}

export interface ReviewingStep {
  step: 'reviewing'
  content: string
}

export interface SynthesizingStep {
  step: 'synthesizing'
}

export type ReasoningStep =
  | PlanningStep
  | DelegatingStep
  | ReviewingStep
  | SynthesizingStep

// ── SystemInfo — mirrors commands/system.rs SystemInfo ───────────────────────

export interface SystemInfo {
  ram_total_gb: number
  ram_available_gb: number
  cpu_brand: string
  cpu_cores: number
  os_name: string
  os_version: string
}

// ── OllamaModelInfo — mirrors commands/system.rs OllamaModelInfo ─────────────

export interface OllamaModelInfo {
  name: string
  size_bytes: number
}
