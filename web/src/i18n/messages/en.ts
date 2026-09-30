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
  cookbooks: {
    title: 'Cookbooks',
    subtitle: 'Group your recipes by theme, season, or favorites.',
    sortLabel: 'Sort by',
    sortUpdated: 'Last updated',
    sortName: 'Name',
    orderAsc: 'Ascending',
    orderDesc: 'Descending',
    recipeCount: '{{count}} recipes',
    noCookbooksTitle: 'No cookbooks yet',
    noCookbooksSubtitle: 'Create your first cookbook to start organizing recipes.',
    addFabAriaLabel: 'Add item',
    addChooserTitle: 'Create',
    addRecipeOption: 'Recipe',
    addCookbookOption: 'Cookbook',
    recipeComingSoon: 'Recipe creation is coming soon.',
    createDialogTitle: 'Create cookbook',
    nameLabel: 'Cookbook name',
    cancelButton: 'Cancel',
    createButton: 'Create',
    errors: {
      required: 'Cookbook name is required.',
      maxLength: 'Cookbook name must be 500 characters or fewer.',
      duplicateGeneric: 'A cookbook with this name already exists.',
      createFailed: 'Could not create cookbook. Please try again.',
    },
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
