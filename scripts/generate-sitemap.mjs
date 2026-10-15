import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

async function loadEnvFile() {
  try {
    const content = await readFile(resolve('.env.local'), 'utf8')
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '')
    }
  } catch { /* .env.local is optional when env vars are supplied by CI */ }
}

await loadEnvFile()
const siteUrl = (process.env.VITE_SITE_URL || '').replace(/\/$/, '')
const supabaseUrl = process.env.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY
if (!siteUrl || !/^https:\/\//.test(siteUrl) || siteUrl.includes('YOUR_PUBLIC_DOMAIN')) throw new Error('Définissez VITE_SITE_URL avec le domaine HTTPS canonique réel.')
if (!supabaseUrl || !anonKey || anonKey.includes('YOUR_')) throw new Error('Définissez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.')

const endpoint = new URL('/rest/v1/locations', supabaseUrl)
endpoint.searchParams.set('select', 'slug,updated_at')
endpoint.searchParams.set('status', 'in.(published,claimed)')
endpoint.searchParams.set('order', 'updated_at.desc')
const response = await fetch(endpoint, { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } })
if (!response.ok) throw new Error(`Impossible de récupérer les lieux publics (${response.status}). Vérifiez les politiques RLS.`)
const places = await response.json()
const urls = [{ path: '/', date: new Date().toISOString().slice(0, 10) }, ...places.map(place => ({ path: `/location/${encodeURIComponent(place.slug)}`, date: String(place.updated_at || '').slice(0, 10) }))]
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(({ path, date }) => `  <url><loc>${siteUrl}${path.replaceAll('&', '&amp;')}</loc>${/^\d{4}-\d{2}-\d{2}$/.test(date) ? `<lastmod>${date}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>\n`
await mkdir(resolve('public'), { recursive: true })
await writeFile(resolve('public/sitemap.xml'), xml, 'utf8')
const robotsPath = resolve('public/robots.txt')
let robots = ''
try { robots = await readFile(robotsPath, 'utf8') } catch { robots = 'User-agent: *\nAllow: /\n' }
robots = robots.split(/\r?\n/).filter(line => !/^\s*Sitemap:/i.test(line)).join('\n').trim()
await writeFile(robotsPath, `${robots}\nSitemap: ${siteUrl}/sitemap.xml\n`, 'utf8')
console.log(`Sitemap généré : ${urls.length} URL(s) dans public/sitemap.xml`)
