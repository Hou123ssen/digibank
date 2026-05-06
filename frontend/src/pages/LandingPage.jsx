import Navbar from '../components/landing/Navbar.jsx';
import HeroSection from '../components/landing/HeroSection.jsx';
import FeaturesSection from '../components/landing/FeaturesSection.jsx';
import SecuritySection from '../components/landing/SecuritySection.jsx';
import TicketingSection from '../components/landing/TicketingSection.jsx';
import CTASection from '../components/landing/CTASection.jsx';
import Footer from '../components/landing/Footer.jsx';

const LandingPage = () => {
  return (
    <div className="bg-[#001F1C] overflow-x-hidden">
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

export default LandingPage;
