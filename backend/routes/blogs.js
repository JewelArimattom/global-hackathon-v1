const express = require('express');
const router = express.Router();

let Blog;
try {
  Blog = require('../models/Blog');
  console.log('✅ Blog model loaded in routes');
} catch (error) {
  console.error('❌ Failed to load Blog model');
}

// Get all published blogs with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      tag,
      author,
      search,
      sort = '-publishedAt'
    } = req.query;

    const query = { status: 'published' };

    // Add filters
    if (category) query.category = category;
    if (tag) query.tags = tag;
    if (author) query.authorName = new RegExp(author, 'i');
    if (search) {
      query.$or = [
        { title: new RegExp(search, 'i') },
        { content: new RegExp(search, 'i') },
        { excerpt: new RegExp(search, 'i') }
      ];
    }

    const blogs = await Blog.find(query)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-content') // Exclude full content for list view
      .lean();

    const count = await Blog.countDocuments(query);

    res.json({
      blogs,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalBlogs: count
    });

  } catch (error) {
    console.error('❌ Error fetching blogs:', error);
    res.status(500).json({ error: 'Failed to fetch blogs' });
  }
});

// Get featured blogs
router.get('/featured', async (req, res) => {
  try {
    const blogs = await Blog.find({ 
      status: 'published', 
      isFeatured: true 
    })
      .sort('-publishedAt')
      .limit(5)
      .select('-content')
      .lean();

    res.json({ blogs });
  } catch (error) {
    console.error('❌ Error fetching featured blogs:', error);
    res.status(500).json({ error: 'Failed to fetch featured blogs' });
  }
});

// Get single blog by slug
router.get('/slug/:slug', async (req, res) => {
  try {
    const blog = await Blog.findOne({ 
      slug: req.params.slug,
      status: 'published'
    }).lean();

    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    // Increment views
    await Blog.findByIdAndUpdate(blog._id, { $inc: { views: 1 } });

    res.json({ blog });
  } catch (error) {
    console.error('❌ Error fetching blog:', error);
    res.status(500).json({ error: 'Failed to fetch blog' });
  }
});

// Get single blog by ID
router.get('/:id', async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id).lean();

    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    res.json({ blog });
  } catch (error) {
    console.error('❌ Error fetching blog:', error);
    res.status(500).json({ error: 'Failed to fetch blog' });
  }
});

// Get blogs by author
router.get('/author/:authorName', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const blogs = await Blog.find({ 
      authorName: req.params.authorName,
      status: 'published'
    })
      .sort('-publishedAt')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-content')
      .lean();

    const count = await Blog.countDocuments({ 
      authorName: req.params.authorName,
      status: 'published'
    });

    res.json({
      blogs,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalBlogs: count
    });
  } catch (error) {
    console.error('❌ Error fetching author blogs:', error);
    res.status(500).json({ error: 'Failed to fetch author blogs' });
  }
});

// Get blogs by category
router.get('/category/:category', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const blogs = await Blog.find({ 
      category: req.params.category,
      status: 'published'
    })
      .sort('-publishedAt')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-content')
      .lean();

    const count = await Blog.countDocuments({ 
      category: req.params.category,
      status: 'published'
    });

    res.json({
      blogs,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalBlogs: count
    });
  } catch (error) {
    console.error('❌ Error fetching category blogs:', error);
    res.status(500).json({ error: 'Failed to fetch category blogs' });
  }
});

// Get blogs by tag
router.get('/tag/:tag', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const blogs = await Blog.find({ 
      tags: req.params.tag,
      status: 'published'
    })
      .sort('-publishedAt')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-content')
      .lean();

    const count = await Blog.countDocuments({ 
      tags: req.params.tag,
      status: 'published'
    });

    res.json({
      blogs,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalBlogs: count
    });
  } catch (error) {
    console.error('❌ Error fetching tag blogs:', error);
    res.status(500).json({ error: 'Failed to fetch tag blogs' });
  }
});

// Like a blog
router.post('/:id/like', async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    await blog.toggleLike();
    
    res.json({ 
      success: true, 
      likes: blog.likes 
    });
  } catch (error) {
    console.error('❌ Error liking blog:', error);
    res.status(500).json({ error: 'Failed to like blog' });
  }
});

// Update blog (optional - for admin/editing)
router.put('/:id', async (req, res) => {
  try {
    const { title, subtitle, content, tags, category, status, isFeatured } = req.body;
    
    const updateData = {};
    if (title) updateData.title = title;
    if (subtitle !== undefined) updateData.subtitle = subtitle;
    if (content) updateData.content = content;
    if (tags) updateData.tags = tags;
    if (category) updateData.category = category;
    if (status) updateData.status = status;
    if (isFeatured !== undefined) updateData.isFeatured = isFeatured;

    const blog = await Blog.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    res.json({ 
      success: true, 
      blog,
      message: 'Blog updated successfully' 
    });
  } catch (error) {
    console.error('❌ Error updating blog:', error);
    res.status(500).json({ error: 'Failed to update blog' });
  }
});

// Delete blog (optional - for admin)
router.delete('/:id', async (req, res) => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);

    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    res.json({ 
      success: true, 
      message: 'Blog deleted successfully' 
    });
  } catch (error) {
    console.error('❌ Error deleting blog:', error);
    res.status(500).json({ error: 'Failed to delete blog' });
  }
});

// Archive blog (soft delete)
router.post('/:id/archive', async (req, res) => {
  try {
    const blog = await Blog.findByIdAndUpdate(
      req.params.id,
      { status: 'archived' },
      { new: true }
    );

    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    res.json({ 
      success: true, 
      message: 'Blog archived successfully' 
    });
  } catch (error) {
    console.error('❌ Error archiving blog:', error);
    res.status(500).json({ error: 'Failed to archive blog' });
  }
});

