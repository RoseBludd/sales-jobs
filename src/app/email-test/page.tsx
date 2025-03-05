'use client';

import React, { useState, useEffect } from 'react';

export default function EmailTestPage() {
  const [testResult, setTestResult] = useState<string>('Testing...');
  const [emailResult, setEmailResult] = useState<string>('Loading...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const runTests = async () => {
      try {
        // Test the test API route
        try {
          const testResponse = await fetch('/api/test');
          if (!testResponse.ok) {
            setTestResult(`Test API failed: ${testResponse.statusText}`);
          } else {
            const testData = await testResponse.json();
            setTestResult(`Test API success: ${JSON.stringify(testData)}`);
          }
        } catch (testError: any) {
          setTestResult(`Test API error: ${testError.message}`);
        }
        
        // Test the email API route
        try {
          const emailResponse = await fetch('/api/email?folder=inbox');
          if (!emailResponse.ok) {
            setEmailResult(`Email API failed: ${emailResponse.statusText}`);
          } else {
            const emailData = await emailResponse.json();
            setEmailResult(`Email API success: ${JSON.stringify(emailData).substring(0, 200)}...`);
          }
        } catch (emailError: any) {
          setEmailResult(`Email API error: ${emailError.message}`);
        }
      } catch (err: any) {
        setError(`General error: ${err.message}`);
      }
    };
    
    runTests();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">API Test Page</h1>
      
      <div className="mb-6 p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Test API Result:</h2>
        <pre className="bg-gray-100 p-3 rounded overflow-auto">{testResult}</pre>
      </div>
      
      <div className="mb-6 p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Email API Result:</h2>
        <pre className="bg-gray-100 p-3 rounded overflow-auto">{emailResult}</pre>
      </div>
      
      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Error:</h2>
          <p>{error}</p>
        </div>
      )}
      
      <div className="mt-6">
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Reload Tests
        </button>
      </div>
    </div>
  );
} 