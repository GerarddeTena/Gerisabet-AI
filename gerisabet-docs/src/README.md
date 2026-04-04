# src/ — Frontend React

Directorio raíz del frontend de Gerisabet AI. Construido con **React 19 + TypeScript**, empaquetado con Vite.

## Punto de entrada
- `main.tsx` → `App.tsx` → `Layout.tsx` → rutas anidadas

## Estructura de directorios

| Directorio / Archivo | Descripción |
|---|---|
| `main.tsx` | Bootstrap de React: fuentes, estilos globales, HashRouter |
| `App.tsx` | Shell principal: rutas, estado global, eventos Tauri |
| `App.css` | Vacío (los estilos están en `styles/`) |
| `vite-env.d.ts` | Declaración de tipos de entorno Vite |
| `assets/` | Componentes de iconos SVG |
| `components/` | Componentes UI reutilizables |
| `dashboard/` | Visualizador del historial de chat |
| `form/` | Formulario de entrada y selector de modelo |
| `hooks/` | Custom hooks: indexación y sesiones de chat |
| `layout/` | Shell de la aplicación (Drawer + Outlet) |
| `pages/` | Vistas enrutadas: Indexer e Historial |
| `styles/` | Hojas de estilos CSS: tokens, layout, drawer |
| `types/` | Interfaces TypeScript compartidas |
| `utils/` | Utilidades menores |
