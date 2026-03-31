'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Move, Upload, Trash2, Save, RotateCcw, Eye, Printer } from 'lucide-react';

// Page A4 dimensions in mm
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const PX_PER_MM = 3.779527559; // 96 DPI

// Default layout positions (in mm from top-left)
const DEFAULT_LAYOUT = {
  // Document info (number, date, BC, BL) - top right
  docInfo: { x: 120, y: 10, width: 80, height: 45, visible: true },
  // Client info - below header
  clientInfo: { x: 10, y: 60, width: 90, height: 40, visible: true },
  // Table start position
  tableStart: { x: 10, y: 120, width: 190, height: 100, visible: true },
  // Totals - right side below table
  totals: { x: 130, y: 230, width: 70, height: 40, visible: true },
  // Footer - bottom
  footer: { x: 10, y: 270, width: 190, height: 20, visible: true },
  // Page margins
  margins: { top: 10, right: 10, bottom: 10, left: 10 }
};

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

interface PrintLayoutEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entreprise: any;
  letterheadImage: string | null;
  printLayout: PrintLayout | null;
  onSave: (letterheadImage: string | null, layout: PrintLayout) => void;
}

export function PrintLayoutEditor({
  open,
  onOpenChange,
  entreprise,
  letterheadImage,
  printLayout,
  onSave
}: PrintLayoutEditorProps) {
  // Use useMemo to compute initial values
  const initialLayout = useMemo(() => printLayout || DEFAULT_LAYOUT, [printLayout]);
  const initialImage = useMemo(() => letterheadImage || null, [letterheadImage]);
  
  const [layout, setLayout] = useState<PrintLayout>(initialLayout);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(initialImage);
  const [selectedElement, setSelectedElement] = useState<keyof PrintLayout | null>(null);
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scale factor for display
  const scale = 0.6;
  const canvasWidth = A4_WIDTH_MM * PX_PER_MM * scale;
  const canvasHeight = A4_HEIGHT_MM * PX_PER_MM * scale;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setBackgroundImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setBackgroundImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const mmToPx = (mm: number) => mm * PX_PER_MM * scale;
  const pxToMm = (px: number) => px / (PX_PER_MM * scale);

  const handleMouseDown = (elementKey: keyof PrintLayout, e: React.MouseEvent) => {
    if (elementKey === 'margins') return;
    e.preventDefault();
    setSelectedElement(elementKey);
    setDragging(true);
    
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging || !selectedElement || !canvasRef.current || selectedElement === 'margins') return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const x = pxToMm(e.clientX - canvasRect.left - dragOffset.x);
    const y = pxToMm(e.clientY - canvasRect.top - dragOffset.y);

    setLayout(prev => ({
      ...prev,
      [selectedElement]: {
        ...prev[selectedElement] as LayoutElement,
        x: Math.max(0, Math.min(A4_WIDTH_MM - (prev[selectedElement] as LayoutElement).width, x)),
        y: Math.max(0, Math.min(A4_HEIGHT_MM - (prev[selectedElement] as LayoutElement).height, y))
      }
    }));
  }, [dragging, selectedElement, dragOffset, pxToMm]);

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  const updateElement = (key: keyof PrintLayout, field: string, value: number | boolean) => {
    if (key === 'margins') {
      setLayout(prev => ({
        ...prev,
        margins: { ...prev.margins, [field]: value }
      }));
    } else {
      setLayout(prev => ({
        ...prev,
        [key]: { ...(prev[key] as LayoutElement), [field]: value }
      }));
    }
  };

  const handleSave = () => {
    onSave(backgroundImage, layout);
  };

  const handleReset = () => {
    setLayout(DEFAULT_LAYOUT);
  };

  const elementStyle = (element: LayoutElement): React.CSSProperties => ({
    position: 'absolute',
    left: `${mmToPx(element.x)}px`,
    top: `${mmToPx(element.y)}px`,
    width: `${mmToPx(element.width)}px`,
    height: `${mmToPx(element.height)}px`,
    cursor: 'move',
    border: element.visible ? '2px dashed #db2777' : '2px dashed #9ca3af',
    backgroundColor: element.visible ? 'rgba(219, 39, 119, 0.1)' : 'rgba(156, 163, 175, 0.1)',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    color: '#db2777',
    userSelect: 'none'
  });

  const elements: { key: keyof PrintLayout; label: string; content: string }[] = [
    { key: 'docInfo', label: 'Infos Document', content: 'N° FC-2024-001\nDate: 15/01/2024\nBC: BC-123\nBL: BL-456' },
    { key: 'clientInfo', label: 'Infos Client', content: 'CLIENT\nRaison Sociale\nAdresse' },
    { key: 'tableStart', label: 'Tableau', content: 'Désignation | Qté | PU | Total' },
    { key: 'totals', label: 'Totaux', content: 'Total HT\nTVA\nTotal TTC' },
    { key: 'footer', label: 'Pied de page', content: 'ICE | RC | Footer' }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Éditeur de Mise en Page - Impression</DialogTitle>
            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-mono font-bold">LAY01</span>
          </div>
        </DialogHeader>

        <div className="flex gap-4 h-[calc(95vh-120px)]">
          {/* Left Panel - Controls */}
          <div className="w-80 flex-shrink-0 overflow-y-auto space-y-4 pr-2">
            {/* Image Upload */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Papier à En-tête
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {backgroundImage ? 'Changer l\'image' : 'Charger une image'}
                </Button>
                {backgroundImage && (
                  <Button
                    variant="outline"
                    className="w-full text-red-600"
                    onClick={handleRemoveImage}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer l'image
                  </Button>
                )}
                <p className="text-xs text-gray-500">
                  Scannez votre papier à en-tête et chargez-le comme référence
                </p>
              </CardContent>
            </Card>

            {/* Element Positions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Move className="w-4 h-4" />
                  Position des Éléments
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {elements.map(({ key, label }) => (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{label}</span>
                      <label className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={(layout[key] as LayoutElement).visible}
                          onChange={(e) => updateElement(key, 'visible', e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span className="text-xs">Afficher</span>
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <div>
                        <Label className="text-xs">X (mm)</Label>
                        <Input
                          type="number"
                          value={Math.round((layout[key] as LayoutElement).x)}
                          onChange={(e) => updateElement(key, 'x', parseFloat(e.target.value) || 0)}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Y (mm)</Label>
                        <Input
                          type="number"
                          value={Math.round((layout[key] as LayoutElement).y)}
                          onChange={(e) => updateElement(key, 'y', parseFloat(e.target.value) || 0)}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Largeur (mm)</Label>
                        <Input
                          type="number"
                          value={Math.round((layout[key] as LayoutElement).width)}
                          onChange={(e) => updateElement(key, 'width', parseFloat(e.target.value) || 0)}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Hauteur (mm)</Label>
                        <Input
                          type="number"
                          value={Math.round((layout[key] as LayoutElement).height)}
                          onChange={(e) => updateElement(key, 'height', parseFloat(e.target.value) || 0)}
                          className="h-7 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Margins */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Marges de Page</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Haut (mm)</Label>
                    <Input
                      type="number"
                      value={layout.margins.top}
                      onChange={(e) => updateElement('margins', 'top', parseFloat(e.target.value) || 0)}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Bas (mm)</Label>
                    <Input
                      type="number"
                      value={layout.margins.bottom}
                      onChange={(e) => updateElement('margins', 'bottom', parseFloat(e.target.value) || 0)}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Gauche (mm)</Label>
                    <Input
                      type="number"
                      value={layout.margins.left}
                      onChange={(e) => updateElement('margins', 'left', parseFloat(e.target.value) || 0)}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Droite (mm)</Label>
                    <Input
                      type="number"
                      value={layout.margins.right}
                      onChange={(e) => updateElement('margins', 'right', parseFloat(e.target.value) || 0)}
                      className="h-7 text-xs"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleReset}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Réinitialiser
              </Button>
              <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Enregistrer
              </Button>
            </div>
          </div>

          {/* Right Panel - Preview */}
          <div className="flex-1 flex flex-col items-center bg-gray-100 rounded-lg p-4 overflow-auto">
            <div className="mb-2 text-sm text-gray-600">
              Aperçu A4 (210 × 297 mm) - Déplacez les éléments par glisser-déposer
            </div>
            
            {/* Rulers */}
            <div className="relative">
              {/* Top ruler */}
              <div className="absolute -top-5 left-0 right-0 h-5 flex text-xs text-gray-400">
                {[0, 50, 100, 150, 200].map(mm => (
                  <div key={mm} style={{ position: 'absolute', left: `${mmToPx(mm)}px` }}>
                    {mm}
                  </div>
                ))}
              </div>
              
              {/* Left ruler */}
              <div className="absolute -left-6 top-0 bottom-0 w-5 flex flex-col text-xs text-gray-400">
                {[0, 50, 100, 150, 200, 250].map(mm => (
                  <div key={mm} style={{ position: 'absolute', top: `${mmToPx(mm)}px` }}>
                    {mm}
                  </div>
                ))}
              </div>

              {/* Canvas */}
              <div
                ref={canvasRef}
                className="relative bg-white shadow-lg"
                style={{
                  width: `${canvasWidth}px`,
                  height: `${canvasHeight}px`,
                  backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                {/* Marges indicator */}
                <div
                  className="absolute border border-dashed border-blue-300 pointer-events-none"
                  style={{
                    left: `${mmToPx(layout.margins.left)}px`,
                    top: `${mmToPx(layout.margins.top)}px`,
                    right: `${mmToPx(layout.margins.right)}px`,
                    bottom: `${mmToPx(layout.margins.bottom)}px`
                  }}
                />

                {/* Draggable elements */}
                {elements.map(({ key, label, content }) => {
                  const element = layout[key] as LayoutElement;
                  if (!element.visible) return null;
                  
                  return (
                    <div
                      key={key}
                      style={elementStyle(element)}
                      onMouseDown={(e) => handleMouseDown(key, e)}
                      className={selectedElement === key ? 'ring-2 ring-green-500' : ''}
                    >
                      <div className="text-center whitespace-pre-line text-[8px]">
                        {label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 text-xs text-gray-500">
              Cliquez et faites glisser pour repositionner les zones
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
