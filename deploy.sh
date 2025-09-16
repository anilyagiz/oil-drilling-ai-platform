#!/bin/bash

# Oil Drilling AI Platform Deployment Script

echo "🚀 Starting deployment process..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm run install-all

# Build the React app
echo "🏗️  Building React application..."
cd client
npm run build
cd ..

# Check if build was successful
if [ ! -d "client/build" ]; then
    echo "❌ Error: Build failed. Please check for errors."
    exit 1
fi

echo "✅ Build completed successfully!"

# Copy environment file if it doesn't exist
if [ ! -f "server/.env" ]; then
    echo "⚠️  Warning: server/.env not found. Creating from example..."
    cp server/env.example server/.env
    echo "📝 Please edit server/.env and add your OpenAI API key."
fi

echo "🎉 Deployment preparation completed!"
echo ""
echo "Next steps:"
echo "1. Add your OpenAI API key to server/.env"
echo "2. Commit and push your changes to GitHub"
echo "3. GitHub Actions will automatically deploy to GitHub Pages"
echo ""
echo "To run locally:"
echo "  npm run dev"
echo ""
echo "To run production build:"
echo "  npm start"
