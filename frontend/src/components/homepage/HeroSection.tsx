import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, Mic, User, Heart, CheckCircle2, ArrowRight, Play, Square, Save, Loader, AlertCircle } from 'lucide-react';

export default function RecordingStoriesPage() {
  const [step, setStep] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [storytellerName, setStorytellerName] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [conversationHistory, setConversationHistory] = useState([]);
  const [error, setError] = useState('');
  
  const recognitionRef = useRef(null);
  const synthRef = useRef(null);

  const topics = [
    { id: 'childhood', title: 'Childhood Memories', icon: '🎈', description: 'Early years and growing up' },
    { id: 'family', title: 'Family Stories', icon: '👨‍👩‍👧‍👦', description: 'Family traditions and relationships' },
    { id: 'career', title: 'Work & Career', icon: '💼', description: 'Professional journey and achievements' },
    { id: 'love', title: 'Love & Marriage', icon: '💕', description: 'Romantic memories and relationships' },
    { id: 'wisdom', title: 'Life Lessons', icon: '💡', description: 'Wisdom and advice for future generations' },
    { id: 'travel', title: 'Adventures & Travel', icon: '✈️', description: 'Travels and memorable experiences' },
  ];

  const questionsByTopic = {
    childhood: [
      "Tell me about your favorite childhood memory.",
      "What games did you play when you were young?",
      "Who was your best friend growing up?",
      "What was your neighborhood like?"
    ],
    family: [
      "Tell me about your parents and what they were like.",
      "What are some family traditions you remember?",
      "Do you have any siblings? Tell me about them.",
      "What's your favorite family recipe?"
    ],
    career: [
      "What was your first job?",
      "What did you want to be when you grew up?",
      "Tell me about your proudest professional achievement.",
      "What advice would you give about choosing a career?"
    ],
    love: [
      "How did you meet your spouse/partner?",
      "What do you remember about your first date?",
      "What's the secret to a lasting relationship?",
      "Tell me about your wedding day."
    ],
    wisdom: [
      "What's the most important lesson you've learned in life?",
      "What would you tell your younger self?",
      "What values do you want to pass down?",
      "What are you most proud of in your life?"
    ],
    travel: [
      "What's the most memorable place you've visited?",
      "Tell me about an adventure you had.",
      "Where would you go if you could travel anywhere?",
      "What's the funniest travel story you have?"
    ]
  };

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setTranscript(prev => prev + finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setError('Speech recognition error. Please try again.');
        setIsRecording(false);
      };
    } else {
      setError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
    }

    // Initialize speech synthesis
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const startRecording = () => {
    if (recognitionRef.current) {
      setTranscript('');
      setError('');
      recognitionRef.current.start();
      setIsRecording(true);
      
      // AI asks first question
      const questions = questionsByTopic[selectedTopic];
      const firstQuestion = questions[0];
      setAiResponse(firstQuestion);
      speakText(firstQuestion);
      
      setConversationHistory([{
        role: 'ai',
        text: firstQuestion,
        timestamp: new Date().toISOString()
      }]);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      
      if (transcript.trim()) {
        // Add user response to conversation
        const newHistory = [...conversationHistory, {
          role: 'user',
          text: transcript,
          timestamp: new Date().toISOString()
        }];
        setConversationHistory(newHistory);
        
        // Generate next question
        setTimeout(() => {
          generateNextQuestion(newHistory);
        }, 1000);
      }
    }
  };

  const speakText = (text) => {
    if (synthRef.current) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;
      synthRef.current.speak(utterance);
    }
  };

  const generateNextQuestion = (history) => {
    setIsProcessing(true);
    
    // Simple AI logic - in production, this would call your AI API
    const questions = questionsByTopic[selectedTopic];
    const usedQuestions = history.filter(h => h.role === 'ai').map(h => h.text);
    const availableQuestions = questions.filter(q => !usedQuestions.includes(q));
    
    setTimeout(() => {
      if (availableQuestions.length > 0) {
        const nextQuestion = availableQuestions[0];
        setAiResponse(nextQuestion);
        speakText(nextQuestion);
        
        setConversationHistory([...history, {
          role: 'ai',
          text: nextQuestion,
          timestamp: new Date().toISOString()
        }]);
      } else {
        const closingMessage = "Thank you so much for sharing these wonderful memories with me. Your stories are precious.";
        setAiResponse(closingMessage);
        speakText(closingMessage);
        
        setConversationHistory([...history, {
          role: 'ai',
          text: closingMessage,
          timestamp: new Date().toISOString()
        }]);
      }
      setIsProcessing(false);
      setTranscript('');
    }, 1500);
  };

  const saveToDatabase = async () => {
    setIsProcessing(true);
    
    // Simulate API call to save data
    const storyData = {
      storytellerName,
      topic: selectedTopic,
      conversation: conversationHistory,
      recordedAt: new Date().toISOString(),
      status: 'pending_blog_generation'
    };

    try {
      // In production, replace this with actual API call:
      // const response = await fetch('/api/stories', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(storyData)
      // });
      
      console.log('Saving to database:', storyData);
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setIsProcessing(false);
      setStep(3);
    } catch (err) {
      setError('Failed to save story. Please try again.');
      setIsProcessing(false);
    }
  };

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
                    {num === 1 ? 'Setup' : num === 2 ? 'AI Interview' : 'Complete'}
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
          
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Step 1: Setup */}
          {step === 1 && (
            <div className="space-y-8">
              <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">Let's Capture Your Story</h1>
                <p className="text-lg text-gray-600">Our AI will guide you through a natural conversation</p>
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
                Start AI Interview <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Step 2: AI Interview */}
          {step === 2 && (
            <div className="space-y-8">
              <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">AI Interview Session</h1>
                <p className="text-lg text-gray-600">Speak naturally and take your time</p>
              </div>

              {/* Current Speaker Info */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-gray-600" />
                    <span className="font-medium text-gray-900">{storytellerName}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-amber-100 px-4 py-2 rounded-full">
                    <span className="text-xl">{topics.find(t => t.id === selectedTopic)?.icon}</span>
                    <span className="font-medium text-gray-900 text-sm">
                      {topics.find(t => t.id === selectedTopic)?.title}
                    </span>
                  </div>
                </div>

                {/* AI Question Display */}
                <div className="bg-blue-50 rounded-lg p-6 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold">AI</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-900 text-lg leading-relaxed">
                        {aiResponse || "Click 'Start Interview' to begin..."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Live Transcript */}
                {isRecording && (
                  <div className="bg-gray-50 rounded-lg p-6 mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
                      <span className="text-sm font-medium text-gray-700">Listening...</span>
                    </div>
                    <p className="text-gray-900 min-h-[60px]">
                      {transcript || "Start speaking..."}
                    </p>
                  </div>
                )}

                {/* Recording Controls */}
                <div className="flex flex-col items-center gap-4">
                  {!isRecording ? (
                    <button
                      onClick={startRecording}
                      disabled={isProcessing}
                      className="bg-amber-600 text-white px-8 py-4 rounded-lg hover:bg-amber-700 transition font-semibold flex items-center gap-2 disabled:opacity-50"
                    >
                      <Play className="w-5 h-5" /> 
                      {conversationHistory.length === 0 ? 'Start Interview' : 'Continue'}
                    </button>
                  ) : (
                    <button
                      onClick={stopRecording}
                      className="bg-red-600 text-white px-8 py-4 rounded-lg hover:bg-red-700 transition font-semibold flex items-center gap-2"
                    >
                      <Square className="w-5 h-5" /> Stop & Process Response
                    </button>
                  )}
                  
                  {isProcessing && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Loader className="w-5 h-5 animate-spin" />
                      <span>AI is thinking...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Conversation History */}
              {conversationHistory.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Conversation History</h3>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {conversationHistory.map((entry, index) => (
                      <div
                        key={index}
                        className={`flex gap-3 ${entry.role === 'ai' ? 'flex-row' : 'flex-row-reverse'}`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          entry.role === 'ai' ? 'bg-blue-600' : 'bg-amber-600'
                        }`}>
                          <span className="text-white text-xs font-bold">
                            {entry.role === 'ai' ? 'AI' : 'U'}
                          </span>
                        </div>
                        <div className={`flex-1 rounded-lg p-3 ${
                          entry.role === 'ai' ? 'bg-blue-50' : 'bg-amber-50'
                        }`}>
                          <p className="text-gray-900 text-sm">{entry.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 bg-white text-gray-700 py-4 rounded-lg hover:bg-gray-50 transition font-semibold border-2 border-gray-200"
                >
                  Back
                </button>
                <button
                  onClick={saveToDatabase}
                  disabled={conversationHistory.length < 4 || isProcessing}
                  className="flex-1 bg-amber-600 text-white py-4 rounded-lg hover:bg-amber-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" /> Save Story
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Complete */}
          {step === 3 && (
            <div className="space-y-8">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <h1 className="text-4xl font-bold text-gray-900 mb-4">Story Saved Successfully!</h1>
                <p className="text-lg text-gray-600">AI is now creating a beautiful blog post</p>
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
                      <p className="text-gray-600">Analyzing the conversation and extracting key memories (5-10 minutes)</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="font-bold text-amber-600">2</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Blog Post Generation</h3>
                      <p className="text-gray-600">Creating a polished narrative with photos and formatting</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="font-bold text-amber-600">3</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Ready to Share</h3>
                      <p className="text-gray-600">Review, edit, and share with your family members</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 rounded-xl border border-amber-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-2">Recording Summary</h3>
                <div className="space-y-1 text-gray-700">
                  <p><strong>Storyteller:</strong> {storytellerName}</p>
                  <p><strong>Topic:</strong> {topics.find(t => t.id === selectedTopic)?.title}</p>
                  <p><strong>Exchanges:</strong> {Math.floor(conversationHistory.length / 2)} questions answered</p>
                  <p className="text-sm text-gray-600 mt-3">
                    ✉️ We'll email you when the blog post is ready for review
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setStep(1);
                    setStorytellerName('');
                    setSelectedTopic('');
                    setConversationHistory([]);
                    setTranscript('');
                    setAiResponse('');
                  }}
                  className="flex-1 bg-white text-gray-700 py-4 rounded-lg hover:bg-gray-50 transition font-semibold border-2 border-gray-200"
                >
                  Record Another Story
                </button>
                <button
                  className="flex-1 bg-amber-600 text-white py-4 rounded-lg hover:bg-amber-700 transition font-semibold"
                >
                  View All Stories
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}