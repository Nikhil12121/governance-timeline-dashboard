import type { Slide } from '@/types/presentation'

interface SlideEditorProps {
  slide: Slide
  index: number
  onUpdate: (id: string, patch: Partial<Slide>) => void
  onRemove: (id: string) => void
}

export function SlideEditor({ slide, index, onUpdate, onRemove }: SlideEditorProps) {
  if (slide.type === 'title') {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Slide {index + 1} – Title
          </span>
          <button
            type="button"
            onClick={() => onRemove(slide.id)}
            className="text-slate-400 hover:text-red-600 text-sm"
          >
            Remove
          </button>
        </div>
        <label className="block mb-3">
          <span className="text-sm font-medium text-slate-700">Title</span>
          <input
            type="text"
            value={slide.title}
            onChange={(e) => onUpdate(slide.id, { title: e.target.value })}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="e.g. Project Governance – Timeline Overview"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Subtitle (optional)</span>
          <input
            type="text"
            value={slide.subtitle ?? ''}
            onChange={(e) => onUpdate(slide.id, { subtitle: e.target.value })}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="e.g. Governance-quality timelines | [Project Name]"
          />
        </label>
      </div>
    )
  }

  if (slide.type === 'timeline') {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Slide {index + 1} – Timeline
          </span>
          <button
            type="button"
            onClick={() => onRemove(slide.id)}
            className="text-slate-400 hover:text-red-600 text-sm"
          >
            Remove
          </button>
        </div>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Slide title</span>
          <input
            type="text"
            value={slide.title}
            onChange={(e) => onUpdate(slide.id, { title: e.target.value })}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Governance Timeline"
          />
        </label>
        <p className="mt-2 text-xs text-slate-500">
          Data comes from the Timeline page (customised view and filters). Use Timeline to adjust what appears here.
        </p>
      </div>
    )
  }

  if (slide.type === 'content') {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Slide {index + 1} – Key messages / Content
          </span>
          <button
            type="button"
            onClick={() => onRemove(slide.id)}
            className="text-slate-400 hover:text-red-600 text-sm"
          >
            Remove
          </button>
        </div>
        <label className="block mb-3">
          <span className="text-sm font-medium text-slate-700">Slide title</span>
          <input
            type="text"
            value={slide.title}
            onChange={(e) => onUpdate(slide.id, { title: e.target.value })}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="e.g. Key messages & objectives"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Bullet points (one per line)</span>
          <textarea
            value={slide.bullets.join('\n')}
            onChange={(e) =>
              onUpdate(slide.id, {
                bullets: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
              })
            }
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-[120px] font-mono"
            placeholder="First key message&#10;Second key message&#10;..."
            rows={5}
          />
        </label>
      </div>
    )
  }

  if (slide.type === 'summary') {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Slide {index + 1} – Summary
          </span>
          <button
            type="button"
            onClick={() => onRemove(slide.id)}
            className="text-slate-400 hover:text-red-600 text-sm"
          >
            Remove
          </button>
        </div>
        <label className="block mb-3">
          <span className="text-sm font-medium text-slate-700">Slide title</span>
          <input
            type="text"
            value={slide.title}
            onChange={(e) => onUpdate(slide.id, { title: e.target.value })}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Summary"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Summary text</span>
          <textarea
            value={slide.body}
            onChange={(e) => onUpdate(slide.id, { body: e.target.value })}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-[100px]"
            placeholder="Paste or type the summary. You can also generate from Export & Summary and paste here."
            rows={4}
          />
        </label>
      </div>
    )
  }

  return null
}
