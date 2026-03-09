import { ExportPanel } from '@/components/export/ExportPanel'

export function ExportPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Export & Summary</h1>
      <p className="text-slate-600 mb-6">
        Generate a summary and quick-export timeline to PPT. For a full multi-slide deck in GSK format (title, timeline, key messages, summary), use <strong>Build presentation</strong> in the sidebar.
      </p>
      <ExportPanel />
    </div>
  )
}
