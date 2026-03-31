'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Printer, Users as UsersIcon, Plus, Trash2, Edit } from 'lucide-react';
import { ImportCentralDialog } from '@/components/import-export/import-central-dialog';
import { PrintLayoutEditor } from '@/components/print/print-layout-editor';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription 
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  PERMISSION_DEFINITIONS, PERMISSION_GROUPS, Permission, DEFAULT_PERMISSIONS 
} from '@/lib/permissions';

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

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  permissions: string | null;
  actif: boolean;
  createdAt: string;
}

interface ParametresViewProps {
  userRole?: string;
}

// Profils prédéfinis
const PROFILES = {
  ADMIN: { label: 'Administrateur (tout accès)', permissions: DEFAULT_PERMISSIONS.ADMIN },
  USER: { label: 'Utilisateur standard', permissions: DEFAULT_PERMISSIONS.USER },
  BL_ONLY: { label: 'Créateur BL uniquement', permissions: DEFAULT_PERMISSIONS.BL_ONLY },
};

export function ParametresView({ userRole }: ParametresViewProps) {
  const [parametres, setParametres] = useState<Parametres | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [layoutEditorOpen, setLayoutEditorOpen] = useState(false);
  
  // Users management
  const [users, setUsers] = useState<User[]>([]);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({ 
    email: '', 
    password: '', 
    name: '', 
    role: 'USER',
    permissions: [] as Permission[]
  });
  const [userLoading, setUserLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<string>('USER');

  const isAdmin = userRole === 'ADMIN';

  useEffect(() => { fetchParametres(); if (isAdmin) fetchUsers(); }, [isAdmin]);

  const fetchParametres = async () => {
    try {
      const res = await fetch('/api/parametres');
      const data = await res.json();
      setParametres(data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (e) { console.error(e); }
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

  // Parse user permissions
  const parsePermissions = (permissionsStr: string | null): Permission[] => {
    if (!permissionsStr) return [];
    try {
      return JSON.parse(permissionsStr);
    } catch {
      return [];
    }
  };

  // User management functions
  const openUserDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      const perms = parsePermissions(user.permissions);
      setUserForm({ 
        email: user.email, 
        password: '', 
        name: user.name || '', 
        role: user.role,
        permissions: perms
      });
      // Detect profile
      if (user.role === 'ADMIN') {
        setSelectedProfile('ADMIN');
      } else if (JSON.stringify(perms) === JSON.stringify(DEFAULT_PERMISSIONS.BL_ONLY)) {
        setSelectedProfile('BL_ONLY');
      } else {
        setSelectedProfile('USER');
      }
    } else {
      setEditingUser(null);
      setUserForm({ email: '', password: '', name: '', role: 'USER', permissions: DEFAULT_PERMISSIONS.USER });
      setSelectedProfile('USER');
    }
    setUserDialogOpen(true);
  };

  const handleProfileChange = (profile: string) => {
    setSelectedProfile(profile);
    if (profile === 'ADMIN') {
      setUserForm(prev => ({ ...prev, role: 'ADMIN', permissions: PROFILES.ADMIN.permissions }));
    } else if (profile === 'BL_ONLY') {
      setUserForm(prev => ({ ...prev, role: 'USER', permissions: PROFILES.BL_ONLY.permissions }));
    } else {
      setUserForm(prev => ({ ...prev, role: 'USER', permissions: PROFILES.USER.permissions }));
    }
  };

  const togglePermission = (permission: Permission) => {
    setUserForm(prev => {
      const hasPerm = prev.permissions.includes(permission);
      const newPerms = hasPerm 
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission];
      // Deselect profile when manually changing
      setSelectedProfile('');
      return { ...prev, permissions: newPerms };
    });
  };

  const handleSaveUser = async () => {
    setUserLoading(true);
    try {
      const payload = {
        email: userForm.email,
        name: userForm.name,
        role: userForm.role,
        password: userForm.password || undefined,
        permissions: userForm.permissions
      };

      if (editingUser) {
        const res = await fetch(`/api/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          fetchUsers();
          setUserDialogOpen(false);
        } else {
          const error = await res.json();
          alert(error.error || 'Erreur lors de la modification');
        }
      } else {
        if (!userForm.password) {
          alert('Le mot de passe est requis pour un nouvel utilisateur');
          setUserLoading(false);
          return;
        }
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          fetchUsers();
          setUserDialogOpen(false);
        } else {
          const error = await res.json();
          alert(error.error || 'Erreur lors de la création');
        }
      }
    } catch (e) { 
      console.error(e); 
      alert('Erreur lors de l\'enregistrement');
    } finally {
      setUserLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Supprimer cet utilisateur ?')) return;
    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchUsers();
      } else {
        const error = await res.json();
        alert(error.error);
      }
    } catch (e) { console.error(e); }
  };

  const handleToggleUserActif = async (user: User) => {
    try {
      await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actif: !user.actif })
      });
      fetchUsers();
    } catch (e) { console.error(e); }
  };

  // Get permission summary for display
  const getPermissionSummary = (user: User): string => {
    if (user.role === 'ADMIN') return 'Tout accès';
    const perms = parsePermissions(user.permissions);
    if (perms.length === 0) return 'Aucun droit';
    if (JSON.stringify(perms) === JSON.stringify(DEFAULT_PERMISSIONS.BL_ONLY)) return 'BL uniquement';
    if (JSON.stringify(perms) === JSON.stringify(DEFAULT_PERMISSIONS.USER)) return 'Standard';
    return `${perms.length} permissions`;
  };

  if (loading) return <div className="p-8">Chargement...</div>;

  return (
    <div className="p-6 space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-blue-700">Paramètres</h1>
          <p className="text-muted-foreground">Configuration de l'application</p>
        </div>
        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-mono font-bold">PAR01</span>
      </div>

      {/* Users Management - Admin Only */}
      {isAdmin && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="w-5 h-5" />
              Gestion des Utilisateurs
            </CardTitle>
            <Button onClick={() => openUserDialog()} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Nouvel utilisateur
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Droits</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name || '-'}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                        {user.role === 'ADMIN' ? 'Administrateur' : 'Utilisateur'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {getPermissionSummary(user)}
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleToggleUserActif(user)}
                        className={user.actif ? 'text-green-600' : 'text-red-600'}
                      >
                        {user.actif ? 'Actif' : 'Inactif'}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openUserDialog(user)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(user.id)} className="text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Aucun utilisateur
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

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
          {saved && <span className="text-blue-600 self-center">Paramètres enregistrés!</span>}
          <Button type="button" variant="outline" onClick={() => setLayoutEditorOpen(true)} className="border-blue-300 text-blue-700 hover:bg-blue-50">
            <Printer className="w-4 h-4 mr-2" />
            Mise en page impression
          </Button>
          <Button type="button" variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Imports
          </Button>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Enregistrer</Button>
        </div>
      </form>

      <ImportCentralDialog open={importOpen} onOpenChange={setImportOpen} />

      {/* Print Layout Editor */}
      <PrintLayoutEditor
        open={layoutEditorOpen}
        onOpenChange={setLayoutEditorOpen}
        entreprise={parametres}
        letterheadImage={parametres?.letterheadImage || null}
        printLayout={getParsedLayout()}
        onSave={handleSaveLayout}
      />

      {/* User Dialog with Permissions */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}</DialogTitle>
            <DialogDescription>
              {editingUser ? 'Modifiez les informations et permissions de l\'utilisateur' : 'Créez un nouveau compte utilisateur avec des permissions personnalisées'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nom</Label>
                <Input 
                  value={userForm.name} 
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} 
                  placeholder="Nom complet"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input 
                  type="email"
                  value={userForm.email} 
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} 
                  placeholder="email@exemple.com"
                />
              </div>
            </div>
            <div>
              <Label>{editingUser ? 'Nouveau mot de passe (laisser vide pour garder l\'actuel)' : 'Mot de passe'}</Label>
              <Input 
                type="password"
                value={userForm.password} 
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} 
                placeholder="••••••••"
              />
            </div>

            {/* Profil prédéfini */}
            <div>
              <Label>Profil de droits</Label>
              <Select value={selectedProfile} onValueChange={handleProfileChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un profil" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PROFILES).map(([key, value]) => (
                    <SelectItem key={key} value={key}>{value.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Permissions détaillées en tableau */}
            <div className="border rounded-lg p-4">
              <Label className="text-base font-semibold mb-3 block">Permissions détaillées</Label>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Module</TableHead>
                    <TableHead className="w-[80px] text-center">Visu</TableHead>
                    <TableHead className="w-[80px] text-center">Modif</TableHead>
                    <TableHead className="w-[80px] text-center">Créer</TableHead>
                    <TableHead className="w-[80px] text-center">Autre</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PERMISSION_GROUPS.map((group) => {
                    const viewPerm = group.permissions.find(p => p.endsWith('.view') || p === 'dashboard.view');
                    const editPerm = group.permissions.find(p => p.endsWith('.edit'));
                    const createPerm = group.permissions.find(p => p.endsWith('.create'));
                    const otherPerms = group.permissions.filter(p => 
                      !p.endsWith('.view') && !p.endsWith('.edit') && !p.endsWith('.create') && p !== 'dashboard.view'
                    );
                    
                    return (
                      <TableRow key={group.name}>
                        <TableCell className="font-medium">{group.name}</TableCell>
                        <TableCell className="text-center">
                          {viewPerm && (
                            <Checkbox
                              checked={userForm.permissions.includes(viewPerm)}
                              onCheckedChange={() => togglePermission(viewPerm)}
                            />
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {editPerm && (
                            <Checkbox
                              checked={userForm.permissions.includes(editPerm)}
                              onCheckedChange={() => togglePermission(editPerm)}
                            />
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {createPerm && (
                            <Checkbox
                              checked={userForm.permissions.includes(createPerm)}
                              onCheckedChange={() => togglePermission(createPerm)}
                            />
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {otherPerms.length > 0 && otherPerms.map(perm => (
                            <div key={perm} className="flex items-center justify-center gap-1">
                              <Checkbox
                                checked={userForm.permissions.includes(perm)}
                                onCheckedChange={() => togglePermission(perm)}
                              />
                              <span className="text-xs">{PERMISSION_DEFINITIONS[perm].label}</span>
                            </div>
                          ))}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSaveUser} disabled={userLoading} className="bg-blue-600 hover:bg-blue-700">
              {userLoading ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
