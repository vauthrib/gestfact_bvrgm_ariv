'use client';

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, FileSpreadsheet, FileText, AlertCircle, CheckCircle } from 'lucide-react';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'tiers' | 'articles' | 'factures-clients' | 'factures-fournisseurs' | 'reglements-clients' | 'reglements-fournisseurs' | 'bons-livraison';
  code: string;
  onSuccess: () => void;
}

export function ImportDialog({ open, onOpenChange, type, code, onSuccess }: ImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; count?: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const typeLabels: Record<string, string> = {
    'tiers': 'Tiers',
    'articles': 'Articles',
    'factures-clients': 'Factures Clients',
    'factures-fournisseurs': 'Factures Fournisseurs',
    'reglements-clients': 'Règlements Clients',
    'reglements-fournisseurs': 'Règlements Fournisseurs',
    'bons-livraison': 'Bons de Livraison'
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const ext = selectedFile.name.split('.').pop()?.toLowerCase();
      if (ext === 'csv' || ext === 'xls' || ext === 'xlsx') {
        setFile(selectedFile);
        setResult(null);
      } else {
        alert('Format non supporté. Utilisez .csv, .xls ou .xlsx');
      }
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (res.ok) {
        setResult({ success: true, message: 'Import réussi', count: data.count });
        setTimeout(() => {
          onOpenChange(false);
          onSuccess();
          resetForm();
        }, 1500);
      } else {
        setResult({ success: false, message: data.error || 'Erreur lors de l\'import' });
      }
    } catch (e) {
      setResult({ success: false, message: 'Erreur serveur' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) resetForm();
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Import {typeLabels[type]}</DialogTitle>
            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-mono font-bold">{code}-IMP</span>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xls,.xlsx"
              onChange={handleFileChange}
              className="hidden"
              id="file-import"
            />
            <label htmlFor="file-import" className="cursor-pointer">
              <Upload className="w-10 h-10 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">Cliquez pour sélectionner un fichier</p>
              <p className="text-xs text-gray-400 mt-1">Formats: CSV, XLS, XLSX</p>
            </label>
          </div>

          {file && (
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
              {file.name.endsWith('.csv') ? (
                <FileText className="w-5 h-5 text-blue-600" />
              ) : (
                <FileSpreadsheet className="w-5 h-5 text-green-600" />
              )}
              <span className="text-sm font-medium">{file.name}</span>
            </div>
          )}

          {result && (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
              {result.success ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600" />
              )}
              <span className={`text-sm ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                {result.message} {result.count !== undefined && `(${result.count} enregistrements)`}
              </span>
            </div>
          )}

          <div className="bg-gray-50 p-3 rounded-lg">
            <Label className="text-xs font-medium text-gray-600 mb-2 block">Colonnes requises :</Label>
            <div className="text-xs text-gray-500">
              {type === 'tiers' && 'code, type (CLIENT/FOURNISSEUR), raisonSociale, adresse, ville, telephone, email, ice, rc'}
              {type === 'articles' && 'code, designation, prixUnitaire, unite, tauxTVA, actif (true/false)'}
              {type === 'factures-clients' && 'numero, dateFacture (YYYY-MM-DD), codeClient, dateEcheance'}
              {type === 'factures-fournisseurs' && 'numeroFacture, dateFacture (YYYY-MM-DD), codeFournisseur, montantHT, montantTVA'}
              {type === 'reglements-clients' && 'numero, dateReglement (YYYY-MM-DD), numeroFacture, montant, modePaiement'}
              {type === 'reglements-fournisseurs' && 'dateReglement (YYYY-MM-DD), numeroFacture, montant, modePaiement'}
              {type === 'bons-livraison' && 'numero, dateBL (YYYY-MM-DD), codeClient'}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Annuler</Button>
          <Button
            type="button"
            className="bg-green-600 hover:bg-green-700"
            onClick={handleImport}
            disabled={!file || loading}
          >
            {loading ? 'Import en cours...' : 'Importer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
