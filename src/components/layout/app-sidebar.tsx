'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, Package, FileText, CreditCard,
  Truck, Settings, ChevronLeft, ChevronRight, Receipt
} from 'lucide-react';

export type PageView =
  | 'dashboard'
  | 'tiers'
  | 'articles'
  | 'factures-clients'
  | 'reglements-clients'
  | 'factures-fournisseurs'
  | 'reglements-fournisseurs'
  | 'bons-livraison'
  | 'parametres';

interface AppSidebarProps {
  currentView: PageView;
  onViewChange: (view: PageView) => void;
  collapsed: boolean;
  onToggle: () => void;
}

const menuItems: { id: PageView; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Tableau de bord', icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'tiers', label: 'Tiers', icon: <Users className="w-5 h-5" /> },
  { id: 'articles', label: 'Articles', icon: <Package className="w-5 h-5" /> },
  { id: 'factures-clients', label: 'Factures Clients', icon: <FileText className="w-5 h-5" /> },
  { id: 'reglements-clients', label: 'Règlements Clients', icon: <CreditCard className="w-5 h-5" /> },
  { id: 'factures-fournisseurs', label: 'Factures Fourn.', icon: <Receipt className="w-5 h-5" /> },
  { id: 'reglements-fournisseurs', label: 'Règlements Fourn.', icon: <CreditCard className="w-5 h-5" /> },
  { id: 'bons-livraison', label: 'Bons de Livraison', icon: <Truck className="w-5 h-5" /> },
  { id: 'parametres', label: 'Paramètres', icon: <Settings className="w-5 h-5" /> },
];

export function AppSidebar({ currentView, onViewChange, collapsed, onToggle }: AppSidebarProps) {
  return (
    <div
      className={cn(
        'bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
        {!collapsed && (
          <span className="font-bold text-lg">
            GestFact <span className="text-xs text-muted-foreground">V1.61</span>
          </span>
        )}
        <Button variant="ghost" size="sm" onClick={onToggle}>
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {menuItems.map((item) => (
          <Button
            key={item.id}
            variant={currentView === item.id ? 'secondary' : 'ghost'}
            className={cn(
              'w-full justify-start gap-3',
              currentView === item.id && 'bg-blue-100 text-blue-900 hover:bg-blue-200'
            )}
            onClick={() => onViewChange(item.id)}
          >
            {item.icon}
            {!collapsed && <span>{item.label}</span>}
          </Button>
        ))}
      </nav>
    </div>
  );
}
