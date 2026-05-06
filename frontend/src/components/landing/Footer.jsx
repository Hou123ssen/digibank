import { Shield, Globe, Mail, ExternalLink } from 'lucide-react';

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
  return (
    <footer className="bg-black border-t border-white/5">
      {/* Main footer content */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-16 pb-10">
        <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-10 mb-14">

          {/* Brand column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-linear-to-br from-[#00C2A8] to-[#007A6E] rounded-xl flex items-center justify-center">
                <Shield size={17} className="text-[#001F1C]" strokeWidth={2.5} />
              </div>
              <span className="text-white font-bold text-xl tracking-tight">DigiBank</span>
            </div>
            <p className="text-[#EAF7F5]/38 text-sm leading-relaxed max-w-55">
              Morocco's premium digital banking platform — secure, smart, and built for everyone.
            </p>

            {/* Social links */}
            <div className="flex items-center gap-3 pt-1">
              {SOCIAL.map(({ Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="w-9 h-9 bg-[#002920]/60 border border-white/8 rounded-lg flex items-center justify-center text-[#EAF7F5]/40 hover:text-[#00C2A8] hover:border-[#00C2A8]/30 transition-all duration-200"
                >
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([category, items]) => (
            <div key={category}>
              <h4 className="text-white text-sm font-semibold mb-4">{category}</h4>
              <ul className="space-y-2.5">
                {items.map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-[#EAF7F5]/38 hover:text-[#00C2A8] text-sm transition-colors duration-200"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[#EAF7F5]/28 text-sm">
            © 2024 DigiBank. All rights reserved. Premium Moroccan Fintech.
          </p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-[#00C2A8] rounded-full animate-pulse" />
            <span className="text-[#EAF7F5]/28 text-sm">All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
