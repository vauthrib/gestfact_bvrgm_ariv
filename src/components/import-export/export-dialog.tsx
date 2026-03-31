'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, FileSpreadsheet } from 'lucide-react';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: string;
  code: string;
}

export function ExportDialog({ open, onOpenChange, type, code }: ExportDialogProps) {
  const handleExport = (format: 'csv' | 'xls' | 'xlsx') => {
    window.open(`/api/export?type=${type}&format=${format}`, '_blank');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Exporter</DialogTitle>
            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-mono font-bold">{code}-EXP</span>
          </div>
        </DialogHeader>

        <div className="space-y-2 py-4">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-14"
            onClick={() => handleExport('csv')}
          >
            <FileText className="w-5 h-5 text-blue-600" />
            <div className="text-left">
              <div className="font-medium">CSV</div>
              <div className="text-xs text-gray-500">Compatible tous logiciels</div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-14"
            onClick={() => handleExport('xls')}
          >
            <FileSpreadsheet className="w-5 h-5 text-green-600" />
            <div className="text-left">
              <div className="font-medium">XLS</div>
              <div className="text-xs text-gray-500">Microsoft Excel (compatible)</div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-14"
            onClick={() => handleExport('xlsx')}
          >
            <FileSpreadsheet className="w-5 h-5 text-blue-700" />
            <div className="text-left">
              <div className="font-medium">XLSX</div>
              <div className="text-xs text-gray-500">Microsoft Excel moderne</div>
            </div>
          </Button>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
