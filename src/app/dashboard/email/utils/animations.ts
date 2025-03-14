/**
 * Animation utilities for email page components
 * This file contains animation configurations for smooth transitions
 */

// Base animation variants for page transitions
export const pageTransitionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.3,
      ease: [0.25, 0.1, 0.25, 1.0] // Cubic bezier easing
    }
  },
  exit: { 
    opacity: 0, 
    y: -10,
    transition: { 
      duration: 0.2,
      ease: [0.25, 0.1, 0.25, 1.0] 
    }
  }
};

// List item staggered animation
export const listItemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: (custom: number) => ({
    opacity: 1,
    x: 0,
    transition: { 
      delay: custom * 0.05, // Stagger based on index
      duration: 0.25,
      ease: "easeOut"
    }
  })
};

// Fade in animation for components
export const fadeInVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { 
      duration: 0.3,
      ease: "easeInOut"
    }
  }
};

// Scale and fade animation for modals and popovers
export const modalVariants = {
  hidden: { 
    opacity: 0, 
    scale: 0.95,
    y: 10
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    y: 0,
    transition: { 
      type: "spring", 
      stiffness: 300, 
      damping: 25 
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: { 
      duration: 0.15,
      ease: "easeIn"
    }
  }
};

// Slide in from right animation for detail view
export const slideInRightVariants = {
  hidden: { opacity: 0, x: 50 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { 
      type: "spring", 
      stiffness: 300, 
      damping: 30
    }
  },
  exit: { 
    opacity: 0, 
    x: 50,
    transition: { 
      duration: 0.2
    }
  }
};

// Custom loading animations
export const spinnerVariants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      ease: "linear",
      repeat: Infinity
    }
  }
};

// Button hover animation preset
export const buttonHoverAnimation = {
  whileHover: { scale: 1.03 },
  whileTap: { scale: 0.97 },
  transition: { duration: 0.2 }
}; 