export default function Dashboard({ user, setActiveTab }) {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Welcome back, {user?.name}!</h1>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white/90 rounded-xl p-6">
            <h3 className="text-xl font-bold mb-4">Assessment Progress</h3>
            <p className="text-gray-600">Continue your emotional intelligence assessment</p>
            <button 
              onClick={() => setActiveTab('assessment')}
              className="mt-4 bg-primary text-white px-4 py-2 rounded-lg"
            >
              Continue Assessment
            </button>
          </div>
          <div className="bg-white/90 rounded-xl p-6">
            <h3 className="text-xl font-bold mb-4">Learning Journey</h3>
            <p className="text-gray-600">Explore CBSE curriculum with gamification</p>
            <button 
              onClick={() => setActiveTab('curriculum')}
              className="mt-4 bg-primary text-white px-4 py-2 rounded-lg"
            >
              Start Learning
            </button>
          </div>
          <div className="bg-white/90 rounded-xl p-6">
            <h3 className="text-xl font-bold mb-4">AI Tutor</h3>
            <p className="text-gray-600">Get help from your emotional intelligence tutor</p>
            <button 
              onClick={() => setActiveTab('chatbot')}
              className="mt-4 bg-primary text-white px-4 py-2 rounded-lg"
            >
              Chat Now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Assessment() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto bg-white/90 rounded-xl p-8">
        <h1 className="text-3xl font-bold mb-6">Emotional Intelligence Assessment</h1>
        <p className="text-gray-600">Assessment component will be implemented here.</p>
      </div>
    </div>
  )
}

export function Chatbot() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto bg-white/90 rounded-xl p-8">
        <h1 className="text-3xl font-bold mb-6">AI Emotional Tutor</h1>
        <p className="text-gray-600">Chatbot component will be implemented here.</p>
      </div>
    </div>
  )
}

export function Counselors() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto bg-white/90 rounded-xl p-8">
        <h1 className="text-3xl font-bold mb-6">Professional Counselors</h1>
        <p className="text-gray-600">Counselor booking component will be implemented here.</p>
      </div>
    </div>
  )
}

export function Footer() {
  return (
    <footer className="bg-dark-navy py-8 mt-16 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <p className="text-gray-300">&copy; 2024 EmpathAI. All rights reserved.</p>
      </div>
    </footer>
  )
}