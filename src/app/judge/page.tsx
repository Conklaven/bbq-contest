'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Toaster } from 'react-hot-toast';

// Global flag to prevent multiple scanner instances
let globalScannerActive = false;

export default function JudgeDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const qrReaderRef = useRef<HTMLDivElement | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannerKey, setScannerKey] = useState(0);
  const [isInitializing, setIsInitializing] = useState(false);

  // Helper to fully clear scanner and DOM
  const cleanupScanner = () => {
    if (scannerRef.current) {
      try {
        scannerRef.current.clear();
        scannerRef.current = null;
      } catch (error) {
        console.error('Error cleaning up scanner:', error);
      }
    }
    globalScannerActive = false;
    setIsScanning(false);
  };

  const handleScanResult = useCallback(
    (result: string) => {
      if (isScanning && result) {
        setIsScanning(false);
        router.push(`/judge/${result}`);
      }
    },
    [isScanning, router]
  );

  const initializeScanner = useCallback(() => {
    if (globalScannerActive || isInitializing) {
      return;
    }

    setIsInitializing(true);

    // Small delay to ensure any previous scanner is fully cleaned up
    setTimeout(() => {
      // Double-check that no scanner is active
      if (globalScannerActive) {
        setIsInitializing(false);
        return;
      }

      cleanupScanner();

      if (qrReaderRef.current) {
        globalScannerActive = true;
        scannerRef.current = new Html5QrcodeScanner(
          qrReaderRef.current.id,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          false
        );

        scannerRef.current.render(
          (decodedText: string) => {
            handleScanResult(decodedText);
          },
          (errorMessage: string) => {
            // Completely ignore all QR scanner errors - they're all expected "no code detected" messages
            // Only log if it's a critical error (camera permission, hardware issue, etc.)
            const lowerMessage = errorMessage.toLowerCase();

            // Only log critical errors, not scanning errors
            const criticalErrors = [
              'permission',
              'camera',
              'hardware',
              'network',
              'timeout',
              'unauthorized',
              'forbidden',
            ];

            const isCriticalError = criticalErrors.some(pattern =>
              lowerMessage.includes(pattern)
            );

            if (isCriticalError) {
              console.error('Critical QR scanner error:', errorMessage);
            }
            // All other errors are silently ignored
          }
        );
        setIsScanning(true);
      }

      setIsInitializing(false);
    }, 200); // Increased delay for better cleanup
  }, [isInitializing, handleScanResult]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/judge/signin');
      return;
    }

    // Cleanup on mount to ensure no leftover scanner
    cleanupScanner();

    // Initialize scanner if user is present
    if (user) {
      initializeScanner();
    }

    // Cleanup on unmount
    return () => {
      cleanupScanner();
    };
  }, [user, loading, router, initializeScanner]);

  // Effect to handle scanner key changes (for restart)
  useEffect(() => {
    if (scannerKey > 0 && user) {
      initializeScanner();
    }
  }, [scannerKey, user, initializeScanner]);

  const startScanning = () => {
    // Force remount of scanner container and re-init
    setScannerKey(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-8">
        <div className="text-lg text-gray-800">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to signin
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-center" />
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Judge Dashboard
              </h1>
              <p className="text-gray-600">Scan QR codes to score items</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Welcome, Judge</p>
              <button
                onClick={() => router.push('/judge/signin')}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Scan Item QR Code
            </h2>
            <p className="text-gray-600 mb-4">
              Scan a QR code to score an item. Make sure the QR code is clearly
              visible and well-lit.
            </p>
            <p className="text-gray-600 mb-4">
              If you&apos;re having trouble scanning, try moving the camera
              closer or adjusting the lighting.
            </p>
          </div>
          {/* QR Scanner */}
          <div className="flex justify-center mb-6">
            <div
              id="qr-reader"
              ref={qrReaderRef}
              className="w-full max-w-md"
              key={scannerKey}
            ></div>
          </div>
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Instructions:</h3>
            <ul className="text-blue-800 text-sm space-y-1">
              <li>• Hold your phone steady and point at the QR code</li>
              <li>• Make sure the code is well-lit and clearly visible</li>
              <li>
                • The scanner will automatically detect and process the code
              </li>
              <li>
                • You&apos;ll be redirected to the scoring form once scanned
              </li>
            </ul>
          </div>
          {/* Manual restart button */}
          {!isScanning && (
            <div className="text-center mt-6">
              <button
                onClick={startScanning}
                disabled={isInitializing}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isInitializing ? 'Initializing...' : 'Restart Scanner'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
