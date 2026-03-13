import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="p-6 rounded-xl border border-red-200 bg-red-50 text-red-800">
          <h3 className="font-semibold mb-2">Something went wrong</h3>
          <p className="text-sm mb-2">{this.state.error.message}</p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-3 py-1.5 text-sm font-medium rounded-lg border border-red-300 bg-white text-red-700 hover:bg-red-100"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
