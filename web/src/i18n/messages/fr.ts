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
  nav: {
    logout: 'Se déconnecter',
    realtimeConnected: 'Temps réel : connecté',
    realtimeDisconnected: 'Temps réel : déconnecté',
    live: 'En direct',
    offline: 'Hors ligne',
  },
}

export default fr
