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
    viewLabel: string
    viewList: string
    viewGrid: string
    sortLabel: string
    sortUpdated: string
    sortName: string
    orderAsc: string
    orderDesc: string
    recipeCount: string
    imageFallback: string
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
  recipes: {
    title: string
    subtitle: string
    tabRecipes: string
    tabCookbooks: string
    viewLabel: string
    viewList: string
    viewGrid: string
    imageFallback: string
    sortLabel: string
    sortUpdated: string
    sortTitle: string
    orderAsc: string
    orderDesc: string
    noRecipesTitle: string
    noRecipesSubtitle: string
    addFabAriaLabel: string
    addChooserTitle: string
    writeFromScratchOption: string
    importTextOption: string
    importTextHint: string
    importTextFieldLabel: string
    importTextFieldPlaceholder: string
    importTextAction: string
    importTextLoading: string
    importUrlOption: string
    importUrlHint: string
    importUrlFieldLabel: string
    importUrlFieldPlaceholder: string
    importUrlAction: string
    importUrlLoading: string
    importUrlSuccess: string
    comingSoon: string
    statusDraft: string
    statusPublished: string
    backToRecipes: string
    editRecipeButton: string
    editorTitleCreate: string
    editorSubtitle: string
    untitledFallback: string
    noIngredients: string
    noInstructions: string
    metaServings: string
    metaPrepMinutes: string
    metaCookMinutes: string
    titleLabel: string
    cookbookLabel: string
    noCookbookOption: string
    servingsLabel: string
    increaseServingsAriaLabel: string
    decreaseServingsAriaLabel: string
    prepMinutesLabel: string
    cookMinutesLabel: string
    sourceUrlLabel: string
    tagsLabel: string
    imageLabel: string
    imageUploadButton: string
    imageCaptureButton: string
    ingredientsTitle: string
    instructionsTitle: string
    addIngredientItem: string
    addIngredientHeading: string
    addInstructionItem: string
    addInstructionHeading: string
    ingredientHeadingLabel: string
    ingredientNameLabel: string
    ingredientQuantityLabel: string
    ingredientUnitLabel: string
    ingredientNoteLabel: string
    instructionTextLabel: string
    rowKindIngredientItem: string
    rowKindTextItem: string
    rowKindHeading: string
    moveUp: string
    moveDown: string
    removeRow: string
    autosaveSaved: string
    autosaveSaving: string
    autosaveUnsaved: string
    autosaveError: string
    publishButton: string
    saveDraftButton: string
    createCookbookButton: string
    createCookbookDialogTitle: string
    cancelButton: string
    createButton: string
    unsavedChangesPrompt: string
    errors: {
      titleRequired: string
      titleMaxLength: string
      instructionItemMaxLength: string
      loadFailed: string
      draftCreateFailed: string
      importTextRequired: string
      importTextInvalid: string
      importTextFailed: string
      importUrlRequired: string
      importUrlInvalid: string
      importUrlFailed: string
      saveFailed: string
      publishFailed: string
      imageUploadFailed: string
      viewLoadFailed: string
      cookbookCreateFailed: string
      cookbookDuplicate: string
      cookbookRequired: string
      cookbookMaxLength: string
    }
  }
  stores: {
    title: string
    subtitle: string
    sortLabel: string
    sortUpdated: string
    sortName: string
    orderAsc: string
    orderDesc: string
    noStoresTitle: string
    noStoresSubtitle: string
    addFabAriaLabel: string
    createDialogTitle: string
    editDialogTitle: string
    nameLabel: string
    cancelButton: string
    createButton: string
    saveButton: string
    deleteButton: string
    editButtonAriaLabel: string
    deleteButtonAriaLabel: string
    deleteConfirm: string
    errors: {
      required: string
      maxLength: string
      duplicateGeneric: string
      createFailed: string
      updateFailed: string
      deleteFailed: string
      notFound: string
    }
  }
  settings: {
    title: string
    subtitle: string
    backToApp: string
    saveButton: string
    saved: string
    aiSection: {
      title: string
      description: string
      modelLabel: string
      apiKeyLabel: string
      apiKeyHint: string
      apiKeyConfigured: string
      apiKeyNotConfigured: string
      apiKeyUpdatedAtLabel: string
      removeKeyButton: string
      models: {
        geminiFree: string
      }
    }
    errors: {
      loadFailed: string
      saveFailed: string
    }
  }
  nav: {
    logout: string
    settings: string
    realtimeConnected: string
    realtimeDisconnected: string
    live: string
    offline: string
    recipesTab: string
    storesTab: string
  }
}

export type Locale = 'en' | 'fr'

export const SUPPORTED_LOCALES: Locale[] = ['en', 'fr']
export const DEFAULT_LOCALE: Locale = 'en'
