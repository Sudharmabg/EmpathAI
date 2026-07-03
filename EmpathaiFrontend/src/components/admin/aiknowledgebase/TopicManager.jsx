import React, { useState, useEffect } from 'react'
import { getChapterTopics, addChapterTopic, deleteChapterTopic } from '../../../api/curriculumAiApi'

export default function TopicManager({ chapter }) {
  const [topics, setTopics] = useState([])
  const [loading, setLoading] = useState(true)
  const [newTopicName, setNewTopicName] = useState('')

  useEffect(() => {
    loadTopics()
  }, [chapter.id])

  const loadTopics = async () => {
    try {
      const data = await getChapterTopics(chapter.id)
      setTopics(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleAddTopic = async (e) => {
    e.preventDefault()
    if (!newTopicName.trim()) return
    try {
      await addChapterTopic(chapter.id, { topicName: newTopicName })
      setNewTopicName('')
      loadTopics()
    } catch (e) {
      alert('Failed to add topic')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure? This will delete the topic.')) return
    try {
      await deleteChapterTopic(id)
      loadTopics()
    } catch (e) {
      alert('Failed to delete topic')
    }
  }

  if (loading) return <div className="text-center py-8">Loading topics...</div>

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Add Topic</h3>
        <form onSubmit={handleAddTopic} className="flex gap-4">
          <input 
            type="text" 
            value={newTopicName}
            onChange={(e) => setNewTopicName(e.target.value)}
            placeholder="E.g., Quantum Mechanics"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9333EA] focus:border-transparent"
          />
          <button type="submit" className="px-6 py-2 bg-[#9333EA] text-white font-medium rounded-lg hover:bg-[#7e22ce] transition-colors">
            Add
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {topics.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No topics added yet. Just add names to build the structure!</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {topics.map(topic => (
              <li key={topic.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <span className="font-medium text-gray-900">{topic.topicName}</span>
                <div className="flex gap-2">
                  {!topic.hasContent && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md font-medium">Structure Only</span>
                  )}
                  <button onClick={() => handleDelete(topic.id)} className="text-red-500 hover:text-red-700 text-sm font-medium">Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
