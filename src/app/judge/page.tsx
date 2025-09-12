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
  const [isHttps, setIsHttps] = useState<boolean>(false);
  const [showPermissionHelp, setShowPermissionHelp] = useState<boolean>(false);
  const [permissionRequested, setPermissionRequested] =
    useState<boolean>(false);
  const [showManualInput, setShowManualInput] = useState<boolean>(false);
  const [manualItemCode, setManualItemCode] = useState<string>('');

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

  // Handle manual item code submission
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualItemCode.trim()) {
      router.push(`/judge/${manualItemCode.trim()}`);
    }
  };

  // Check HTTPS requirement
  const checkHttps = useCallback(() => {
    if (typeof window !== 'undefined') {
      const isSecure =
        window.location.protocol === 'https:' ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';
      setIsHttps(isSecure);
      return isSecure;
    }
    return false;
  }, []);

  // Request camera permission explicitly
  const requestCameraPermission = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Camera access not supported on this device');
    }

    try {
      // Try to get a media stream to trigger permission request
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Prefer rear camera
      });

      // Stop the stream immediately as we just wanted to request permission
      stream.getTracks().forEach(track => track.stop());

      setPermissionRequested(true);
      return true;
    } catch (err: unknown) {
      console.error('Permission request failed:', err);

      if (err instanceof Error && err.name === 'NotAllowedError') {
        setHasPermission(false);
        setShowPermissionHelp(true);
        throw new Error(
          'Camera permission denied. Please allow camera access in your browser settings.'
        );
      } else if (err instanceof Error && err.name === 'NotFoundError') {
        throw new Error('No camera found on this device.');
      } else if (err instanceof Error && err.name === 'NotSupportedError') {
        throw new Error(
          'Camera access not supported on this device or browser.'
        );
      } else {
        throw new Error(
          `Camera access failed: ${err instanceof Error ? err.message : 'Unknown error'}`
        );
      }
    }
  }, []);

  // Initialize scanner
  const initializeScanner = useCallback(async () => {
    if (isInitializing || isScanning || scannerRef.current) {
      return;
    }

    setIsInitializing(true);
    setError('');

    // Check HTTPS requirement first
    if (!checkHttps()) {
      setError(
        'Camera access requires HTTPS. Please use a secure connection (https://) to access the camera.'
      );
      setIsInitializing(false);
      return;
    }

    try {
      // Request permission first if not already requested
      if (!permissionRequested) {
        await requestCameraPermission();
      }
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
    } catch (err: unknown) {
      console.error('Error initializing scanner:', err);
      setHasPermission(false);

      if (err instanceof Error && err.message.includes('HTTPS')) {
        setError(err.message);
      } else if (
        err instanceof Error &&
        (err.name === 'NotAllowedError' || err.message.includes('permission'))
      ) {
        setError(
          'Camera permission denied. Please allow camera access in your browser settings and try again.'
        );
        setShowPermissionHelp(true);
      } else {
        setError(
          `Camera initialization failed: ${err instanceof Error ? err.message : 'Unknown error'}`
        );
      }
    } finally {
      setIsInitializing(false);
    }
  }, [
    router,
    checkHttps,
    requestCameraPermission,
    permissionRequested,
    isInitializing,
    isScanning,
  ]);

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

  // Check HTTPS on component mount
  useEffect(() => {
    checkHttps();
  }, [checkHttps]);

  // Initialize scanner when user is authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/judge/signin');
      return;
    }

    if (
      user &&
      !isScanning &&
      !scannerRef.current &&
      hasPermission === null &&
      isHttps
    ) {
      // Auto-initialize scanner when user is authenticated and HTTPS is available
      initializeScanner();
    }

    // Cleanup on unmount
    return () => {
      cleanupScanner();
    };
  }, [
    user,
    loading,
    initializeScanner,
    router,
    isHttps,
    hasPermission,
    isScanning,
  ]);

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

          {/* HTTPS Warning */}
          {!isHttps && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-yellow-900 mb-2">
                Secure Connection Required
              </h3>
              <p className="text-yellow-800 text-sm mb-4">
                Camera access requires a secure connection (HTTPS). Please
                access this site using https:// instead of http://
              </p>
              <p className="text-yellow-700 text-xs">
                If you&apos;re on a local development server, this is expected.
                For production, ensure your site uses HTTPS.
              </p>
            </div>
          )}

          {/* Camera Permission Error */}
          {hasPermission === false && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-red-900 mb-2">
                Camera Access Required
              </h3>
              <p className="text-red-800 text-sm mb-4">{error}</p>

              {/* Android-specific help */}
              <div className="bg-red-100 border border-red-300 rounded p-3 mb-4">
                <h4 className="font-medium text-red-900 mb-2">
                  Android Users:
                </h4>
                <ol className="text-red-800 text-sm space-y-1">
                  <li>
                    1. Look for the camera permission popup and tap
                    &quot;Allow&quot;
                  </li>
                  <li>2. If you previously denied permission:</li>
                  <li className="ml-4">
                    • Tap the lock icon in your browser&apos;s address bar
                  </li>
                  <li className="ml-4">
                    • Select &quot;Camera&quot; and change to &quot;Allow&quot;
                  </li>
                  <li>
                    3. Or go to Settings → Apps → [Your Browser] → Permissions →
                    Camera → Allow
                  </li>
                </ol>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={initializeScanner}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition"
                >
                  Try Again
                </button>
                <button
                  onClick={() => setShowPermissionHelp(!showPermissionHelp)}
                  className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition"
                >
                  {showPermissionHelp ? 'Hide' : 'Show'} Detailed Instructions
                </button>
                <button
                  onClick={() => setShowManualInput(!showManualInput)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
                >
                  {showManualInput ? 'Hide' : 'Use'} Manual Entry
                </button>
              </div>

              {/* Detailed permission help */}
              {showPermissionHelp && (
                <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded">
                  <h4 className="font-medium text-red-900 mb-2">
                    Detailed Instructions:
                  </h4>
                  <div className="text-red-800 text-sm space-y-2">
                    <div>
                      <strong>Chrome on Android:</strong>
                      <ul className="ml-4 mt-1 space-y-1">
                        <li>• Tap the lock icon in the address bar</li>
                        <li>• Find &quot;Camera&quot; and tap it</li>
                        <li>• Select &quot;Allow&quot; from the dropdown</li>
                        <li>• Refresh the page</li>
                      </ul>
                    </div>
                    <div>
                      <strong>Samsung Internet:</strong>
                      <ul className="ml-4 mt-1 space-y-1">
                        <li>• Tap the menu (three dots) → Settings</li>
                        <li>• Go to Privacy and security → Site permissions</li>
                        <li>• Find this site and enable camera access</li>
                      </ul>
                    </div>
                    <div>
                      <strong>Firefox on Android:</strong>
                      <ul className="ml-4 mt-1 space-y-1">
                        <li>• Tap the shield icon in the address bar</li>
                        <li>• Go to Permissions</li>
                        <li>• Enable camera access for this site</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
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

          {/* Scanner Controls */}
          {isScanning && (
            <div className="text-center mb-6">
              <button
                onClick={() => setShowManualInput(!showManualInput)}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition"
              >
                {showManualInput ? 'Hide' : 'Use'} Manual Entry Instead
              </button>
            </div>
          )}

          {/* Manual Permission Request */}
          {hasPermission === null && !isInitializing && isHttps && (
            <div className="text-center mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">
                  Camera Access Required
                </h3>
                <p className="text-blue-800 text-sm mb-4">
                  Click the button below to request camera access for scanning
                  QR codes.
                </p>
                <button
                  onClick={initializeScanner}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition"
                >
                  Enable Camera Access
                </button>
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

          {/* Manual Input Fallback */}
          {showManualInput && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">
                Manual Item Code Entry
              </h3>
              <p className="text-gray-700 text-sm mb-4">
                If camera scanning is not working, you can manually enter the
                item code below.
              </p>
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="manual-code"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Item Code
                  </label>
                  <input
                    id="manual-code"
                    type="text"
                    value={manualItemCode}
                    onChange={e =>
                      setManualItemCode(e.target.value.toUpperCase())
                    }
                    placeholder="Enter item code (e.g., BRISKET001)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoComplete="off"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={!manualItemCode.trim()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    Score Item
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowManualInput(false)}
                    className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
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
              {availableCameras.length > 1 && (
                <li className="text-blue-700 font-medium">
                  • Tap the flip camera button to switch between front and back
                  cameras
                </li>
              )}
              {(hasPermission === false || !isHttps) && (
                <li className="text-blue-700 font-medium">
                  • If camera scanning doesn&apos;t work, use the manual entry
                  option above
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
