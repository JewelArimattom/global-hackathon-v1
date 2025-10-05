import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Mic, Library, Sparkles, TrendingUp, Zap, Users, ArrowRight } from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50">
      {/* Header */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-teal-600 to-blue-600 p-2 rounded-lg">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold text-slate-800">Story Weaver AI</span>
                <p className="text-xs text-slate-500 hidden sm:block">Transform conversations into beautiful blogs</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/blogs')}
                className="px-4 py-2 text-slate-700 hover:text-slate-900 font-medium transition-colors"
              >
                Browse Blogs
              </button>
              <Link to="/stories">
              <button
                className="px-6 py-2 bg-gradient-to-r from-teal-600 to-blue-600 text-white rounded-lg hover:from-teal-700 hover:to-blue-700 transition-all font-semibold shadow-md"
              >
                Get Started
              </button></Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 sm:px-6 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-teal-100 text-teal-700 px-4 py-2 rounded-full text-sm font-semibold mb-6">
            <Sparkles className="w-4 h-4" />
            AI-Powered Story Generation
          </div>
          
          <h1 className="text-5xl sm:text-6xl font-bold text-slate-900 mb-6 leading-tight">
            Turn Your Voice Into
            <span className="block bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent">
              Beautiful Blog Posts
            </span>
          </h1>
          
          <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Share your stories, memories, and wisdom through simple conversations. 
            Our AI transforms your words into professionally written, engaging blog posts.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/stories">
            <button
              className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-teal-600 to-blue-600 text-white text-lg font-bold rounded-full hover:from-teal-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
            >
              <Mic className="w-6 h-6" />
              Start Recording Story
              <ArrowRight className="w-5 h-5" />
            </button></Link>
            
            <button
              onClick={() => navigate('/blogs')}
              className="flex items-center gap-3 px-8 py-4 bg-white text-slate-700 text-lg font-bold rounded-full hover:bg-slate-50 transition-all border-2 border-slate-200 shadow-md"
            >
              <Library className="w-6 h-6" />
              View Blog Library
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 sm:px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">
            How It Works
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="bg-gradient-to-br from-teal-500 to-teal-600 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                <Mic className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">1. Share Your Story</h3>
              <p className="text-slate-600 leading-relaxed">
                Simply speak into your microphone. Our AI listens actively and encourages you to share naturally, just like talking to a friend.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">2. AI Transforms</h3>
              <p className="text-slate-600 leading-relaxed">
                Our advanced AI processes your conversation and crafts a well-structured, engaging blog post with proper formatting and flow.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                <Library className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">3. Publish & Share</h3>
              <p className="text-slate-600 leading-relaxed">
                Your blog is automatically saved to your library, complete with tags, categories, and a beautiful layout ready to share.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="container mx-auto px-4 sm:px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="bg-gradient-to-br from-teal-600 to-blue-600 rounded-2xl p-12 text-white">
            <h2 className="text-3xl font-bold mb-8 text-center">Why Choose Story Weaver?</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex items-start gap-4">
                <div className="bg-white/20 p-3 rounded-lg">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Lightning Fast</h3>
                  <p className="text-teal-50">
                    Get a professionally written blog post in minutes, not hours. No writing experience needed.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-white/20 p-3 rounded-lg">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Premium Quality</h3>
                  <p className="text-teal-50">
                    AI-generated content that captures your voice, emotion, and unique perspective authentically.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-white/20 p-3 rounded-lg">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Auto-Generated</h3>
                  <p className="text-teal-50">
                    Blogs are created automatically as you speak. No manual editing or formatting required.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-white/20 p-3 rounded-lg">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Built for Everyone</h3>
                  <p className="text-teal-50">
                    Perfect for storytellers, bloggers, authors, or anyone who wants to share their experiences.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 sm:px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-slate-900 mb-6">
            Ready to Share Your Story?
          </h2>
          <p className="text-xl text-slate-600 mb-10">
            Join thousands of storytellers transforming their voices into beautiful written content.
          </p>
          
          <button
            onClick={() => navigate('/record')}
            className="inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-teal-600 to-blue-600 text-white text-xl font-bold rounded-full hover:from-teal-700 hover:to-blue-700 transition-all shadow-xl hover:shadow-2xl transform hover:scale-105"
          >
            <Mic className="w-7 h-7" />
            Start Your First Story
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-teal-600 to-blue-600 p-2 rounded-lg">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-slate-800">Story Weaver AI</span>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-slate-600">
              <button
                onClick={() => navigate('/blogs')}
                className="hover:text-slate-900 transition-colors"
              >
                Browse Blogs
              </button>
              <Link to="/sto">
                            <button
                className="hover:text-slate-900 transition-colors"
              >
                Create Story
              </button></Link>
            </div>
            
            <p className="text-sm text-slate-500">
              © 2025 Story Weaver AI. Powered by AI.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}