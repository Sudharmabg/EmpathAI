import { UserGroupIcon, GlobeAltIcon, CpuChipIcon, LanguageIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

export default function InclusivityFocus() {
  const inclusivityFeatures = [
    {
      icon: UserGroupIcon,
      title: 'Accessibility First',
      description: 'Full WCAG 2.1 mapping with screen reader support, keyboard navigation, and high-contrast modes.',
      color: 'text-powder-blue',
      bg: 'bg-powder-blue/5'
    },
    {
      icon: GlobeAltIcon,
      title: 'Cultural Sensitivity',
      description: 'Assessments designed to respect diverse global perspectives and localized cultural nuances.',
      color: 'text-warm-apricot',
      bg: 'bg-warm-apricot/5'
    },
    {
      icon: CpuChipIcon,
      title: 'Neurodivergent Support',
      description: 'Accommodations for ADHD, autism, and dyslexia through sensory-friendly UI and focus modes.',
      color: 'text-sage-green',
      bg: 'bg-sage-green/5'
    },
    {
      icon: LanguageIcon,
      title: 'Multiple Languages',
      description: 'Seamless support for 20+ languages to ensure every student feels seen and heard.',
      color: 'text-dusty-lilac',
      bg: 'bg-dusty-lilac/5'
    }
  ]

  return (
    <section id="inclusivity" className="section-padding bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
          <div className="max-w-2xl">
            <h2 className="text-4xl md:text-5xl font-lora font-bold text-dark-navy mb-6">
              Inclusivity <span className="text-primary italic">at the Core</span>
            </h2>
            <p className="text-xl text-gray-600 leading-relaxed font-medium">
              We don't just add accessibility—we build around it. Supporting every student's unique journey with comprehensive inclusive design.
            </p>
          </div>
          <div className="flex -space-x-4 mb-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="w-12 h-12 rounded-full border-4 border-white bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 overflow-hidden shadow-sm">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 20}`} alt="avatar" />
              </div>
            ))}
            <div className="w-12 h-12 rounded-full border-4 border-white bg-primary flex items-center justify-center text-[10px] font-bold text-white shadow-sm z-10">
              ALL
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {inclusivityFeatures.map((feature, index) => (
            <article key={index} className="group p-8 rounded-3xl border border-gray-100 hover:border-primary/20 hover:shadow-xl transition-all duration-300">
              <div className={`w-14 h-14 ${feature.bg} rounded-2xl flex items-center justify-center mb-6 group-hover:rotate-6 transition-transform`}>
                <feature.icon className={`w-7 h-7 ${feature.color}`} />
              </div>
              <h3 className="text-xl font-bold text-dark-navy mb-4">{feature.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
            </article>
          ))}
        </div>

        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary via-light-purple to-dusty-lilac rounded-[3rem] blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
          <div className="relative bg-primary rounded-[3rem] p-8 lg:p-20 text-white overflow-hidden">
            {/* Decorative graphic background */}
            <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none">
              <svg viewBox="0 0 400 400" className="w-full h-full">
                <path d="M0,200 Q100,0 200,200 T400,200" stroke="white" strokeWidth="2" fill="none" />
                <path d="M0,250 Q100,50 200,250 T400,250" stroke="white" strokeWidth="2" fill="none" />
                <circle cx="300" cy="100" r="50" fill="white" />
              </svg>
            </div>

            <div className="grid lg:grid-cols-2 gap-16 items-center relative z-10">
              <div>
                <div className="inline-block px-4 py-1.5 bg-white/10 backdrop-blur-sm rounded-full text-xs font-bold uppercase tracking-widest text-purple-200 mb-8">
                  Our Commitment
                </div>
                <h3 className="text-4xl md:text-5xl font-lora font-bold mb-8 leading-tight">
                  Every Student <br />
                  <span className="text-warm-apricot italic underline underline-offset-8 decoration-2">Matters</span>
                </h3>
                <p className="text-xl text-purple-100/90 leading-relaxed mb-10 font-medium">
                  Our platform is built from the ground up with inclusivity at its core.
                  We believe that emotional well-being support should be accessible to ALL students.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {[
                    'Universal Design principles',
                    'Trauma-informed approaches',
                    'Privacy-first architecture',
                    'Neuro-inclusive interface'
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <CheckCircleIcon className="w-6 h-6 text-sage-green" />
                      <span className="text-sm font-bold text-white tracking-wide">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-[2.5rem] p-10 border border-white/20 relative overflow-hidden group/card shadow-2xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-[100px]"></div>
                <div className="text-center">
                  <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-8 group-hover/card:scale-110 transition-transform">
                    <UserGroupIcon className="w-10 h-10 text-white" />
                  </div>
                  <h4 className="text-2xl font-bold text-white mb-4 italic">
                    Committed to Equity
                  </h4>
                  <p className="text-purple-100 text-lg leading-relaxed mb-8">
                    Working with institutions globally to ensure no student is left behind in their emotional well-being journey.
                  </p>
                  <button className="w-full py-4 bg-white text-primary rounded-xl font-bold hover:bg-gray-50 transition-colors shadow-lg shadow-black/20">
                    View Equality Charter
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}