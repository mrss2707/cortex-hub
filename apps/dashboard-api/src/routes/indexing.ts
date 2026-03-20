import { Hono } from 'hono'
import { randomUUID } from 'crypto'
import { db } from '../db/client.js'
import { startIndexing, cancelJob } from '../services/indexer.js'

export const indexingRouter = new Hono()

interface IndexJob {
  id: string
  project_id: string
  branch: string
  status: string
  progress: number
  total_files: number
  symbols_found: number
  log: string | null
  error: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
}

// ── Start Indexing ──
indexingRouter.post('/:id/index', async (c) => {
  const projectId = c.req.param('id')

  try {
    // Verify project exists and has a git URL
    const project = db.prepare('SELECT id, git_repo_url FROM projects WHERE id = ?').get(projectId) as {
      id: string
      git_repo_url: string | null
    } | undefined

    if (!project) return c.json({ error: 'Project not found' }, 404)
    if (!project.git_repo_url) return c.json({ error: 'Project has no git repository URL configured' }, 400)

    // Check if there's already a running job
    const activeJob = db.prepare(
      `SELECT id FROM index_jobs WHERE project_id = ? AND status IN ('pending', 'cloning', 'analyzing', 'ingesting')`
    ).get(projectId) as { id: string } | undefined

    if (activeJob) {
      return c.json({ error: 'An indexing job is already running', jobId: activeJob.id }, 409)
    }

    // Parse branch from body
    let branch = 'main'
    try {
      const body = await c.req.json()
      if (body.branch) branch = body.branch
    } catch {
      // No body is OK, use default branch
    }

    // Create job record
    const jobId = `idx-${randomUUID().slice(0, 12)}`
    db.prepare(
      `INSERT INTO index_jobs (id, project_id, branch, status, progress) VALUES (?, ?, ?, 'pending', 0)`
    ).run(jobId, projectId, branch)

    // Fire and forget — run indexing in background
    startIndexing(projectId, jobId, branch).catch(() => {
      // Error is already logged by indexer.ts
    })

    return c.json({ jobId, status: 'pending', branch }, 201)
  } catch (error) {
    return c.json({ error: String(error) }, 500)
  }
})

// ── Get Current Index Status ──
indexingRouter.get('/:id/index/status', (c) => {
  const projectId = c.req.param('id')

  try {
    const job = db.prepare(
      `SELECT * FROM index_jobs WHERE project_id = ? ORDER BY created_at DESC LIMIT 1`
    ).get(projectId) as IndexJob | undefined

    if (!job) return c.json({ status: 'none', message: 'No indexing jobs found' })

    return c.json({
      jobId: job.id,
      branch: job.branch,
      status: job.status,
      progress: job.progress,
      totalFiles: job.total_files,
      symbolsFound: job.symbols_found,
      error: job.error,
      log: job.log,
      startedAt: job.started_at,
      completedAt: job.completed_at,
      createdAt: job.created_at,
    })
  } catch (error) {
    return c.json({ error: String(error) }, 500)
  }
})

// ── Get Index History ──
indexingRouter.get('/:id/index/history', (c) => {
  const projectId = c.req.param('id')

  try {
    const jobs = db.prepare(
      `SELECT id, branch, status, progress, total_files, symbols_found, error, started_at, completed_at, created_at
       FROM index_jobs WHERE project_id = ? ORDER BY created_at DESC LIMIT 20`
    ).all(projectId) as IndexJob[]

    return c.json({ jobs })
  } catch (error) {
    return c.json({ error: String(error) }, 500)
  }
})

// ── Cancel Running Job ──
indexingRouter.post('/:id/index/cancel', (c) => {
  const projectId = c.req.param('id')

  try {
    // Find running job
    const activeJob = db.prepare(
      `SELECT id FROM index_jobs WHERE project_id = ? AND status IN ('pending', 'cloning', 'analyzing', 'ingesting') ORDER BY created_at DESC LIMIT 1`
    ).get(projectId) as { id: string } | undefined

    if (!activeJob) return c.json({ error: 'No active indexing job found' }, 404)

    const cancelled = cancelJob(activeJob.id)
    if (!cancelled) {
      // Process already exited, just mark as error
      db.prepare(
        `UPDATE index_jobs SET status = 'error', error = 'Cancelled by user', completed_at = datetime('now') WHERE id = ?`
      ).run(activeJob.id)
    }

    return c.json({ success: true, jobId: activeJob.id })
  } catch (error) {
    return c.json({ error: String(error) }, 500)
  }
})
