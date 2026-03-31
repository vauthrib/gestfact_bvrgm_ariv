// Types de permissions disponibles
// Chaque module a 3 permissions: .view (Visu), .edit (Modif), .create (Créer)
export const PERMISSION_DEFINITIONS = {
  // Tableau de bord
  'dashboard.view': { label: 'Voir', group: 'Tableau de bord', type: 'view' },
  
  // Tiers (Clients/Fournisseurs)
  'tiers.view': { label: 'Visu', group: 'Tiers', type: 'view' },
  'tiers.edit': { label: 'Modif', group: 'Tiers', type: 'edit' },
  'tiers.create': { label: 'Créer', group: 'Tiers', type: 'create' },
  
  // Articles
  'articles.view': { label: 'Visu', group: 'Articles', type: 'view' },
  'articles.edit': { label: 'Modif', group: 'Articles', type: 'edit' },
  'articles.create': { label: 'Créer', group: 'Articles', type: 'create' },
  
  // Bons de Livraison
  'bl.view': { label: 'Visu', group: 'Bons de Livraison', type: 'view' },
  'bl.edit': { label: 'Modif', group: 'Bons de Livraison', type: 'edit' },
  'bl.create': { label: 'Créer', group: 'Bons de Livraison', type: 'create' },
  'bl.validate': { label: 'Valider', group: 'Bons de Livraison', type: 'validate' },
  
  // Factures Clients
  'factures.view': { label: 'Visu', group: 'Factures Clients', type: 'view' },
  'factures.edit': { label: 'Modif', group: 'Factures Clients', type: 'edit' },
  'factures.create': { label: 'Créer', group: 'Factures Clients', type: 'create' },
  'factures.validate': { label: 'Valider', group: 'Factures Clients', type: 'validate' },
  
  // Avoirs
  'avoirs.view': { label: 'Visu', group: 'Avoirs', type: 'view' },
  'avoirs.edit': { label: 'Modif', group: 'Avoirs', type: 'edit' },
  'avoirs.create': { label: 'Créer', group: 'Avoirs', type: 'create' },
  
  // Règlements Clients
  'reglements.view': { label: 'Visu', group: 'Règlements Clients', type: 'view' },
  'reglements.edit': { label: 'Modif', group: 'Règlements Clients', type: 'edit' },
  'reglements.create': { label: 'Créer', group: 'Règlements Clients', type: 'create' },
  
  // Factures Fournisseurs
  'fournisseurs.view': { label: 'Visu', group: 'Fournisseurs', type: 'view' },
  'fournisseurs.edit': { label: 'Modif', group: 'Fournisseurs', type: 'edit' },
  'fournisseurs.create': { label: 'Créer', group: 'Fournisseurs', type: 'create' },
  
  // Règlements Fournisseurs
  'reglements-fourn.view': { label: 'Visu', group: 'Règlements Fournisseurs', type: 'view' },
  'reglements-fourn.edit': { label: 'Modif', group: 'Règlements Fournisseurs', type: 'edit' },
  'reglements-fourn.create': { label: 'Créer', group: 'Règlements Fournisseurs', type: 'create' },
  
  // Paramètres
  'parametres.view': { label: 'Voir', group: 'Administration', type: 'view' },
  'parametres.edit': { label: 'Modifier', group: 'Administration', type: 'edit' },
  
  // Utilisateurs
  'users.manage': { label: 'Gérer', group: 'Administration', type: 'manage' },
} as const;

export type Permission = keyof typeof PERMISSION_DEFINITIONS;

