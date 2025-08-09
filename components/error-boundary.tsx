"use client"

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { RefreshCw, AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({
      error,
      errorInfo,
    })
  }

  handleRetry = () => {
    // ลองโหลดหน้าใหม่
    window.location.reload()
  }

  handleClearCache = () => {
    // ล้าง cache และ reload
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => {
          caches.delete(name)
        })
      })
    }
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      const isChunkError = this.state.error?.message?.includes('ChunkLoadError') ||
                          this.state.error?.message?.includes('Loading chunk')

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>เกิดข้อผิดพลาด</AlertTitle>
              <AlertDescription>
                {isChunkError ? (
                  <div className="space-y-2">
                    <p>ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง</p>
                    <p className="text-sm text-muted-foreground">
                      หากปัญหายังคงอยู่ กรุณาล้าง cache ของเบราว์เซอร์
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p>เกิดข้อผิดพลาดที่ไม่คาดคิด</p>
                    <p className="text-sm text-muted-foreground">
                      {this.state.error?.message}
                    </p>
                  </div>
                )}
              </AlertDescription>
            </Alert>

            <div className="flex flex-col space-y-2">
              <Button onClick={this.handleRetry} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                ลองใหม่
              </Button>
              
              {isChunkError && (
                <Button 
                  variant="outline" 
                  onClick={this.handleClearCache}
                  className="w-full"
                >
                  ล้าง Cache และลองใหม่
                </Button>
              )}
            </div>

            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-muted-foreground">
                  ดูรายละเอียดข้อผิดพลาด (Development)
                </summary>
                <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
} 