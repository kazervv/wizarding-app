# Wizarding Workflow React App

A React web application for running the fal.ai wizarding workflow with video uploads.

## Features

- ✅ API key input with secure storage and validation
- ✅ Upload up to 4 images with preview and removal options
- ✅ Submit workflow with loading state
- ✅ Real-time progress tracking via streaming API
- ✅ Video result display with inline player
- ✅ Download functionality for result video

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open http://localhost:5173/ in your browser

## Usage

1. **Enter API Key**: Input your fal.ai API key (it will be hidden after submission)
2. **Upload Images**: Click the upload slots to add up to 4 images
3. **Enter Prompt**: Describe what you want the AI to do with the images
4. **Submit Workflow**: Click "Submit Workflow" to start processing
5. **Monitor Progress**: Watch the real-time progress updates
6. **View Results**: Play the result video inline or download it

## Workflow Endpoint

The app uses the workflow: `https://fal.ai/workflows/derek/wizarding-5-no-extend`

## Technologies

- React 18
- Vite
- @fal-ai/client for workflow integration
- Modern CSS Grid and Flexbox for responsive design