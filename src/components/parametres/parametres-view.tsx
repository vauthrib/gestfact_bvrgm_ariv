'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Trash2, AlertTriangle, Layout, Printer, Database } from 'lucide-react';
import { ImportCentralDialog } from '@/components/import-export/import-central-dialog';
import { PrintLayoutEditor } from '@/components/print/print-layout-editor';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface LayoutElement {
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
}

interface PrintLayout {
  docInfo: LayoutElement;
  clientInfo: LayoutElement;
  tableStart: LayoutElement;
  totals: LayoutElement;
  footer: LayoutElement;
  margins: { top: number; right: number; bottom: number; left: number };
}

interface Parametres {
  id: string; nomEntreprise: string; adresseEntreprise: string | null;
  villeEntreprise: string | null; telephoneEntreprise: string | null;
  emailEntreprise: string | null; ice: string | null; rc: string | null;
  rcLieu: string | null; if: string | null; tp: string | null;
  cnss: string | null; infoLibre: string | null; tvaDefaut: number;
  prefixeFacture: string | null; numeroFactureDepart: number | null;
  prefixeBL: string | null; numeroBLDepart: number | null;
  prefixeAvoir: string | null; numeroAvoirDepart: number | null;
  letterheadImage: string | null; printLayout: string | null;
}

const DEFAULT_LAYOUT: PrintLayout = {
  docInfo: { x: 120, y: 10, width: 80, height: 30, visible: true },
  clientInfo: { x: 10, y: 60, width: 90, height: 40, visible: true },
  tableStart: { x: 10, y: 110, width: 190, height: 100, visible: true },
  totals: { x: 130, y: 220, width: 70, height: 40, visible: true },
  footer: { x: 10, y: 270, width: 190, height: 20, visible: true },
  margins: { top: 10, right: 10, bottom: 10, left: 10 }
};

