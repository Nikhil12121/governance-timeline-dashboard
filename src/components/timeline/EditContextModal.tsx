import type { TimelineTask } from '@/types/timeline'

interface EditContextModalProps {
  task: TimelineTask | null
  onClose: () => void
  onSave: (id: string, manualContext: string) => void
}

export function EditContextModal({ task, onClose, onSave }: EditContextModalProps) {
  if (!task) return null

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const input = form.querySelector('textarea') as HTMLTextAreaElement
    if (input) onSave(task.id, input.value.trim())
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-slate-800 mb-1">Add manual context</h3>
        <p className="text-sm text-slate-500 mb-4">{task.name}</p>
        <form onSubmit={handleSubmit}>
          <textarea
            name="manualContext"
            defaultValue={task.manualContext ?? ''}
            placeholder="e.g. Stakeholder approval, IP session note…"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-[100px]"
            autoFocus
          />
          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-2 text-sm font-medium bg-slate-800 text-white rounded-lg hover:bg-slate-700"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
