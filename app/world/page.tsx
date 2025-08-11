"use client";

import dynamic from 'next/dynamic';
import { Suspense, useState } from 'react';
import { RotateCcw, Globe } from 'lucide-react';

// Dynamically import both viewers to avoid SSR issues
const CesiumViewer = dynamic(() => import('@/components/world/CesiumViewer'), {
  ssr: false,
  loading: () => <LoadingComponent message="Loading CesiumJS..." />
});

const CobeGlobe = dynamic(() => import('@/components/world/CobeGlobe'), {
  ssr: false,
  loading: () => <LoadingComponent message="Loading COBE Globe..." />
});

function LoadingComponent({ message }: { message: string }) {
  return (
    <div className="h-screen w-full bg-gradient-to-b from-blue-900 to-black flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="relative w-16 h-16 mx-auto">
          <div className="absolute inset-0 border-4 border-blue-400/30 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          <Globe className="absolute inset-0 m-auto w-6 h-6 text-blue-400" />
        </div>
        <div className="space-y-2">
          <h2 className="text-white text-lg font-bold">Loading Earth</h2>
          <p className="text-blue-200">{message}</p>
        </div>
      </div>
    </div>
  );
}

export default function WorldPage() {
  const [viewerType, setViewerType] = useState<'cesium' | 'cobe'>('cesium');
  const [showSwitcher, setShowSwitcher] = useState(true);

  return (
    <div className="h-screen w-full overflow-hidden">
      {/* Viewer Type Switcher */}
      {showSwitcher && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-2">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewerType('cesium')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  viewerType === 'cesium' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                }`}
              >
                CesiumJS
              </button>
              <button
                onClick={() => setViewerType('cobe')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  viewerType === 'cobe' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                }`}
              >
                COBE Globe
              </button>
              <button
                onClick={() => setShowSwitcher(false)}
                className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white/70 hover:text-white transition-all duration-200"
                title="Hide switcher"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Show switcher button when hidden */}
      {!showSwitcher && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
          <button
            onClick={() => setShowSwitcher(true)}
            className="w-10 h-10 bg-black/20 backdrop-blur-md border border-white/10 rounded-xl flex items-center justify-center hover:bg-black/30 transition-all duration-200"
            title="Show viewer options"
          >
            <RotateCcw className="w-4 h-4 text-white" />
          </button>
        </div>
      )}

      {/* Render the selected viewer */}
      <Suspense fallback={<LoadingComponent message="Initializing viewer..." />}>
        {viewerType === 'cesium' ? <CesiumViewer /> : <CobeGlobe />}
      </Suspense>
    </div>
  );
}
