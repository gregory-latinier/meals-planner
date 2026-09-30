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
