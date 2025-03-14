# Email Dashboard Module

This module provides a modern, responsive email dashboard with clean UI/UX design, smooth animations, and a consistent theming system.

## Design Principles

1. **Clean and Modern UI** - Aesthetically pleasing design with a focus on usability
2. **Responsive Layout** - Works seamlessly on all screen sizes from mobile to desktop
3. **Consistent Theming** - Uses theme context to maintain consistent styling
4. **Smooth Transitions** - Employs framer-motion for fluid animations
5. **Error Handling** - Graceful error states with user recovery options
6. **Loading States** - Skeleton loading and smooth transitions between states

## Component Structure

- `page.tsx` - Entry point and container component with folder navigation
- `components/EmailPage.tsx` - Main email page layout and functionality
- `components/EmailDetail.tsx` - Email detail view with animations
- `components/EmailSkeleton.tsx` - Loading skeleton components for various states
- `components/FeatureNotification.tsx` - Notification system for upcoming features
- `context/EmailProvider.tsx` - Context for email data management
- `context/ThemeContext.tsx` - Theme provider for consistent styling
- `hooks/useSmoothLoading.ts` - Custom hook for smooth loading transitions
- `hooks/usePageTransition.ts` - Custom hook for page transition animations
- `utils/animations.ts` - Animation configurations for framer-motion

## Custom Hooks

### useSmoothLoading

Prevents loading flashes by delaying loading indicators and ensuring minimum loading times.

```tsx
const { isLoading } = useSmoothLoading(actualLoadingState, {
  minLoadingTime: 500, // Minimum loading time in ms
  loadingDelay: 200,   // Delay before showing loading state
  initialLoading: true // Initial loading state
});
```

### usePageTransition

Manages transitions between different views or pages.

```tsx
const { isTransitioning, triggerTransition } = usePageTransition();

// Trigger transition when changing views
useEffect(() => {
  triggerTransition();
}, [folder]);
```

## Theme Context

Provides consistent theming across components with support for light and dark modes.

```tsx
const { theme, isDark, toggleTheme } = useTheme();

// Use theme values in components
<div style={{ color: theme.colors.primary }}>...</div>
```

## Animation Variants

Pre-configured animation variants for common UI patterns:

- `pageTransitionVariants` - For whole page transitions
- `listItemVariants` - For list items with staggered animations
- `fadeInVariants` - Simple fade-in animations
- `slideInRightVariants` - Slide-in from right (detail views)
- `modalVariants` - For modal dialogs

## Feature Notifications

Use the `showFeatureNotification` function to display toast notifications for upcoming features:

```tsx
showFeatureNotification({
  featureName: 'Feature Name',
  type: 'coming-soon', // or 'under-maintenance', 'beta'
  description: 'Custom description message'
});
```

## Skeleton Loading

Various skeleton components are available for different UI elements:

- `EmailListSkeleton` - For the email list
- `EmailDetailSkeleton` - For the email detail view
- `EmailListItemSkeleton` - For individual email list items

## Usage Guidelines

1. Always use the theme context for styling to maintain consistency
2. Implement smooth loading states for all asynchronous operations
3. Use animation variants consistently across components
4. Handle errors gracefully with user recovery options
5. Use skeleton loading instead of spinner loaders when possible
6. Notify users about upcoming features instead of showing broken UI

## Adding New Features

When adding new features:

1. Create new components in the appropriate directory
2. Use the theme context for styling
3. Implement smooth loading states
4. Add appropriate animations using the existing variants
5. Use feature notifications for partially implemented features
6. Update this README with any new patterns or guidelines 