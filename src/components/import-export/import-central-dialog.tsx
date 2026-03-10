'use client';

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileSpreadsheet, FileText, AlertCircle, CheckCircle, Users, Package, FileText as FactureIcon, CreditCard, Truck, Lock } from 'lucide-react';

interface ImportCentralDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ImportType = 'tiers' | 'articles' | 'factures-clients' | 'factures-fournisseurs' | 'reglements-clients' | 'reglements-fournisseurs' | 'bons-livraison';

const importOptions: { type: ImportType; label: string; icon: React.ReactNode; color: string }[] = [
  { type: 'tiers', label: 'Tiers (Clients/Fournisseurs)', icon: <Users className="w-5 h-5" />, color: 'blue' },
  { type: 'articles', label: 'Articles', icon: <Package className="w-5 h-5" />, color: 'purple' },
  { type: 'factures-clients', label: 'Factures Clients', icon: <FactureIcon className="w-5 h-5" />, color: 'green' },
  { type: 'factures-fournisseurs', label: 'Factures Fournisseurs', icon: <FactureIcon className="w-5 h-5" />, color: 'orange' },
  { type: 'reglements-clients', label: 'Règlements Clients', icon: <CreditCard className="w-5 h-5" />, color: 'teal' },
  { type: 'reglements-fournisseurs', label: 'Règlements Fournisseurs', icon: <CreditCard className="w-5 h-5" />, color: 'cyan' },
  { type: 'bons-livraison', label: 'Bons de Livraison', icon: <Truck className="w-5 h-5" />, color: 'amber' },
];

const SECRET_CODE = '2222';

export function ImportCentralDialog({ open, onOpenChange }: ImportCentralDialogProps) {
  const [step, setStep] = useState<'code' | 'imports'>('code');
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState(false);
  const [selectedType, setSelectedType] = useState<ImportType | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; count?: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCodeSubmit = () => {
    if (codeInput === SECRET_CODE) {
      setCodeError(false);
      setStep('imports');
    } else {
      setCodeError(true);
      setCodeInput('');
    }
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
    if (!file || !selectedType) return;

    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', selectedType);

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (res.ok) {
        setResult({ success: true, message: 'Import réussi', count: data.count });
        setTimeout(() => {
          resetImportForm();
        }, 2000);
      } else {
        setResult({ success: false, message: data.error || 'Erreur lors de l\'import' });
      }
    } catch (e) {
      setResult({ success: false, message: 'Erreur serveur' });
    } finally {
      setLoading(false);
    }
  };

  const resetImportForm = () => {
    setFile(null);
    setResult(null);
    setSelectedType(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset everything when closing
      setStep('code');
      setCodeInput('');
      setCodeError(false);
      resetImportForm();
    }
    onOpenChange(open);
  };

  const typeLabels: Record<string, string> = {
    'tiers': 'Tiers',
    'articles': 'Articles',
    'factures-clients': 'Factures Clients',
    'factures-fournisseurs': 'Factures Fournisseurs',
    'reglements-clients': 'Règlements Clients',
    'reglements-fournisseurs': 'Règlements Fournisseurs',
    'bons-livraison': 'Bons de Livraison'
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Importation Centralisée
            </DialogTitle>
            <span className="bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-sm font-mono font-bold">PAR01-IMP</span>
          </div>
        </DialogHeader>

        {step === 'code' && (
          <div className="space-y-4">
            <div className="flex flex-col items-center py-6">
              <Lock className="w-12 h-12 text-pink-600 mb-4" />
              <p className="text-center text-muted-foreground mb-4">
                Veuillez entrer le code d'accès pour accéder aux fonctions d'importation
              </p>
              <div className="w-full max-w-xs">
                <Input
                  type="password"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  placeholder="Code d'accès"
                  className={`text-center text-2xl tracking-widest ${codeError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  maxLength={4}
                  onKeyDown={(e) => e.key === 'Enter' && handleCodeSubmit()}
                />
                {codeError && (
                  <p className="text-red-500 text-sm text-center mt-2">Code incorrect</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>Annuler</Button>
              <Button className="bg-pink-600 hover:bg-pink-700" onClick={handleCodeSubmit}>Valider</Button>
            </DialogFooter>
          </div>
        )}

        {step === 'imports' && (
          <div className="space-y-4">
            {!selectedType ? (
              <>
                <p className="text-sm text-muted-foreground mb-2">Sélectionnez le type de données à importer :</p>
                <div className="grid grid-cols-2 gap-2">
                  {importOptions.map((option) => (
                    <Button
                      key={option.type}
                      variant="outline"
                      className="justify-start h-auto py-3"
                      onClick={() => setSelectedType(option.type)}
                    >
                      <span className="mr-2">{option.icon}</span>
                      <span className="text-sm">{option.label}</span>
                    </Button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="sm" onClick={resetImportForm}>
                    ← Retour
                  </Button>
                  <span className="font-medium">{typeLabels[selectedType]}</span>
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".csv,.xls,.xlsx"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-import-central"
                  />
                  <label htmlFor="file-import-central" className="cursor-pointer">
                    <Upload className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">Cliquez pour sélectionner un fichier</p>
                    <p className="text-xs text-gray-400 mt-1">Formats: CSV, XLS, XLSX</p>
                  </label>
                </div>

                {file && (
                  <div className="flex items-center gap-2 p-3 bg-pink-50 rounded-lg">
                    {file.name.endsWith('.csv') ? (
                      <FileText className="w-5 h-5 text-blue-600" />
                    ) : (
                      <FileSpreadsheet className="w-5 h-5 text-pink-600" />
                    )}
                    <span className="text-sm font-medium">{file.name}</span>
                  </div>
                )}

                {result && (
                  <div className={`flex items-center gap-2 p-3 rounded-lg ${result.success ? 'bg-pink-50' : 'bg-red-50'}`}>
                    {result.success ? (
                      <CheckCircle className="w-5 h-5 text-pink-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span className={`text-sm ${result.success ? 'text-pink-700' : 'text-red-700'}`}>
                      {result.message} {result.count !== undefined && `(${result.count} enregistrements)`}
                    </span>
                  </div>
                )}

                <div className="bg-gray-50 p-3 rounded-lg">
                  <Label className="text-xs font-medium text-gray-600 mb-2 block">Colonnes requises :</Label>
                  <div className="text-xs text-gray-500">
                    {selectedType === 'tiers' && 'code, type (CLIENT/FOURNISSEUR), raisonSociale, adresse, ville, telephone, email, ice, rc'}
                    {selectedType === 'articles' && 'code, designation, prixUnitaire, unite, tauxTVA, actif (true/false)'}
                    {selectedType === 'factures-clients' && 'numero, dateFacture (YYYY-MM-DD), codeClient, dateEcheance'}
                    {selectedType === 'factures-fournisseurs' && 'numeroFacture, dateFacture (YYYY-MM-DD), codeFournisseur, montantHT, montantTVA'}
                    {selectedType === 'reglements-clients' && 'numero, dateReglement (YYYY-MM-DD), numeroFacture, montant, modePaiement'}
                    {selectedType === 'reglements-fournisseurs' && 'dateReglement (YYYY-MM-DD), numeroFacture, montant, modePaiement'}
                    {selectedType === 'bons-livraison' && 'numero, dateBL (YYYY-MM-DD), codeClient'}
                  </div>
                </div>
              </>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>Fermer</Button>
              {selectedType && file && (
                <Button
                  className="bg-pink-600 hover:bg-pink-700"
                  onClick={handleImport}
                  disabled={!file || loading}
                >
                  {loading ? 'Import en cours...' : 'Importer'}
                </Button>
              )}
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
