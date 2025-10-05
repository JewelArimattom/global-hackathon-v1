import React, { useState, useEffect } from 'react';
import { BookOpen, Search, Filter, Eye, Heart, Clock, Tag, User, Calendar, Sparkles, TrendingUp, X } from 'lucide-react';

// Types
interface Blog {
  _id: string;
  title: string;
  subtitle?: string;
  excerpt: string;
  authorName: string;
  category: string;
  tags: string[];
  slug: string;
  readingTime: number;
  views: number;
  likes: number;
  publishedAt: string;
  formattedDate?: string;
}

interface BlogStats {
  totalBlogs: number;
  totalViews: number;
  totalLikes: number;
  topBlogs: Array<{ title: string; views: number; likes: number; slug: string }>;
  categoryCounts: Array<{ _id: string; count: number }>;
}

export default function BlogsPage() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [featuredBlogs, setFeaturedBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [allTags, setAllTags] = useState<string[]>([]);
  const [categories, setCategories] = useState<Array<{ name: string; count: number }>>([]);
  const [stats, setStats] = useState<BlogStats | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchBlogs();
    fetchFeaturedBlogs();
    fetchMetadata();
    fetchStats();
  }, [currentPage, selectedCategory, selectedTag, searchTerm]);

  const fetchBlogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '9'
      });

      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedTag) params.append('tag', selectedTag);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`http://localhost:5000/api/blogs?${params}`);
      const data = await response.json();
      
      setBlogs(data.blogs || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('Error fetching blogs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFeaturedBlogs = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/blogs/featured');
      const data = await response.json();
      setFeaturedBlogs(data.blogs || []);
    } catch (error) {
      console.error('Error fetching featured blogs:', error);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [tagsRes, categoriesRes] = await Promise.all([
        fetch('http://localhost:5000/api/blogs/meta/tags'),
        fetch('http://localhost:5000/api/blogs/meta/categories')
      ]);

      const tagsData = await tagsRes.json();
      const categoriesData = await categoriesRes.json();

      setAllTags(tagsData.tags || []);
      setCategories(categoriesData.categories || []);
    } catch (error) {
      console.error('Error fetching metadata:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/blogs/stats/overview');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleLike = async (blogId: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/blogs/${blogId}/like`, {
        method: 'POST'
      });
      
      if (response.ok) {
        // Refresh blogs to show updated like count
        fetchBlogs();
      }
    } catch (error) {
      console.error('Error liking blog:', error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchBlogs();
  };

  const clearFilters = () => {
    setSelectedCategory('');
    setSelectedTag('');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'personal-story': 'from-purple-500 to-pink-500',
      'life-lessons': 'from-blue-500 to-cyan-500',
      'wisdom': 'from-amber-500 to-orange-500',
      'inspiration': 'from-teal-500 to-green-500',
      'reflection': 'from-indigo-500 to-purple-500',
      'journey': 'from-rose-500 to-red-500',
      'experience': 'from-emerald-500 to-teal-500'
    };
    return colors[category] || 'from-gray-500 to-slate-500';
  };

  const renderBlogCard = (blog: Blog) => (
    <div 
      key={blog._id}
      className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-slate-200 group cursor-pointer"
    >
      {/* Category Badge */}
      <div className={`h-2 bg-gradient-to-r ${getCategoryColor(blog.category)}`}></div>
      
      <div className="p-6">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white bg-gradient-to-r ${getCategoryColor(blog.category)}`}>
              {blog.category.replace('-', ' ')}
            </span>
            <span className="text-slate-500 text-xs flex items-center gap-1">
              <Clock size={12} />
              {blog.readingTime} min read
            </span>
          </div>
          
          <h3 className="text-2xl font-bold text-slate-800 mb-2 group-hover:text-teal-600 transition-colors line-clamp-2">
            {blog.title}
          </h3>
          
          {blog.subtitle && (
            <p className="text-slate-600 text-sm font-medium mb-2 line-clamp-1">
              {blog.subtitle}
            </p>
          )}
        </div>

        {/* Excerpt */}
        <p className="text-slate-700 text-sm leading-relaxed mb-4 line-clamp-3">
          {blog.excerpt}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {blog.tags.slice(0, 4).map((tag, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedTag(tag);
                setCurrentPage(1);
              }}
              className="text-xs bg-gradient-to-r from-teal-50 to-blue-50 text-teal-700 px-2 py-1 rounded-full hover:from-teal-100 hover:to-blue-100 transition-colors"
            >
              #{tag}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <div className="flex items-center gap-1">
              <User size={14} />
              <span className="font-medium">{blog.authorName}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar size={14} />
              <span>{formatDate(blog.publishedAt)}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-slate-500">
              <Eye size={14} />
              {blog.views}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleLike(blog._id);
              }}
              className="flex items-center gap-1 text-rose-500 hover:text-rose-600 transition-colors"
            >
              <Heart size={14} />
              {blog.likes}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderFeaturedBlog = (blog: Blog) => (
    <div 
      key={blog._id}
      className="bg-gradient-to-br from-teal-600 to-blue-600 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden cursor-pointer text-white p-8"
    >
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5" />
        <span className="text-sm font-semibold uppercase tracking-wide">Featured</span>
      </div>
      
      <h3 className="text-3xl font-bold mb-3 line-clamp-2">
        {blog.title}
      </h3>
      
      {blog.subtitle && (
        <p className="text-teal-100 text-lg font-medium mb-4 line-clamp-2">
          {blog.subtitle}
        </p>
      )}
      
      <p className="text-white/90 leading-relaxed mb-6 line-clamp-3">
        {blog.excerpt}
      </p>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm">{blog.authorName}</span>
          <span className="text-sm opacity-75">{blog.readingTime} min read</span>
        </div>
        
        <div className="flex items-center gap-3 text-sm">
          <span className="flex items-center gap-1">
            <Eye size={14} />
            {blog.views}
          </span>
          <span className="flex items-center gap-1">
            <Heart size={14} />
            {blog.likes}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50">
      {/* Header */}
      <nav className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-teal-600 to-blue-600 p-2 rounded-lg">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold text-slate-800">Story Weaver Blogs</span>
                <p className="text-xs text-slate-500">AI-Generated Personal Stories</p>
              </div>
            </div>
            
            {stats && (
              <div className="hidden md:flex items-center gap-6 text-sm">
                <div className="text-center">
                  <div className="font-bold text-teal-600">{stats.totalBlogs}</div>
                  <div className="text-slate-500 text-xs">Stories</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-blue-600">{stats.totalViews}</div>
                  <div className="text-slate-500 text-xs">Views</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-rose-600">{stats.totalLikes}</div>
                  <div className="text-slate-500 text-xs">Likes</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 sm:px-6 py-8">
        {/* Featured Blogs Section */}
        {featuredBlogs.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-6 h-6 text-teal-600" />
              <h2 className="text-3xl font-bold text-slate-800">Featured Stories</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {featuredBlogs.slice(0, 2).map(renderFeaturedBlog)}
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <form onSubmit={handleSearch} className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search blogs by title, content, or tags..."
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="px-6 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2"
            >
              <Filter size={20} />
              Filters
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-teal-600 to-blue-600 text-white rounded-lg hover:from-teal-700 hover:to-blue-700 transition-all font-semibold"
            >
              Search
            </button>
          </form>

          {/* Active Filters */}
          {(selectedCategory || selectedTag) && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-slate-600 font-medium">Active Filters:</span>
              {selectedCategory && (
                <span className="bg-teal-100 text-teal-700 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                  {selectedCategory}
                  <button onClick={() => setSelectedCategory('')}>
                    <X size={14} />
                  </button>
                </span>
              )}
              {selectedTag && (
                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                  #{selectedTag}
                  <button onClick={() => setSelectedTag('')}>
                    <X size={14} />
                  </button>
                </span>
              )}
              <button
                onClick={clearFilters}
                className="text-sm text-slate-600 hover:text-slate-800 underline"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Categories */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Tag size={16} />
                  Categories
                </h3>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.name}
                      onClick={() => {
                        setSelectedCategory(selectedCategory === cat.name ? '' : cat.name);
                        setCurrentPage(1);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        selectedCategory === cat.name
                          ? 'bg-gradient-to-r from-teal-600 to-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {cat.name.replace('-', ' ')} ({cat.count})
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Tag size={16} />
                  Popular Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {allTags.slice(0, 15).map((tag) => (
                    <button
                      key={tag}
                      onClick={() => {
                        setSelectedTag(selectedTag === tag ? '' : tag);
                        setCurrentPage(1);
                      }}
                      className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                        selectedTag === tag
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                          : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                      }`}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Blog Grid */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">All Stories</h2>
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white rounded-xl shadow-lg p-6 animate-pulse">
                  <div className="h-4 bg-slate-200 rounded w-3/4 mb-4"></div>
                  <div className="h-3 bg-slate-200 rounded w-full mb-2"></div>
                  <div className="h-3 bg-slate-200 rounded w-5/6 mb-4"></div>
                  <div className="h-20 bg-slate-200 rounded mb-4"></div>
                  <div className="flex gap-2">
                    <div className="h-6 bg-slate-200 rounded-full w-16"></div>
                    <div className="h-6 bg-slate-200 rounded-full w-16"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : blogs.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl shadow-md">
              <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-700 mb-2">No blogs found</h3>
              <p className="text-slate-500 mb-4">Try adjusting your filters or search terms</p>
              <button
                onClick={clearFilters}
                className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {blogs.map(renderBlogCard)}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            
            <div className="flex gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-10 h-10 rounded-lg font-semibold transition-all ${
                    currentPage === page
                      ? 'bg-gradient-to-r from-teal-600 to-blue-600 text-white'
                      : 'bg-white border border-slate-300 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}