// Permissions par défaut par rôle
export const DEFAULT_PERMISSIONS: Record<string, Permission[]> = {
  ADMIN: [
    // Admin a toutes les permissions
    'dashboard.view',
    'tiers.view', 'tiers.edit', 'tiers.create',
    'articles.view', 'articles.edit', 'articles.create',
    'bl.view', 'bl.edit', 'bl.create', 'bl.validate',
    'factures.view', 'factures.edit', 'factures.create', 'factures.validate',
    'avoirs.view', 'avoirs.edit', 'avoirs.create',
    'reglements.view', 'reglements.edit', 'reglements.create',
    'fournisseurs.view', 'fournisseurs.edit', 'fournisseurs.create',
    'reglements-fourn.view', 'reglements-fourn.edit', 'reglements-fourn.create',
    'parametres.view', 'parametres.edit',
    'users.manage',
  ],
  USER: [
    // User standard: peut voir tiers/articles et créer des BL
    'dashboard.view',
    'tiers.view',
    'articles.view',
    'bl.view', 'bl.create',
  ],
  BL_ONLY: [
    // Profil "Créateur BL uniquement"
    'dashboard.view',
    'tiers.view',
    'articles.view',
    'bl.view', 'bl.create',
  ],
};

// Grouper les permissions pour l'affichage en tableau avec 3 colonnes
export const PERMISSION_GROUPS = [
  { name: 'Tableau de bord', permissions: ['dashboard.view'] },
  { name: 'Tiers', permissions: ['tiers.view', 'tiers.edit', 'tiers.create'] },
  { name: 'Articles', permissions: ['articles.view', 'articles.edit', 'articles.create'] },
  { name: 'Bons de Livraison', permissions: ['bl.view', 'bl.edit', 'bl.create', 'bl.validate'] },
  { name: 'Factures Clients', permissions: ['factures.view', 'factures.edit', 'factures.create', 'factures.validate'] },
  { name: 'Avoirs', permissions: ['avoirs.view', 'avoirs.edit', 'avoirs.create'] },
  { name: 'Règlements Clients', permissions: ['reglements.view', 'reglements.edit', 'reglements.create'] },
  { name: 'Fournisseurs', permissions: ['fournisseurs.view', 'fournisseurs.edit', 'fournisseurs.create'] },
  { name: 'Règlements Fournisseurs', permissions: ['reglements-fourn.view', 'reglements-fourn.edit', 'reglements-fourn.create'] },
  { name: 'Administration', permissions: ['parametres.view', 'parametres.edit', 'users.manage'] },
];

// Vérifier si une permission est accordée
export function hasPermission(
  userRole: string, 
  userPermissions: Permission[] | null | undefined, 
  permission: Permission
): boolean {
  // Admin a toujours accès
  if (userRole === 'ADMIN') return true;
  
  // Si l'utilisateur a des permissions personnalisées
  if (userPermissions && userPermissions.length > 0) {
    return userPermissions.includes(permission);
  }
  
  // Sinon, utiliser les permissions par défaut du rôle
  const defaultPerms = DEFAULT_PERMISSIONS[userRole] || DEFAULT_PERMISSIONS.USER;
  return defaultPerms.includes(permission);
}

// Mapper une page à une permission de vue
export const PAGE_PERMISSIONS: Record<string, Permission> = {
  'dashboard': 'dashboard.view',
  'tiers': 'tiers.view',
  'articles': 'articles.view',
  'bons-livraison': 'bl.view',
  'factures-clients': 'factures.view',
  'avoirs-clients': 'avoirs.view',
  'reglements-clients': 'reglements.view',
  'factures-fournisseurs': 'fournisseurs.view',
  'reglements-fournisseurs': 'reglements-fourn.view',
  'parametres': 'parametres.view',
};

// Obtenir les pages accessibles
export function getAccessiblePages(
  userRole: string,
  userPermissions: Permission[] | null | undefined
): string[] {
  if (userRole === 'ADMIN') {
    // Admin a accès à tout
    return Object.keys(PAGE_PERMISSIONS);
  }
  
  const perms = userPermissions && userPermissions.length > 0 
    ? userPermissions 
    : (DEFAULT_PERMISSIONS[userRole] || DEFAULT_PERMISSIONS.USER);
  
  return Object.entries(PAGE_PERMISSIONS)
    .filter(([_, permission]) => perms.includes(permission))
    .map(([page]) => page);
}
