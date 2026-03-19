import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, type Easing } from "framer-motion";
import { Clock, CheckCircle, BarChart3, Shield, MapPin, FileText, Phone, Mail, MessageCircle, LogIn, ChevronRight, Send, Fingerprint, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

import screenshotDashboard from "@/assets/screenshot-dashboard.jpeg";
import screenshotPonto from "@/assets/screenshot-ponto.jpeg";
import screenshotManual from "@/assets/screenshot-manual.jpeg";
import screenshotBanco from "@/assets/screenshot-banco.jpeg";
import screenshotConfig from "@/assets/screenshot-config.jpeg";
import screenshotRelatorios from "@/assets/screenshot-relatorios.jpeg";

const easeOut: Easing = [0.16, 1, 0.3, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: easeOut },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: easeOut } },
};

const features = [
  {
    icon: Clock,
    title: "Marcação Automática",
    description: "Registre seu ponto com um clique. O sistema captura horário e localização GPS automaticamente.",
    image: screenshotPonto,
  },
  {
    icon: FileText,
    title: "Lançamento Manual",
    description: "Registre períodos de trabalho retroativamente com calendário visual e controle total dos horários.",
    image: screenshotManual,
  },
  {
    icon: BarChart3,
    title: "Dashboard Completo",
    description: "Visualize horas trabalhadas, extras remuneradas, saldo do banco e valor das HE em tempo real.",
    image: screenshotDashboard,
  },
  {
    icon: Shield,
    title: "Banco de Horas",
    description: "Controle automático de créditos e débitos. Acompanhe saldo, folgas e vencimentos facilmente.",
    image: screenshotBanco,
  },
  {
    icon: Fingerprint,
    title: "Biometria do Dispositivo",
    description: "Valide marcações com a biometria nativa do seu celular — impressão digital ou Face ID — garantindo que só você registre seu ponto.",
    image: screenshotConfig,
  },
  {
    icon: Camera,
    title: "Reconhecimento Facial",
    description: "Capture uma foto de referência e valide cada marcação com reconhecimento facial via câmera. Segurança extra com registro visual.",
    image: screenshotPonto,
  },
  {
    icon: MapPin,
    title: "Configurações Flexíveis",
    description: "Defina carga horária, salário, dias de trabalho e regras de horas extras personalizadas.",
    image: screenshotConfig,
  },
  {
    icon: FileText,
    title: "Relatórios & Exportação",
    description: "Exporte marcações por período em PDF ou Excel. Filtros por semana, mês ou ano.",
    image: screenshotRelatorios,
  },
];

const whatsappNumber = "5522999431532";
const whatsappMessage = encodeURIComponent("Quero saber mais sobre o Hora Certa");
const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

