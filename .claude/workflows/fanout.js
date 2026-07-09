export const meta = {
  name: 'fanout',
  description: 'Fan out N tasks: implement -> 2 adversarial verifiers -> fixer, then report',
  whenToUse: 'When you have a list of independent, well-scoped tasks to execute in parallel with built-in verification. Pass the tasks as an array of strings via args.',
  phases: [
    { title: 'Implement', detail: 'one implementer agent per task' },
    { title: 'Verify', detail: 'two adversarial verifiers per task (correctness + completeness)' },
    { title: 'Fix', detail: 'one fixer per task, only when verifiers found real issues' },
  ],
}

// args: an array of task-description strings, e.g.
//   Workflow({ name: 'fanout', args: ["Add X to module A", "Write tests for B"] })
// Tasks should be file-disjoint — implementers run concurrently in the same
// working tree. For overlapping tasks, add isolation: 'worktree' to the
// implementer call and have each implementer commit to its own branch.
const tasks = Array.isArray(args) ? args : [String(args)]
if (!tasks.length) return { error: 'No tasks provided. Pass an array of task strings via args.' }

const IMPL_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'What was implemented' },
    files: { type: 'array', items: { type: 'string' }, description: 'Files created or modified' },
    assumptions: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'files'],
}

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    passed: { type: 'boolean' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          file: { type: 'string' },
          issue: { type: 'string' },
          severity: { type: 'string', enum: ['critical', 'major', 'minor'] },
        },
        required: ['issue', 'severity'],
      },
    },
  },
  required: ['passed', 'findings'],
}

const FIX_SCHEMA = {
  type: 'object',
  properties: {
    resolved: { type: 'array', items: { type: 'string' } },
    rejected: { type: 'array', items: { type: 'string' }, description: 'Findings judged invalid, with reasoning' },
    files: { type: 'array', items: { type: 'string' } },
  },
  required: ['resolved', 'rejected', 'files'],
}

// pipeline(): each task flows implement -> verify -> fix independently, so
// task 1 can be in Fix while task N is still in Implement. No barriers.
const results = await pipeline(
  tasks,

  // Stage 1 — implementer (one per task)
  (task, _t, i) =>
    agent(
      `Task ${i + 1} of ${tasks.length}: ${task}\n\nImplement this task fully in the current repository.`,
      { agentType: 'implementer', label: `implement:${i + 1}`, phase: 'Implement', schema: IMPL_SCHEMA },
    ),

  // Stage 2 — two adversarial verifiers with distinct lenses, in parallel
  async (impl, task, i) => {
    if (!impl) return null
    const verdicts = await parallel(
      ['correctness', 'completeness'].map((lens) => () =>
        agent(
          `Lens: ${lens}.\nTask: ${task}\nImplementer's report: ${JSON.stringify(impl)}\n\nRead the actual changes and try to refute that this task is done correctly.`,
          { agentType: 'verifier', label: `verify:${lens}:${i + 1}`, phase: 'Verify', schema: VERDICT_SCHEMA },
        ),
      ),
    )
    const findings = verdicts.filter(Boolean).flatMap((v) => v.findings)
    return { impl, findings, passed: verdicts.filter(Boolean).every((v) => v.passed) }
  },

  // Stage 3 — fixer, only when verifiers found something
  async (verified, task, i) => {
    if (!verified) return { task, status: 'failed', detail: 'implementer or verifiers did not complete' }
    if (verified.passed || !verified.findings.length) {
      return { task, status: 'clean', impl: verified.impl }
    }
    const fix = await agent(
      `Task: ${task}\nImplementer's report: ${JSON.stringify(verified.impl)}\nVerifier findings to fix: ${JSON.stringify(verified.findings)}`,
      { agentType: 'fixer', label: `fix:${i + 1}`, phase: 'Fix', schema: FIX_SCHEMA },
    )
    return { task, status: 'fixed', impl: verified.impl, findings: verified.findings, fix }
  },
)

const done = results.filter(Boolean)
log(`${done.filter((r) => r.status === 'clean').length} clean, ${done.filter((r) => r.status === 'fixed').length} fixed, ${results.length - done.length} failed`)
return { results }
