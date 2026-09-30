import type { Messages } from '@/i18n'

const en: Messages = {
  common: {
    appName: 'Meals Planner',
    appTagline: 'Your household meal planning hub',
    loading: 'Loading…',
    error: 'An error occurred.',
  },
  auth: {
    login: {
      title: 'Welcome back',
      subtitle: 'Sign in to continue',
      passwordLabel: 'Household Password',
      submitButton: 'Enter',
      forgotPassword: 'Forgot password?',
      errorGeneric: 'Login failed. Please try again.',
      errorNetwork: 'Network error. Please try again.',
      errorIncorrect: 'Incorrect password.',
      errorTooMany: 'Too many attempts. Please try again later.',
    },
    forgotPassword: {
      title: 'Reset password',
    },
  },
  dashboard: {
    welcome: 'Welcome back',
    subtitle: 'Your household meal planning dashboard',
    weeklyMealPlan: {
      title: 'Weekly Meal Plan',
      description: 'Plan your meals for the week ahead.',
    },
    groceryList: {
      title: 'Grocery List',
      description: 'Auto-generate your shopping list from your meal plan.',
    },
    realtimeStatus: {
      title: 'Realtime Status',
      description: 'Live sync across all household devices.',
    },
    comingSoon: 'Coming soon',
    connected: 'Connected',
    disconnected: 'Disconnected',
    lastEvent: 'Last event',
  },
  nav: {
    logout: 'Logout',
    realtimeConnected: 'Realtime: connected',
    realtimeDisconnected: 'Realtime: disconnected',
    live: 'Live',
    offline: 'Offline',
  },
}

export default en
