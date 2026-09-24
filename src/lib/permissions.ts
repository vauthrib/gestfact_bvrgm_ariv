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
  
  // Archives d'expéditions
  'expeditions.view': { label: 'Voir', group: 'Archives d’expéditions', type: 'view' },
  'expeditions.edit': { label: 'Modifier', group: 'Archives d’expéditions', type: 'edit' },
  'expeditions.create': { label: 'Créer', group: 'Archives d’expéditions', type: 'create' },

  // Factures Clients
  'factures.view': { label: 'Visu', group: 'Factures Clients', type: 'view' },
  'factures.edit': { label: 'Modif', group: 'Factures Clients', type: 'edit' },
  'factures.create': { label: 'Créer', group: 'Factures Clients', type: 'create' },
  'factures.validate': { label: 'Valider', group: 'Factures Clients', type: 'validate' },

  // Scans & Accusés Réception
  'scans.view': { label: 'Visu', group: 'Scans & Accusés Réception', type: 'view' },
  'scans.create': { label: 'Déposer', group: 'Scans & Accusés Réception', type: 'create' },
  'scans.delete': { label: 'Supprimer', group: 'Scans & Accusés Réception', type: 'delete' },

  // Étiquettes
  'etiquettes.view': { label: 'Visu', group: 'Étiquettes', type: 'view' },
  'etiquettes.print': { label: 'Imprimer', group: 'Étiquettes', type: 'print' },
  'etiquettes.manage': { label: 'Modèles', group: 'Étiquettes', type: 'manage' },
  
  // Avoirs
  'avoirs.view': { label: 'Visu', group: 'Avoirs', type: 'view' },
  'avoirs.edit': { label: 'Modif', group: 'Avoirs', type: 'edit' },
  'avoirs.create': { label: 'Créer', group: 'Avoirs', type: 'create' },
  'avoirs.validate': { label: 'Valider', group: 'Avoirs', type: 'validate' },
  
  // Règlements Clients
  'reglements.view': { label: 'Visu', group: 'Règlements Clients', type: 'view' },
  'reglements.edit': { label: 'Modif', group: 'Règlements Clients', type: 'edit' },
  'reglements.create': { label: 'Créer', group: 'Règlements Clients', type: 'create' },
  'reglements.validate': { label: 'Valider', group: 'Règlements Clients', type: 'validate' },
  
  // Factures Fournisseurs
  'fournisseurs.view': { label: 'Visu', group: 'Fournisseurs', type: 'view' },
  'fournisseurs.edit': { label: 'Modif', group: 'Fournisseurs', type: 'edit' },
  'fournisseurs.create': { label: 'Créer', group: 'Fournisseurs', type: 'create' },
  'fournisseurs.validate': { label: 'Valider', group: 'Fournisseurs', type: 'validate' },
  
  // Règlements Fournisseurs
  'reglements-fourn.view': { label: 'Visu', group: 'Règlements Fournisseurs', type: 'view' },
  'reglements-fourn.edit': { label: 'Modif', group: 'Règlements Fournisseurs', type: 'edit' },
  'reglements-fourn.create': { label: 'Créer', group: 'Règlements Fournisseurs', type: 'create' },
  'reglements-fourn.validate': { label: 'Valider', group: 'Règlements Fournisseurs', type: 'validate' },
  
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
    'expeditions.view', 'expeditions.edit', 'expeditions.create',
    'scans.view', 'scans.create', 'scans.delete',
    'etiquettes.view', 'etiquettes.print', 'etiquettes.manage',
    'factures.view', 'factures.edit', 'factures.create', 'factures.validate',
    'avoirs.view', 'avoirs.edit', 'avoirs.create', 'avoirs.validate',
    'reglements.view', 'reglements.edit', 'reglements.create', 'reglements.validate',
    'fournisseurs.view', 'fournisseurs.edit', 'fournisseurs.create', 'fournisseurs.validate',
    'reglements-fourn.view', 'reglements-fourn.edit', 'reglements-fourn.create', 'reglements-fourn.validate',
    'parametres.view', 'parametres.edit',
    'users.manage',
  ],
  USER: [
    // User standard: peut voir tiers/articles et créer des BL
    'dashboard.view',
    'tiers.view',
    'articles.view',
    'bl.view', 'bl.create',
    'scans.view', 'scans.create',
    'etiquettes.view', 'etiquettes.print',
  ],
  BL_ONLY: [
    // Profil "Créateur BL uniquement"
    'dashboard.view',
    'tiers.view',
    'articles.view',
    'bl.view', 'bl.create',
    'scans.view', 'scans.create',
    'etiquettes.view', 'etiquettes.print',
  ],
};

// Grouper les permissions pour l'affichage en tableau avec 3 colonnes
export const PERMISSION_GROUPS = [
  { name: 'Tableau de bord', permissions: ['dashboard.view'] },
  { name: 'Tiers', permissions: ['tiers.view', 'tiers.edit', 'tiers.create'] },
  { name: 'Articles', permissions: ['articles.view', 'articles.edit', 'articles.create'] },
  { name: 'Bons de Livraison', permissions: ['bl.view', 'bl.edit', 'bl.create', 'bl.validate'] },
  { name: 'Archives d’expéditions', permissions: ['expeditions.view', 'expeditions.edit', 'expeditions.create'] },
  { name: 'Scans & Accusés Réception', permissions: ['scans.view', 'scans.create', 'scans.delete'] },
  { name: 'Étiquettes', permissions: ['etiquettes.view', 'etiquettes.print', 'etiquettes.manage'] },
  { name: 'Factures Clients', permissions: ['factures.view', 'factures.edit', 'factures.create', 'factures.validate'] },
  { name: 'Avoirs', permissions: ['avoirs.view', 'avoirs.edit', 'avoirs.create', 'avoirs.validate'] },
  { name: 'Règlements Clients', permissions: ['reglements.view', 'reglements.edit', 'reglements.create', 'reglements.validate'] },
  { name: 'Fournisseurs', permissions: ['fournisseurs.view', 'fournisseurs.edit', 'fournisseurs.create', 'fournisseurs.validate'] },
  { name: 'Règlements Fournisseurs', permissions: ['reglements-fourn.view', 'reglements-fourn.edit', 'reglements-fourn.create', 'reglements-fourn.validate'] },
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
  'expeditions': 'expeditions.view',
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
