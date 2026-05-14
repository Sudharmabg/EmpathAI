import React from 'react'

export default class ErrorBoundary extends React.Component {
    state = { hasError: false, error: null }

    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }

    componentDidCatch(error, info) {
        console.error('ErrorBoundary caught:', error, info.componentStack)
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null })
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center p-8">
                    <h2 className="text-xl font-semibold text-gray-800">Something went wrong</h2>
                    <p className="text-gray-500 text-sm max-w-sm">
                        An unexpected error occurred in this section. Your session is still active.
                    </p>
                    <button
                        onClick={this.handleReset}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
                    >
                        Try again
                    </button>
                </div>
            )
        }
        return this.props.children
    }
}