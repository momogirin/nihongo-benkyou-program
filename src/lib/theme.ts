export type ThemeMode = 'system' | 'light' | 'dark'

const THEME_KEY = 'kanjiApp.theme'

export function getStoredTheme(): ThemeMode {
  const raw = localStorage.getItem(THEME_KEY)
  return raw === 'light' || raw === 'dark' ? raw : 'system'
}

// 'system' clears the override so tokens.css's prefers-color-scheme media
// query decides; 'light'/'dark' stamp data-theme, which tokens.css's
// :root[data-theme=...] rules win over that media query on specificity
export function applyTheme(mode: ThemeMode) {
  if (mode === 'system') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.setAttribute('data-theme', mode)
  }
}

export function setTheme(mode: ThemeMode) {
  if (mode === 'system') {
    localStorage.removeItem(THEME_KEY)
  } else {
    localStorage.setItem(THEME_KEY, mode)
  }
  applyTheme(mode)
}
