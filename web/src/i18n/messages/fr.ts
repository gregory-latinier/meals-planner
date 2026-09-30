import type { Messages } from '@/i18n'

const fr: Messages = {
  common: {
    appName: 'Planificateur de repas',
    appTagline: 'Votre hub de planification des repas',
    loading: 'Chargement…',
    error: 'Une erreur est survenue.',
  },
  auth: {
    login: {
      title: 'Bon retour',
      subtitle: 'Connectez-vous pour continuer',
      passwordLabel: 'Mot de passe du foyer',
      submitButton: 'Entrer',
      forgotPassword: 'Mot de passe oublié ?',
      errorGeneric: 'Échec de la connexion. Veuillez réessayer.',
      errorNetwork: 'Erreur réseau. Veuillez réessayer.',
      errorIncorrect: 'Mot de passe incorrect.',
      errorTooMany: 'Trop de tentatives. Veuillez réessayer plus tard.',
    },
    forgotPassword: {
      title: 'Réinitialiser le mot de passe',
    },
  },
  dashboard: {
    welcome: 'Bon retour',
    subtitle: 'Votre tableau de bord de planification des repas',
    weeklyMealPlan: {
      title: 'Plan de repas hebdomadaire',
      description: 'Planifiez vos repas pour la semaine à venir.',
    },
    groceryList: {
      title: 'Liste de courses',
      description: 'Générez automatiquement votre liste de courses depuis votre plan de repas.',
    },
    realtimeStatus: {
      title: 'État en temps réel',
      description: 'Synchronisation en direct sur tous les appareils du foyer.',
    },
    comingSoon: 'Bientôt disponible',
    connected: 'Connecté',
    disconnected: 'Déconnecté',
    lastEvent: 'Dernier événement',
  },
  cookbooks: {
    title: 'Livres de recettes',
    subtitle: 'Regroupez vos recettes par thème, saison ou favoris.',
    sortLabel: 'Trier par',
    sortUpdated: 'Dernière mise à jour',
    sortName: 'Nom',
    orderAsc: 'Croissant',
    orderDesc: 'Décroissant',
    recipeCount: '{{count}} recettes',
    noCookbooksTitle: 'Aucun livre de recettes',
    noCookbooksSubtitle: 'Créez votre premier livre pour commencer à organiser vos recettes.',
    addFabAriaLabel: 'Ajouter un élément',
    addChooserTitle: 'Créer',
    addRecipeOption: 'Recette',
    addCookbookOption: 'Livre de recettes',
    recipeComingSoon: 'La création de recette arrive bientôt.',
    createDialogTitle: 'Créer un livre de recettes',
    nameLabel: 'Nom du livre de recettes',
    cancelButton: 'Annuler',
    createButton: 'Créer',
    errors: {
      required: 'Le nom du livre de recettes est requis.',
      maxLength: 'Le nom du livre doit contenir 500 caractères maximum.',
      duplicateGeneric: 'Un livre de recettes avec ce nom existe déjà.',
      createFailed: 'Impossible de créer le livre de recettes. Veuillez réessayer.',
    },
  },
  nav: {
    logout: 'Se déconnecter',
    realtimeConnected: 'Temps réel : connecté',
    realtimeDisconnected: 'Temps réel : déconnecté',
    live: 'En direct',
    offline: 'Hors ligne',
  },
}

export default fr
