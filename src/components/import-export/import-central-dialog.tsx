'use client';

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileSpreadsheet, FileText, AlertCircle, CheckCircle, Users, Package, FileText as FactureIcon, CreditCard, Truck, Lock, Download, Database, Trash2, AlertTriangle } from 'lucide-react';

interface ImportCentralDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ClearDataState {
  showDialog: boolean;
  code: string;
  error: boolean;
  clearing: boolean;
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
  
  // Import All state
  const [importAllFile, setImportAllFile] = useState<File | null>(null);
  const [importAllLoading, setImportAllLoading] = useState(false);
  const [importAllResult, setImportAllResult] = useState<{ success: boolean; message: string; results?: any[] } | null>(null);
  const importAllInputRef = useRef<HTMLInputElement>(null);
  
  // Clear data state
  const [clearData, setClearData] = useState<ClearDataState>({ showDialog: false, code: '', error: false, clearing: false });

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

  // Export All handler
  const handleExportAll = () => {
    window.open('/api/export-all', '_blank');
  };

  // Import All handlers
  const handleImportAllFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const ext = selectedFile.name.split('.').pop()?.toLowerCase();
      if (ext === 'csv') {
        setImportAllFile(selectedFile);
        setImportAllResult(null);
      } else {
        alert('Format non supporté. Utilisez un fichier .csv exporté avec "Export All"');
      }
    }
  };

  const handleImportAll = async () => {
    if (!importAllFile) return;

    setImportAllLoading(true);
    setImportAllResult(null);

    const formData = new FormData();
    formData.append('file', importAllFile);

    try {
      const res = await fetch('/api/import-all', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (res.ok) {
        const totalCount = data.results?.reduce((sum: number, r: any) => sum + r.count, 0) || 0;
        setImportAllResult({ 
          success: true, 
          message: `Import réussi: ${totalCount} enregistrements`, 
          results: data.results 
        });
        setTimeout(() => {
          setImportAllFile(null);
          setImportAllResult(null);
          if (importAllInputRef.current) importAllInputRef.current.value = '';
        }, 3000);
      } else {
        setImportAllResult({ success: false, message: data.error || 'Erreur lors de l\'import' });
      }
    } catch (e) {
      setImportAllResult({ success: false, message: 'Erreur serveur' });
    } finally {
      setImportAllLoading(false);
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
      setImportAllFile(null);
      setImportAllResult(null);
    }
    onOpenChange(open);
  };

  const handleClearData = async () => {
    if (clearData.code !== '2222') {
      setClearData(prev => ({ ...prev, error: true }));
      return;
    }
    
    setClearData(prev => ({ ...prev, clearing: true }));
    try {
      const res = await fetch('/api/clear-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: clearData.code })
      });
      
      if (res.ok) {
        setClearData({ showDialog: false, code: '', error: false, clearing: false });
        alert('Toutes les données ont été supprimées avec succès!');
      } else {
        const data = await res.json();
        alert('Erreur: ' + data.error);
      }
    } catch (e) { 
      console.error(e); 
      alert('Erreur lors de la suppression des données');
    } finally {
      setClearData(prev => ({ ...prev, clearing: false }));
    }
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
            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-mono font-bold">PAR01-IMP</span>
          </div>
        </DialogHeader>

        {step === 'code' && (
          <div className="space-y-4">
            <div className="flex flex-col items-center py-6">
              <Lock className="w-12 h-12 text-green-600 mb-4" />
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
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleCodeSubmit}>Valider</Button>
            </DialogFooter>
          </div>
        )}

        {step === 'imports' && (
          <div className="space-y-4">
            {/* EXPORT ALL / IMPORT ALL Buttons */}
            <div className="border-b pb-4 mb-4">
              <Label className="text-base font-semibold text-blue-700 mb-3 block">Actions globales</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  className="bg-blue-600 hover:bg-blue-700 h-auto py-3 flex-col"
                  onClick={handleExportAll}
                >
                  <Download className="w-5 h-5 mb-1" />
                  <span className="text-sm font-semibold">EXPORT ALL</span>
                  <span className="text-xs opacity-80">Toutes les données</span>
                </Button>
                
                <div className="space-y-2">
                  <input
                    ref={importAllInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleImportAllFileChange}
                    className="hidden"
                    id="file-import-all"
                  />
                  {!importAllFile ? (
                    <label htmlFor="file-import-all" className="cursor-pointer">
                      <Button
                        variant="outline"
                        className="w-full border-blue-300 text-blue-700 hover:bg-blue-50 h-auto py-3 flex-col"
                        asChild
                      >
                        <span>
                          <Database className="w-5 h-5 mb-1" />
                          <span className="text-sm font-semibold">IMPORT ALL</span>
                          <span className="text-xs opacity-80">Restaurer les données</span>
                        </span>
                      </Button>
                    </label>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 p-2 bg-green-50 rounded text-sm">
                        <FileText className="w-4 h-4 text-green-600" />
                        <span className="truncate flex-1">{importAllFile.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setImportAllFile(null); setImportAllResult(null); }}
                          className="h-6 w-6 p-0"
                        >
                          ×
                        </Button>
                      </div>
                      <Button
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        onClick={handleImportAll}
                        disabled={importAllLoading}
                      >
                        {importAllLoading ? 'Import en cours...' : 'Importer tout'}
                      </Button>
                    </div>
                  )}
                  {importAllResult && (
                    <div className={`flex items-center gap-2 p-2 rounded text-sm ${importAllResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {importAllResult.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      {importAllResult.message}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Vider les données - RED BUTTON */}
              <div className="mt-4 pt-4 border-t border-red-200">
                <Button
                  variant="destructive"
                  className="w-full bg-red-600 hover:bg-red-700 h-auto py-3"
                  onClick={() => setClearData(prev => ({ ...prev, showDialog: true }))}
                >
                  <Trash2 className="w-5 h-5 mr-2" />
                  <span className="font-semibold">VIDER LES DONNÉES</span>
                </Button>
                <p className="text-xs text-red-600 text-center mt-1">⚠️ Action irréversible</p>
              </div>
            </div>

            {/* Individual imports */}
            {!selectedType ? (
              <>
                <Label className="text-base font-semibold text-muted-foreground">Import individuel</Label>
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
                  className="bg-blue-600 hover:bg-blue-700"
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
      
      {/* Dialog confirmation pour vider les données */}
      <Dialog open={clearData.showDialog} onOpenChange={(open) => setClearData(prev => ({ ...prev, showDialog: open, code: '', error: false }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Vider toutes les données
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-red-50 p-3 rounded-lg text-sm">
              <p className="font-semibold text-red-700 mb-2">Cette action va supprimer définitivement :</p>
              <ul className="list-disc list-inside text-red-600 space-y-1">
                <li>Tous les tiers (clients/fournisseurs)</li>
                <li>Tous les articles</li>
                <li>Toutes les factures et avoirs</li>
                <li>Tous les bons de livraison</li>
                <li>Tous les règlements</li>
              </ul>
            </div>
            <div>
              <Label>Entrez le code de confirmation</Label>
              <Input
                type="password"
                value={clearData.code}
                onChange={(e) => setClearData(prev => ({ ...prev, code: e.target.value, error: false }))}
                placeholder="Code à 4 chiffres"
                className={`mt-2 ${clearData.error ? 'border-red-500' : ''}`}
                maxLength={4}
              />
              {clearData.error && <p className="text-red-500 text-sm mt-1">Code incorrect</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearData(prev => ({ ...prev, showDialog: false, code: '', error: false }))}>Annuler</Button>
            <Button
              variant="destructive"
              onClick={handleClearData}
              disabled={clearData.clearing || clearData.code.length !== 4}
            >
              {clearData.clearing ? 'Suppression...' : 'Confirmer la suppression'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
