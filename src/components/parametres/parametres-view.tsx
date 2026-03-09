'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Parametres {
  id: string; nomEntreprise: string; adresseEntreprise: string | null;
  villeEntreprise: string | null; telephoneEntreprise: string | null;
  emailEntreprise: string | null; ice: string | null; rc: string | null;
  rcLieu: string | null; if: string | null; tp: string | null;
  cnss: string | null; infoLibre: string | null; tvaDefaut: number;
  prefixeFacture: string | null; numeroFactureDepart: number | null;
  prefixeBL: string | null; numeroBLDepart: number | null;
}

export function ParametresView() {
  const [parametres, setParametres] = useState<Parametres | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

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

  if (loading) return <div className="p-8">Chargement...</div>;

  return (
    <div className="p-6 space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-pink-700">Paramètres</h1>
          <p className="text-muted-foreground">Configuration de l'application</p>
        </div>
        <span className="bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-sm font-mono font-bold">PAR01</span>
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
            <div className="grid grid-cols-4 gap-4">
              <div><Label>Préfixe Facture</Label><Input value={parametres?.prefixeFacture || ''} onChange={(e) => setParametres(p => p ? { ...p, prefixeFacture: e.target.value } : null)} /></div>
              <div><Label>N° Départ Facture</Label><Input type="number" value={parametres?.numeroFactureDepart || ''} onChange={(e) => setParametres(p => p ? { ...p, numeroFactureDepart: parseInt(e.target.value) } : null)} /></div>
              <div><Label>Préfixe BL</Label><Input value={parametres?.prefixeBL || ''} onChange={(e) => setParametres(p => p ? { ...p, prefixeBL: e.target.value } : null)} /></div>
              <div><Label>N° Départ BL</Label><Input type="number" value={parametres?.numeroBLDepart || ''} onChange={(e) => setParametres(p => p ? { ...p, numeroBLDepart: parseInt(e.target.value) } : null)} /></div>
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

        <div className="flex justify-end gap-4">
          {saved && <span className="text-pink-600 self-center">Paramètres enregistrés!</span>}
          <Button type="submit" className="bg-pink-600 hover:bg-pink-700">Enregistrer</Button>
        </div>
      </form>
    </div>
  );
}
