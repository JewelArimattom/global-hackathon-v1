import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, Mic, User, AlertTriangle, Wifi, Save, Loader2, MessageSquare, Play, Square, FileText, Sparkles, Library, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Types
interface ConversationMessage {
  speaker: 'user' | 'ai';
  text: string;
  timestamp?: Date;
  isFallback?: boolean;
  isVoice?: boolean;
}

interface AIResponse {
  response: string;
  timestamp: string;
  storyId?: string;
  transcribedText?: string;
  isFallback?: boolean;
}

interface BlogData {
  blogId?: string;
  blogTitle: string;
  blogSubtitle?: string;
  blogContent: string;
  blogTags: string[];
  blogCategory?: string;
  slug?: string;
  success: boolean;
  message: string;
}

// --- Main Component ---
export default function RecordingStoriesPage() {
  const navigate = useNavigate();
  const [interviewState, setInterviewState] = useState<'ready' | 'running' | 'saving' | 'error'>('ready');
  const [isRecording, setIsRecording] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [aiStatus, setAiStatus] = useState<'idle' | 'thinking' | 'speaking'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isBackendConnected, setIsBackendConnected] = useState(true);
  const [currentStoryId, setCurrentStoryId] = useState<string | null>(null);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [blogData, setBlogData] = useState<BlogData | null>(null);
  const [showBlogPreview, setShowBlogPreview] = useState(false);
  const [isGeneratingBlog, setIsGeneratingBlog] = useState(false);
  const [autoBlogEnabled, setAutoBlogEnabled] = useState(true);

  const speechRecognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const storytellerName = 'Friend';

  // Scroll to the bottom of the chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationHistory]);

  // Update recording duration
  useEffect(() => {
    if (isRecording && recordingStartTime) {
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - recordingStartTime) / 1000));
      }, 1000);
    } else {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }

    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, [isRecording, recordingStartTime]);

  // Test backend connection on mount
  useEffect(() => {
    checkBackendConnection();
  }, []);

 // Inside RecordingStoriesPage.tsx

  const checkBackendConnection = async () => {
    try {
      // BEFORE: const response = await fetch('http://localhost:5000/api/ai/health');
      // AFTER: Corrected the URL to match the server's route
      const response = await fetch('http://localhost:5000/health');
      
      setIsBackendConnected(response.ok);
    } catch {
      setIsBackendConnected(false);
    }
  };

  // --- API Functions ---

  const startStorySession = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/ai/start-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          storytellerName, 
          topic: 'personal-stories', 
          interviewMode: 'voice' 
        }),
      });
      if (!response.ok) throw new Error('Failed to start story session');
      const data = await response.json();
      setCurrentStoryId(data.storyId);
      setRecordingStartTime(Date.now());
      setRecordingDuration(0);
      const greeting: ConversationMessage = { 
        speaker: 'ai', 
        text: data.greeting, 
        timestamp: new Date() 
      };
      setConversationHistory([greeting]);
      return data.greeting;
    } catch (error) {
      console.error('Error starting story session:', error);
      throw error;
    }
  };

  const endStorySession = async () => {
    if (!currentStoryId) return;
    setIsSaving(true);
    try {
      const response = await fetch('http://localhost:5000/api/ai/end-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          storyId: currentStoryId, 
          recordingDuration: recordingDuration 
        }),
      });
      if (!response.ok) throw new Error('Failed to save story session');
      const data = await response.json();
      
      if (data.blogData) {
        setBlogData({
          blogTitle: data.blogData.blogTitle,
          blogContent: data.blogData.blogContent,
          blogTags: data.blogData.blogTags,
          success: true,
          message: 'Blog generated automatically!'
        });
        setShowBlogPreview(true);
      }
      
      // Show success message
      alert('Story saved successfully! ' + (data.blogGenerated ? 'Blog was generated and published.' : ''));
      
      // Reset state
      setInterviewState('ready');
      setConversationHistory([]);
      setCurrentStoryId(null);
      setRecordingDuration(0);
      setRecordingStartTime(null);
    } catch (error) {
      setErrorMessage('Failed to save story. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const generateBlogPost = async () => {
    if (!currentStoryId) return;
    
    setIsGeneratingBlog(true);
    try {
      const response = await fetch('http://localhost:5000/api/ai/generate-blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          storyId: currentStoryId,
          quality: 'standard' // or 'premium' for longer blogs
        }),
      });
      
      if (!response.ok) throw new Error('Failed to generate blog post');
      
      const data = await response.json();
      setBlogData(data);
      setShowBlogPreview(true);
      
    } catch (error) {
      console.error('Error generating blog post:', error);
      setErrorMessage('Failed to generate blog post.');
    } finally {
      setIsGeneratingBlog(false);
    }
  };

  const handleBeginInterview = async () => {
    setErrorMessage('');
    setInterviewState('running');
    setBlogData(null);
    setShowBlogPreview(false);

    try {
      const greeting = await startStorySession();
      await speakText(greeting);
      // Start speech recognition after greeting
      initializeSpeechRecognition();
    } catch (error) {
      setErrorMessage('Failed to start interview session. Please try again.');
      setInterviewState('ready');
    }
  };

  const processVoiceMessage = async (message: string) => {
    try {
      console.log('🎤 Sending voice message to backend:', message);
      
      const response = await fetch('http://localhost:5000/api/ai/voice-message', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          message: message,
          storyId: currentStoryId,
          storytellerName: storytellerName
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Server error:', errorData);
        throw new Error(errorData.error || 'Failed to process voice message');
      }
      
      return await response.json();
    } catch (error) {
      console.error('❌ Voice message processing error:', error);
      throw error;
    }
  };

  const speakText = (text: string): Promise<void> => {
    return new Promise((resolve) => {
      setAiStatus('speaking');
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      
      utterance.onend = () => { 
        setAiStatus('idle'); 
        resolve(); 
      };
      utterance.onerror = () => { 
        setAiStatus('idle'); 
        resolve(); 
      };
      
      speechSynthesis.speak(utterance);
    });
  };

  // --- Speech Recognition Functions ---

  const initializeSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setErrorMessage("Speech Recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      console.log('🎤 Speech recognition started');
      setIsRecording(true);
      setRecordingStartTime(Date.now());
      setErrorMessage('');
    };

    recognition.onresult = async (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('');

      // Only process final results
      const finalResult = event.results[event.results.length - 1];
      if (finalResult.isFinal) {
        const finalTranscript = finalResult[0].transcript.trim();
        if (finalTranscript.length > 0) {
          console.log('🎤 Final transcript:', finalTranscript);
          
          try {
            // Add user message immediately to UI
            const userMessage: ConversationMessage = { 
              speaker: 'user', 
              text: finalTranscript, 
              timestamp: new Date(),
              isVoice: true 
            };
            setConversationHistory(prev => [...prev, userMessage]);
            
            // Process with backend
            setAiStatus('thinking');
            const data = await processVoiceMessage(finalTranscript);
            
            // Add AI response to UI
            const aiMessage: ConversationMessage = { 
              speaker: 'ai', 
              text: data.response, 
              timestamp: new Date() 
            };
            setConversationHistory(prev => [...prev, aiMessage]);
            
            // Speak the response
            await speakText(data.response);
            
          } catch (error) {
            console.error('❌ Error processing voice message:', error);
            const errorMsg: ConversationMessage = { 
              speaker: 'ai', 
              text: "I'm having trouble processing that. Let me try again...", 
              timestamp: new Date(), 
              isFallback: true 
            };
            setConversationHistory(prev => [...prev, errorMsg]);
            await speakText(errorMsg.text);
          }
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
      
      if (event.error === 'not-allowed') {
        setErrorMessage('Microphone access denied. Please allow microphone permissions.');
      } else if (event.error === 'audio-capture') {
        setErrorMessage('No microphone found. Please check your microphone connection.');
      } else if (event.error !== 'no-speech') {
        setErrorMessage(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      console.log('🎤 Speech recognition ended');
      setIsRecording(false);
      // Restart recognition if we're still in running state
      if (interviewState === 'running') {
        setTimeout(() => {
          try {
            recognition.start();
          } catch (error) {
            console.error('Failed to restart recognition:', error);
          }
        }, 500);
      }
    };

    speechRecognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      setErrorMessage('Failed to start speech recognition. Please refresh and try again.');
    }
  };

  const stopSpeechRecognition = () => {
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopSpeechRecognition();
    } else {
      initializeSpeechRecognition();
    }
  };

  const handleViewBlogs = () => {
    navigate('/blogs');
  };

  const handleCloseBlogPreview = () => {
    setShowBlogPreview(false);
  };

  const handleViewBlogInLibrary = () => {
    setShowBlogPreview(false);
    navigate('/blogs');
  };

  // --- Render Functions ---

  const renderMessageBubble = (message: ConversationMessage, index: number) => {
    const isUser = message.speaker === 'user';
    return (
      <div key={index} className={`flex items-end gap-3 ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        {!isUser && (
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">AI</span>
            </div>
          </div>
        )}
        
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[70%]`}>
          <div className={`inline-block px-4 py-3 rounded-2xl ${
            isUser 
              ? 'bg-gradient-to-br from-teal-600 to-teal-700 text-white rounded-br-none' 
              : 'bg-white text-slate-800 rounded-bl-none border border-slate-200 shadow-sm'
          }`}>
            <div className="flex items-center gap-2">
              {message.isVoice && <Mic className="w-4 h-4" />}
              <p className="text-sm leading-relaxed">{message.text}</p>
            </div>
          </div>
          <span className="text-xs text-slate-500 mt-1 px-1">
            {message.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        
        {isUser && (
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-slate-600" />
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderBlogPreview = () => {
    if (!blogData || !showBlogPreview) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-teal-600" />
                <h2 className="text-2xl font-bold text-slate-800">Generated Blog Post</h2>
              </div>
              <button
                onClick={handleCloseBlogPreview}
                className="text-slate-400 hover:text-slate-600 transition-colors text-2xl leading-none"
              >
                ×
              </button>
            </div>
            
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-slate-800 mb-4 leading-tight">
                {blogData.blogTitle}
              </h1>
              {blogData.blogSubtitle && (
                <p className="text-xl text-slate-600 mb-4 font-medium">
                  {blogData.blogSubtitle}
                </p>
              )}
              <div className="flex flex-wrap gap-2 mb-6">
                {blogData.blogTags.map((tag, index) => (
                  <span 
                    key={index} 
                    className="bg-gradient-to-r from-teal-100 to-blue-100 text-teal-800 px-3 py-1 rounded-full text-sm font-medium"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
            
            <article className="prose prose-lg max-w-none">
              {blogData.blogContent.split('\n\n').map((paragraph, index) => {
                // Check if paragraph is a heading (starts with ##)
                if (paragraph.startsWith('## ')) {
                  return (
                    <h2 key={index} className="text-2xl font-bold text-slate-800 mt-8 mb-4">
                      {paragraph.replace('## ', '')}
                    </h2>
                  );
                }
                return (
                  <p key={index} className="text-slate-700 leading-relaxed mb-4 text-lg">
                    {paragraph}
                  </p>
                );
              })}
            </article>
            
            <div className="mt-8 pt-6 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  This blog post was automatically generated from your conversation using AI.
                </p>
                
                <button
                  onClick={handleViewBlogInLibrary}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-600 to-blue-600 text-white rounded-lg hover:from-teal-700 hover:to-blue-700 transition-all font-semibold"
                >
                  <Library className="w-4 h-4" />
                  View in Blog Library
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const getStatusText = () => {
    if (aiStatus === 'speaking') return 'AI is speaking...';
    if (aiStatus === 'thinking') return 'Processing...';
    if (isRecording) return `Listening • ${recordingDuration}s`;
    if (errorMessage) return 'Error occurred';
    return 'Ready to listen';
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderFooter = () => {
    if (interviewState === 'ready') {
      return (
        <div className="p-6 bg-white border-t border-slate-200">
          <div className="max-w-2xl mx-auto text-center">
            <button 
              onClick={handleBeginInterview}
              disabled={!isBackendConnected}
              className="px-8 py-4 bg-gradient-to-r from-teal-600 to-blue-600 text-white font-bold rounded-full hover:from-teal-700 hover:to-blue-700 transition-all disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center gap-3 text-lg mx-auto shadow-lg"
            >
              <Play className="w-6 h-6" /> Start Story Session
            </button>
            
            <div className="mt-4 flex items-center justify-center gap-4">
              <div className={`flex items-center gap-2 text-sm font-medium ${isBackendConnected ? 'text-green-600' : 'text-red-600'}`}>
                <Wifi size={16} />
                {isBackendConnected ? 'Backend Connected' : 'Backend Disconnected'}
              </div>
              
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Sparkles size={16} />
                Auto-Blog Generation
              </div>
            </div>
            
            {!isBackendConnected && (
              <p className="text-red-600 text-sm mt-3 flex items-center justify-center gap-2">
                <AlertTriangle size={16} />
                Cannot connect to server. Please make sure the backend is running.
              </p>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="p-6 bg-white border-t border-slate-200">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={toggleRecording}
                disabled={aiStatus === 'thinking' || aiStatus === 'speaking'}
                className={`relative flex items-center justify-center w-14 h-14 rounded-full transition-all duration-300 shadow-lg ${
                  isRecording 
                    ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                    : 'bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-600 hover:to-blue-600 text-white'
                } disabled:bg-slate-400 disabled:cursor-not-allowed`}
              >
                {isRecording ? <Square className="w-6 h-6 z-10" /> : <Mic className="w-6 h-6 z-10" />}
              </button>
              
              <div className="flex flex-col">
                <p className="text-sm font-medium text-slate-700">{getStatusText()}</p>
                {recordingDuration > 0 && (
                  <p className="text-xs text-slate-500">
                    Total: {formatDuration(recordingDuration)}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={generateBlogPost}
                disabled={isGeneratingBlog || conversationHistory.length < 3}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 transition disabled:bg-slate-400 shadow-md"
              >
                {isGeneratingBlog ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
                Generate Blog
              </button>
              
              <button
                onClick={endStorySession}
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-700 text-white font-semibold rounded-lg hover:bg-slate-800 transition disabled:bg-slate-400 shadow-md"
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Save Story
              </button>
            </div>
          </div>
          
          {errorMessage && (
            <p className="text-center text-red-600 text-sm flex items-center justify-center gap-2 bg-red-50 py-2 rounded-lg">
              <AlertTriangle size={16} /> {errorMessage}
            </p>
          )}
          
          {blogData && (
            <p className="text-center text-green-600 text-sm flex items-center justify-center gap-2 bg-green-50 py-2 rounded-lg">
              <Sparkles size={16} /> Blog post generated successfully!
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 to-blue-50 font-sans">
      <nav className="bg-white border-b border-slate-200 shadow-sm flex-shrink-0">
        <div className="container mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-teal-600 to-blue-600 p-2 rounded-lg">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-slate-800">Story Weaver AI</span>
              <p className="text-xs text-slate-500">Turn conversations into beautiful blogs</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleViewBlogs}
              className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-teal-600 text-teal-600 rounded-lg hover:bg-teal-50 transition-all font-semibold"
            >
              <Library className="w-4 h-4" />
              View Blog Library
            </button>
            
            {currentStoryId && (
              <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full border">
                Session: {currentStoryId.slice(-8)}
              </span>
            )}
            <div className={`flex items-center gap-2 text-sm font-medium px-3 py-1 rounded-full ${
              isBackendConnected 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700'
            }`}>
              <Wifi size={14} />
              {isBackendConnected ? 'Connected' : 'Disconnected'}
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-grow p-4 sm:p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {conversationHistory.length === 0 && (
            <div className="text-center py-16 px-4">
              <div className="bg-gradient-to-br from-teal-100 to-blue-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                <MessageSquare className="w-12 h-12 text-teal-600" />
              </div>
              <h2 className="text-3xl font-bold text-slate-800 mb-4">Share Your Story</h2>
              <p className="text-slate-600 text-lg max-w-md mx-auto leading-relaxed mb-6">
                Start speaking and watch as your stories are automatically transformed 
                into beautifully written blog posts using AI.
              </p>
              <div className="mt-6 p-4 bg-blue-50 rounded-lg max-w-md mx-auto">
                <p className="text-sm text-blue-700 flex items-center gap-2">
                  <Mic size={16} />
                  Click the microphone button and start speaking. Your words will be converted to a blog automatically.
                </p>
              </div>
              <div className="mt-4">
                <button
                  onClick={handleViewBlogs}
                  className="text-teal-600 hover:text-teal-700 text-sm font-medium underline"
                >
                  Or browse existing blogs →
                </button>
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            {conversationHistory.map(renderMessageBubble)}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </main>
      
      <footer className="flex-shrink-0">
        {renderFooter()}
      </footer>

      {renderBlogPreview()}
    </div>
  );
}