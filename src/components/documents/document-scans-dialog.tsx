'use client';

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Upload, Trash2, ExternalLink, Loader2, Paperclip, CheckCircle } from 'lucide-react';
import { PermissionGate } from '@/components/auth/permission-gate';

export interface DocumentScan {
  id: string;
  typeDoc: string;
  numeroDoc: string;
  nature: string;
  nomFichier: string;
  storagePath: string;
  mimeType: string;
  taille: number;
  notes?: string | null;
  createdAt: string;
}

export function DocumentScansDialog({
  open,
  onOpenChange,
  typeDoc,
  numeroDoc,
  accent = 'green',
  onScanCountChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  typeDoc: 'FACTURE_CLIENT' | 'BON_LIVRAISON' | 'AVOIR_CLIENT' | 'FACTURE_FOURNISSEUR' | 'BON_COMMANDE';
  numeroDoc: string;
  accent?: 'green' | 'pink' | 'blue';
  onScanCountChange?: (count: number) => void;
}) {
  const [scans, setScans] = useState<DocumentScan[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [nature, setNature] = useState('AR_CLIENT');
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const colors = {
    green: { text: 'text-green-700', bg: 'bg-green-600 hover:bg-green-700', badge: 'bg-green-100 text-green-800' },
    pink: { text: 'text-pink-700', bg: 'bg-pink-600 hover:bg-pink-700', badge: 'bg-pink-100 text-pink-800' },
    blue: { text: 'text-blue-700', bg: 'bg-blue-600 hover:bg-blue-700', badge: 'bg-blue-100 text-blue-800' },
  }[accent];

  const fetchScans = async () => {
    if (!numeroDoc) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/document-scans?typeDoc=${encodeURIComponent(typeDoc)}&numeroDoc=${encodeURIComponent(numeroDoc)}`);
      if (res.ok) {
        const data = await res.json();
        setScans(Array.isArray(data) ? data : []);
        if (onScanCountChange && Array.isArray(data)) {
          onScanCountChange(data.length);
        }
      }
    } catch (err) {
      console.error('Erreur chargement scans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && numeroDoc) {
      fetchScans();
      setSelectedFile(null);
      setNotes('');
      setNature('AR_CLIENT');
    }
  }, [open, numeroDoc, typeDoc]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !numeroDoc) return;

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', selectedFile);
      fd.append('typeDoc', typeDoc);
      fd.append('numeroDoc', numeroDoc);
      fd.append('nature', nature);
      if (notes) fd.append('notes', notes);

      const res = await fetch('/api/document-scans', {
        method: 'POST',
        body: fd,
      });

      if (res.ok) {
        setSelectedFile(null);
        setNotes('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        await fetchScans();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Erreur lors du dépôt du scan');
      }
    } catch (err: any) {
      alert('Erreur réseau : ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce document scanné ?')) return;
    try {
      const res = await fetch(`/api/document-scans?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchScans();
      } else {
        alert('Erreur lors de la suppression');
      }
    } catch (err: any) {
      alert('Erreur : ' + err.message);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  const getNatureLabel = (n: string) => {
    switch (n) {
      case 'AR_CLIENT': return 'Accusé / Cachet client';
      case 'ORIGINAL': return 'Original signé';
      case 'BON_COMMANDE': return 'Bon de commande joint';
      default: return 'Autre document';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[calc(100vh-3rem)] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className={`flex items-center gap-2 ${colors.text}`}>
              <Paperclip className="h-5 w-5" />
              Scans & Accusés Réception — {numeroDoc}
            </DialogTitle>
            <span className={`${colors.badge} px-3 py-1 rounded-full text-xs font-mono font-bold`}>
              V3.36
            </span>
          </div>
        </DialogHeader>

        {/* Section Upload */}
        <PermissionGate permission="scans.create">
        <form onSubmit={handleUpload} className="p-4 border rounded-lg bg-gray-50/70 space-y-3">
          <Label className="text-sm font-semibold text-gray-700 block">
            Déposer un scan (PDF, Image JPG/PNG)
          </Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Fichier scanné</Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                required
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Type de document</Label>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-white text-sm"
                value={nature}
                onChange={(e) => setNature(e.target.value)}
              >
                <option value="AR_CLIENT">Accusé / Cachet client (Recommandé)</option>
                <option value="ORIGINAL">Original signé</option>
                <option value="BON_COMMANDE">Bon de commande joint</option>
                <option value="AUTRE">Autre pièce</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 items-end">
            <div className="flex-1 w-full">
              <Label className="text-xs text-muted-foreground mb-1 block">Commentaire / Notes (optionnel)</Label>
              <Input
                placeholder="Ex: Tamponné le 23/09 par M. Dupont"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              disabled={!selectedFile || uploading}
              className={`${colors.bg} text-white whitespace-nowrap min-w-[140px]`}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Enregistrer
                </>
              )}
            </Button>
          </div>
        </form>
        </PermissionGate>

        {/* Liste des scans déjà enregistrés */}
        <div className="mt-2">
          <div className="flex items-center justify-between mb-2">
            <Label className="font-semibold text-gray-800">
              Documents numérisés ({scans.length})
            </Label>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>

          {scans.length === 0 ? (
            <div className="text-center py-8 border rounded-md bg-white text-sm text-muted-foreground">
              Aucun document scanné pour le moment.
            </div>
          ) : (
            <div className="border rounded-md overflow-hidden bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Nom du fichier</TableHead>
                    <TableHead>Taille</TableHead>
                    <TableHead>Date ajout</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scans.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 font-medium text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                          {s.nature === 'AR_CLIENT' && <CheckCircle className="w-3 h-3 text-green-600" />}
                          {getNatureLabel(s.nature)}
                        </span>
                        {s.notes && (
                          <div className="text-xs text-muted-foreground mt-0.5 max-w-[200px] truncate" title={s.notes}>
                            {s.notes}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs max-w-[180px] truncate" title={s.nomFichier}>
                        {s.nomFichier}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatSize(s.taille)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(s.createdAt).toLocaleDateString('fr-FR', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2 text-blue-600"
                            onClick={() => window.open(`/api/document-scans/${s.id}/view`, '_blank')}
                            title="Ouvrir le scan"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <PermissionGate permission="scans.delete">
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-8 px-2"
                              onClick={() => handleDelete(s.id)}
                              title="Supprimer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </PermissionGate>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
