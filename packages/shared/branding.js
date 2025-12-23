// Branding configuration for Shreem POS
// Contains all branding-related constants and configurations

const BRAND_CONFIG = {
  // App Information
  appName: 'Shreem POS',
  appVersion: '1.0.0',
  appDescription: 'Point of Sale and Inventory Management System',
  
  // Company Information
  company: {
    name: 'Shreem Technologies',
    website: 'https://shreem.com',
    email: 'support@shreem.com',
    phone: '+1-800-SHREEM',
    address: '123 Business Ave, Suite 100, City, State 12345'
  },
  
  // Visual Branding
  colors: {
    primary: '#2563eb',      // Blue
    secondary: '#10b981',    // Green
    accent: '#f59e0b',       // Amber
    danger: '#ef4444',       // Red
    warning: '#f59e0b',      // Amber
    success: '#10b981',      // Green
    info: '#3b82f6',         // Blue
    dark: '#1f2937',         // Gray-800
    light: '#f9fafb',        // Gray-50
    muted: '#6b7280',        // Gray-500
    border: '#e5e7eb'        // Gray-200
  },
  
  // Typography
  fonts: {
    primary: 'Inter, system-ui, sans-serif',
    mono: 'JetBrains Mono, Consolas, monospace',
    heading: 'Inter, system-ui, sans-serif'
  },
  
  // Layout
  layout: {
    sidebarWidth: '280px',
    headerHeight: '64px',
    footerHeight: '48px',
    containerPadding: '1.5rem',
    cardPadding: '1.5rem',
    buttonPadding: '0.5rem 1rem',
    inputPadding: '0.5rem 0.75rem'
  },
  
  // Breakpoints
  breakpoints: {
    xs: '475px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px'
  },
  
  // Animations
  animations: {
    duration: {
      fast: '150ms',
      normal: '250ms',
      slow: '350ms'
    },
    easing: {
      ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)'
    }
  },
  
  // Icons
  icons: {
    sizes: {
      xs: '16px',
      sm: '20px',
      md: '24px',
      lg: '32px',
      xl: '48px'
    }
  },
  
  // Theme
  theme: {
    light: {
      background: '#ffffff',
      surface: '#f9fafb',
      text: '#111827',
      textSecondary: '#6b7280',
      border: '#e5e7eb'
    },
    dark: {
      background: '#111827',
      surface: '#1f2937',
      text: '#f9fafb',
      textSecondary: '#9ca3af',
      border: '#374151'
    }
  },
  
  // Legal
  legal: {
    copyright: `© ${new Date().getFullYear()} Shreem Technologies. All rights reserved.`,
    termsUrl: '/terms',
    privacyUrl: '/privacy',
    licenseUrl: '/license'
  },
  
  // Support
  support: {
    documentation: 'https://docs.shreem.com',
    helpCenter: 'https://help.shreem.com',
    community: 'https://community.shreem.com',
    bugReport: 'https://bugs.shreem.com'
  }
};

// Theme utilities
const getTheme = (mode = 'light') => {
  return BRAND_CONFIG.theme[mode];
};

const getColor = (colorName) => {
  return BRAND_CONFIG.colors[colorName];
};

const getBreakpoint = (size) => {
  return BRAND_CONFIG.breakpoints[size];
};

// CSS utilities
const cssVariables = {
  ...Object.entries(BRAND_CONFIG.colors).reduce((acc, [key, value]) => ({
    ...acc,
    [`--color-${key}`]: value
  }), {}),
  ...Object.entries(BRAND_CONFIG.theme.light).reduce((acc, [key, value]) => ({
    ...acc,
    [`--theme-${key}`]: value
  }), {})
};

// Tailwind CSS configuration
const tailwindConfig = {
  theme: {
    extend: {
      colors: BRAND_CONFIG.colors,
      fontFamily: BRAND_CONFIG.fonts,
      screens: BRAND_CONFIG.breakpoints,
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem'
      },
      animation: {
        'fade-in': 'fadeIn 250ms ease-in-out',
        'slide-up': 'slideUp 250ms ease-out',
        'slide-down': 'slideDown 250ms ease-in'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        }
      }
    }
  }
};

module.exports = {
  BRAND_CONFIG,
  getTheme,
  getColor,
  getBreakpoint,
  cssVariables,
  tailwindConfig
};
