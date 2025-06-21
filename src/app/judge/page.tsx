'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
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
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>(
    []
  );
  const [selectedCamera, setSelectedCamera] = useState<MediaDeviceInfo | null>(
    null
  );

  // Get stored camera preference
  const getStoredCameraId = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('preferredCameraId');
    }
    return null;
  };

  // Store camera preference
  const storeCameraId = (deviceId: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferredCameraId', deviceId);
    }
  };

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
  const initializeScanner = useCallback(async () => {
    if (isInitializing || isScanning || scannerRef.current) {
      return;
    }

    setIsInitializing(true);
    setError('');

    try {
      // Get available cameras and prefer rear camera on mobile
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(
        device => device.kind === 'videoinput'
      );

      setAvailableCameras(videoDevices);

      console.log(
        'Available video devices:',
        videoDevices.map(d => ({
          deviceId: d.deviceId,
          label: d.label,
          groupId: d.groupId,
        }))
      );

      // Get stored camera preference
      const storedCameraId = getStoredCameraId();
      const storedCamera = videoDevices.find(
        device => device.deviceId === storedCameraId
      );

      // More comprehensive rear camera detection
      const rearCamera = videoDevices.find(device => {
        const label = device.label.toLowerCase();
        console.log('Checking device:', { label, deviceId: device.deviceId });

        return (
          label.includes('back') ||
          label.includes('rear') ||
          label.includes('environment') ||
          label.includes('external') ||
          label.includes('outdoor') ||
          label.includes('world') ||
          // Some devices use different naming conventions
          label.includes('main') ||
          label.includes('primary') ||
          // Check for device ID patterns that might indicate rear camera
          device.deviceId.includes('back') ||
          device.deviceId.includes('rear') ||
          device.deviceId.includes('1') || // Often rear camera has ID ending in 1
          // Additional patterns for mobile devices
          device.deviceId.includes('2') || // Sometimes rear camera is device 2
          device.deviceId.includes('rear') ||
          device.deviceId.includes('back')
        );
      });

      // Detect if first camera is likely front camera
      const firstCamera = videoDevices[0];
      const isFirstCameraFront =
        firstCamera &&
        (firstCamera.label.toLowerCase().includes('front') ||
          firstCamera.label.toLowerCase().includes('user') ||
          firstCamera.label.toLowerCase().includes('selfie') ||
          firstCamera.deviceId.includes('front') ||
          firstCamera.deviceId.includes('user'));

      // If no rear camera found, try to find the second camera (often the rear camera)
      const fallbackRearCamera =
        !rearCamera && videoDevices.length > 1 ? videoDevices[1] : null;

      // Smart fallback: if first camera is clearly front camera and we have multiple cameras, prefer second
      const smartFallback =
        !rearCamera &&
        !fallbackRearCamera &&
        isFirstCameraFront &&
        videoDevices.length > 1
          ? videoDevices[1]
          : null;

      // Priority: stored camera > rear camera > smart fallback > fallback > first camera
      const preferredCamera =
        storedCamera ||
        rearCamera ||
        smartFallback ||
        fallbackRearCamera ||
        videoDevices[0];

      setSelectedCamera(preferredCamera);

      // Store the selected camera for future use
      if (preferredCamera) {
        storeCameraId(preferredCamera.deviceId);
      }

      console.log('Camera selection results:', {
        totalDevices: videoDevices.length,
        storedCamera: storedCamera?.label,
        rearCamera: rearCamera?.label,
        isFirstCameraFront,
        smartFallback: smartFallback?.label,
        fallbackRearCamera: fallbackRearCamera?.label,
        selectedCamera: preferredCamera?.label,
        deviceIds: videoDevices.map(d => d.deviceId),
        labels: videoDevices.map(d => d.label),
      });

      // Small delay to ensure DOM is ready
      await new Promise(resolve => setTimeout(resolve, 100));

      if (qrReaderRef.current && !scannerRef.current) {
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
  }, [router]);

  // Switch camera function
  const switchCamera = async (camera: MediaDeviceInfo) => {
    if (isScanning || isInitializing) return;

    console.log('Switching to camera:', camera.label);
    setSelectedCamera(camera);
    storeCameraId(camera.deviceId); // Store the new camera preference

    // Clean up current scanner
    cleanupScanner();

    // Wait a bit longer before reinitializing to ensure proper cleanup
    setTimeout(() => {
      initializeScanner();
    }, 1000);
  };

  // Flip camera function - switch to next available camera
  const flipCamera = async () => {
    if (isScanning || isInitializing || availableCameras.length < 2) return;

    const currentIndex = availableCameras.findIndex(
      camera => camera.deviceId === selectedCamera?.deviceId
    );
    const nextIndex = (currentIndex + 1) % availableCameras.length;
    const nextCamera = availableCameras[nextIndex];

    console.log(
      'Flipping camera from',
      selectedCamera?.label,
      'to',
      nextCamera.label
    );

    setSelectedCamera(nextCamera);
    storeCameraId(nextCamera.deviceId); // Store the new camera preference

    // Clean up current scanner
    cleanupScanner();

    // Wait a bit longer before reinitializing to ensure proper cleanup
    setTimeout(() => {
      initializeScanner();
    }, 1000);
  };

  // Initialize scanner when user is authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/judge/signin');
      return;
    }

    if (user && !isScanning && !scannerRef.current && hasPermission === null) {
      // Auto-initialize scanner when user is authenticated
      initializeScanner();
    }

    // Cleanup on unmount
    return () => {
      cleanupScanner();
    };
  }, [user, loading, initializeScanner, router]);

  // Auto-retry initialization if permission is granted but scanner failed
  useEffect(() => {
    if (
      hasPermission === true &&
      !isScanning &&
      !scannerRef.current &&
      !isInitializing
    ) {
      const timer = setTimeout(() => {
        initializeScanner();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [hasPermission, isScanning, isInitializing, initializeScanner]);

  // Cleanup scanner when component unmounts or user changes
  useEffect(() => {
    return () => {
      cleanupScanner();
    };
  }, []);

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
                onClick={initializeScanner}
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
                onClick={initializeScanner}
                className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 transition"
              >
                Restart Scanner
              </button>
            </div>
          )}

          {/* QR Scanner */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div id="qr-reader" ref={qrReaderRef} className="w-full max-w-md">
                {/* Camera preview will be inserted here by Html5QrcodeScanner */}
              </div>

              {/* Camera Flip Button */}
              {availableCameras.length > 1 && (
                <button
                  onClick={flipCamera}
                  disabled={isScanning || isInitializing}
                  className={`absolute top-4 right-4 p-2 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-70 transition ${
                    isScanning || isInitializing
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  }`}
                  title={isInitializing ? 'Switching camera...' : 'Flip Camera'}
                >
                  {isInitializing ? (
                    <svg
                      className="w-5 h-5 animate-spin"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Camera Selection */}
          {availableCameras.length > 1 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2 text-center">
                Camera Selection
              </h3>
              <div className="flex justify-center gap-2">
                {availableCameras.map((camera, index) => (
                  <button
                    key={camera.deviceId}
                    onClick={() => switchCamera(camera)}
                    disabled={isScanning || isInitializing}
                    className={`px-3 py-1 text-xs rounded-md transition ${
                      selectedCamera?.deviceId === camera.deviceId
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    } ${
                      isScanning || isInitializing
                        ? 'opacity-50 cursor-not-allowed'
                        : ''
                    }`}
                  >
                    {camera.label || `Camera ${index + 1}`}
                  </button>
                ))}
              </div>
            </div>
          )}

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
              {availableCameras.length > 1 && selectedCamera && (
                <li className="text-blue-700 font-medium">
                  • Current camera: {selectedCamera.label || 'Camera'}
                  {availableCameras.length > 1 && (
                    <span className="text-blue-600 ml-2">
                      (Tap the flip button to switch)
                    </span>
                  )}
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
