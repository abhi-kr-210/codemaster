# CodeMaster

A lightweight Next.js application for creating Java programming questions, running public tests, and submitting hidden tests with real Java compilation on the server.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the local development server:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:3000` in your browser.

## How to use

- Write the problem statement.
- Add public and hidden testcases.
- Enter Java source code in the editor.
- Click `Execute public tests` to run public cases.
- Click `Submit hidden tests` to run hidden cases and confirm completion.

## Files

- `pages/index.js` - main UI and frontend logic.
- `pages/api/compile.js` - backend API that compiles and runs Java with `javac` and `java`.
- `styles/globals.module.css` - app styling.
- `package.json` - Next.js project configuration.

## Notes

- This app uses your local Java toolchain. Make sure `javac` and `java` are installed and available in your PATH.
- The compiler runs on the local Next.js server and is not deployed as a cloud service.
