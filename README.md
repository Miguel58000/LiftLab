# LiftLab (PulseSplit)

> 🌐 **Languages / Idiomas:** [English](#liftlab) · [Español](#liftlab)

LiftLab is a next-generation fitness routine analyzer and tracking application. It helps users design their training splits day by day, provides smart suggestions and metrics (like weekly sets per muscle group, balance score, and efficiency score), estimates training durations, and calculates nutritional recommendations (macros) based on workout volume.


---

## 🚀 Key Features

- **Workout Builder**: Easily build and organize your routine days (e.g., Push, Pull, Legs) with custom sets, reps, weight, and rest durations.
- **Analysis Dashboard**: Real-time analysis of weekly muscle group volume (including primary/secondary muscle load contributions), muscle balance radar charts, and muscle heatmap fatigue distribution.
- **Smart Optimizer Assistant**: Walks you through generating a personalized, balanced routine day split matching your strong points and priority muscles.
- **Progress Tracking**: Log workout sessions with advanced metrics like Weight per Rep and Speed Deviation (cardio consistency), and review trends in efficiency and intensity.
- **Mobile-First Data Entry**: Intelligent UI with manual decimal support (dot/comma), exercise-specific numeric keyboards, and type-validation for fast, precise logging during training.
- **Smart PR Alerts**: Real-time detection of Personal Records (PRs) that cross-references your entire training history to celebrate genuine strength milestones.
- **Dynamic Exercise Context**: An intelligent UI that adapts terminology (e.g., "Intervals" vs. "Sets") and tracking metrics based on the type of exercise (Cardio vs. Strength).
- **Warm-up & Feeder Sets**: Support for marking preparation sets to distinguish them from effective working sets in volume analytics.
- **Nutritional Guidance**: Built-in macro calculator estimating daily calories, protein, carbs, and fat requirements tailored to your profile goals (bulking, cutting, or maintenance).
- **Cross-Device Syncing**: Integrated Firebase Auth & Firestore database to store and sync your user profiles and workouts securely.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16.2 (App Router with Turbopack)
- **Language**: TypeScript
- **State Management**: Zustand (with localStorage persistence)
- **Styling**: Tailwind CSS & Lucide Icons
- **UI Components**: Base UI & custom components
- **Backend / Sync**: Firebase Auth & Cloud Firestore
- **Data Visualization**: Recharts (radar charts, bar charts)

---

## 📁 Project Structure

```text
LiftLab/
├── package.json          # Root scripts runner (delegates to pulsesplit/)
├── LiftLab/           # Main Next.js project folder
│   ├── src/
│   │   ├── app/          # App Router pages and page-specific layouts
│   │   ├── components/   # UI elements (buttons, inputs, dialogs)
│   │   ├── lib/          # Analysis logic, macros formulas, and exercises database
│   │   └── store/        # Zustand global state persistence
│   ├── package.json      # Dependencies and build settings
│   └── firestore.rules   # Firebase security rules
└── README.md             # This documentation
```

---

## 🚦 Getting Started

You can run the application directly from the **workspace root** using the delegated scripts.

### Installation

First, navigate to the `pulsesplit` directory and install the dependencies:

```bash
cd LiftLab
npm install
```

### Run the Development Server

You can start the dev server from the **root directory** (thanks to root-level npm delegation):

```bash
npm run dev
```

Or run directly inside the `pulsesplit` folder:

```bash
cd LiftLab
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Build and Start for Production

```bash
npm run build
npm run start
```

---

## 📜 Version History

### `v1.1.0` (Current Release - 2026-06-07)

- **Advanced Progress Metrics**: Integrated Sets, Weight per Rep, and Speed Deviation (Cardio Consistency) into charts and data tables.
- **Warm-up Set Logic**: Integrated a "Warm-up" toggle for sets, allowing users to track preparation without inflating effective volume metrics.
- **Contextual Terminology**: Dynamic UI labels that switch between "Intervals" (cardio) and "Sets" (strength) across the entire app.
- **Smart PR Logic**: Refined Personal Record detection that cross-references current session data and history to prevent duplicate alerts.
- **Improved Data Entry**: Manual decimal support (dot/comma) with mobile-optimized numeric keyboards and exercise-type specific validation.
- **Builder Enhancements**: Fully localized counters ("5 días") and units, improving the user experience for multi-language support.
- **Quality of Life**: Replaced total reps with Weight per Rep for better intensity tracking in strength exercises.

### `v1.0.0` (Initial Release - 2026-05-25)

- **Initial Release**: Full implementation of the Next.js client-side application.
- **State Management**: Implemented Zustand storage for offline usability and state persistence.
- **Integrations**: Firebase Authentication and Firestore database backup and recovery.
- **Layout Refinements**: Added a responsive, clean, theme-aware footer with versioning information.
- **Bug Fixes**: Resolved the DialogTrigger nested button hydration issue on next-themes and header layouts.
- **Quality Enhancements**: Unified type definitions for muscle groups (`Tibialis`, `Brachialis`, `Psoas`) and cleaned up redundant typecasts.

---

---

# LiftLab (PulseSplit)

> 🌐 **Idiomas / Languages:** [Español](#liftlab) · [English](#liftlab)

LiftLab es una aplicación de análisis y seguimiento de rutinas de entrenamiento de próxima generación. Permite a los usuarios diseñar su división de entrenamiento día a día, ofrece sugerencias inteligentes y métricas clave (como series semanales por grupo muscular, puntuación de balance y puntuación de eficiencia), estima la duración del entrenamiento y calcula recomendaciones nutricionales (macros) en función del volumen de entrenamiento.

El proyecto está estructurado con la aplicación Next.js dentro del subdirectorio `/pulsesplit`, con scripts de ejecución disponibles en la raíz del workspace.

---

## 🚀 Funcionalidades Principales

- **Constructor de Rutinas**: Armá y organizá fácilmente tus días de entrenamiento (ej. Empuje, Tirón, Piernas) con series, repeticiones, peso y tiempos de descanso personalizados.
- **Panel de Análisis**: Análisis en tiempo real del volumen semanal por grupo muscular (incluyendo la contribución de músculos primarios y secundarios), gráficos radar de balance muscular y mapa de calor de distribución de fatiga.
- **Asistente de Optimización**: Te guía para generar una división de rutina personalizada y equilibrada según tus puntos fuertes y músculos prioritarios.
- **Seguimiento de Progreso**: Registrá tus sesiones con métricas avanzadas como Peso por Repetición y Desvío de Velocidad (consistencia), y revisá tendencias de eficiencia e intensidad.
- **Entrada de Datos Optimizada**: Interfaz inteligente con soporte para decimales, teclados numéricos específicos por ejercicio y validación de tipos para un registro rápido y preciso.
- **Alertas de PR Inteligentes**: Detección en tiempo real de Récords Personales (PR) que cruza datos con todo tu historial para celebrar hitos de fuerza reales.
- **Contexto Dinámico de Ejercicios**: Una interfaz inteligente que adapta la terminología (ej. "Intervalos" vs "Series") y las métricas de seguimiento según el tipo de ejercicio (Cardio vs Fuerza).
- **Series de Aproximación**: Soporte para marcar series de preparación para distinguirlas de las series efectivas en el análisis de volumen.
- **Guía Nutricional**: Calculadora de macros integrada que estima los requerimientos diarios de calorías, proteínas, carbohidratos y grasas según tus objetivos (volumen, definición o mantenimiento).
- **Sincronización Multidispositivo**: Integración con Firebase Auth y Firestore para almacenar y sincronizar perfiles y entrenamientos de forma segura.

---

## 🛠️ Tecnologías Utilizadas

- **Framework**: Next.js 16.2 (App Router con Turbopack)
- **Lenguaje**: TypeScript
- **Gestión de Estado**: Zustand (con persistencia en localStorage)
- **Estilos**: Tailwind CSS & Lucide Icons
- **Componentes UI**: Base UI & componentes personalizados
- **Backend / Sincronización**: Firebase Auth & Cloud Firestore
- **Visualización de Datos**: Recharts (gráficos radar y de barras)

---

## 📁 Estructura del Proyecto

```text
LiftLab/
├── package.json          # Scripts raíz (delegan a pulsesplit/)
├── LiftLab/           # Carpeta principal del proyecto Next.js
│   ├── src/
│   │   ├── app/          # Páginas y layouts del App Router
│   │   ├── components/   # Elementos UI (botones, inputs, diálogos)
│   │   ├── lib/          # Lógica de análisis, fórmulas de macros y base de ejercicios
│   │   └── store/        # Estado global persistente con Zustand
│   ├── package.json      # Dependencias y configuración de build
│   └── firestore.rules   # Reglas de seguridad de Firebase
└── README.md             # Esta documentación
```

---

## 🚦 Cómo Empezar

Podés ejecutar la aplicación directamente desde la **raíz del workspace** usando los scripts delegados.

### Instalación

Primero, navegá al directorio `LiftLab` e instalá las dependencias:

```bash
cd LiftLab
npm install
```

### Servidor de Desarrollo

Podés iniciar el servidor desde el **directorio raíz** (gracias a la delegación npm de nivel raíz):

```bash
npm run dev
```

O ejecutarlo directamente dentro de la carpeta `LiftLab`:

```bash
cd LiftLab
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000) en tu navegador para ver el resultado.

