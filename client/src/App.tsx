import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedLayout } from './components/ProtectedLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import RecipesPage from './pages/RecipesPage'
import RecipeViewPage from './pages/RecipeViewPage'
import RecipeEditorPage from './pages/RecipeEditorPage'
import CookbooksPage from './pages/CookbooksPage'
import SettingsPage from './pages/SettingsPage'
import MealPlanPage from './pages/MealPlanPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Navigate to="/recipes" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/recipes" element={<RecipesPage />} />
        <Route path="/recipes/:recipeId" element={<RecipeViewPage />} />
        <Route path="/recipes/:recipeId/edit" element={<RecipeEditorPage />} />
        <Route path="/meal-plan" element={<MealPlanPage />} />
        <Route path="/cookbooks" element={<CookbooksPage />} />
        <Route path="/stores" element={<Navigate to="/settings?tab=stores" replace />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/recipes" replace />} />
    </Routes>
  )
}
