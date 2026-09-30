import React from 'react';
import { Calendar, Shield, Clock, CheckCircle2, MessageCircle, Sparkles, MapPin, Phone, ArrowRight } from 'lucide-react';
import { Service } from '../types';

interface LandingHeroProps {
  onOpenClientBooking: () => void;
  onOpenAdminLogin: () => void;
  services: Service[];
  onSelectServiceToBook: (serviceId: string) => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  onOpenClientBooking,
  onOpenAdminLogin,
  services,
  onSelectServiceToBook,
}) => {
  return (
    <div className="space-y-16 sm:space-y-24 pb-16">
      
      {/* Hero Presentation */}
      <section className="relative pt-6 sm:pt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Column: Headlines & 2 Primary Action Cards */}
            <div className="lg:col-span-7 space-y-6">
              
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200/70 text-rose-900 text-xs font-medium tracking-wide">
                <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                <span>Atendimento Personalizado com Hora Marcada</span>
              </div>

              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-medium tracking-tight text-stone-900 leading-[1.12]">
                Realce a sua beleza com quem entende do seu cabelo.
              </h1>

              <p className="text-stone-700 text-base sm:text-lg leading-relaxed max-w-xl">
                Agende seu horário online em segundos com confirmação automática pelo WhatsApp ou gerencie seu estúdio pelo painel administrativo.
              </p>

              {/* THE TWO REQUIRED PRIMARY CHOICES */}
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* 1. OPÇÃO CLIENTE */}
                <div 
                  onClick={onOpenClientBooking}
                  className="group relative bg-white rounded-2xl p-5 border border-stone-200/90 shadow-sm hover:shadow-md hover:border-rose-300 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Calendar className="w-6 h-6 text-rose-700" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-rose-700">Para Você</span>
                      <h2 className="font-serif text-2xl font-bold text-stone-900 group-hover:text-rose-900 transition-colors">
                        Cliente
                      </h2>
                    </div>
                    <p className="text-xs text-stone-700 leading-relaxed">
                      Selecione o serviço desejado, confira dias e horários livres em tempo real e envie seu pedido de agendamento com aviso no WhatsApp.
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-semibold text-rose-900 group-hover:text-rose-700">
                    <span>Abrir Calendário Público</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* 2. OPÇÃO CABELEIREIRA */}
                <div 
                  onClick={onOpenAdminLogin}
                  className="group relative bg-stone-900 rounded-2xl p-5 text-white shadow-sm hover:shadow-md hover:bg-stone-800 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-xl bg-stone-800 text-amber-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Shield className="w-6 h-6 text-amber-300" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-amber-300/80">Gestão do Salão</span>
                      <h2 className="font-serif text-2xl font-bold text-white group-hover:text-amber-100 transition-colors">
                        Cabeleireira
                      </h2>
                    </div>
                    <p className="text-xs text-stone-300 leading-relaxed">
                      Acesso ao painel restrito para aprovar ou recusar solicitações, bloquear horários, cadastrar serviços e acompanhar o histórico.
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-stone-800 flex items-center justify-between text-xs font-semibold text-amber-200 group-hover:text-white">
                    <span>Acessar Painel com Login</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

              </div>

              {/* WhatsApp Feature Highlight */}
              <div className="pt-2 flex items-center gap-3 text-xs text-stone-700">
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-3.5 h-3.5" />
                </div>
                <span>
                  <strong>Avisos no WhatsApp:</strong> Notificações automáticas instantâneas enviadas no celular da cliente a cada aprovação ou alteração de horário.
                </span>
              </div>

            </div>

            {/* Right Column: Visual Showcase */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-3xl overflow-hidden shadow-xl border border-stone-200/80 aspect-4/3 sm:aspect-16/10 lg:aspect-4/5">
                <img 
                  src="/src/assets/images/salon_hero_cover_1790710958525.jpg" 
                  alt="Interior do Studio Bella Cabeleireira" 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                
                {/* Clean gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/20 to-transparent" />

                {/* Stylist floating tag */}
                <div className="absolute bottom-4 left-4 right-4 p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-white/40 shadow-lg flex items-center gap-3.5">
                  <img 
                    src="/src/assets/images/hairdresser_profile_1790710969666.jpg" 
                    alt="Isabella Mendes - Cabeleireira Responsável" 
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-rose-200 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-stone-900 truncate">Isabella Mendes</p>
                    <p className="text-[11px] text-stone-700 truncate">Especialista em Visagismo & Balayage</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-medium mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Agenda aberta para esta semana</span>
                    </div>
                  </div>
                  <button
                    onClick={onOpenClientBooking}
                    className="px-3 py-1.5 bg-stone-900 text-white rounded-lg text-xs font-semibold hover:bg-rose-950 transition-colors shrink-0"
                  >
                    Agendar
                  </button>
                </div>

              </div>
            </div>

          </div>

        </div>
      </section>

      {/* Featured Services Preview Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-semibold tracking-wider text-rose-800 uppercase">Menu de Tratamentos</span>
            <h2 className="font-serif text-3xl font-medium text-stone-900 mt-1">
              Serviços Mais Procurados
            </h2>
          </div>
          <button
            onClick={onOpenClientBooking}
            className="text-sm font-semibold text-rose-900 hover:text-stone-900 flex items-center gap-1.5 self-start md:self-auto cursor-pointer"
          >
            <span>Ver todos os serviços e horários</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.slice(0, 3).map((service) => (
            <div 
              key={service.id}
              className="bg-white rounded-2xl overflow-hidden border border-stone-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div className="aspect-16/10 relative overflow-hidden bg-stone-100">
                <img 
                  src={service.image} 
                  alt={service.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-bold text-stone-900 shadow-sm">
                  R$ {service.price.toFixed(2).replace('.', ',')}
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-xs text-stone-700 mb-1.5">
                    <span>{service.category}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-stone-600" />
                      {service.durationMinutes} min
                    </span>
                  </div>
                  <h3 className="font-serif text-lg font-bold text-stone-900 group-hover:text-rose-900 transition-colors">
                    {service.name}
                  </h3>
                  <p className="text-xs text-stone-700 mt-2 line-clamp-2 leading-relaxed">
                    {service.description}
                  </p>
                </div>

                <button
                  onClick={() => onSelectServiceToBook(service.id)}
                  className="w-full py-2.5 px-4 bg-stone-100 hover:bg-stone-900 hover:text-white text-stone-800 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Escolher Data & Horário</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Salon Info & Location */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-stone-100/70 rounded-3xl p-6 sm:p-10 border border-stone-200/80">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-white text-stone-800 flex items-center justify-center shadow-sm">
                <MapPin className="w-5 h-5 text-rose-700" />
              </div>
              <h4 className="font-serif text-base font-bold text-stone-900">Localização Privilegiada</h4>
              <p className="text-xs text-stone-700 leading-relaxed">
                Av. das Flores, 850 - Sala 302, Jardins, São Paulo - SP.<br />
                Estacionamento conveniado com manobrista no local.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-white text-stone-800 flex items-center justify-center shadow-sm">
                <Clock className="w-5 h-5 text-rose-700" />
              </div>
              <h4 className="font-serif text-base font-bold text-stone-900">Horários de Atendimento</h4>
              <p className="text-xs text-stone-700 leading-relaxed">
                Terça a Sexta: 09:00 às 19:30<br />
                Sábado: 08:30 às 18:00<br />
                Domingo e Segunda: Fechado para descanso e cursos.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-white text-stone-800 flex items-center justify-center shadow-sm">
                <MessageCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <h4 className="font-serif text-base font-bold text-stone-900">Atendimento Via WhatsApp</h4>
              <p className="text-xs text-stone-700 leading-relaxed">
                Dúvidas sobre mechas ou tratamentos? Fale diretamente com nossa equipe no WhatsApp oficial: (11) 98765-4321.
              </p>
            </div>

          </div>
        </div>
      </section>

    </div>
  );
};