// Publish draft blog
router.post('/:id/publish', async (req, res) => {
  try {
    const blog = await Blog.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'published',
        publishedAt: new Date()
      },
      { new: true }
    );

    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    res.json({ 
      success: true, 
      blog,
      message: 'Blog published successfully' 
    });
  } catch (error) {
    console.error('❌ Error publishing blog:', error);
    res.status(500).json({ error: 'Failed to publish blog' });
  }
});

// Get blog statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const totalBlogs = await Blog.countDocuments({ status: 'published' });
    
    const totalViews = await Blog.aggregate([
      { $match: { status: 'published' } },
      { $group: { _id: null, total: { $sum: '$views' } } }
    ]);
    
    const totalLikes = await Blog.aggregate([
      { $match: { status: 'published' } },
      { $group: { _id: null, total: { $sum: '$likes' } } }
    ]);

    const topBlogs = await Blog.find({ status: 'published' })
      .sort('-views')
      .limit(5)
      .select('title views likes slug')
      .lean();

    const categoryCounts = await Blog.aggregate([
      { $match: { status: 'published' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const recentBlogs = await Blog.find({ status: 'published' })
      .sort('-publishedAt')
      .limit(5)
      .select('title publishedAt authorName')
      .lean();

    res.json({
      totalBlogs,
      totalViews: totalViews[0]?.total || 0,
      totalLikes: totalLikes[0]?.total || 0,
      topBlogs,
      categoryCounts,
      recentBlogs
    });
  } catch (error) {
    console.error('❌ Error fetching blog stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get trending blogs (most views in last 7 days)
router.get('/trending/weekly', async (req, res) => {
  try {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const blogs = await Blog.find({
      status: 'published',
      publishedAt: { $gte: weekAgo }
    })
      .sort('-views')
      .limit(10)
      .select('-content')
      .lean();

    res.json({ blogs });
  } catch (error) {
    console.error('❌ Error fetching trending blogs:', error);
    res.status(500).json({ error: 'Failed to fetch trending blogs' });
  }
});

// Get related blogs (by tags and category)
router.get('/:id/related', async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    const relatedBlogs = await Blog.find({
      _id: { $ne: blog._id },
      status: 'published',
      $or: [
        { category: blog.category },
        { tags: { $in: blog.tags } }
      ]
    })
      .sort('-publishedAt')
      .limit(5)
      .select('-content')
      .lean();

    res.json({ blogs: relatedBlogs });
  } catch (error) {
    console.error('❌ Error fetching related blogs:', error);
    res.status(500).json({ error: 'Failed to fetch related blogs' });
  }
});

// Get all unique tags
router.get('/meta/tags', async (req, res) => {
  try {
    const tags = await Blog.distinct('tags', { status: 'published' });
    res.json({ tags: tags.sort() });
  } catch (error) {
    console.error('❌ Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// Get all categories with counts
router.get('/meta/categories', async (req, res) => {
  try {
    const categories = await Blog.aggregate([
      { $match: { status: 'published' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({ 
      categories: categories.map(cat => ({
        name: cat._id,
        count: cat.count
      }))
    });
  } catch (error) {
    console.error('❌ Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get authors list with blog counts
router.get('/meta/authors', async (req, res) => {
  try {
    const authors = await Blog.aggregate([
      { $match: { status: 'published' } },
      { $group: { 
        _id: '$authorName', 
        count: { $sum: 1 },
        totalViews: { $sum: '$views' },
        totalLikes: { $sum: '$likes' }
      }},
      { $sort: { count: -1 } }
    ]);

    res.json({ 
      authors: authors.map(author => ({
        name: author._id,
        blogCount: author.count,
        totalViews: author.totalViews,
        totalLikes: author.totalLikes
      }))
    });
  } catch (error) {
    console.error('❌ Error fetching authors:', error);
    res.status(500).json({ error: 'Failed to fetch authors' });
  }
});

// Search blogs with advanced filtering
router.post('/search/advanced', async (req, res) => {
  try {
    const {
      query,
      categories = [],
      tags = [],
      authors = [],
      dateFrom,
      dateTo,
      minViews,
      minLikes,
      page = 1,
      limit = 10,
      sort = '-publishedAt'
    } = req.body;

    const searchQuery = { status: 'published' };

    // Text search
    if (query) {
      searchQuery.$or = [
        { title: new RegExp(query, 'i') },
        { content: new RegExp(query, 'i') },
        { excerpt: new RegExp(query, 'i') }
      ];
    }

    // Filter by categories
    if (categories.length > 0) {
      searchQuery.category = { $in: categories };
    }

    // Filter by tags
    if (tags.length > 0) {
      searchQuery.tags = { $in: tags };
    }

    // Filter by authors
    if (authors.length > 0) {
      searchQuery.authorName = { $in: authors };
    }

    // Date range filter
    if (dateFrom || dateTo) {
      searchQuery.publishedAt = {};
      if (dateFrom) searchQuery.publishedAt.$gte = new Date(dateFrom);
      if (dateTo) searchQuery.publishedAt.$lte = new Date(dateTo);
    }

    // Views filter
    if (minViews) {
      searchQuery.views = { $gte: parseInt(minViews) };
    }

    // Likes filter
    if (minLikes) {
      searchQuery.likes = { $gte: parseInt(minLikes) };
    }

    const blogs = await Blog.find(searchQuery)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-content')
      .lean();

    const count = await Blog.countDocuments(searchQuery);

    res.json({
      blogs,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalBlogs: count
    });

  } catch (error) {
    console.error('❌ Error in advanced search:', error);
    res.status(500).json({ error: 'Failed to perform search' });
  }
});

module.exports = router;