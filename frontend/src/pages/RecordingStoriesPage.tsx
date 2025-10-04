import React, { useState } from 'react';
import { BookOpen, Mic, User, Calendar, Heart, Clock, CheckCircle2, ArrowRight, Play, Pause, RotateCcw, Save } from 'lucide-react';

export default function RecordingStoriesPage() {
  const [step, setStep] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [storytellerName, setStorytellerName] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');

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

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  React.useEffect(() => {
    let interval;
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
                        onClick={() => setIsRecording(true)}
                        className="bg-amber-600 text-white px-8 py-4 rounded-lg hover:bg-amber-700 transition font-semibold flex items-center gap-2"
                      >
                        <Play className="w-5 h-5" /> Start Recording
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => setIsRecording(false)}
                          className="bg-gray-600 text-white px-8 py-4 rounded-lg hover:bg-gray-700 transition font-semibold flex items-center gap-2"
                        >
                          <Pause className="w-5 h-5" /> Pause
                        </button>
                        <button
                          onClick={() => {
                            setIsRecording(false);
                            setRecordingTime(0);
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
                  onClick={() => setStep(3)}
                  disabled={recordingTime < 10}
                  className="flex-1 bg-amber-600 text-white py-4 rounded-lg hover:bg-amber-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" /> Save & Continue
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