import { Github, Linkedin, Mail, MessageCircle } from "lucide-react";

export function About() {
  return (
    <section id="about" className="py-32 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-20">
          <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-6 tracking-tight">
            About WorldLive
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Real-time global data visualization at your fingertips
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Left Side - Project Description */}
          <div className="space-y-8">
            <div className="space-y-6">
              <h3 className="text-3xl font-semibold text-foreground">
                The Project
              </h3>
              <p className="text-lg text-muted-foreground leading-relaxed">
                WorldLive transforms complex global data into an interactive, visual experience. 
                Track flights, ships, weather patterns, and seismic activity in real-time on a 
                beautiful 3D globe interface.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Built with modern web technologies, this project showcases the power of real-time 
                data visualization and interactive design. Every element is crafted to make global 
                information accessible and engaging.
              </p>
            </div>

            {/* Tech Stack */}
            <div className="space-y-6">
              <h4 className="text-xl font-semibold text-foreground">
                Built With
              </h4>
              <div className="flex space-x-4">
                {[
                  { name: 'Next.js', icon: '⚡' },
                  { name: 'ShadCN', icon: '🎨' },
                  { name: 'CesiumJS', icon: '🌍' },
                  { name: 'APIs', icon: '🔗' }
                ].map((tech) => (
                  <div
                    key={tech.name}
                    title={tech.name}
                    className="w-12 h-12 bg-muted/50 border border-border/50 rounded-xl flex items-center justify-center hover:scale-110 hover:bg-muted transition-all duration-200 cursor-pointer"
                  >
                    <span className="text-2xl">{tech.icon}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Side - Contact */}
          <div className="relative">
            <div className="bg-card/30 backdrop-blur-sm border border-border/30 rounded-3xl p-10 shadow-2xl">
              <div className="space-y-8 text-center">
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl flex items-center justify-center mx-auto border border-blue-500/20">
                    <Mail className="w-8 h-8 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-bold text-foreground mb-2">Let's Connect</h4>
                    <p className="text-muted-foreground">Ready to collaborate on something amazing?</p>
                  </div>
                </div>

                {/* Contact Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { 
                      icon: Mail, 
                      label: 'Email',
                      href: 'mailto:hello@worldlive.com',
                      iconColor: 'text-blue-600',
                    },
                    { 
                      icon: Github, 
                      label: 'GitHub',
                      href: '#',
                      iconColor: 'text-gray-600',
                    },
                    { 
                      icon: Linkedin, 
                      label: 'LinkedIn',
                      href: '#',
                      iconColor: 'text-blue-600',
                    },
                    { 
                      icon: MessageCircle, 
                      label: 'Discord',
                      href: '#',
                      iconColor: 'text-purple-600',
                    }
                  ].map((contact) => {
                    const IconComponent = contact.icon;
                    return (
                      <a
                        key={contact.label}
                        href={contact.href}
                        className={"group flex flex-col items-center space-y-3 p-6 rounded-2xl border border-border/30 transition-all duration-300 hover:scale-105 hover:shadow-lg"}
                      >
                        <div className="w-12 h-12 bg-white/50 dark:bg-black/20 rounded-xl flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                          <IconComponent className={`w-6 h-6 ${contact.iconColor}`} />
                        </div>
                        <span className="text-sm font-medium text-foreground">{contact.label}</span>
                      </a>
                    );
                  })}
                </div>

                <div className="pt-6 border-t border-border/20">
                  <p className="text-sm text-muted-foreground">
                    Open to new opportunities • Quick response guaranteed
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
