'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Toaster } from 'react-hot-toast';

export default function JudgeDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const qrReaderRef = useRef<HTMLDivElement | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string>('');

  // Cleanup scanner
  const cleanupScanner = () => {
    if (scannerRef.current) {
      try {
        scannerRef.current.clear();
        scannerRef.current = null;
      } catch (error) {
        console.error('Error cleaning up scanner:', error);
      }
    }
    setIsScanning(false);
  };

  // Initialize scanner
  const initializeScanner = async () => {
    if (isInitializing || isScanning || scannerRef.current) {
      return;
    }

    setIsInitializing(true);
    setError('');

    try {
      // Check camera permission first
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the test stream
      setHasPermission(true);

      // Small delay to ensure DOM is ready
      await new Promise(resolve => setTimeout(resolve, 100));

      if (qrReaderRef.current && !scannerRef.current) {
        scannerRef.current = new Html5QrcodeScanner(
          qrReaderRef.current.id,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            supportedScanTypes: [0], // QR_CODE only
          },
          false
        );

        scannerRef.current.render(
          (decodedText: string) => {
            console.log('QR Code scanned:', decodedText);
            setIsScanning(false);
            router.push(`/judge/${decodedText}`);
          },
          (errorMessage: string) => {
            // Only log critical errors, ignore normal "no code detected" messages
            const lowerMessage = errorMessage.toLowerCase();

            // List of normal "no code detected" messages to ignore
            const ignorePatterns = [
              'no multiformat readers were able to detect',
              'notfoundexception',
              'no qr code found',
              'no barcode found',
              'no code detected',
              'qr code parse error',
              'no valid qr code',
              'no valid barcode',
              'multiformat readers were able to detect',
              'no barcode',
              'no qr code',
              'parse error',
              'not found exception',
            ];

            // Check if this is a normal "no code detected" message
            const shouldIgnore = ignorePatterns.some(pattern =>
              lowerMessage.includes(pattern)
            );

            // Only log if it's NOT a normal scanning message
            if (!shouldIgnore) {
              const criticalErrors = [
                'permission',
                'camera',
                'hardware',
                'network',
                'timeout',
                'unauthorized',
                'forbidden',
                'not allowed',
                'access denied',
                'device not found',
                'constraint not satisfied',
              ];

              const isCriticalError = criticalErrors.some(pattern =>
                lowerMessage.includes(pattern)
              );

              if (isCriticalError) {
                console.error('Critical QR scanner error:', errorMessage);
                setError(`Camera error: ${errorMessage}`);
              }
            }
            // All other errors (including normal "no code detected") are silently ignored
          }
        );

        setIsScanning(true);
      }
    } catch (err) {
      console.error('Error initializing scanner:', err);
      setHasPermission(false);
      setError(
        'Camera permission denied. Please allow camera access and refresh the page.'
      );
    } finally {
      setIsInitializing(false);
    }
  };

  // Initialize scanner when user is authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/judge/signin');
      return;
    }

    if (user && !isScanning && !scannerRef.current) {
      initializeScanner();
    }

    // Cleanup on unmount
    return () => {
      cleanupScanner();
    };
  }, [user, loading]);

  // Restart scanner
  const restartScanner = () => {
    cleanupScanner();
    setError('');
    setHasPermission(null);
    setTimeout(() => {
      initializeScanner();
    }, 500);
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

          {/* Camera Permission Error */}
          {hasPermission === false && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-red-900 mb-2">
                Camera Access Required
              </h3>
              <p className="text-red-800 text-sm mb-4">{error}</p>
              <button
                onClick={restartScanner}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Scanner Error */}
          {error && hasPermission !== false && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-yellow-900 mb-2">
                Scanner Issue
              </h3>
              <p className="text-yellow-800 text-sm mb-4">{error}</p>
              <button
                onClick={restartScanner}
                className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 transition"
              >
                Restart Scanner
              </button>
            </div>
          )}

          {/* QR Scanner */}
          <div className="flex justify-center mb-6">
            <div
              id="qr-reader"
              ref={qrReaderRef}
              className="w-full max-w-md"
            ></div>
          </div>

          {/* Loading State */}
          {isInitializing && (
            <div className="text-center mb-6">
              <div className="text-lg text-gray-800">
                Initializing camera...
              </div>
            </div>
          )}

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
          {!isScanning && !isInitializing && (
            <div className="text-center mt-6">
              <button
                onClick={restartScanner}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition"
              >
                Restart Scanner
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
