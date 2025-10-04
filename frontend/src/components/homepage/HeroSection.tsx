import { useState } from 'react';
import { BookOpen, Heart, Users, Sparkles, Menu, X, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';
import Link from 'next/link';
export default function HeroSection() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-8 h-8 text-amber-600" />
              <Link href="/"><span className="text-2xl font-semibold text-gray-800">Memory Keeper</span></Link>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-600 hover:text-amber-600 transition">How It Works</a>
              <a href="#stories" className="text-gray-600 hover:text-amber-600 transition">Stories</a>
              <a href="#pricing" className="text-gray-600 hover:text-amber-600 transition">Pricing</a>
              <a href="#about" className="text-gray-600 hover:text-amber-600 transition">About</a>
              <a href="#contact" className="text-gray-600 hover:text-amber-600 transition">Contact</a>
            </div>

            <div className="hidden md:flex items-center gap-4">
              <button className="text-gray-700 hover:text-amber-600 transition font-medium">
                Sign In
              </button>
              <button className="bg-amber-600 text-white px-6 py-2.5 rounded-lg hover:bg-amber-700 transition font-medium">
                Get Started
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden text-gray-700"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 border-t border-gray-200 pt-4">
              <div className="flex flex-col gap-4">
                <a href="#features" className="text-gray-600 hover:text-amber-600 transition">How It Works</a>
                <a href="#stories" className="text-gray-600 hover:text-amber-600 transition">Stories</a>
                <a href="#pricing" className="text-gray-600 hover:text-amber-600 transition">Pricing</a>
                <a href="#about" className="text-gray-600 hover:text-amber-600 transition">About</a>
                <a href="#contact" className="text-gray-600 hover:text-amber-600 transition">Contact</a>
                <button className="text-gray-700 hover:text-amber-600 transition font-medium text-left">
                  Sign In
                </button>
                <button className="bg-amber-600 text-white px-6 py-2.5 rounded-lg hover:bg-amber-700 transition font-medium">
                  Get Started
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Content */}
      <div className="flex-grow bg-gradient-to-b from-amber-50 via-white to-blue-50">
        <div className="container mx-auto px-6 pt-20 pb-24">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white border border-amber-200 rounded-full px-4 py-2 mb-8 shadow-sm">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span className="text-sm text-gray-700">Preserve Family Stories Forever</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Turn Conversations with
              <span className="text-amber-600"> Grandparents</span>
              <br />
              Into Lasting Family Treasures
            </h1>

            {/* Subheading */}
            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              AI-powered conversations that guide your loved ones through their life stories, 
              automatically creating beautiful blog posts to share with family for generations to come.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link href="/stories"><button className="bg-amber-600 text-white px-8 py-4 rounded-lg hover:bg-amber-700 transition font-semibold text-lg shadow-lg hover:shadow-xl w-full sm:w-auto">
                Start Recording Stories
              </button></Link>
              <button className="bg-white text-gray-700 px-8 py-4 rounded-lg hover:bg-gray-50 transition font-semibold text-lg border-2 border-gray-200 w-full sm:w-auto">
                Watch Demo
              </button>
            </div>

            {/* Feature Cards */}
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
                <div className="bg-amber-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <Heart className="w-6 h-6 text-amber-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Guided Conversations</h3>
                <p className="text-gray-600 text-sm">
                  AI asks thoughtful questions that help grandparents share their most precious memories naturally.
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
                <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Beautiful Blog Posts</h3>
                <p className="text-gray-600 text-sm">
                  Stories are automatically crafted into polished, shareable blog posts with photos and context.
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
                <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Family Legacy</h3>
                <p className="text-gray-600 text-sm">
                  Share with the whole family and build a private archive of wisdom for future generations.
                </p>
              </div>
            </div>

            {/* Social Proof */}
            <div className="mt-16 pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-500 mb-4">Trusted by families preserving their stories</p>
              <div className="flex items-center justify-center gap-8 text-gray-400">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-700">10,000+</div>
                  <div className="text-sm">Stories Preserved</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-700">5,000+</div>
                  <div className="text-sm">Families</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-700">50+</div>
                  <div className="text-sm">Countries</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300">
        <div className="container mx-auto px-6 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Brand Column */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-8 h-8 text-amber-500" />
                <span className="text-xl font-semibold text-white">Memory Keeper</span>
              </div>
              <p className="text-sm text-gray-400 mb-4">
                Preserving family stories and wisdom for generations to come through AI-powered conversations.
              </p>
              <div className="flex gap-4">
                <a href="#" className="text-gray-400 hover:text-amber-500 transition">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="#" className="text-gray-400 hover:text-amber-500 transition">
                  <Twitter className="w-5 h-5" />
                </a>
                <a href="#" className="text-gray-400 hover:text-amber-500 transition">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="#" className="text-gray-400 hover:text-amber-500 transition">
                  <Linkedin className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Product Column */}
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-amber-500 transition">How It Works</a></li>
                <li><a href="#pricing" className="hover:text-amber-500 transition">Pricing</a></li>
                <li><a href="#stories" className="hover:text-amber-500 transition">Success Stories</a></li>
                <li><a href="#faq" className="hover:text-amber-500 transition">FAQ</a></li>
                <li><a href="#demo" className="hover:text-amber-500 transition">Request Demo</a></li>
              </ul>
            </div>

            {/* Company Column */}
            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#about" className="hover:text-amber-500 transition">About Us</a></li>
                <li><a href="#blog" className="hover:text-amber-500 transition">Blog</a></li>
                <li><a href="#careers" className="hover:text-amber-500 transition">Careers</a></li>
                <li><a href="#press" className="hover:text-amber-500 transition">Press Kit</a></li>
                <li><a href="#partners" className="hover:text-amber-500 transition">Partners</a></li>
              </ul>
            </div>

            {/* Contact Column */}
            <div>
              <h4 className="font-semibold text-white mb-4">Get In Touch</h4>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-amber-500" />
                  <a href="mailto:hello@memorykeeper.com" className="hover:text-amber-500 transition">
                    hello@memorykeeper.com
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-amber-500" />
                  <a href="tel:+1234567890" className="hover:text-amber-500 transition">
                    +1 (234) 567-890
                  </a>
                </li>
                <li className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-amber-500 mt-1" />
                  <span className="text-gray-400">
                    123 Memory Lane<br />
                    San Francisco, CA 94102
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-400">
              © 2025 Memory Keeper. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm">
              <a href="#privacy" className="text-gray-400 hover:text-amber-500 transition">Privacy Policy</a>
              <a href="#terms" className="text-gray-400 hover:text-amber-500 transition">Terms of Service</a>
              <a href="#cookies" className="text-gray-400 hover:text-amber-500 transition">Cookie Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}