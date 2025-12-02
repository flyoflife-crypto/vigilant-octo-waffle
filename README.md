# Mars OnePager - Project Management Tool

Desktop and web application for creating one-page project summaries with Gantt charts, KPIs, and team performance tracking.

## 🚀 Live Demo

**Web App:** [https://flyoflife-crypto.github.io/vigilant-octo-waffle-SP/](https://flyoflife-crypto.github.io/vigilant-octo-waffle-SP/)

**Desktop App:** Download and build locally (see below)

## 📦 Quick Start

### Web Version (GitHub Pages)

Just visit: [https://flyoflife-crypto.github.io/vigilant-octo-waffle-SP/](https://flyoflife-crypto.github.io/vigilant-octo-waffle-SP/)

**Note:** Projects are stored in browser localStorage only. SharePoint integration requires additional configuration.

### Desktop Version

```
# Clone repository
git clone https://github.com/flyoflife-crypto/vigilant-octo-waffle-SP.git
cd vigilant-octo-waffle-SP

# Install dependencies
npm install

# Run Electron app
npm run dev:electron

# Build desktop app
npm run build:all
npm run pack
```

## 🏗️ Architecture

- **Frontend:** Next.js 14 (React 18, TypeScript, Tailwind CSS)
- **Desktop:** Electron 31
- **Storage:** Browser localStorage (web) / SharePoint (optional)
- **Hosting:** GitHub Pages (web) / Standalone (desktop)

---

