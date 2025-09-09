# Wizarding - Images to Video Adventure Generator

Transform your images into magical fantasy world video adventures using AI. Upload up to 4 images and watch as they're transformed into a cinematic journey through four unique fantasy locations. The Video results is about around 30 seconds

## Prerequisites

- Node.js 18+ installed
- A fal.ai account with at least $13 in credits
- Your fal.ai API key (get it at [https://fal.ai/](https://fal.ai/))

## Installation to Running it Locally

1. Clone the repository:
```bash
git clone git@github.com:derekalia/wizarding.git
cd wizarding
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:5173`

## Usage

### Step 1: Enter API Key
- When you first open the app, you'll be prompted to enter your fal.ai API key
- Make sure you have at least $13 in credits on your fal.ai account
- Your API key will be used to access the AI models for image and video generation

### Step 2: Upload Images
- Click on the upload boxes to select images from your computer
- You can upload between 1 to 4 images
- These images will serve as inspiration for your fantasy world locations

### Step 3: Generate Your Fantasy World
- Once your images are uploaded, click the "Generate Fantasy World" button
- The AI will:
  1. Analyze your images and create detailed fantasy world descriptions
  2. Generate 4 unique fantasy location images based on your input
  3. Convert each image into a video sequence
  4. Merge all videos into a final cinematic journey
- The entire process takes approximately 2-3 minutes

### Step 4: Download Your Video
- Once complete, you can preview your fantasy world video directly in the browser
- Click the "Download Video" button to save the final video to your computer

## Important Notes

- **Cost**: Each full generation uses approximately $13 of fal.ai credits
- **Processing Time**: The complete workflow takes 2-3 minutes
- **File Size**: Final videos are typically 10-20 MB

## Tech Stack

- React + Vite
- Tailwind CSS
- ShadCN UI Components  
- fal.ai API for AI processing
