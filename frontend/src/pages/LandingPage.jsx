import Navbar from '../components/landing/Navbar.jsx';
import HeroSection from '../components/landing/HeroSection.jsx';
import FeaturesSection from '../components/landing/FeaturesSection.jsx';
import SecuritySection from '../components/landing/SecuritySection.jsx';
import TicketingSection from '../components/landing/TicketingSection.jsx';
import CTASection from '../components/landing/CTASection.jsx';
import Footer from '../components/landing/Footer.jsx';
import { ThemeProvider, useTheme } from '../components/landing/ThemeContext.jsx';

const Inner = () => {
  const { dark } = useTheme();
  return (
    <div className="overflow-x-hidden" style={{ background: dark ? '#001F1C' : '#f0fffe' }}>
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <SecuritySection />
      <TicketingSection />
      <CTASection />
      <Footer />
    </div>
  );
};

const LandingPage = () => (
  <ThemeProvider>
    <Inner />
  </ThemeProvider>
);

export default LandingPage;