const LandingPage = () => {
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mailtoUrl = `mailto:contato@horacerta.com?subject=Contato via Hora Certa - ${contactName}&body=${encodeURIComponent(contactMessage)}%0A%0ADe: ${contactName}%0AEmail: ${contactEmail}`;
    window.open(mailtoUrl, "_blank");
    toast.success("Redirecionando para seu email...");
    setContactName("");
    setContactEmail("");
    setContactMessage("");
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Hora Certa
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a href="#funcionalidades" className="hidden sm:inline-block text-sm text-muted-foreground hover:text-foreground transition-colors">
              Funcionalidades
            </a>
            <a href="#contato" className="hidden sm:inline-block text-sm text-muted-foreground hover:text-foreground transition-colors">
              Contato
            </a>
            <Link to="/login">
              <Button size="sm" className="gap-2">
                <LogIn className="w-4 h-4" />
                Entrar
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto text-center relative">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <CheckCircle className="w-4 h-4" />
              Controle de ponto inteligente
            </span>
          </motion.div>
          <motion.h1
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={1}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-6"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Gerencie suas horas com{" "}
            <span className="text-primary">precisão total</span>
          </motion.h1>
          <motion.p
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={2}
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
          >
            O Hora Certa é o sistema completo para controle de ponto, banco de horas e relatórios.
            Marcação automática com GPS, lançamento manual e exportação em PDF/Excel.
          </motion.p>
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3} className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/login">
              <Button size="lg" className="gap-2 text-base px-8">
                Começar agora
                <ChevronRight className="w-5 h-5" />
              </Button>
            </Link>
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="outline" className="gap-2 text-base px-8 border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700">
                <MessageCircle className="w-5 h-5" />
                Falar no WhatsApp
              </Button>
            </a>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="funcionalidades" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            custom={0}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Tudo que você precisa em um só lugar
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Conheça as funcionalidades que tornam o Hora Certa a ferramenta ideal para controle de jornada.
            </p>
          </motion.div>

          <div className="space-y-28">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-80px" }}
                variants={fadeUp}
                custom={0}
                className={`flex flex-col ${index % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"} items-center gap-10 lg:gap-16`}
              >
                {/* Text */}
                <div className="flex-1 text-center lg:text-left">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mb-5">
                    <feature.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground text-lg leading-relaxed max-w-md mx-auto lg:mx-0">
                    {feature.description}
                  </p>
                </div>

                {/* Screenshot */}
                <motion.div
                  variants={scaleIn}
                  className="flex-1 flex justify-center"
                >
                  <div className="relative group">
                    <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 to-primary/5 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <img
                      src={feature.image}
                      alt={feature.title}
                      className="relative w-64 sm:w-72 rounded-2xl shadow-2xl border border-border transition-transform duration-500 group-hover:scale-[1.02]"
                      loading="lazy"
                    />
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-primary/5">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center"
          >
            {[
              { value: "4", label: "Marcações diárias" },
              { value: "GPS", label: "Localização verificada" },
              { value: "PDF", label: "Exportação de relatórios" },
              { value: "24/7", label: "Acesso ao sistema" },
            ].map((stat, i) => (
              <motion.div key={stat.label} variants={fadeUp} custom={i}>
                <p className="text-3xl sm:text-4xl font-bold text-primary mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {stat.value}
                </p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Contact */}
      <section id="contato" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Entre em contato
            </h2>
            <p className="text-muted-foreground text-lg">
              Tire suas dúvidas ou solicite uma demonstração
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Info */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={1}
              className="space-y-6"
            >
              <div className="flex items-start gap-4 p-5 rounded-2xl bg-card border border-border">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Telefone</h4>
                  <a href="tel:+5522999431532" className="text-muted-foreground hover:text-primary transition-colors">
                    (22) 99943-1532
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4 p-5 rounded-2xl bg-card border border-border">
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">WhatsApp</h4>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-green-600 transition-colors"
                  >
                    Clique para conversar
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4 p-5 rounded-2xl bg-card border border-border">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">E-mail</h4>
                  <p className="text-muted-foreground">Envie sua mensagem pelo formulário</p>
                </div>
              </div>
            </motion.div>

            {/* Contact Form */}
            <motion.form
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={2}
              onSubmit={handleContactSubmit}
              className="space-y-4 p-6 rounded-2xl bg-card border border-border"
            >
              <Input
                placeholder="Seu nome"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                required
              />
              <Input
                type="email"
                placeholder="Seu e-mail"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                required
              />
              <Textarea
                placeholder="Sua mensagem..."
                rows={5}
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                required
              />
              <Button type="submit" className="w-full gap-2">
                <Send className="w-4 h-4" />
                Enviar mensagem
              </Button>
            </motion.form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Clock className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Hora Certa</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Desenvolvido por <span className="font-medium text-foreground">Marcio Dias</span>
          </p>
        </div>
      </footer>

      {/* Floating WhatsApp Button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
      >
        <MessageCircle className="w-7 h-7 text-white" />
      </a>
    </div>
  );
};

export default LandingPage;
