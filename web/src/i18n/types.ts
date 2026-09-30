export interface Messages {
  common: {
    appName: string
    appTagline: string
    loading: string
    error: string
  }
  auth: {
    login: {
      title: string
      subtitle: string
      passwordLabel: string
      submitButton: string
      forgotPassword: string
      errorGeneric: string
      errorNetwork: string
      errorIncorrect: string
      errorTooMany: string
    }
    forgotPassword: {
      title: string
    }
  }
  dashboard: {
    welcome: string
    subtitle: string
    weeklyMealPlan: {
      title: string
      description: string
    }
    groceryList: {
      title: string
      description: string
    }
    realtimeStatus: {
      title: string
      description: string
    }
    comingSoon: string
    connected: string
    disconnected: string
    lastEvent: string
  }
  cookbooks: {
    title: string
    subtitle: string
    sortLabel: string
    sortUpdated: string
    sortName: string
    orderAsc: string
    orderDesc: string
    recipeCount: string
    noCookbooksTitle: string
    noCookbooksSubtitle: string
    addFabAriaLabel: string
    addChooserTitle: string
    addRecipeOption: string
    addCookbookOption: string
    recipeComingSoon: string
    createDialogTitle: string
    nameLabel: string
    cancelButton: string
    createButton: string
    errors: {
      required: string
      maxLength: string
      duplicateGeneric: string
      createFailed: string
    }
  }
  nav: {
    logout: string
    realtimeConnected: string
    realtimeDisconnected: string
    live: string
    offline: string
  }
}

export type Locale = 'en' | 'fr'

export const SUPPORTED_LOCALES: Locale[] = ['en', 'fr']
export const DEFAULT_LOCALE: Locale = 'en'
