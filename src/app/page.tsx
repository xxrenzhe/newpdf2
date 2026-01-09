import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import StatsSection from "@/components/StatsSection";
import BrandsMarquee from "@/components/BrandsMarquee";
import ToolsGrid from "@/components/ToolsGrid";
import AdvantagesSection from "@/components/AdvantagesSection";
import FAQSection from "@/components/FAQSection";
import BannerSection from "@/components/BannerSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Header />
      <HeroSection />
      <StatsSection />
      <BrandsMarquee />
      <ToolsGrid />
      <AdvantagesSection />
      <FAQSection />
      <BannerSection />
      <Footer />
    </main>
  );
}
