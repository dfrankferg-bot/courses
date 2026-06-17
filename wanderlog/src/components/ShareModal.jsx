import { useState } from 'react'
import { tripToShareLink, exportJson, exportMarkdown, printTrip } from '../data/share.js'

export default function ShareModal({ trip, onClose }) {
  const link = tripToShareLink(trip)
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Fallback: select the text so the user can copy manually.
      const el = document.getElementById('share-link-input')
      el?.select()
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Share &amp; export</h2>

        <label className="field">
          <span>Shareable link</span>
          <p className="muted small" style={{ margin: '0 0 6px' }}>
            Anyone who opens this link gets a copy of the whole itinerary — no account needed.
          </p>
          <div className="share-link-row">
            <input id="share-link-input" readOnly value={link} onFocus={(e) => e.target.select()} />
            <button className="btn btn-primary small" onClick={copy}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </label>

        <div className="field">
          <span>Export</span>
          <div className="export-grid">
            <button className="export-btn" onClick={() => printTrip(trip)}>
              🖨️ Print / PDF
            </button>
            <button className="export-btn" onClick={() => exportMarkdown(trip)}>
              📝 Markdown
            </button>
            <button className="export-btn" onClick={() => exportJson(trip)}>
              📦 JSON
            </button>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}
