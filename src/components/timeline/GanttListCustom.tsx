import type { Task } from 'gantt-task-react'
import { useGanttColumnWidths } from '@/context/GanttColumnWidthsContext'
import 'gantt-task-react/dist/index.css'

const tableStyle: React.CSSProperties = {
  display: 'table',
  borderBottom: '1px solid #e6e4e4',
  borderLeft: '1px solid #e6e4e4',
}
const headerRowStyle: React.CSSProperties = {
  display: 'table-row',
  listStyle: 'none',
}
const headerCellStyle: React.CSSProperties = {
  display: 'table-cell',
  verticalAlign: 'middle',
}
const separatorStyle: React.CSSProperties = {
  borderRight: '1px solid rgb(196, 196, 196)',
  opacity: 1,
  marginLeft: '-2px',
}
const rowStyle: React.CSSProperties = {
  display: 'table-row',
  textOverflow: 'ellipsis',
}
const cellStyle: React.CSSProperties = {
  display: 'table-cell',
  verticalAlign: 'middle',
  whiteSpace: 'nowrap' as const,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}
const nameWrapperStyle: React.CSSProperties = { display: 'flex' }
const expanderStyle: React.CSSProperties = {
  color: 'rgb(86 86 86)',
  fontSize: '0.6rem',
  padding: '0.15rem 0.2rem 0 0.2rem',
  userSelect: 'none' as const,
  cursor: 'pointer',
}
const emptyExpanderStyle: React.CSSProperties = {
  fontSize: '0.6rem',
  paddingLeft: '1rem',
  userSelect: 'none' as const,
}

export interface TaskListHeaderProps {
  headerHeight: number
  fontFamily: string
  fontSize: string
  rowWidth: string
}

export function GanttListHeaderCustom({ headerHeight, fontFamily, fontSize }: TaskListHeaderProps) {
  const { phaseWidth, nameWidth } = useGanttColumnWidths()
  return (
    <div style={{ ...tableStyle, fontFamily, fontSize }}>
      <div style={{ ...headerRowStyle, height: headerHeight - 2 }}>
        <div style={{ ...headerCellStyle, minWidth: phaseWidth }}> Phase / milestone</div>
        <div style={{ ...headerCellStyle, ...separatorStyle, minWidth: nameWidth }}> Activity</div>
      </div>
    </div>
  )
}

export interface TaskListTableProps {
  rowHeight: number
  rowWidth: string
  fontFamily: string
  fontSize: string
  locale: string
  tasks: Task[]
  selectedTaskId: string
  setSelectedTask: (taskId: string) => void
  onExpanderClick: (task: Task) => void
}

export function GanttListTableCustom({
  rowHeight,
  fontFamily,
  fontSize,
  tasks,
  selectedTaskId: _selectedTaskId,
  setSelectedTask: _setSelectedTask,
  onExpanderClick,
}: TaskListTableProps) {
  const { phaseWidth, nameWidth } = useGanttColumnWidths()
  const width = (n: number) => ({ minWidth: n, maxWidth: n })
  return (
    <div style={{ ...tableStyle, fontFamily, fontSize }}>
      {tasks.map((t, index) => {
        const task = t as Task & { phase?: string }
        let expanderSymbol = ''
        if (t.hideChildren === false) expanderSymbol = '▼'
        else if (t.hideChildren === true) expanderSymbol = '▶'
        return (
          <div
            key={t.id + 'row'}
            style={{
              ...rowStyle,
              height: rowHeight,
              ...(index % 2 === 1 ? { backgroundColor: '#f5f5f5' } : {}),
            }}
          >
            <div
              style={{ ...cellStyle, ...width(phaseWidth), fontWeight: t.type === 'project' ? 600 : 500, color: '#334155' }}
              title={task.phase ?? ''}
            >
              {task.phase ?? '—'}
            </div>
            <div style={{ ...cellStyle, ...width(nameWidth) }} title={t.name}>
              <div style={nameWrapperStyle}>
                <div
                  style={expanderSymbol ? expanderStyle : emptyExpanderStyle}
                  onClick={() => onExpanderClick(t)}
                >
                  {expanderSymbol}
                </div>
                <div style={{ fontWeight: t.type === 'project' ? 600 : 400 }}>
                  {t.name}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
