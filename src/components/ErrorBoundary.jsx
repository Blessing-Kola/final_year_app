import { Component } from "react";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  handleLogout = () => {
    window.localStorage.removeItem("thesishub-token");
    window.localStorage.removeItem("thesishub-user");
    window.location.assign("/login");
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
          <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm font-medium text-red-600">
              Something went wrong
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">
              The app crashed unexpectedly
            </h2>
            <p className="mt-3 text-sm text-slate-600">
              Please refresh the page or return home.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-5 rounded-xl bg-indigo-600 px-4 py-2 font-medium text-white"
            >
              Try again
            </button>
            <button
              onClick={this.handleLogout}
              className="ml-3 rounded-xl border border-slate-200 px-4 py-2 font-medium text-slate-700"
            >
              Log out
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
