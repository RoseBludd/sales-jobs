'use client';

import Header from '@/components/Header';
import Script from 'next/script';
export default function FilloutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header showSignOut={true} />
      <main className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">New Project Form</h1>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <iframe
              src="https://restoremasters.fillout.com/NewProject"
              style={{ width: '100%', height: '600px', border: 'none' }}
              allowFullScreen
            />
          </div>
        </div>
      </main>
      <Script
        src="https://server.fillout.com/embed/v1/"
        strategy="afterInteractive"
        id="fillout-script"
        onLoad={() => {
          if (window.Fillout) {
            window.Fillout.initializeAll();
          }
        }}
      />
    </div>
  );
}

declare global {
  interface Window {
    Fillout?: {
      initializeAll: () => void;
    };
  }
}