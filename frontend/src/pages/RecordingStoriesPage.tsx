import React, { useState, useRef } from 'react';
import { BookOpen, Mic, User, Calendar, Heart, Clock, CheckCircle2, ArrowRight, Play, Pause, RotateCcw, Save } from 'lucide-react';

// Types for our data
interface Story {
  _id?: string;
  storytellerName: string;
  topic: string;
  recordingDuration: number;
  transcript: string;
  audioUrl?: string;
  createdAt?: Date;
  status: 'processing' | 'completed' | 'failed';
}

export default function RecordingStoriesPage() {
  const [step, setStep] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [storytellerName, setStorytellerName] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Array<{speaker: 'user' | 'ai', text: string}>>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);

  const topics = [
    { id: 'childhood', title: 'Childhood Memories', icon: '🎈', description: 'Early years and growing up' },
    { id: 'family', title: 'Family Stories', icon: '👨‍👩‍👧‍👦', description: 'Family traditions and relationships' },
    { id: 'career', title: 'Work & Career', icon: '💼', description: 'Professional journey and achievements' },
    { id: 'love', title: 'Love & Marriage', icon: '💕', description: 'Romantic memories and relationships' },
    { id: 'wisdom', title: 'Life Lessons', icon: '💡', description: 'Wisdom and advice for future generations' },
    { id: 'travel', title: 'Adventures & Travel', icon: '✈️', description: 'Travels and memorable experiences' },
  ];

  const sampleQuestions = [
    "What was your favorite childhood game or activity?",
    "Tell me about your first job and what you learned from it.",
    "What's the most important lesson your parents taught you?",
    "Describe a moment that changed your life forever.",
    "What advice would you give to your younger self?",
  ];

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Initialize speech recognition
  const initializeSpeechRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
            // Process final transcript with AI
            processUserResponse(transcript);
          } else {
            interimTranscript += transcript;
          }
        }

        setTranscript(prev => prev + finalTranscript + interimTranscript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
      };

      recognitionRef.current = recognition;
    } else {
      console.warn('Speech recognition not supported in this browser');
    }
  };

  // AI response simulation
  const generateAIResponse = async (userInput: string): Promise<string> => {
    // In a real implementation, you would call your AI API here
    // For now, we'll simulate AI responses based on the topic
    
    const topic = topics.find(t => t.id === selectedTopic);
    const responses: { [key: string]: string[] } = {
      childhood: [
        "That's wonderful! What other memories do you have from your childhood?",
        "I'd love to hear more about that. How did that experience shape who you are today?",
        "That sounds like a precious memory. Can you tell me about your childhood home?"
      ],
      family: [
        "Family stories are so important. What traditions did your family have?",
        "That's beautiful. How has your family influenced your life?",
        "Tell me more about your family relationships growing up."
      ],
      career: [
        "Your career journey sounds fascinating. What was your biggest challenge?",
        "That's impressive. What advice would you give someone starting in your field?",
        "How did your career choices affect your personal life?"
      ],
      love: [
        "Love stories are always special. How did you meet your partner?",
        "That's romantic. What's the secret to your lasting relationship?",
        "Tell me about your wedding day or a special moment in your relationship."
      ],
      wisdom: [
        "That's very insightful. What other life lessons have you learned?",
        "Your wisdom is valuable. How did you learn this lesson?",
        "What would you tell your grandchildren about living a good life?"
      ],
      travel: [
        "Adventures create the best stories! What was your most memorable trip?",
        "That sounds amazing. How did traveling change your perspective?",
        "Tell me about a place that felt like home away from home."
      ]
    };

    const topicResponses = responses[selectedTopic] || [
      "That's very interesting. Please tell me more.",
      "I'd love to hear more about that experience.",
      "How did that make you feel?"
    ];

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    return topicResponses[Math.floor(Math.random() * topicResponses.length)];
  };

  const processUserResponse = async (userInput: string) => {
    // Add user message to conversation history
    setConversationHistory(prev => [...prev, { speaker: 'user', text: userInput }]);

    // Generate AI response
    const aiResponse = await generateAIResponse(userInput);
    
    // Add AI response to conversation history
    setConversationHistory(prev => [...prev, { speaker: 'ai', text: aiResponse }]);

    // Speak the AI response (optional)
    speakText(aiResponse);
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    }
  };

  const startRecording = async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Initialize media recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        // Here you would upload the audio blob to your server
        console.log('Audio recording completed:', audioBlob);
      };

      // Start recording
      mediaRecorder.start();
      setIsRecording(true);

      // Initialize speech recognition
      initializeSpeechRecognition();
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }

      // Start with an AI greeting
      const greeting = `Hello ${storytellerName}! I'm excited to hear your stories about ${topics.find(t => t.id === selectedTopic)?.title?.toLowerCase()}. ${sampleQuestions[0]}`;
      setConversationHistory([{ speaker: 'ai', text: greeting }]);
      speakText(greeting);

    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Error accessing microphone. Please ensure you have granted microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    setIsRecording(false);
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const saveRecordingToMongoDB = async (): Promise<Story> => {
    setIsProcessing(true);
    
    try {
      // Prepare the story data
      const storyData: Omit<Story, '_id' | 'createdAt'> = {
        storytellerName,
        topic: selectedTopic,
        recordingDuration: recordingTime,
        transcript,
        status: 'processing',
        audioUrl: undefined // In real implementation, you would upload the audio file
      };

      // Send to your backend API
      const response = await fetch('/api/stories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(storyData),
      });

      if (!response.ok) {
        throw new Error('Failed to save recording');
      }

      const savedStory: Story = await response.json();
      
      // Process the audio and transcript with AI (simulated)
      setTimeout(() => {
        // In real implementation, you would call your AI processing service
        console.log('Processing story with AI...');
      }, 2000);

      return savedStory;
    } catch (error) {
      console.error('Error saving recording:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveAndContinue = async () => {
    try {
      await saveRecordingToMongoDB();
      setStep(3);
    } catch (error) {
      alert('Error saving recording. Please try again.');
    }
  };

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-8 h-8 text-amber-600" />
              <span className="text-2xl font-semibold text-gray-800">Memory Keeper</span>
            </div>
            <button className="text-gray-600 hover:text-amber-600 transition">
              Back to Home
            </button>
          </div>
        </div>
      </nav>

      {/* Progress Steps */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-center gap-4 max-w-3xl mx-auto">
            {[1, 2, 3].map((num) => (
              <React.Fragment key={num}>
                <div className="flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    step >= num ? 'bg-amber-600 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {step > num ? <CheckCircle2 className="w-5 h-5" /> : num}
                  </div>
                  <span className={`hidden sm:inline font-medium ${
                    step >= num ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    {num === 1 ? 'Setup' : num === 2 ? 'Record' : 'Review'}
                  </span>
                </div>
                {num < 3 && (
                  <div className={`w-16 h-1 rounded ${
                    step > num ? 'bg-amber-600' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          
          {/* Step 1: Setup */}
          {step === 1 && (
            <div className="space-y-8">
              <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">Let's Get Started</h1>
                <p className="text-lg text-gray-600">Set up your recording session in just a few steps</p>
              </div>

              {/* Storyteller Info */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <User className="w-6 h-6 text-amber-600" />
                  <h2 className="text-2xl font-semibold text-gray-900">Who's Sharing Their Story?</h2>
                </div>
                <input
                  type="text"
                  placeholder="Enter storyteller's name (e.g., Grandma Mary)"
                  value={storytellerName}
                  onChange={(e) => setStorytellerName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-lg"
                />
              </div>

              {/* Topic Selection */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <Heart className="w-6 h-6 text-amber-600" />
                  <h2 className="text-2xl font-semibold text-gray-900">Choose a Topic</h2>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {topics.map((topic) => (
                    <button
                      key={topic.id}
                      onClick={() => setSelectedTopic(topic.id)}
                      className={`p-5 rounded-lg border-2 text-left transition ${
                        selectedTopic === topic.id
                          ? 'border-amber-600 bg-amber-50'
                          : 'border-gray-200 hover:border-amber-300 bg-white'
                      }`}
                    >
                      <div className="text-3xl mb-2">{topic.icon}</div>
                      <h3 className="font-semibold text-gray-900 mb-1">{topic.title}</h3>
                      <p className="text-sm text-gray-600">{topic.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!storytellerName || !selectedTopic}
                className="w-full bg-amber-600 text-white py-4 rounded-lg hover:bg-amber-700 transition font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Continue to Recording <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Step 2: Recording */}
          {step === 2 && (
            <div className="space-y-8">
              <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">Recording Session</h1>
                <p className="text-lg text-gray-600">Take your time and share the story naturally</p>
              </div>

              {/* Recording Interface */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-3 bg-gray-100 px-6 py-3 rounded-full mb-4">
                    <User className="w-5 h-5 text-gray-600" />
                    <span className="font-medium text-gray-900">{storytellerName}</span>
                  </div>
                  <div className="inline-flex items-center gap-3 bg-amber-100 px-6 py-3 rounded-full">
                    <span className="text-2xl">{topics.find(t => t.id === selectedTopic)?.icon}</span>
                    <span className="font-medium text-gray-900">
                      {topics.find(t => t.id === selectedTopic)?.title}
                    </span>
                  </div>
                </div>

                {/* Conversation History */}
                {conversationHistory.length > 0 && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg max-h-60 overflow-y-auto">
                    {conversationHistory.map((message, index) => (
                      <div
                        key={index}
                        className={`mb-3 ${
                          message.speaker === 'ai' ? 'text-left' : 'text-right'
                        }`}
                      >
                        <div
                          className={`inline-block px-4 py-2 rounded-lg max-w-xs lg:max-w-md ${
                            message.speaker === 'ai'
                              ? 'bg-blue-100 text-gray-800'
                              : 'bg-amber-100 text-gray-800'
                          }`}
                        >
                          <div className="text-xs font-semibold mb-1">
                            {message.speaker === 'ai' ? 'AI Guide' : storytellerName}
                          </div>
                          {message.text}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Live Transcript */}
                {transcript && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-semibold text-green-800 mb-2">Live Transcript:</h4>
                    <p className="text-green-700">{transcript}</p>
                  </div>
                )}

                {/* Recording Controls */}
                <div className="flex flex-col items-center gap-6">
                  <div className="relative">
                    <div className={`w-32 h-32 rounded-full flex items-center justify-center ${
                      isRecording ? 'bg-red-100 animate-pulse' : 'bg-amber-100'
                    }`}>
                      <Mic className={`w-16 h-16 ${isRecording ? 'text-red-600' : 'text-amber-600'}`} />
                    </div>
                    {isRecording && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 rounded-full animate-pulse" />
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-3xl font-mono font-bold text-gray-900">
                    <Clock className="w-6 h-6" />
                    {formatTime(recordingTime)}
                  </div>

                  <div className="flex gap-4">
                    {!isRecording ? (
                      <button
                        onClick={startRecording}
                        className="bg-amber-600 text-white px-8 py-4 rounded-lg hover:bg-amber-700 transition font-semibold flex items-center gap-2"
                      >
                        <Play className="w-5 h-5" /> Start Recording
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={stopRecording}
                          className="bg-gray-600 text-white px-8 py-4 rounded-lg hover:bg-gray-700 transition font-semibold flex items-center gap-2"
                        >
                          <Pause className="w-5 h-5" /> Stop
                        </button>
                        <button
                          onClick={() => {
                            stopRecording();
                            setRecordingTime(0);
                            setTranscript('');
                            setConversationHistory([]);
                          }}
                          className="bg-white text-gray-700 px-8 py-4 rounded-lg hover:bg-gray-50 transition font-semibold border-2 border-gray-200 flex items-center gap-2"
                        >
                          <RotateCcw className="w-5 h-5" /> Restart
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* AI Prompts */}
              <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-xl">💬</span> AI Suggested Questions
                </h3>
                <ul className="space-y-3">
                  {sampleQuestions.slice(0, 3).map((question, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold mt-1">•</span>
                      <span className="text-gray-700">{question}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-gray-600 mt-4 italic">
                  The AI will guide the conversation naturally based on the responses
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 bg-white text-gray-700 py-4 rounded-lg hover:bg-gray-50 transition font-semibold border-2 border-gray-200"
                >
                  Back
                </button>
                <button
                  onClick={handleSaveAndContinue}
                  disabled={recordingTime < 10 || isProcessing}
                  className="flex-1 bg-amber-600 text-white py-4 rounded-lg hover:bg-amber-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" /> Save & Continue
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-8">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <h1 className="text-4xl font-bold text-gray-900 mb-4">Recording Saved!</h1>
                <p className="text-lg text-gray-600">Your story is being processed by our AI</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">What Happens Next?</h2>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="font-bold text-amber-600">1</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">AI Processing</h3>
                      <p className="text-gray-600">Our AI will transcribe and analyze the conversation (5-10 minutes)</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="font-bold text-amber-600">2</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Blog Post Creation</h3>
                      <p className="text-gray-600">The story will be crafted into a beautiful, shareable blog post</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="font-bold text-amber-600">3</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Review & Share</h3>
                      <p className="text-gray-600">You'll be able to review, edit, and share with your family</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 rounded-xl border border-amber-200 p-6 text-center">
                <p className="text-gray-700 mb-4">
                  <strong>Recording Details:</strong> {storytellerName} • {topics.find(t => t.id === selectedTopic)?.title} • {formatTime(recordingTime)}
                </p>
                <p className="text-sm text-gray-600">
                  We'll send you an email when your blog post is ready!
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setStep(1);
                    setStorytellerName('');
                    setSelectedTopic('');
                    setRecordingTime(0);
                    setTranscript('');
                    setConversationHistory([]);
                  }}
                  className="flex-1 bg-white text-gray-700 py-4 rounded-lg hover:bg-gray-50 transition font-semibold border-2 border-gray-200"
                >
                  Record Another Story
                </button>
                <button
                  className="flex-1 bg-amber-600 text-white py-4 rounded-lg hover:bg-amber-700 transition font-semibold"
                >
                  View My Stories
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}