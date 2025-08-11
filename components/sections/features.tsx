import { Plane, Ship, CloudRain, Zap } from "lucide-react";

export function Features() {
  const features = [
    {
      icon: Plane,
      title: "Flight Tracking",
      description: "Monitor aircraft movements across the globe with detailed route information and live positioning data.",
      gradient: "from-blue-600 to-blue-400"
    },
    {
      icon: Ship,
      title: "Maritime Data",
      description: "Track vessels navigating international waters with comprehensive shipping and cargo information.",
      gradient: "from-cyan-600 to-cyan-400"
    },
    {
      icon: CloudRain,
      title: "Weather Monitoring",
      description: "Access real-time atmospheric data including temperature, precipitation, and storm tracking.",
      gradient: "from-purple-600 to-purple-400"
    },
    {
      icon: Zap,
      title: "Seismic Activity",
      description: "Stay informed about earthquakes and geological events with magnitude and location data.",
      gradient: "from-red-600 to-red-400"
    }
  ];

  return (
    <section id="features" className="py-32 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-20">
          <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-6 tracking-tight">
            Monitor the World
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Real-time global data streams at your fingertips
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 lg:gap-20">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            const isLeftColumn = index % 2 === 0;
            
            return (
              <div
                key={feature.title}
                className="group relative"
              >
                <div className={`flex items-start ${isLeftColumn ? 'space-x-8 flex-row-reverse space-x-reverse' : 'space-x-8'}`}>
                  {/* Icon */}
                  <div className={`
                    w-20 h-20 rounded-3xl bg-gradient-to-br ${feature.gradient} 
                    flex items-center justify-center flex-shrink-0
                    group-hover:scale-105 transition-transform duration-300
                    shadow-xl shadow-black/10
                  `}>
                    <IconComponent className="w-10 h-10 text-white" />
                  </div>

                  {/* Content */}
                  <div className={`flex-1 pt-2 ${isLeftColumn ? 'text-right' : 'text-left'}`}>
                    <h3 className="text-3xl font-semibold text-foreground mb-4 group-hover:text-foreground/80 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed text-xl">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
