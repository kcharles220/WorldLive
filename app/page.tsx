"use client";

import { Header, Hero, Features, About, Footer } from "@/components/sections";

export default function Home() {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header onScrollToSection={scrollToSection} />
      <Hero onScrollToSection={scrollToSection} />
      <Features />
      <About />
      <Footer onScrollToSection={scrollToSection} />
    </div>
  );
}