export function ParametresView() {
  const [parametres, setParametres] = useState<Parametres | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [clearDataOpen, setClearDataOpen] = useState(false);
  const [clearCode, setClearCode] = useState('');
  const [clearError, setClearError] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [layoutEditorOpen, setLayoutEditorOpen] = useState(false);
  const [migratingAvoirs, setMigratingAvoirs] = useState(false);
  const [migrationMessage, setMigrationMessage] = useState('');

  useEffect(() => { fetchParametres(); }, []);

  const fetchParametres = async () => {
    try {
      const res = await fetch('/api/parametres');
      const data = await res.json();
      setParametres(data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/parametres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parametres)
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (e) { console.error(e); }
  };

  const handleClearData = async () => {
    if (clearCode !== '2222') {
      setClearError(true);
      return;
    }
    
    setClearing(true);
    try {
      const res = await fetch('/api/clear-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: clearCode })
      });
      
      if (res.ok) {
        setClearDataOpen(false);
        setClearCode('');
        alert('Toutes les données ont été supprimées avec succès!');
      } else {
        const data = await res.json();
        alert('Erreur: ' + data.error);
      }
    } catch (e) { 
      console.error(e); 
      alert('Erreur lors de la suppression des données');
    } finally {
      setClearing(false);
    }
  };

  const handleSaveLayout = async (letterheadImage: string | null, layout: PrintLayout) => {
    try {
      const res = await fetch('/api/parametres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...parametres,
          letterheadImage,
          printLayout: JSON.stringify(layout)
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        setParametres(data);
        setLayoutEditorOpen(false);
        alert('Mise en page enregistrée avec succès!');
      }
    } catch (e) {
      console.error(e);
      alert('Erreur lors de l\'enregistrement de la mise en page');
    }
  };

  const getParsedLayout = (): PrintLayout | null => {
    if (!parametres?.printLayout) return null;
    try {
      return JSON.parse(parametres.printLayout);
    } catch {
      return null;
    }
  };

  const handleMigrateAvoirs = async () => {
    if (!confirm('Créer les tables pour les avoirs clients ?')) return;
    setMigratingAvoirs(true);
    setMigrationMessage('');
    try {
      const res = await fetch('/api/migrations/create-avoirs-tables', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setMigrationMessage('Tables créées avec succès!');
      } else {
        setMigrationMessage('Erreur: ' + data.error);
      }
    } catch (e: any) {
      setMigrationMessage('Erreur: ' + e.message);
    } finally {
      setMigratingAvoirs(false);
    }
  };

  if (loading) return <div className="p-8">Chargement...</div>;

  return (
    <div className="p-6 space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-green-700">Paramètres</h1>
          <p className="text-muted-foreground">Configuration de l'application</p>
        </div>
        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-mono font-bold">PAR01</span>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Informations Entreprise</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Nom de l'entreprise</Label><Input value={parametres?.nomEntreprise || ''} onChange={(e) => setParametres(p => p ? { ...p, nomEntreprise: e.target.value } : null)} /></div>
              <div><Label>Téléphone</Label><Input value={parametres?.telephoneEntreprise || ''} onChange={(e) => setParametres(p => p ? { ...p, telephoneEntreprise: e.target.value } : null)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Adresse</Label><Input value={parametres?.adresseEntreprise || ''} onChange={(e) => setParametres(p => p ? { ...p, adresseEntreprise: e.target.value } : null)} /></div>
              <div><Label>Ville</Label><Input value={parametres?.villeEntreprise || ''} onChange={(e) => setParametres(p => p ? { ...p, villeEntreprise: e.target.value } : null)} /></div>
            </div>
            <div><Label>Email</Label><Input value={parametres?.emailEntreprise || ''} onChange={(e) => setParametres(p => p ? { ...p, emailEntreprise: e.target.value } : null)} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Informations Fiscales</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div><Label>ICE</Label><Input value={parametres?.ice || ''} onChange={(e) => setParametres(p => p ? { ...p, ice: e.target.value } : null)} /></div>
              <div><Label>RC</Label><Input value={parametres?.rc || ''} onChange={(e) => setParametres(p => p ? { ...p, rc: e.target.value } : null)} /></div>
              <div><Label>RC Lieu</Label><Input value={parametres?.rcLieu || ''} onChange={(e) => setParametres(p => p ? { ...p, rcLieu: e.target.value } : null)} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>IF</Label><Input value={parametres?.if || ''} onChange={(e) => setParametres(p => p ? { ...p, if: e.target.value } : null)} /></div>
              <div><Label>TP</Label><Input value={parametres?.tp || ''} onChange={(e) => setParametres(p => p ? { ...p, tp: e.target.value } : null)} /></div>
              <div><Label>CNSS</Label><Input value={parametres?.cnss || ''} onChange={(e) => setParametres(p => p ? { ...p, cnss: e.target.value } : null)} /></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Numérotation</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-6 gap-4">
              <div><Label>Préfixe Facture</Label><Input value={parametres?.prefixeFacture || ''} onChange={(e) => setParametres(p => p ? { ...p, prefixeFacture: e.target.value } : null)} /></div>
              <div><Label>N° Départ Facture</Label><Input type="number" value={parametres?.numeroFactureDepart || ''} onChange={(e) => setParametres(p => p ? { ...p, numeroFactureDepart: parseInt(e.target.value) } : null)} /></div>
              <div><Label>Préfixe BL</Label><Input value={parametres?.prefixeBL || ''} onChange={(e) => setParametres(p => p ? { ...p, prefixeBL: e.target.value } : null)} /></div>
              <div><Label>N° Départ BL</Label><Input type="number" value={parametres?.numeroBLDepart || ''} onChange={(e) => setParametres(p => p ? { ...p, numeroBLDepart: parseInt(e.target.value) } : null)} /></div>
              <div><Label>Préfixe Avoir</Label><Input value={parametres?.prefixeAvoir || ''} onChange={(e) => setParametres(p => p ? { ...p, prefixeAvoir: e.target.value } : null)} /></div>
              <div><Label>N° Départ Avoir</Label><Input type="number" value={parametres?.numeroAvoirDepart || ''} onChange={(e) => setParametres(p => p ? { ...p, numeroAvoirDepart: parseInt(e.target.value) } : null)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>TVA par défaut (%)</Label><Input type="number" value={parametres?.tvaDefaut || ''} onChange={(e) => setParametres(p => p ? { ...p, tvaDefaut: parseFloat(e.target.value) } : null)} /></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Informations Libres</CardTitle></CardHeader>
          <CardContent>
            <Label>Info libre</Label>
            <Textarea value={parametres?.infoLibre || ''} onChange={(e) => setParametres(p => p ? { ...p, infoLibre: e.target.value } : null)} />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 flex-wrap">
          {saved && <span className="text-green-600 self-center">Paramètres enregistrés!</span>}
          {migrationMessage && <span className={migrationMessage.includes('Erreur') ? 'text-red-600' : 'text-green-600'} self-center>{migrationMessage}</span>}
          <Button type="button" variant="outline" onClick={handleMigrateAvoirs} disabled={migratingAvoirs} className="border-blue-300 text-blue-700 hover:bg-blue-50">
            <Database className="w-4 h-4 mr-2" />
            {migratingAvoirs ? 'Migration...' : 'Créer tables Avoirs'}
          </Button>
          <Button type="button" variant="outline" onClick={() => setLayoutEditorOpen(true)} className="border-green-300 text-green-700 hover:bg-green-50">
            <Printer className="w-4 h-4 mr-2" />
            Mise en page impression
          </Button>
          <Button type="button" variant="destructive" onClick={() => { setClearCode(''); setClearError(false); setClearDataOpen(true); }}>
            <Trash2 className="w-4 h-4 mr-2" />
            Vider les données
          </Button>
          <Button type="button" variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Imports
          </Button>
          <Button type="submit" className="bg-green-600 hover:bg-green-700">Enregistrer</Button>
        </div>
      </form>
      <ImportCentralDialog open={importOpen} onOpenChange={setImportOpen} />

      {/* Dialog pour vider les données */}
      <Dialog open={clearDataOpen} onOpenChange={setClearDataOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Vider toutes les données
            </DialogTitle>
            <DialogDescription className="pt-4">
              Cette action va supprimer définitivement toutes les données de l'application :
              <ul className="list-disc list-inside mt-2 text-sm">
                <li>Tous les tiers (clients et fournisseurs)</li>
                <li>Tous les articles</li>
                <li>Toutes les factures clients et fournisseurs</li>
                <li>Tous les bons de livraison</li>
                <li>Tous les règlements</li>
              </ul>
              <p className="mt-4 font-semibold text-red-600">
                Cette action est irréversible!
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Entrez le code de confirmation (code import)</Label>
            <Input
              type="password"
              value={clearCode}
              onChange={(e) => { setClearCode(e.target.value); setClearError(false); }}
              placeholder="Code à 4 chiffres"
              className={`mt-2 ${clearError ? 'border-red-500' : ''}`}
              maxLength={4}
            />
            {clearError && <p className="text-red-500 text-sm mt-1">Code incorrect</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearDataOpen(false)}>Annuler</Button>
            <Button 
              variant="destructive" 
              onClick={handleClearData}
              disabled={clearing || clearCode.length !== 4}
            >
              {clearing ? 'Suppression...' : 'Confirmer la suppression'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Layout Editor */}
      <PrintLayoutEditor
        open={layoutEditorOpen}
        onOpenChange={setLayoutEditorOpen}
        entreprise={parametres}
        letterheadImage={parametres?.letterheadImage || null}
        printLayout={getParsedLayout()}
        onSave={handleSaveLayout}
      />
    </div>
  );
}
