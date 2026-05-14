import { SparklesIcon, AcademicCapIcon } from '@heroicons/react/24/outline'

export default function Hero({ onStartJourney }) {
  return (
    <div className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-16">
      {/* Dynamic Animated Background Components */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[5%] w-72 h-72 bg-purple-200/40 rounded-full blur-3xl animate-blob"></div>
        <div className="absolute top-[20%] right-[10%] w-80 h-80 bg-purple-100/40 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[10%] left-[20%] w-64 h-64 bg-green-100/30 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] opacity-[0.03] rotate-12 scale-150">
          <div className="w-full h-full border-[1px] border-black/10 rounded-full"></div>
          <div className="absolute inset-20 border-[1px] border-black/10 rounded-full"></div>
          <div className="absolute inset-40 border-[1px] border-black/10 rounded-full"></div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-50 backdrop-blur-sm border border-purple-200 shadow-sm mb-8 animate-fade-in">
          <SparklesIcon className="w-5 h-5 text-purple-600" />
          <span className="text-sm font-semibold tracking-wide text-purple-700 uppercase">Empowering Young Minds</span>
        </div>

        <h1 className="text-5xl md:text-8xl font-lora font-black text-black mb-8 leading-[1.1] animate-fade-in tracking-tight">
          Welcome to our <br />
          <span className="relative inline-block">
            <span className="relative z-10 text-black">
              Learning Journey
            </span>
            <span className="absolute bottom-2 left-0 w-full h-3 bg-purple-200/50 -z-10 rounded-full"></span>
          </span>
        </h1>

        <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed animate-fade-in opacity-0" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
          Discover emotional intelligence through AI-powered learning,
          interactive experiences, and personalized growth designed
          especially for children.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 animate-fade-in opacity-0" style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}>
          <button
            onClick={onStartJourney}
            className="bg-black text-white px-8 py-4 rounded-xl font-bold hover:bg-gray-800 transition-all duration-300 transform hover:scale-105 shadow-lg active:scale-95 group flex items-center gap-3 text-lg"
          >
            Begin Your Journey
            <SparklesIcon className="w-5 h-5 group-hover:rotate-12 transition-transform" />
          </button>
          <button className="bg-white text-black border-2 border-purple-200 px-8 py-4 rounded-xl font-bold hover:bg-purple-50 transition-all duration-300 transform hover:scale-105 shadow-sm active:scale-95 flex items-center gap-3 text-lg">
            Learn More
            <AcademicCapIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Floating Graphics Elements */}
        <div className="hidden lg:block absolute -left-20 top-1/2 -translate-y-1/2 animate-float">
          <div className="glass p-6 rounded-2xl rotate-[-15deg] max-w-[200px] border-2 border-purple-100">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4 text-green-600">
              <span className="text-2xl">🌱</span>
            </div>
            <p className="text-sm font-bold text-black">Growth Mindset</p>
            <p className="text-xs text-gray-500">Cultivate emotional resilience</p>
          </div>
        </div>

        <div className="hidden lg:block absolute -right-20 top-1/3 animate-float animation-delay-2000">
          <div className="glass p-6 rounded-2xl rotate-[12deg] max-w-[200px] border-2 border-purple-100">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4 text-purple-600">
              <span className="text-2xl">🧠</span>
            </div>
            <p className="text-sm font-bold text-black">AI Tutor</p>
            <p className="text-xs text-gray-500">Personalized support 24/7</p>
          </div>
        </div>
      </div>
    </div>
  )
}