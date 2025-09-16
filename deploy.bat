@echo off
echo 🚀 Starting deployment process...

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: package.json not found. Please run this script from the project root.
    pause
    exit /b 1
)

REM Install dependencies
echo 📦 Installing dependencies...
call npm run install-all

REM Build the React app
echo 🏗️  Building React application...
cd client
call npm run build
cd ..

REM Check if build was successful
if not exist "client\build" (
    echo ❌ Error: Build failed. Please check for errors.
    pause
    exit /b 1
)

echo ✅ Build completed successfully!

REM Copy environment file if it doesn't exist
if not exist "server\.env" (
    echo ⚠️  Warning: server\.env not found. Creating from example...
    copy server\env.example server\.env
    echo 📝 Please edit server\.env and add your OpenAI API key.
)

echo 🎉 Deployment preparation completed!
echo.
echo Next steps:
echo 1. Add your OpenAI API key to server\.env
echo 2. Commit and push your changes to GitHub
echo 3. GitHub Actions will automatically deploy to GitHub Pages
echo.
echo To run locally:
echo   npm run dev
echo.
echo To run production build:
echo   npm start
pause
