"use client";

import { Component, type ReactNode } from "react";
import { Alert, Button, CodeBlock, Heading } from "@/components/data-terminal";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackHref?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override render() {
    if (this.state.error) {
      return (
        <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-6 p-8">
          <Heading level={2}>Something went wrong</Heading>
          <Alert variant="error" className="w-full">
            {this.state.error.message}
          </Alert>
          {this.state.error.stack && (
            <CodeBlock
              language="text"
              code={this.state.error.stack}
              showLineNumbers={false}
            />
          )}
          <div className="flex gap-3">
            <Button
              variant="primary"
              onClick={() => this.setState({ error: null })}
            >
              Retry
            </Button>
            <Button
              variant="secondary"
              as="a"
              href={this.props.fallbackHref ?? "/dashboard"}
            >
              Go to Dashboard
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
