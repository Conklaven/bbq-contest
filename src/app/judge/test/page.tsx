'use client';
import { useState } from 'react';
import QRCode from 'qrcode';
import Image from 'next/image';

export default function TestQRCode() {
  const [itemCode, setItemCode] = useState('TEST001');
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  const generateQRCode = async () => {
    try {
      const baseUrl =
        typeof window !== 'undefined'
          ? window.location.origin
          : 'https://www.asbeekosherbbqcontest.com';
      const qrUrl = `${baseUrl}/judge/${itemCode}`;
      const url = await QRCode.toDataURL(qrUrl);
      setQrCodeUrl(url);
    } catch (err) {
      console.error('Error generating QR code:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">
          QR Code Test Page
        </h1>

        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Item Code
            </label>
            <input
              type="text"
              value={itemCode}
              onChange={e => setItemCode(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter item code"
            />
          </div>

          <button
            onClick={generateQRCode}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition mb-6"
          >
            Generate QR Code
          </button>

          {qrCodeUrl && (
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-4">Generated QR Code</h2>
              <div className="inline-block p-4 bg-white border rounded-lg">
                <Image
                  src={qrCodeUrl}
                  alt="QR Code"
                  width={256}
                  height={256}
                  className="w-64 h-64"
                />
              </div>
              <p className="mt-4 text-sm text-gray-600">
                Scan this QR code with the judge scanner to test the
                functionality
              </p>
              <p className="text-gray-600 mb-4">
                This is a test QR code that should redirect to item code
                &quot;TEST001&quot;.
              </p>
              <p className="text-gray-600 mb-4">
                If you&apos;re having trouble scanning, try moving your camera
                closer or adjusting the lighting.
              </p>
            </div>
          )}

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">
              Test Instructions:
            </h3>
            <ol className="text-blue-800 text-sm space-y-1">
              <li>
                1. Enter an item code above (e.g., &quot;TEST001&quot;,
                &quot;BRISKET001&quot;)
              </li>
              <li>2. Click &quot;Generate QR Code&quot;</li>
              <li>3. Open the judge scanner on your phone</li>
              <li>4. Scan the generated QR code</li>
              <li>5. You should be redirected to the scoring form</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
