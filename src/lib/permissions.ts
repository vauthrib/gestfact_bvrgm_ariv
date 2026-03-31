// Types de permissions disponibles
export const PERMISSION_DEFINITIONS = {
  // Tableau de bord
  'dashboard.view': { label: 'Voir le tableau de bord', group: 'Général' },
  
  // Tiers (Clients/Fournisseurs)
  'tiers.view': { label: 'Voir les tiers', group: 'Tiers' },
  'tiers.edit': { label: 'Créer/Modifier les tiers', group: 'Tiers' },
  
  // Articles
  'articles.view': { label: 'Voir les articles', group: 'Articles' },
  'articles.edit': { label: 'Créer/Modifier les articles', group: 'Articles' },
  
  // Bons de Livraison
  'bl.view': { label: 'Voir les bons de livraison', group: 'Bons de Livraison' },
  'bl.edit': { label: 'Créer/Modifier les BL', group: 'Bons de Livraison' },
  'bl.validate': { label: 'Valider les BL', group: 'Bons de Livraison' },
  
  // Factures Clients
  'factures.view': { label: 'Voir les factures clients', group: 'Factures Clients' },
  'factures.edit': { label: 'Créer/Modifier les factures', group: 'Factures Clients' },
  'factures.validate': { label: 'Valider les factures', group: 'Factures Clients' },
  
  // Avoirs
  'avoirs.view': { label: 'Voir les avoirs', group: 'Avoirs' },
  'avoirs.edit': { label: 'Créer/Modifier les avoirs', group: 'Avoirs' },
  
  // Règlements Clients
  'reglements.view': { label: 'Voir les règlements clients', group: 'Règlements Clients' },
  'reglements.edit': { label: 'Créer/Modifier les règlements', group: 'Règlements Clients' },
  
  // Factures Fournisseurs
  'fournisseurs.view': { label: 'Voir les factures fournisseurs', group: 'Fournisseurs' },
  'fournisseurs.edit': { label: 'Créer/Modifier les factures fourn.', group: 'Fournisseurs' },
  
  // Règlements Fournisseurs
  'reglements-fourn.view': { label: 'Voir les règlements fournisseurs', group: 'Règlements Fournisseurs' },
  'reglements-fourn.edit': { label: 'Créer/Modifier les règlements fourn.', group: 'Règlements Fournisseurs' },
  
  // Paramètres
  'parametres.view': { label: 'Voir les paramètres', group: 'Administration' },
  'parametres.edit': { label: 'Modifier les paramètres', group: 'Administration' },
  
  // Utilisateurs
  'users.manage': { label: 'Gérer les utilisateurs', group: 'Administration' },
} as const;

export type Permission = keyof typeof PERMISSION_DEFINITIONS;

// Permissions par défaut par rôle
export const DEFAULT_PERMISSIONS: Record<string, Permission[]> = {
  ADMIN: [
    // Admin a toutes les permissions
    'dashboard.view',
    'tiers.view', 'tiers.edit',
    'articles.view', 'articles.edit',
    'bl.view', 'bl.edit', 'bl.validate',
    'factures.view', 'factures.edit', 'factures.validate',
    'avoirs.view', 'avoirs.edit',
    'reglements.view', 'reglements.edit',
    'fournisseurs.view', 'fournisseurs.edit',
    'reglements-fourn.view', 'reglements-fourn.edit',
    'parametres.view', 'parametres.edit',
    'users.manage',
  ],
  USER: [
    // User par défaut : seulement créer des BL
    'dashboard.view',
    'tiers.view',
    'articles.view',
    'bl.view', 'bl.edit',
  ],
  // Profil "Créateur BL uniquement"
  BL_ONLY: [
    'dashboard.view',
    'tiers.view',
    'articles.view',
    'bl.view', 'bl.edit',
  ],
};

// Grouper les permissions pour l'affichage
export const PERMISSION_GROUPS = [
  { name: 'Général', permissions: ['dashboard.view'] },
  { name: 'Tiers', permissions: ['tiers.view', 'tiers.edit'] },
  { name: 'Articles', permissions: ['articles.view', 'articles.edit'] },
  { name: 'Bons de Livraison', permissions: ['bl.view', 'bl.edit', 'bl.validate'] },
  { name: 'Factures Clients', permissions: ['factures.view', 'factures.edit', 'factures.validate'] },
  { name: 'Avoirs', permissions: ['avoirs.view', 'avoirs.edit'] },
  { name: 'Règlements Clients', permissions: ['reglements.view', 'reglements.edit'] },
  { name: 'Fournisseurs', permissions: ['fournisseurs.view', 'fournisseurs.edit'] },
  { name: 'Règlements Fournisseurs', permissions: ['reglements-fourn.view', 'reglements-fourn.edit'] },
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
