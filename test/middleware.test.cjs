const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const typescript = require('typescript')
const { NextRequest } = require('next/server')

const sourcePath = path.join(__dirname, '..', 'middleware.ts')
const compiled = typescript.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
  compilerOptions: { module: typescript.ModuleKind.CommonJS, target: typescript.ScriptTarget.ES2020 },
}).outputText
const middlewareModule = new Module(sourcePath, module)
middlewareModule.filename = sourcePath
middlewareModule.paths = Module._nodeModulePaths(path.dirname(sourcePath))
middlewareModule._compile(compiled, sourcePath)
const { middleware } = middlewareModule.exports

const requestFor = (pathname, withCookie = true) => new NextRequest(`http://localhost:3000${pathname}`, {
  headers: withCookie ? { cookie: 'auth_token=test-token' } : {},
})

test('dashboard middleware admits admins and rejects other sessions before rendering', async () => {
  const originalFetch = global.fetch
  try {
    global.fetch = async () => ({ status: 200, ok: true, json: async () => ({ user: { role: 'admin' } }) })
    const admin = await middleware(requestFor('/psmnlp-dashboard'))
    assert.equal(admin.status, 200)
    const nestedAdmin = await middleware(requestFor('/psmnlp-dashboard/settings'))
    assert.equal(nestedAdmin.status, 200)

    global.fetch = async () => ({ status: 200, ok: true, json: async () => ({ user: { role: 'user' } }) })
    const customer = await middleware(requestFor('/psmnlp-dashboard'))
    assert.equal(customer.status, 307)
    assert.equal(customer.headers.get('location'), 'http://localhost:3000/')

    global.fetch = async () => ({ status: 401, ok: false })
    const expired = await middleware(requestFor('/psmnlp-dashboard'))
    assert.equal(expired.status, 307)
    assert.equal(expired.headers.get('location'), 'http://localhost:3000/login?redirect=%2Fpsmnlp-dashboard')
    assert.match(expired.headers.get('set-cookie') || '', /auth_token=;/)

    const expiredForgotPassword = await middleware(requestFor('/forgot-password'))
    assert.equal(expiredForgotPassword.status, 200)
    assert.match(expiredForgotPassword.headers.get('set-cookie') || '', /auth_token=;/)

    global.fetch = async () => { throw new Error('API unavailable') }
    const unavailable = await middleware(requestFor('/psmnlp-dashboard'))
    assert.equal(unavailable.status, 503)

    const anonymous = await middleware(requestFor('/psmnlp-dashboard', false))
    assert.equal(anonymous.status, 307)
    assert.equal(anonymous.headers.get('location'), 'http://localhost:3000/login?redirect=%2Fpsmnlp-dashboard')
    assert.equal((await middleware(requestFor('/forgot-password', false))).status, 200)
  } finally {
    global.fetch = originalFetch
  }
})
