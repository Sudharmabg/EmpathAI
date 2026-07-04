import { useNavigate } from 'react-router-dom'
import { useEffect, useRef } from 'react'

export default function NotFound() {
  const navigate = useNavigate()
  const rocketRef = useRef(null)
  const starsRef = useRef(null)

  useEffect(() => {
    const canvas = starsRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    const stars = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2 + 0.5,
      speed: Math.random() * 0.4 + 0.1,
      opacity: Math.random(),
      dir: Math.random() > 0.5 ? 1 : -1,
    }))

    let raf
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      stars.forEach(s => {
        s.opacity += 0.015 * s.dir
        if (s.opacity >= 1) s.dir = -1
        if (s.opacity <= 0) s.dir = 1
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(167,139,250,${s.opacity})`
        ctx.fill()
      })
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0c29 0%, #1a1040 50%, #0d1b2a 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Lora, Georgia, serif',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* Star canvas */}
      <canvas ref={starsRef} style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none',
      }} />

      {/* Floating planets */}
      <div style={{ position: 'absolute', top: '8%', left: '6%', animation: 'floatA 6s ease-in-out infinite' }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, #a78bfa, #6d28d9)', opacity: 0.6 }} />
      </div>
      <div style={{ position: 'absolute', top: '15%', right: '10%', animation: 'floatB 8s ease-in-out infinite' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'radial-gradient(circle at 40% 30%, #fbbf24, #d97706)', opacity: 0.5 }} />
      </div>
      <div style={{ position: 'absolute', bottom: '12%', left: '12%', animation: 'floatA 7s ease-in-out infinite 1s' }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'radial-gradient(circle at 40% 30%, #6ee7b7, #10b981)', opacity: 0.45 }} />
      </div>
      <div style={{ position: 'absolute', bottom: '20%', right: '8%', animation: 'floatB 9s ease-in-out infinite 2s' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, #f9a8d4, #ec4899)', opacity: 0.4 }} />
      </div>

      {/* Main card */}
      <div style={{
        position: 'relative', zIndex: 10,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        textAlign: 'center', padding: '0 24px', maxWidth: 560,
      }}>

        {/* Rocket astronaut animation */}
        <div ref={rocketRef} style={{ fontSize: 100, animation: 'rocketFloat 3s ease-in-out infinite', marginBottom: 8, lineHeight: 1 }}>
          🚀
        </div>
        <div style={{ fontSize: 44, animation: 'rocketFloat 3s ease-in-out infinite 0.5s', marginBottom: 24 }}>
          🪐
        </div>

        {/* 404 */}
        <div style={{
          fontSize: 120, fontWeight: 900, lineHeight: 1,
          background: 'linear-gradient(135deg, #a78bfa 0%, #ec4899 50%, #fbbf24 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          letterSpacing: '-4px', marginBottom: 12,
          animation: 'glowPulse 2.5s ease-in-out infinite',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          404
        </div>

        {/* Heading */}
        <h1 style={{
          fontSize: 28, fontWeight: 700, color: '#f3f4f6', marginBottom: 12, marginTop: 0,
        }}>
          Lost in space! 🌌
        </h1>

        {/* Sub */}
        <p style={{
          fontSize: 16, color: '#a5b4fc', lineHeight: 1.7, marginBottom: 8, marginTop: 0,
        }}>
          Hmm, this page drifted off into the galaxy.
        </p>
        <p style={{
          fontSize: 15, color: '#7c8db5', lineHeight: 1.7, marginBottom: 36, marginTop: 0,
        }}>
          Don't worry — even the best explorers take a wrong turn sometimes!
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: '12px 28px', borderRadius: 50, border: '2px solid #a78bfa',
              background: 'transparent', color: '#a78bfa', fontSize: 15, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.target.style.background = '#a78bfa20' }}
            onMouseLeave={e => { e.target.style.background = 'transparent' }}
          >
            ← Go back
          </button>
          <button
            onClick={() => navigate('/student/overview')}
            style={{
              padding: '12px 28px', borderRadius: 50, border: 'none',
              background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
              color: '#fff', fontSize: 15, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'all 0.2s',
              boxShadow: '0 0 24px rgba(124,58,237,0.5)',
            }}
            onMouseEnter={e => { e.target.style.transform = 'scale(1.05)' }}
            onMouseLeave={e => { e.target.style.transform = 'scale(1)' }}
          >
            🏠 Back to dashboard
          </button>
        </div>

        {/* Fun fact pill */}
        <div style={{
          marginTop: 48,
          background: 'rgba(167,139,250,0.1)',
          border: '1px solid rgba(167,139,250,0.25)',
          borderRadius: 50,
          padding: '10px 24px',
          color: '#c4b5fd',
          fontSize: 13,
        }}>
          🌟 Fun fact: Even NASA spacecraft occasionally go off course!
        </div>
      </div>

      {/* Logo watermark */}
      <div style={{
        position: 'absolute', top: 24, left: 28, zIndex: 10,
        display: 'flex', alignItems: 'center', gap: 10,
        cursor: 'pointer',
      }} onClick={() => navigate('/')}>
        <div style={{
          width: 36, height: 36, background: '#a78bfa33',
          border: '1px solid #a78bfa55',
          borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ color: '#a78bfa', fontWeight: 900, fontSize: 18 }}>E</span>
        </div>
        <span style={{ color: '#c4b5fd', fontWeight: 800, fontSize: 18 }}>MyMercurie</span>
      </div>

      <style>{`
        @keyframes rocketFloat {
          0%, 100% { transform: translateY(0px) rotate(-5deg); }
          50% { transform: translateY(-18px) rotate(5deg); }
        }
        @keyframes floatA {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes floatB {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-14px) rotate(15deg); }
        }
        @keyframes glowPulse {
          0%, 100% { filter: drop-shadow(0 0 20px rgba(167,139,250,0.4)); }
          50% { filter: drop-shadow(0 0 40px rgba(236,72,153,0.6)); }
        }
      `}</style>
    </div>
  )
}