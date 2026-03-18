import { z } from 'zod'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

/**
 * Register memory tools.
 * Proxies to mem0 API for agent memory storage and retrieval.
 */
export function registerMemoryTools(server: McpServer, env: Env) {
  // memory.store — persist a memory for an agent
  server.tool(
    'cortex.memory.store',
    'Store a memory for an AI agent. Memories persist across sessions and can be recalled by semantic search.',
    {
      content: z.string().describe('The memory content to store'),
      agentId: z.string().optional().describe('Agent identifier (default: "default")'),
      metadata: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Optional metadata tags'),
    },
    async ({ content, agentId, metadata }) => {
      try {
        const response = await fetch(`${env.MEM0_URL}/v1/memories/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content }],
            user_id: agentId ?? 'default',
            metadata: metadata ?? {},
          }),
          signal: AbortSignal.timeout(10000),
        })

        if (!response.ok) {
          const errorText = await response.text()
          return {
            content: [
              {
                type: 'text' as const,
                text: `Failed to store memory: ${response.status} ${errorText}`,
              },
            ],
            isError: true,
          }
        }

        const result = await response.json()
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { stored: true, agentId: agentId ?? 'default', result },
                null,
                2
              ),
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Memory store error: ${error instanceof Error ? error.message : 'Unknown'}`,
            },
          ],
          isError: true,
        }
      }
    }
  )

  // memory.search — recall memories by semantic similarity
  server.tool(
    'cortex.memory.search',
    'Search agent memories by semantic similarity. Returns relevant past memories ranked by relevance.',
    {
      query: z.string().describe('Search query for memory recall'),
      agentId: z.string().optional().describe('Filter by agent (default: all agents)'),
      limit: z.number().optional().describe('Max results (default: 5)'),
    },
    async ({ query, agentId, limit }) => {
      try {
        const params = new URLSearchParams({ query })
        if (agentId) params.set('user_id', agentId)
        if (limit) params.set('limit', String(limit))

        const response = await fetch(
          `${env.MEM0_URL}/v1/memories/search/?${params.toString()}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query,
              user_id: agentId ?? 'default',
              limit: limit ?? 5,
            }),
            signal: AbortSignal.timeout(10000),
          }
        )

        if (!response.ok) {
          const errorText = await response.text()
          return {
            content: [
              {
                type: 'text' as const,
                text: `Memory search failed: ${response.status} ${errorText}`,
              },
            ],
            isError: true,
          }
        }

        const memories = await response.json()
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  query,
                  agentId: agentId ?? 'all',
                  count: Array.isArray(memories) ? memories.length : 0,
                  memories,
                },
                null,
                2
              ),
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Memory search error: ${error instanceof Error ? error.message : 'Unknown'}`,
            },
          ],
          isError: true,
        }
      }
    }
  )
}
