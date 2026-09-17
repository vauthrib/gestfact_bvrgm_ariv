'use client';

import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, Upload, Eye } from 'lucide-react';

export interface LabelField {
  id: string;
  type: 'code' | 'designation' | 'date' | 'numero' | 'quantite' | 'barcode' | 'client' | 'text';
  label?: string;
  value?: string; // pour type 'text'
  x: number;      // position X en mm
  y: number;      // position Y en mm
  width: number;   // largeur en mm
  height: number;  // hauteur en mm
  fontSize: number;
  bold: boolean;
  color: string;
}

export interface LabelTemplateData {
  id?: string;
  name: string;
  width: number;
  height: number;
  backgroundImage: string | null;
  fields: LabelField[];
  isDefault: boolean;
}

interface LabelTemplateEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: LabelTemplateData | null;
  onSave: (template: LabelTemplateData) => void;
}

const FIELD_TYPES = [
  { value: 'code', label: 'Code article' },
  { value: 'designation', label: 'Désignation' },
  { value: 'date', label: 'Date' },
  { value: 'numero', label: 'N° BL' },
  { value: 'quantite', label: 'Quantité' },
  { value: 'barcode', label: 'Code-barres (Code128)' },
  { value: 'qrcode', label: 'QR Code (lien article)' },
  { value: 'client', label: 'Client' },
  { value: 'text', label: 'Texte fixe' },
];

const generateId = () => Math.random().toString(36).substr(2, 9);

export function LabelTemplateEditor({ open, onOpenChange, template, onSave }: LabelTemplateEditorProps) {
  const [name, setName] = useState('');
  const [width, setWidth] = useState(100);
  const [height, setHeight] = useState(60);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [fields, setFields] = useState<LabelField[]>([]);
  const [isDefault, setIsDefault] = useState(false);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setWidth(template.width);
      setHeight(template.height);
      setBackgroundImage(template.backgroundImage);
      setFields(template.fields);
      setIsDefault(template.isDefault);
    } else {
      resetForm();
    }
  }, [template, open]);

  const resetForm = () => {
    setName('');
    setWidth(100);
    setHeight(60);
    setBackgroundImage(null);
    setFields([{
      id: generateId(),
      type: 'code',
      x: 5, y: 5, width: 40, height: 10,
      fontSize: 14, bold: true, color: '#000000'
    }]);
    setIsDefault(false);
  };

  const addField = () => {
    setFields([...fields, {
      id: generateId(),
      type: 'text',
      label: 'Nouveau champ',
      value: '',
      x: 5, y: fields.length * 12 + 5, width: 40, height: 8,
      fontSize: 10, bold: false, color: '#000000'
    }]);
  };

  const updateField = (id: string, updates: Partial<LabelField>) => {
    setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
    if (selectedField === id) setSelectedField(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setBackgroundImage(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    onSave({
      id: template?.id,
      name,
      width,
      height,
      backgroundImage,
      fields,
      isDefault
    });
    onOpenChange(false);
  };

  // Preview scale: 1mm = 3px
  const scale = 3;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[calc(100vh-4rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template?.id ? 'Modifier' : 'Nouveau'} template d'étiquette</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-6 py-4">
          {/* Colonne gauche: configuration */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nom du template</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Étiquette colis" />
              </div>
              <div className="flex items-end gap-2">
                <input type="checkbox" id="isDefault" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="w-4 h-4" />
                <Label htmlFor="isDefault">Template par défaut</Label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Largeur (mm)</Label><Input type="number" value={width} onChange={(e) => setWidth(Number(e.target.value))} /></div>
              <div><Label>Hauteur (mm)</Label><Input type="number" value={height} onChange={(e) => setHeight(Number(e.target.value))} /></div>
            </div>
            <div>
              <Label>Image de fond</Label>
              <div className="flex gap-2 mt-1">
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-1" />Importer JPG/PNG
                </Button>
                {backgroundImage && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setBackgroundImage(null)}>
                    <Trash2 className="h-4 w-4 mr-1" />Supprimer
                  </Button>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </div>
            {/* Liste des champs */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Champs dynamiques</Label>
                <Button type="button" size="sm" variant="outline" onClick={addField}><Plus className="h-4 w-4 mr-1" />Ajouter</Button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {fields.map((field) => (
                  <div key={field.id} className={`border rounded p-2 cursor-pointer ${selectedField === field.id ? 'border-blue-500 bg-blue-50' : ''}`} onClick={() => setSelectedField(field.id)}>
                    <div className="flex items-center gap-2">
                      <Select value={field.type} onValueChange={(v) => updateField(field.id, { type: v as any })}>
                        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {FIELD_TYPES.map(ft => <SelectItem key={ft.value} value={ft.value}>{ft.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {field.type === 'text' && <Input value={field.value || ''} onChange={(e) => updateField(field.id, { value: e.target.value })} placeholder="Texte" className="flex-1" />}
                      <Button type="button" size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); removeField(field.id); }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    {selectedField === field.id && (
                      <div className="grid grid-cols-4 gap-2 mt-2">
                        <div><Label className="text-xs">X (mm)</Label><Input type="number" value={field.x} onChange={(e) => updateField(field.id, { x: Number(e.target.value) })} /></div>
                        <div><Label className="text-xs">Y (mm)</Label><Input type="number" value={field.y} onChange={(e) => updateField(field.id, { y: Number(e.target.value) })} /></div>
                        <div><Label className="text-xs">Larg. (mm)</Label><Input type="number" value={field.width} onChange={(e) => updateField(field.id, { width: Number(e.target.value) })} /></div>
                        <div><Label className="text-xs">Haut. (mm)</Label><Input type="number" value={field.height} onChange={(e) => updateField(field.id, { height: Number(e.target.value) })} /></div>
                        <div><Label className="text-xs">Taille</Label><Input type="number" value={field.fontSize} onChange={(e) => updateField(field.id, { fontSize: Number(e.target.value) })} /></div>
                        <div><Label className="text-xs">Couleur</Label><Input type="color" value={field.color} onChange={(e) => updateField(field.id, { color: e.target.value })} /></div>
                        <div className="flex items-end"><label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={field.bold} onChange={(e) => updateField(field.id, { bold: e.target.checked })} />Gras</label></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Colonne droite: preview */}
          <div>
            <Label className="mb-2 block">Aperçu ({width}mm × {height}mm)</Label>
            <div className="border-2 border-dashed rounded-lg bg-gray-50 overflow-hidden" style={{ width: width * scale, height: height * scale, position: 'relative' }}>
              {backgroundImage && <img src={backgroundImage} alt="" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain' }} />}
              {fields.map((field) => (
                <div key={field.id} style={{
                  position: 'absolute',
                  left: field.x * scale,
                  top: field.y * scale,
                  width: field.width * scale,
                  height: field.height * scale,
                  fontSize: field.fontSize * scale * 0.3,
                  fontWeight: field.bold ? 'bold' : 'normal',
                  color: field.color,
                  overflow: 'hidden',
                  border: selectedField === field.id ? '1px dashed blue' : '1px dashed gray',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 2,
                }}>
                  {field.type === 'barcode' ? (
                    <div className="w-full h-full flex items-center justify-center text-xs bg-gray-100"> barcode </div>
                  ) : field.type === 'qrcode' ? (
                    <div className="w-full h-full flex items-center justify-center text-xs bg-gray-100"> QR </div>
                  ) : field.type === 'text' ? (
                    field.value || 'Texte'
                  ) : (
                    <span className="truncate">{`{${field.type}}`}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button className="bg-green-600 hover:bg-green-700" onClick={handleSave} disabled={!name}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
