import { ChartBarIcon, PuzzlePieceIcon, SparklesIcon } from '@heroicons/react/24/outline'

export default function WhyEmpathAI() {
  const features = [
    {
      icon: ChartBarIcon,
      title: 'Emotional Calibration',
      description: 'Insight into emotional patterns',
      details: 'Understand and track emotional well-being patterns to support student mental health and academic success.',
      color: 'bg-powder-blue/20',
      iconColor: 'text-powder-blue'
    },
    {
      icon: PuzzlePieceIcon,
      title: 'Neurodiversity Inclusion',
      description: 'Honor diverse thinking styles',
      details: 'Celebrate and support different learning styles, cognitive approaches, and neurodivergent perspectives.',
      color: 'bg-warm-apricot/20',
      iconColor: 'text-warm-apricot'
    },
    {
      icon: SparklesIcon,
      title: 'AI-Led Insights',
      description: 'Personalized patterns and reports',
      details: 'Advanced AI analysis provides personalized insights and actionable recommendations for each student.',
      color: 'bg-sage-green/20',
      iconColor: 'text-sage-green'
    }
  ]

  return (
    <section id="why" className="section-padding bg-white relative overflow-hidden">
      <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-gray-50 to-transparent pointer-events-none -z-10"></div>

      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-lora font-bold text-dark-navy mb-6">
            Why <span className="bg-gradient-to-r from-primary to-light-purple bg-clip-text text-transparent">EmpathAI</span>?
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Empowering educational institutions with compassionate, data-driven insights that bridge the gap between AI and human empathy.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-10">
          {features.map((feature, index) => (
            <article
              key={index}
              className="group card-hover glass p-10 rounded-[2.5rem] border-2 border-transparent hover:border-primary/5 relative overflow-hidden flex flex-col items-center text-center"
            >
              <div className={`absolute top-0 right-0 w-32 h-32 ${feature.color} rounded-bl-[100px] -mr-10 -mt-10 transition-transform group-hover:scale-110 duration-500`}></div>

              <div className={`w-20 h-20 ${feature.color} rounded-3xl flex items-center justify-center mb-10 relative z-10 transform group-hover:rotate-6 transition-transform duration-500 shadow-sm border border-white/20`}>
                <feature.icon className={`w-10 h-10 ${feature.iconColor}`} strokeWidth={2.5} />
              </div>

              <div className="relative z-10 flex flex-col items-center">
                <h3 className="text-2xl font-bold text-dark-navy mb-3">{feature.title}</h3>
                <p className="text-primary font-bold text-sm uppercase tracking-widest mb-4 opacity-80 group-hover:opacity-100 transition-opacity">
                  {feature.description}
                </p>
                <div className="w-16 h-1.5 bg-primary/20 group-hover:w-24 group-hover:bg-primary/40 transition-all duration-500 mb-6 rounded-full"></div>
                <p className="text-gray-600 leading-relaxed font-medium">
                  {feature.details}
                </p>

                <button className="mt-8 text-primary font-extrabold text-sm inline-flex items-center gap-2 group/btn">
                  Learn more
                  <span className="block w-6 h-[2px] bg-primary group-hover/btn:w-10 transition-all duration-300"></span>
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}