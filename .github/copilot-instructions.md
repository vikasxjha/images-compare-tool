<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Image Comparison Tool - Copilot Instructions

This is a responsive web application for comparing two images side by side with visual difference detection capabilities.

## Project Structure

- `index.html` - Main HTML structure with upload areas, controls, and comparison views
- `styles.css` - Responsive CSS with mobile-first design and smooth animations
- `script.js` - JavaScript with ES6 classes for image handling, canvas manipulation, and diff algorithms

## Key Features

- Drag and drop image uploads
- Three comparison modes: side-by-side, slider overlay, and difference highlighting
- Canvas-based image rendering for pixel-level comparisons
- Responsive design that works on mobile and desktop
- Visual diff algorithm with customizable sensitivity threshold

## Technical Details

- Uses HTML5 Canvas API for image manipulation and comparison
- FileReader API for client-side image processing
- CSS Grid and Flexbox for responsive layouts
- Event-driven architecture with proper error handling
- No external dependencies - pure HTML/CSS/JavaScript

## Code Style Guidelines

- Use ES6+ features (classes, arrow functions, const/let)
- Follow semantic HTML structure
- Use CSS custom properties for theming
- Implement proper accessibility features
- Keep functions focused and modular
- Add proper error handling and user feedback

## Browser Compatibility

- Modern browsers supporting Canvas API, FileReader, and ES6
- Mobile browsers with touch and gesture support
- Progressive enhancement approach
