'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, Package, FileText, CreditCard,
  Truck, Settings, ChevronLeft, ChevronRight, Receipt, Undo2, LogOut, User
} from 'lucide-react';
import { hasPermission, Permission } from '@/lib/permissions';

export type PageView =
  | 'dashboard'
  | 'tiers'
  | 'articles'
  | 'bons-livraison'
  | 'factures-clients'
  | 'avoirs-clients'
  | 'reglements-clients'
  | 'factures-fournisseurs'
  | 'reglements-fournisseurs'
  | 'parametres';

interface User {
  id: string;
  email: string;
  name?: string | null;
  role: string;
  permissions: Permission[];
}

interface AppSidebarProps {
  currentView: PageView;
  onViewChange: (view: PageView) => void;
  collapsed: boolean;
  onToggle: () => void;
  user: User;
  onLogout: () => void;
}

const allMenuItems: { id: PageView; label: string; icon: React.ReactNode; separatorAfter?: boolean; permission: Permission }[] = [
  { id: 'dashboard', label: 'Tableau de bord', icon: <LayoutDashboard className="w-5 h-5" />, permission: 'dashboard.view' },
  { id: 'tiers', label: 'Tiers', icon: <Users className="w-5 h-5" />, permission: 'tiers.view' },
  { id: 'articles', label: 'Articles', icon: <Package className="w-5 h-5" />, permission: 'articles.view' },
  { id: 'bons-livraison', label: 'Bons de Livraison', icon: <Truck className="w-5 h-5" />, permission: 'bl.view' },
  { id: 'factures-clients', label: 'Factures Clients', icon: <FileText className="w-5 h-5" />, permission: 'factures.view' },
  { id: 'avoirs-clients', label: 'Avoirs Clients', icon: <Undo2 className="w-5 h-5" />, permission: 'avoirs.view' },
  { id: 'reglements-clients', label: 'Règlements Clients', icon: <CreditCard className="w-5 h-5" />, permission: 'reglements.view', separatorAfter: true },
  { id: 'factures-fournisseurs', label: 'Factures Fourn.', icon: <Receipt className="w-5 h-5" />, permission: 'fournisseurs.view' },
  { id: 'reglements-fournisseurs', label: 'Règlements Fourn.', icon: <CreditCard className="w-5 h-5" />, permission: 'reglements-fourn.view', separatorAfter: true },
  { id: 'parametres', label: 'Paramètres', icon: <Settings className="w-5 h-5" />, permission: 'parametres.view' },
];

export function AppSidebar({ currentView, onViewChange, collapsed, onToggle, user, onLogout }: AppSidebarProps) {
  // Filtrer les menus selon les permissions
  const menuItems = allMenuItems.filter(item => 
    hasPermission(user.role, user.permissions, item.permission)
  );

  // Ajouter separatorAfter au dernier item de chaque groupe si nécessaire
  const processedMenuItems = menuItems.map((item, index) => {
    // Ajouter separator après règlements clients et règlements fournisseurs
    const needsSeparator = 
      item.id === 'reglements-clients' || 
      item.id === 'reglements-fournisseurs';
    return { ...item, separatorAfter: needsSeparator };
  });

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
            ARIV <span className="bg-blue-500 text-white px-2 py-0.5 rounded text-xs font-bold">V2.56</span>
          </span>
        )}
        <Button variant="ghost" size="sm" onClick={onToggle}>
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>
      
      <nav className="flex-1 p-2 space-y-1">
        {processedMenuItems.map((item) => (
          <div key={item.id}>
            <Button
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
            {item.separatorAfter && (
              <div className="my-2 border-t border-black" />
            )}
          </div>
        ))}
      </nav>

      {/* User info and logout */}
      <div className="p-2 border-t border-sidebar-border">
        {!collapsed ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-2 py-1 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              <div className="flex-1 truncate">
                <div className="font-medium text-foreground truncate">{user.name || user.email}</div>
                <div className="text-xs">{user.role === 'ADMIN' ? 'Administrateur' : 'Utilisateur'}</div>
              </div>
            </div>
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={onLogout}
            >
              <LogOut className="w-5 h-5" />
              <span>Déconnexion</span>
            </Button>
          </div>
        ) : (
          <Button 
            variant="ghost" 
            size="sm"
            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={onLogout}
          >
            <LogOut className="w-5 h-5" />
          </Button>
        )}
      </div>
    </div>
  );
}
