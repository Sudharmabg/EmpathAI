import { useState } from 'react'

export default function Resources() {
  const [activeCategory, setActiveCategory] = useState('articles')

  const articles = [
    {
      id: 1,
      title: "Understanding Student Stress: A Complete Guide",
      excerpt: "Learn about common sources of student stress and effective coping strategies.",
      readTime: "5 min read",
      category: "Stress Management"
    },
    {
      id: 2,
      title: "Building Emotional Resilience in College",
      excerpt: "Develop the skills to bounce back from challenges and maintain mental well-being.",
      readTime: "7 min read",
      category: "Resilience"
    },
    {
      id: 3,
      title: "The Science of Sleep and Academic Performance",
      excerpt: "Discover how quality sleep impacts your learning and emotional regulation.",
      readTime: "6 min read",
      category: "Sleep Health"
    },
    {
      id: 4,
      title: "Mindfulness Techniques for Students",
      excerpt: "Simple mindfulness practices you can do between classes or during study breaks.",
      readTime: "4 min read",
      category: "Mindfulness"
    }
  ]

  const categories = [
    { id: 'articles', name: 'Articles', icon: '📄' },
    { id: 'videos', name: 'Videos', icon: '🎥' },
    { id: 'tools', name: 'Tools', icon: '🛠️' }
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-black mb-6">Wellness Resources</h2>

      {/* Category Tabs */}
      <div className="flex space-x-4 mb-6">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setActiveCategory(category.id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              activeCategory === category.id
                ? 'bg-black text-white'
                : 'bg-powder-blue text-black hover:bg-dusty-lilac'
            }`}
          >
            <span>{category.icon}</span>
            <span>{category.name}</span>
          </button>
        ))}
      </div>

      {/* Articles Section */}
      {activeCategory === 'articles' && (
        <div className="grid md:grid-cols-2 gap-6">
          {articles.map((article) => (
            <div key={article.id} className="bg-gradient-to-br from-powder-blue to-dusty-lilac rounded-xl p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex justify-between items-start mb-3">
                <span className="bg-warm-apricot text-black px-3 py-1 rounded-full text-sm">
                  {article.category}
                </span>
                <span className="text-black text-sm">{article.readTime}</span>
              </div>
              <h3 className="text-xl font-semibold text-black mb-2">{article.title}</h3>
              <p className="text-black text-sm mb-4">{article.excerpt}</p>
              <button className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">
                Read Article
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}