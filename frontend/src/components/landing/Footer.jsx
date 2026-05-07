import { motion } from 'framer-motion';
import { Globe, Mail, ExternalLink } from 'lucide-react';
import logo from '../../images/logo digi.png';
import { useTheme } from './ThemeContext.jsx';

const FOOTER_LINKS = {
  Product: ['Overview', 'Features', 'Security', 'Daret', 'Donations'],
  Company: ['About', 'Blog', 'Careers', 'Press'],
  Support: ['Help Center', 'Contact', 'Status', 'Privacy'],
  Legal: ['Privacy Policy', 'Terms of Service', 'Cookie Policy'],
};

const SOCIAL = [
  { Icon: Globe, label: 'Website' },
  { Icon: Mail, label: 'Email' },
  { Icon: ExternalLink, label: 'Careers' },
];

const Footer = () => {
  const { dark } = useTheme();
  return (
    <footer className="border-t" style={{ background: dark ? '#000e0c' : '#00a896', borderColor: dark ? 'rgba(0,194,168,0.1)' : 'rgba(0,80,70,0.2)' }}>
      {/* Main footer content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 pb-8 sm:pb-10">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-6 gap-8 sm:gap-10 mb-10 sm:mb-14">

          {/* Brand column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <img src={logo} alt="DigiBank logo" className="w-9 h-9 rounded-xl object-cover" />
              <span className="font-bold text-xl tracking-tight" style={{ color: dark ? '#fff' : '#fff' }}>DigiBank</span>
            </div>
            <p className="text-sm leading-relaxed max-w-55" style={{ color: dark ? 'rgba(234,247,245,0.38)' : 'rgba(255,255,255,0.75)' }}>
              Morocco's premium digital banking platform — secure, smart, and built for everyone.
            </p>

            {/* Social links */}
            <div className="flex items-center gap-3 pt-1">
              {SOCIAL.map(({ Icon, label }) => (
                <motion.a
                  key={label}
                  href="#"
                  aria-label={label}
                  whileHover={{ scale: 1.15, background: 'rgba(255,255,255,0.28)', borderColor: 'rgba(255,255,255,0.6)' }}
                  whileTap={{ scale: 0.93 }}
                  className="w-9 h-9 border rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.85)' }}
                >
                  <Icon size={15} />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([category, items]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold mb-4" style={{ color: dark ? '#fff' : '#fff' }}>{category}</h4>
              <ul className="space-y-2.5">
                {items.map((item) => (
                  <li key={item}>
                    <motion.a
                      href="#"
                      whileHover={{ x: 4, color: '#fff' }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      className="text-sm inline-block"
                      style={{ color: dark ? 'rgba(234,247,245,0.38)' : 'rgba(255,255,255,0.7)' }}
                    >
                      {item}
                    </motion.a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t pt-8 flex flex-col md:flex-row justify-between items-center gap-4"
          style={{ borderColor: dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.2)' }}>
          <p className="text-sm" style={{ color: dark ? 'rgba(234,247,245,0.28)' : 'rgba(255,255,255,0.65)' }}>
            © 2026 DigiBank. All rights reserved. Premium Moroccan Fintech.
          </p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-[#00C2A8] rounded-full animate-pulse" />
            <span className="text-sm" style={{ color: dark ? 'rgba(234,247,245,0.28)' : 'rgba(255,255,255,0.65)' }}>All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
