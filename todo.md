# SlideForge Future Roadmap & QoL Improvements

This document outlines suggested features and improvements to elevate SlideForge from a presentation builder to a professional-grade creative suite.

## 🚀 Priority Quality of Life (QoL)
- [x] **Keyboard Shortcuts Overlay**: Press `?` to show a beautiful modal listing all shortcuts (Ctrl+S, Ctrl+Z, arrow keys for nudging, etc.).
- [x] **Smart Snap-to-Grid & Alignment Guides**: Show dynamic purple/blue lines when an element aligns with the center or edges of other elements.
- [x] **Canvas Zoom & Pan**: Add a zoom slider and the ability to space-drag (pan) around the canvas for detailed editing.
- [x] **Context Menu (Right Click)**: Right-click on elements for quick actions like "Bring to Front," "Send to Back," "Duplicate," or "Lock."
- [x] **Real-time Slide Thumbnails**: Ensure the sidebar thumbnails update instantly as the user types or moves elements.
- [x] **Multi-Select Grouping**: Allow users to select multiple elements and group them (`Ctrl+G`) to move or resize them as one.

## 🎨 Design & Content
- [x] **Slide Layout Templates**: Pre-defined "Master Slides" (e.g., Title Slide, Two-Column Comparison, Image + Caption).
- [x] **Global Color Palette**: Let users define 5-6 brand colors that stay at the top of every color picker for consistency.
- [ ] **Media Library**: A panel to browse previously uploaded images and videos without re-uploading.
- [x] **Native Table Support**: A dedicated table element with rows/columns editing, similar to Notion or Excel.
- [x] **Integrated Chart Builder**: Simple Bar/Pie/Line charts using Chart.js or D3.js.

## 🤖 AI & Smart Features
- [x] **AI-Powered "Clean Up"**: One-click button to automatically align elements and fix spacing on the current slide.
- [ ] **AI Image Generation (DALL-E/Stable Diffusion)**: Generate background images or icons directly from a prompt inside the editor.
- [ ] **Text Refinement**: "Make this more professional" or "Summarize into bullets" using an LLM.
- [ ] **PDF/Doc to Slide**: Upload a document and have the AI automatically chunk it into a presentation outline.

## 📤 Advanced Export & Sharing
- [ ] **Publish to Web**: Generate a unique, public URL for the presentation (requires backend hosting logic).
- [ ] **Speaker Notes Panel**: Dedicated area for notes that only the presenter sees in a "Presenter View" window.
- [ ] **Self-Running Mode**: Timed transitions for kiosks or trade show displays.
- [x] **High-Resolution Image Export**: Export individual slides as 4K PNGs for social media or print.

## 🛠 Technical Debt / Performance
- [ ] **State Compression**: Compress the `state_json` in the database to handle extremely large presentations more efficiently.
- [ ] **Asset Lazy Loading**: Only load media for the current and adjacent slides to keep the editor snappy.
- [ ] **Offline Mode**: Use Service Workers to allow editing even when the internet is flaky, syncing once back online.
