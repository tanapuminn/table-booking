import { Loader2 } from 'lucide-react'
import React from 'react'

interface LoadingProps {
    isLoding: boolean
}

export default function Loading({ isLoding }: LoadingProps) {
    if (!isLoding) return null;
    
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 flex flex-col items-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-lg font-medium">กำลังประมวลผล...</p>
                <p className="text-sm text-muted-foreground">กรุณารอสักครู่</p>
            </div>
        </div>
    )
}
