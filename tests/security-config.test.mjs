import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

test('CodeQL et Dependabot sont activés', async () => {
  const security = await read('../.github/workflows/security.yml')
  const dependabot = await read('../.github/dependabot.yml')

  assert.match(security, /github\/codeql-action\/init@v3/)
  assert.match(security, /npm audit --audit-level=high/)
  assert.match(dependabot, /package-ecosystem: npm/)
})

test('la CI principale conserve les garde-fous TypeScript, lint et E2E', async () => {
  const ci = await read('../.github/workflows/ci.yml')

  assert.match(ci, /npm run typecheck/)
  assert.match(ci, /npm run lint/)
  assert.match(ci, /smoke\.spec\.mjs/)
  assert.match(ci, /authenticated-flow\.spec\.mjs/)
})
