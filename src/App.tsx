import { useState, useRef, ChangeEvent } from 'react'
import { fal } from '@fal-ai/client'

interface WorkflowEvent {
  type: 'submit' | 'completion' | 'error' | 'output'
  node_id?: string
  app_id?: string
  request_id?: string
  message?: string
  error?: {
    status: number
    body: any
  }
  output?: {
    images?: Array<{
      url: string
      content_type: string
      file_name: string
      file_size: number | null
    }>
    video?: {
      url: string
      content_type: string
      file_name: string
      file_size: number
    }
    description?: string
  }
  details?: any
}

interface WorkflowResult {
  type: 'output'
  output: {
    video: {
      url: string
      content_type: string
      file_name: string
      file_size: number
    }
  }
}

interface GeneratedImage {
  url: string
  content_type: string
  file_name: string
  file_size: number | null
}

function App() {
  const [apiKey, setApiKey] = useState<string>('')
  const [apiKeySet, setApiKeySet] = useState<boolean>(false)
  const [images, setImages] = useState<File[]>([])
  const [prompt, setPrompt] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [result, setResult] = useState<WorkflowResult | null>(null)
  const [progress, setProgress] = useState<WorkflowEvent[]>([])
  const [currentStage, setCurrentStage] = useState<string>('')
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([])
  const [videosCompleted, setVideosCompleted] = useState<number>(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleApiKeySubmit = (): void => {
    if (apiKey.trim()) {
      fal.config({
        credentials: apiKey
      })
      setApiKeySet(true)
    }
  }

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>): void => {
    const files = Array.from(e.target.files || [])
    if (images.length + files.length <= 4) {
      setImages(prev => [...prev, ...files])
    }
  }

  const removeImage = (index: number): void => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const submitWorkflow = async (): Promise<void> => {
    if (images.length === 0) return
    
    setIsLoading(true)
    setProgress([])
    setResult(null)
    setCurrentStage('Uploading images...')
    setGeneratedImages([])
    setVideosCompleted(0)

    try {
      const imageUrls: string[] = []
      for (const image of images) {
        const imageUrl = await fal.storage.upload(image)
        imageUrls.push(imageUrl)
      }

      // Match the successful input format exactly
      const workflowInput = {
        image_urls: imageUrls,
        prompt: "",
        system_prompt: "# Fantasy World Exploration Prompt Generator\n\nGenerate FOUR location prompts from a reference image, creating wondrous environments with consistent third-person game POV.\n\n## CORE PRINCIPLE\n**Describe environments, not lists.** Write rich paragraphs painting complete pictures of interesting locations. Focus on environmental wonder with consistent character for scale. Keep style phrasing simple and consistent.\n\n## INPUT\nUser provides an image as style/environmental and character reference.\n\n## OUTPUT FORMAT\n```json\n{\n  \"world_name\": \"[2-5 word fantasy realm name]\",\n  \"style_description\": \"[15-25 words: painterly style, light quality, color story]\",\n  \"explorer_character\": \"[simple character seen from behind]\",\n  \"environment_theme\": \"[world type: floating islands/crystal forests/etc]\",\n  \"magical_atmosphere\": \"[how magic manifests visually]\",\n  \"first_image_prompt\": \"[5-7 sentences]\",\n  \"second_image_prompt\": \"[5-7 sentences]\",\n  \"third_image_prompt\": \"[5-7 sentences]\",\n  \"fourth_image_prompt\": \"[5-7 sentences]\"\n}\n```\n\n## LOCATION REQUIREMENTS\n\n### Each Location Must Include:\n- Complete style description embedded naturally\n- Same character at 10-15ft behind, slightly elevated (third-person game view)\n- 80% environment focus: scale, wonder, impossible features\n- Specific lighting and magical effects\n- Multiple detail layers (near/mid/far)\n\n### Location Progression:\n1. **Gateway** - Entry point, establish wonder\n2. **Deeper Wonder** - Contrasting environment, unique mechanics\n3. **Heart of Wonder** - Most spectacular location\n4. **Secret Haven** - Hidden reward location\n\n## POV SPECIFICATIONS\n- Always 10-15ft behind character, 6-8ft elevated\n- Character in lower third for scale\n- Never show face or change perspective\n- Like following in Zelda/Journey\n-Always start with this phrase \"Using the same style create a new scene, keep the same character. \"\n-End with aspect ratio (append the same for each video, they should not be different). \"16:9\" or \"9:16\"\n\n\nReturn ONLY valid JSON. No extra text or markdown.",
        model: "openai/gpt-5-chat",
        reasoning: true
      }
      
      console.log('Submitting workflow with input:', workflowInput)
      setCurrentStage('Generating adventure video descriptions...')
      
      const stream = await fal.stream("workflows/derek/wizarding-5-no-extend", {
        input: workflowInput
      })

      for await (const event of stream) {
        console.log('Stream event:', event)
        setProgress(prev => [...prev, event])
        
        // Update stage based on the workflow step
        if (event.type === 'submit') {
          if (event.node_id?.includes('any_llm/vision')) {
            setCurrentStage('Analyzing your image and generating world descriptions...')
          } else if (event.node_id?.includes('nano_banana')) {
            setCurrentStage('Creating adventure video images...')
          } else if (event.node_id?.includes('veo3')) {
            setCurrentStage('Converting images to videos...')
          } else if (event.node_id?.includes('ffmpeg')) {
            setCurrentStage('Merging videos into final result...')
          }
        }
        
        // Collect generated images
        if (event.type === 'completion' && event.node_id?.includes('nano_banana') && event.output?.images) {
          setGeneratedImages(prev => [...prev, ...event.output.images])
        }
        
        // Track video completion progress
        if (event.type === 'completion' && event.node_id?.includes('veo3/image_to_video') && event.output?.video) {
          setVideosCompleted(prev => {
            const newCount = prev + 1
            setCurrentStage(`Converting images to videos... (${newCount} out of 4 complete)`)
            return newCount
          })
        }
        
        if (event.type === 'completion' || event.type === 'output') {
          console.log('Important Event:', event)
        }
        if (event.type === 'error') {
          console.error('Workflow step error:', event)
        }
      }

      const finalResult = await stream.done()
      console.log('Final result:', finalResult)
      setResult(finalResult as WorkflowResult)
      setCurrentStage('Complete!')
    } catch (error: any) {
      console.error('Workflow error:', error)
      console.error('Error details:', error.body || error.response)
      setProgress(prev => [...prev, { 
        type: 'error', 
        message: error.message,
        details: error.body || error.response || 'No additional details'
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const downloadVideo = async (url: string, filename: string = 'result.mp4'): Promise<void> => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(downloadUrl)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download error:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Credit Usage Alert */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 bg-yellow-100 border border-yellow-300 text-yellow-800 px-3 py-1.5 rounded-full text-sm font-medium">
            <span className="text-yellow-600">⚠️</span>
            <span>Running this workflow uses ~$13 of credits</span>
          </div>
        </div>
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-600">
            ✨ Wizarding Workflow
          </h1>
          <p className="text-gray-600 mt-2">Transform your images into magical adventure videos</p>
        </div>
        
        {/* API Key Section */}
        {!apiKeySet ? (
          <div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              🔐 Enter your fal.ai API Key
            </h2>
            <p className="text-gray-600 mb-3 text-sm">
              Get your API key from{' '}
              <a 
                href="https://fal.ai/dashboard/keys" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 underline"
              >
                fal.ai dashboard
              </a>
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-blue-800">
                <span className="font-semibold">🔒 Privacy:</span> This site does not store your API key. It's only used in your browser session.
              </p>
              <p className="text-xs text-blue-800 mt-1">
                Prefer to run locally? Clone from{' '}
                <a 
                  href="https://github.com/derekalia/wizarding" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline hover:text-blue-900"
                >
                  GitHub
                </a>
              </p>
            </div>
            <div className="space-y-4">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button 
                onClick={handleApiKeySubmit} 
                disabled={!apiKey.trim()}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                Submit API Key
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-w-md mx-auto">
            <div className="flex items-center justify-center gap-2 text-green-700">
              <span className="text-green-600">✅</span>
              <span className="font-medium">API Key Set Successfully</span>
            </div>
          </div>
        )}

        {/* Image Upload Section */}
        {apiKeySet && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              📤 Upload Images (up to 4)
            </h2>
            <p className="text-gray-600 mb-6 text-sm">
              Select images that will serve as inspiration for your adventure video locations
            </p>
            
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="aspect-square border-2 border-dashed border-gray-300 rounded-lg">
                  {images[index] ? (
                    <div className="relative h-full">
                      <img
                        src={URL.createObjectURL(images[index])}
                        alt="Preview"
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <button
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                        onClick={() => removeImage(index)}
                      >
                        ×
                      </button>
                      <div className="absolute bottom-2 left-2 right-2">
                        <p className="text-xs bg-black bg-opacity-60 text-white p-1 rounded truncate">
                          {images[index].name}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-full flex flex-col items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <div className="text-2xl mb-2">📤</div>
                      <span className="text-sm">Click to upload</span>
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-blue-600 text-lg">✨</span>
                <div>
                  <h3 className="font-semibold text-blue-900">Adventure Video Generator</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Upload images to generate four adventure video locations with a consistent character perspective. 
                    The AI will create detailed environment descriptions for video generation.
                  </p>
                </div>
              </div>
            </div>

            <button 
              onClick={submitWorkflow}
              disabled={images.length === 0 || isLoading}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-lg font-medium"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Processing...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  ✨ Generate Adventure Video
                </span>
              )}
            </button>
          </div>
        )}

        {/* Progress Section */}
        {isLoading && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-yellow-800">
              <span className="animate-spin">⏳</span>
              Progress
            </h3>
            <div className="text-yellow-700 mb-4">{currentStage}</div>
            {videosCompleted > 0 && videosCompleted < 4 && (
              <div className="space-y-2">
                <div className="w-full bg-yellow-200 rounded-full h-3">
                  <div 
                    className="bg-yellow-500 h-3 rounded-full transition-all duration-500"
                    style={{width: `${(videosCompleted / 4) * 100}%`}}
                  ></div>
                </div>
                <div className="text-sm text-yellow-700 text-center">
                  {videosCompleted}/4 videos complete
                </div>
              </div>
            )}
          </div>
        )}

        {/* Generated Images Section */}
        {generatedImages.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              ✨ Generated Adventure Video Images
            </h3>
            <p className="text-gray-600 mb-6 text-sm">
              Your magical locations are being brought to life
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {generatedImages.map((image, index) => (
                <div key={index} className="space-y-2">
                  <div className="aspect-square rounded-lg overflow-hidden border">
                    <img 
                      src={image.url} 
                      alt={`Fantasy location ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-sm font-medium text-center">Location {index + 1}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress Log Section */}
        {/* {progress.length > 0 && !isLoading && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Workflow Progress</h3>
            <p className="text-gray-600 mb-4 text-sm">Detailed log of the generation process</p>
            <div className="max-h-64 overflow-y-auto space-y-2 text-sm font-mono">
              {progress.map((event, index) => (
                <div key={index} className={`p-2 rounded border-l-4 ${
                  event.type === 'error' ? 'border-red-500 bg-red-50' :
                  event.type === 'completion' ? 'border-green-500 bg-green-50' :
                  event.type === 'output' ? 'border-blue-500 bg-blue-50' :
                  'border-gray-300 bg-gray-50'
                }`}>
                  <div className="font-semibold">{event.type}</div>
                  {event.node_id && <div className="text-xs opacity-75">{event.node_id}</div>}
                  {event.message && <div className="text-xs mt-1">{event.message}</div>}
                </div>
              ))}
            </div>
          </div>
        )} */}

        {/* Result Section */}
        {result && result.output && (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-green-800 mb-2">
                🎉 Adventure Video Complete!
              </h2>
              <p className="text-green-700">
                Your magical video journey is ready to explore
              </p>
            </div>
            {result.output.video && (
              <div className="space-y-4">
                <div className="rounded-lg overflow-hidden border shadow-lg">
                  <video 
                    src={result.output.video.url} 
                    controls 
                    className="w-full max-w-3xl mx-auto"
                  />
                </div>
                <div className="flex justify-center">
                  <button 
                    onClick={() => downloadVideo(result.output.video.url, result.output.video.file_name || 'adventure_video.mp4')}
                    className="bg-green-600 text-white py-2 px-6 rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    📥 Download Video ({(result.output.video.file_size / 1024 / 1024).toFixed(1)} MB)
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default App