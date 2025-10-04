import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, Mic, User, ArrowRight, AlertTriangle, Wifi, Save, Loader2, MessageSquare, Play, Square, FileText } from 'lucide-react';

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
  extractedData?: any;
  isFallback?: boolean;
  storyId?: string;
  transcribedText?: string;
}

interface BlogData {
  blogTitle: string;
  blogContent: string;
  blogTags: string[];
  success: boolean;
  message: string;
}

// --- Main Component ---
export default function RecordingStoriesPage() {
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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Hardcoded values
  const storytellerName = 'Friend';
  const selectedTopic = 'wisdom';

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
        recordingIntervalRef.current = null;
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
    fetch('http://localhost:5000/api/ai/health')
      .then(res => setIsBackendConnected(res.ok))
      .catch(() => setIsBackendConnected(false));

    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      speechSynthesis.cancel();
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

  // --- API Functions ---

  const startStorySession = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/ai/start-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storytellerName, topic: selectedTopic, interviewMode: 'voice' }),
      });
      if (!response.ok) throw new Error('Failed to start story session');
      const data = await response.json();
      setCurrentStoryId(data.storyId);
      setRecordingStartTime(Date.now());
      setRecordingDuration(0);
      const greeting: ConversationMessage = { speaker: 'ai', text: data.greeting, timestamp: new Date() };
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
      
      // Generate blog post after saving
      await generateBlogPost();
      
      alert('Story saved successfully and blog post generated!');
      
      // Reset to start
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
        body: JSON.stringify({ storyId: currentStoryId }),
      });
      
      if (!response.ok) throw new Error('Failed to generate blog post');
      
      const data = await response.json();
      setBlogData(data);
      setShowBlogPreview(true);
      
    } catch (error) {
      console.error('Error generating blog post:', error);
      setErrorMessage('Failed to generate blog post, but story was saved.');
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
    } catch (error) {
      setErrorMessage('Failed to start interview session. Please try again.');
      setInterviewState('ready');
    }
  };

  const sendVoiceMessage = async (audioBlob: Blob): Promise<AIResponse> => {
    setAiStatus('thinking');
    
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    formData.append('storyId', currentStoryId || '');
    formData.append('storytellerName', storytellerName);

    const response = await fetch('http://localhost:5000/api/ai/voice-message', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error(`Server error: ${response.status}`);
    return await response.json();
  };

  const processUserResponse = async (userInput: string, isVoice: boolean = false) => {
    const userMessage: ConversationMessage = { 
      speaker: 'user', 
      text: userInput, 
      timestamp: new Date(),
      isVoice: isVoice 
    };
    
    setConversationHistory(prev => [...prev, userMessage]);

    try {
      let aiData: AIResponse;
      
      if (isVoice) {
        // For voice messages, we don't need to call the chat endpoint separately
        // The voice-message endpoint already returns the AI response
        aiData = await sendVoiceMessage(new Blob()); // We'll replace this with actual audio blob
      } else {
        // For text messages, use the chat endpoint
        const response = await fetch('http://localhost:5000/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message: userInput, 
            storytellerName,
            storyId: currentStoryId
          }),
        });
        if (!response.ok) throw new Error(`Server error: ${response.status}`);
        aiData = await response.json();
      }

      const aiMessage: ConversationMessage = { 
        speaker: 'ai', 
        text: aiData.response, 
        timestamp: new Date(), 
        isFallback: aiData.isFallback 
      };
      
      setConversationHistory(prev => [...prev, aiMessage]);
      await speakText(aiData.response);
    } catch (error) {
      console.error('Error processing response:', error);
      const errorMsg: ConversationMessage = { 
        speaker: 'ai', 
        text: "I'm having trouble connecting. Let's try that again in a moment.", 
        timestamp: new Date(), 
        isFallback: true 
      };
      setConversationHistory(prev => [...prev, errorMsg]);
      await speakText(errorMsg.text);
    }
  };

  const speakText = (text: string): Promise<void> => {
    return new Promise((resolve) => {
      setAiStatus('speaking');
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => { setAiStatus('idle'); resolve(); };
      utterance.onerror = () => { setAiStatus('idle'); resolve(); };
      speechSynthesis.speak(utterance);
    });
  };

  // --- Voice Recording Functions ---

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000
        } 
      });

      audioChunksRef.current = [];
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        await processRecording();
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingStartTime(Date.now());
      setErrorMessage('');

    } catch (error) {
      console.error('Error starting recording:', error);
      setErrorMessage('Failed to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processRecording = async () => {
    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      // Show temporary message while processing
      const tempMessage: ConversationMessage = { 
        speaker: 'user', 
        text: '🎤 Processing voice message...', 
        timestamp: new Date(),
        isVoice: true 
      };
      setConversationHistory(prev => [...prev, tempMessage]);

      // Send to backend for speech-to-text and AI response
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('storyId', currentStoryId || '');
      formData.append('storytellerName', storytellerName);

      const response = await fetch('http://localhost:5000/api/ai/voice-message', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to process voice message');

      const data = await response.json();

      // Remove temporary message and add actual transcribed message
      setConversationHistory(prev => {
        const newHistory = prev.filter(msg => msg.text !== '🎤 Processing voice message...');
        const userMessage: ConversationMessage = { 
          speaker: 'user', 
          text: data.transcribedText, 
          timestamp: new Date(),
          isVoice: true 
        };
        const aiMessage: ConversationMessage = { 
          speaker: 'ai', 
          text: data.response, 
          timestamp: new Date() 
        };
        return [...newHistory, userMessage, aiMessage];
      });

      await speakText(data.response);

    } catch (error) {
      console.error('Error processing recording:', error);
      setErrorMessage('Failed to process voice message. Please try again.');
      
      // Remove temporary message on error
      setConversationHistory(prev => 
        prev.filter(msg => msg.text !== '🎤 Processing voice message...')
      );
      
      const errorMsg: ConversationMessage = { 
        speaker: 'ai', 
        text: "I couldn't process your voice message. Please try again.", 
        timestamp: new Date(), 
        isFallback: true 
      };
      setConversationHistory(prev => [...prev, errorMsg]);
      await speakText(errorMsg.text);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // --- Render Functions ---

  const renderMessageBubble = (message: ConversationMessage, index: number) => {
    const isUser = message.speaker === 'user';
    return (
      <div key={index} className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
        {!isUser && <img src="https://i.pravatar.cc/150?u=anna-ai" className="w-8 h-8 rounded-full self-start" alt="AI" />}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <div className={`inline-block px-4 py-3 rounded-2xl max-w-md md:max-w-lg ${
            isUser 
              ? 'bg-teal-600 text-white rounded-br-none' 
              : 'bg-white text-slate-800 rounded-bl-none border border-slate-200'
          }`}>
            <div className="flex items-center gap-2">
              {message.isVoice && <Mic className="w-3 h-3" />}
              <p className="text-sm">{message.text}</p>
            </div>
          </div>
          {message.isFallback && <p className="text-xs text-red-500 mt-1">⚠️ Fallback response</p>}
          <span className="text-xs text-slate-500 mt-1">
            {message.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        {isUser && <User className="w-8 h-8 rounded-full p-1.5 bg-slate-200 text-slate-600 self-start" />}
      </div>
    );
  };

  const renderBlogPreview = () => {
    if (!blogData || !showBlogPreview) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-slate-800">Generated Blog Post</h2>
              <button
                onClick={() => setShowBlogPreview(false)}
                className="text-slate-500 hover:text-slate-700"
              >
                ✕
              </button>
            </div>
            
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-teal-700 mb-4">{blogData.blogTitle}</h1>
              <div className="flex flex-wrap gap-2 mb-4">
                {blogData.blogTags.map((tag, index) => (
                  <span key={index} className="bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-sm">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="prose max-w-none">
              {blogData.blogContent.split('\n').map((paragraph, index) => (
                <p key={index} className="mb-4 text-slate-700 leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
            
            <div className="mt-8 pt-6 border-t border-slate-200">
              <p className="text-sm text-slate-500">
                This blog post was automatically generated from your conversation with AI Interviewer.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const getStatusText = () => {
    if (aiStatus === 'speaking') return 'Anna is speaking...';
    if (aiStatus === 'thinking') return 'Anna is thinking...';
    if (isRecording) return `Recording... ${recordingDuration}s`;
    if (errorMessage) return 'Interview interrupted';
    return 'Ready to record';
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderFooter = () => {
    if (interviewState === 'ready') {
      return (
        <div className="p-4 bg-white border-t border-slate-200 flex flex-col items-center justify-center">
            <button 
              onClick={handleBeginInterview}
              disabled={!isBackendConnected}
              className="px-8 py-4 bg-teal-600 text-white font-bold rounded-full hover:bg-teal-700 transition disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center gap-3 text-lg"
            >
              <Play className="w-6 h-6" /> Start Conversation
            </button>
            {!isBackendConnected && (
              <p className="text-red-600 text-sm mt-3 flex items-center gap-2">
                <AlertTriangle size={16} />
                Cannot connect to server. Please try again later.
              </p>
            )}
        </div>
      );
    }

    return (
      <div className="p-4 bg-white border-t border-slate-200">
        <div className="flex items-center justify-center gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <button
              onClick={toggleRecording}
              disabled={aiStatus === 'thinking' || aiStatus === 'speaking'}
              className={`relative flex items-center justify-center w-16 h-16 rounded-full transition-all duration-300 ${
                isRecording 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-teal-500 hover:bg-teal-600 text-white'
              } disabled:bg-slate-400 disabled:cursor-not-allowed`}
            >
              {isRecording && <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-50"></div>}
              {isRecording ? <Square className="w-6 h-6 z-10" /> : <Mic className="w-6 h-6 z-10" />}
            </button>
            <p className="text-sm font-medium text-slate-600 h-5">{getStatusText()}</p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={generateBlogPost}
              disabled={isGeneratingBlog || conversationHistory.length < 2}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:bg-slate-400"
            >
              {isGeneratingBlog ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
              Generate Blog
            </button>
            
            <button
              onClick={endStorySession}
              disabled={isSaving || conversationHistory.length < 2}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-700 text-white font-semibold rounded-lg hover:bg-slate-800 transition disabled:bg-slate-400"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              End & Save
            </button>
          </div>
        </div>
        
        {errorMessage && (
          <p className="text-center text-red-600 text-sm mt-3 flex items-center justify-center gap-2">
            <AlertTriangle size={16} /> {errorMessage}
          </p>
        )}
        
        {recordingDuration > 0 && (
          <p className="text-center text-slate-500 text-sm mt-2">
            Total recording time: {formatDuration(recordingDuration)}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans">
      <nav className="bg-white border-b border-slate-200 shadow-sm flex-shrink-0">
        <div className="container mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-teal-600" />
            <span className="text-xl font-semibold text-slate-800">AI Interviewer</span>
          </div>
          <div className="flex items-center gap-4">
            {currentStoryId && (
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                Session: {currentStoryId.slice(-8)}
              </span>
            )}
            <div className={`flex items-center gap-2 text-sm font-medium ${isBackendConnected ? 'text-green-600' : 'text-red-600'}`}>
              <Wifi size={16} />
              {isBackendConnected ? 'Connected' : 'Disconnected'}
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-grow p-4 sm:p-6 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-6">
          {conversationHistory.length === 0 && (
            <div className="text-center py-12 px-4">
              <MessageSquare className="w-16 h-16 mx-auto text-slate-300" />
              <h2 className="mt-4 text-2xl font-semibold text-slate-700">Ready to Listen</h2>
              <p className="mt-2 text-slate-500">
                Click "Start Conversation" below to begin sharing your story. 
                Your conversation will be automatically converted into a blog post!
              </p>
            </div>
          )}
          {conversationHistory.map(renderMessageBubble)}
          <div ref={messagesEndRef} />
        </div>
      </main>
      
      <footer className="flex-shrink-0">
        {renderFooter()}
      </footer>

      {renderBlogPreview()}
    </div>
  );
}