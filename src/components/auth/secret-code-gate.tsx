'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SecretCodeGateProps {
  children: React.ReactNode;
}

export function SecretCodeGate({ children }: SecretCodeGateProps) {
  const [code, setCode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code === '1111') {
      setIsAuthenticated(true);
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  if (isAuthenticated) return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-sky-100">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-blue-800">GestFact</h1>
          <p className="text-sm text-muted-foreground">V1.44</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            placeholder="Code d'accès"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className={`text-center text-xl ${error ? 'border-red-500 animate-shake' : ''}`}
            autoFocus
          />
          <Button type="submit" className="w-full bg-blue-500 hover:bg-blue-600">
            Entrer
          </Button>
        </form>
        {error && (
          <p className="text-red-500 text-center mt-2 text-sm">Code incorrect</p>
        )}
      </div>
    </div>
  );
}
