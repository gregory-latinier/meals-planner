import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider, CssBaseline } from '@mui/material'
import theme from './theme/theme'
import { I18nProvider } from './i18n/I18nContext'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <I18nProvider>
          <App />
        </I18nProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
)
