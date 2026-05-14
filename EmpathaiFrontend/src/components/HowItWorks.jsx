import { ArrowRightIcon } from '@heroicons/react/24/outline'

export default function HowItWorks() {
  const steps = [
    {
      number: '01',
      title: 'Complete Assessment',
      description: 'Students take a comprehensive, non-diagnostic emotional well-being assessment designed by experts.',
      accent: 'border-powder-blue'
    },
    {
      number: '02',
      title: 'AI Analysis',
      description: 'Our proprietary AI processes responses to identify patterns, rhythms, and deep behavioral insights.',
      accent: 'border-warm-apricot'
    },
    {
      number: '03',
      title: 'Personalized Report',
      description: 'Receive detailed insights and actionable recommendations tailored to each student\'s unique profile.',
      accent: 'border-sage-green'
    }
  ]

  return (
    <section id="how" className="section-padding bg-gray-50/50 relative overflow-hidden">
      <div className="absolute top-1/2 left-0 w-64 h-64 bg-powder-blue/10 rounded-full blur-[120px] -z-10"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-20 items-center">
          <div className="lg:w-1/2">
            <h2 className="text-4xl md:text-5xl font-lora font-bold text-dark-navy mb-8">
              Compassionate <br />
              <span className="text-primary italic">AI-Driven</span> Process
            </h2>
            <p className="text-lg text-gray-600 mb-12 leading-relaxed max-w-xl">
              Simple, secure, and supportive process designed with student privacy and emotional safety as our highest priorities.
            </p>

            <div className="space-y-12">
              {steps.map((step, index) => (
                <div key={index} className="flex gap-8 group relative">
                  {index !== steps.length - 1 && (
                    <div className="absolute left-[31px] top-12 w-[2px] h-12 bg-gray-200 group-hover:bg-primary/30 transition-colors"></div>
                  )}
                  <div className={`w-16 h-16 rounded-2xl bg-white border-2 ${step.accent} flex items-center justify-center font-lora font-bold text-xl text-dark-navy shadow-sm group-hover:-translate-y-1 transition-transform duration-300`}>
                    {step.number}
                  </div>
                  <div className="pt-2">
                    <h3 className="text-2xl font-bold text-dark-navy mb-2">{step.title}</h3>
                    <p className="text-gray-600 leading-relaxed font-medium">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:w-1/2 relative">
            <div className="absolute -inset-4 bg-gradient-to-tr from-primary/10 to-light-purple/10 rounded-[3rem] blur-2xl -z-10"></div>
            <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-gray-100 p-2">
              <div className="bg-primary p-10 rounded-[2.5rem] text-white">
                <div className="flex items-center justify-between mb-10">
                  <h3 className="text-2xl font-bold">Insights Dashboard</h3>
                  <div className="flex gap-2">
                    <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  </div>
                </div>

                <div className="space-y-8">
                  {[
                    { label: 'Sleep Quality', value: '7.2h', percent: 75, color: 'bg-powder-blue' },
                    { label: 'Stress Index', value: 'Moderate', percent: 45, color: 'bg-warm-apricot' },
                    { label: 'Well-being Score', value: 'Excellent', percent: 92, color: 'bg-sage-green' }
                  ].map((stat, i) => (
                    <div key={i} className="animate-fade-in" style={{ animationDelay: `${i * 0.2 + 0.5}s` }}>
                      <div className="flex justify-between items-center mb-3">
                        <span className="font-semibold text-purple-100">{stat.label}</span>
                        <span className="bg-white/10 px-3 py-1 rounded-full text-xs font-bold tracking-wider">{stat.value}</span>
                      </div>
                      <div className="bg-white/10 h-3 rounded-full overflow-hidden">
                        <div
                          className={`${stat.color} h-full rounded-full transition-all duration-1000 ease-out`}
                          style={{ width: `${stat.percent}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-12 p-6 bg-white/5 rounded-2xl border border-white/10">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-2 h-2 bg-sage-green rounded-full animate-pulse"></div>
                    <span className="text-xs font-bold uppercase tracking-widest text-purple-200">Live AI Insight</span>
                  </div>
                  <p className="text-sm text-purple-50 font-medium italic">
                    "Consistent emotional patterns detected. Recommended focus: Mindful breaks and social-emotional integration."
                  </p>
                </div>
              </div>
            </div>

            {/* Decorative floaters */}
            <div className="absolute -bottom-10 -right-10 bg-white p-6 rounded-2xl shadow-xl animate-float lg:block hidden">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-sage-green/20 rounded-lg flex items-center justify-center text-xl">✨</div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase">Growth</p>
                  <p className="text-sm font-bold text-dark-navy">+14% Weekly</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}