### Build y Producción

```bash
npm run build
npm run start
```

---

## 📜 Historial de Versiones

### `v1.1.0` (Versión Actual - 07/06/2026)

- **Métricas de Progreso Avanzadas**: Inclusión de Series, Peso por Repetición y Desvío de Velocidad (Consistencia) en gráficos y tablas de progreso.
- **Lógica de Series de Aproximación**: Implementación de un selector para series de calentamiento, permitiendo el registro sin inflar el volumen efectivo.
- **Terminología Contextual**: Adaptación dinámica de etiquetas ("Intervalos" para cardio, "Series" para fuerza) en toda la aplicación.
- **Optimización de PRs**: Nueva lógica de detección de Récords Personales que compara contra la sesión actual y el historial para eliminar notificaciones redundantes.
- **Entrada de Datos Flexibles**: Soporte para decimales (punto y coma) con teclados numéricos optimizados para móviles y validación de tipos de ejercicio.
- **Mejoras en el Constructor**: Localización completa de contadores ("5 días") y unidades, mejorando la experiencia en español.
- **Calidad de Vida**: Sustitución de repeticiones totales por "Peso por Repetición" para un mejor seguimiento de la intensidad.

### `v1.0.0` (Lanzamiento Inicial - 25/05/2026)

- **Lanzamiento Inicial**: Implementación completa de la aplicación cliente con Next.js.
- **Gestión de Estado**: Implementación de Zustand con persistencia para uso offline y continuidad de estado.
- **Integraciones**: Autenticación con Firebase y base de datos Firestore para backup y sincronización.
- **Ajustes de Layout**: Footer responsivo, limpio y con soporte de temas, con información de versión incluida.
- **Corrección de Errores**: Resuelto el error de hidratación por botón anidado en `DialogTrigger` con next-themes.
- **Mejoras de Calidad**: Definiciones de tipo unificadas para grupos musculares (`Tibialis`, `Brachialis`, `Psoas`) y eliminación de casteos redundantes.
