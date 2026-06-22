// Sharing & export helpers. A shared trip is encoded into the URL hash so it
// can be opened on another device with no backend; we also export JSON,
// Markdown, and a printable view.
import { daysOfTrip } from '../store.jsx'
import { categoryOf } from './categories.js'

// Unicode-safe base64 (handles emoji in titles/notes).
function toB64(str) {
  return btoa(String.fromCharCode(...new TextEncoder().encode(str)))
}
function fromB64(b64) {
  return new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)))
}

export function tripToShareLink(trip) {
  const encoded = toB64(JSON.stringify(trip))
  return `${location.origin}${location.pathname}#trip=${encoded}`
}

export function readSharedTrip() {
  const m = location.hash.match(/^#trip=(.+)$/)
  if (!m) return null
  try {
    return JSON.parse(fromB64(m[1]))
  } catch {
    return null
  }
}

export function clearShareHash() {
  history.replaceState(null, '', location.pathname + location.search)
}

function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function placesByDay(trip, dayIndex) {
  return trip.places
    .filter((p) => p.dayIndex === dayIndex)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

export function tripToMarkdown(trip) {
  const days = daysOfTrip(trip)
  const lines = [`# ${trip.emoji || ''} ${trip.title}`.trim()]
  const sub = [trip.destination, trip.startDate && `${fmtDate(trip.startDate)} – ${fmtDate(trip.endDate)}`]
    .filter(Boolean)
    .join(' · ')
  if (sub) lines.push('', `_${sub}_`)

  days.forEach((d) => {
    lines.push('', `## Day ${d.index + 1} — ${d.date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}`)
    const stops = placesByDay(trip, d.index)
    if (stops.length === 0) lines.push('_Nothing planned yet._')
    stops.forEach((p) => {
      const cat = categoryOf(p.category)
      const bits = [p.time, `${cat.emoji} **${p.name}**`, p.cost > 0 ? `($${p.cost})` : '']
        .filter(Boolean)
        .join(' ')
      lines.push(`- ${bits}`)
      if (p.address) lines.push(`  - ${p.address}`)
      if (p.notes) lines.push(`  - _${p.notes}_`)
    })
  })

  const saved = placesByDay(trip, null)
  if (saved.length) {
    lines.push('', '## 💡 Want to go')
    saved.forEach((p) => lines.push(`- ${categoryOf(p.category).emoji} ${p.name}`))
  }

  const total = trip.places.reduce((s, p) => s + (Number(p.cost) || 0), 0)
  lines.push('', `**Estimated budget: $${total.toLocaleString()}**`)
  return lines.join('\n')
}

export function downloadFile(filename, content, type = 'text/plain') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

const slug = (s) => (s || 'trip').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export function exportJson(trip) {
  downloadFile(`${slug(trip.title)}.json`, JSON.stringify(trip, null, 2), 'application/json')
}

export function exportMarkdown(trip) {
  downloadFile(`${slug(trip.title)}.md`, tripToMarkdown(trip), 'text/markdown')
}

// Open a clean, printable itinerary in a new window.
export function printTrip(trip) {
  const md = tripToMarkdown(trip)
  const html = md
    .split('\n')
    .map((line) => {
      if (line.startsWith('## ')) return `<h2>${esc(line.slice(3))}</h2>`
      if (line.startsWith('# ')) return `<h1>${esc(line.slice(2))}</h1>`
      if (line.startsWith('  - ')) return `<div class="sub">${inline(line.slice(4))}</div>`
      if (line.startsWith('- ')) return `<div class="stop">${inline(line.slice(2))}</div>`
      if (line.trim() === '') return ''
      return `<p>${inline(line)}</p>`
    })
    .join('\n')

  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(trip.title)}</title>
    <style>
      body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:720px;margin:40px auto;padding:0 20px;color:#1d2433;line-height:1.5}
      h1{font-size:26px;margin-bottom:4px} h2{font-size:18px;margin-top:28px;border-bottom:1px solid #e7eaf2;padding-bottom:4px}
      .stop{margin:6px 0;font-size:15px} .sub{margin:0 0 6px 18px;color:#7a839a;font-size:13px}
      p{color:#7a839a} strong{color:#1d2433}
    </style></head><body>${html}
    <script>window.onload=()=>window.print()<\/script></body></html>`)
  w.document.close()
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function inline(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
}
