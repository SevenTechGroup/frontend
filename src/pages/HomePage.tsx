import { Link } from 'react-router-dom';
import { BrandLogo } from '../components/brand/BrandLogo';

type IconName =
  'arrow' | 'bell' | 'camera' | 'chart' | 'check' | 'clock' | 'location' | 'offline' | 'shield';

function Icon({ name, className = 'size-5' }: { name: IconName; className?: string }) {
  const paths = {
    arrow: <path d="m9 18 6-6-6-6M4 12h11" />,
    bell: <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />,
    camera: (
      <>
        <path d="M14.5 4 16 7h4a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h4l1.5-3z" />
        <circle cx="12" cy="13" r="3" />
      </>
    ),
    chart: <path d="M4 19V9m6 10V5m6 14v-7m4 7H2" />,
    check: <path d="m5 12 4 4L19 6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    location: (
      <>
        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    offline: (
      <path d="m2 8.8 3.1 2.4M22 8.8A15.5 15.5 0 0 0 7.5 5M8.5 14.5a5 5 0 0 1 6.8.3M12 20h.01M3 3l18 18" />
    ),
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Zm-3-10 2 2 4-4" />,
  } satisfies Record<IconName, React.ReactNode>;

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

const steps = [
  {
    number: '01',
    icon: 'location' as const,
    title: 'Décrivez le problème',
    text: 'Choisissez une catégorie, expliquez la situation et indiquez le quartier ou un repère.',
  },
  {
    number: '02',
    icon: 'camera' as const,
    title: 'Envoyez en confiance',
    text: 'Ajoutez une photo si vous le souhaitez. Votre brouillon reste disponible même sans réseau.',
  },
  {
    number: '03',
    icon: 'chart' as const,
    title: 'Suivez la résolution',
    text: 'Consultez chaque évolution du signalement, de sa réception jusqu’à sa résolution.',
  },
];

const fieldFeatures = [
  {
    icon: 'offline' as const,
    title: 'Fonctionne avec un réseau instable',
    text: 'Les brouillons sont conservés sur votre appareil et repris à la reconnexion.',
  },
  {
    icon: 'location' as const,
    title: 'Localisation toujours facultative',
    text: 'Utilisez le GPS avec consentement ou saisissez simplement un quartier.',
  },
  {
    icon: 'shield' as const,
    title: 'Confidentialité intégrée',
    text: 'Les accès sont contrôlés selon les rôles et les données sensibles restent protégées.',
  },
];

export function HomePage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#f7faf8] text-slate-950">
      <a
        href="#contenu"
        className="sr-only z-[100] rounded-lg bg-white px-4 py-2 font-semibold text-teal-800 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Aller au contenu
      </a>

      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/60 bg-[#f7faf8]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
          <BrandLogo />
          <nav
            className="hidden items-center gap-8 text-sm font-semibold text-slate-600 lg:flex"
            aria-label="Navigation principale"
          >
            <a className="transition hover:text-teal-700" href="#fonctionnement">
              Comment ça marche
            </a>
            <a className="transition hover:text-teal-700" href="#solutions">
              Nos solutions
            </a>
            <a className="transition hover:text-teal-700" href="#engagements">
              Nos engagements
            </a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              className="hidden rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-white sm:inline-flex"
              to="/connexion"
            >
              Connexion
            </Link>
            <Link
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal-800 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-teal-900/15 transition hover:-translate-y-0.5 hover:bg-teal-900 sm:px-5"
              to="/inscription"
            >
              <span className="hidden sm:inline">Faire un signalement</span>
              <span className="sm:hidden">Signaler</span>
              <Icon name="arrow" className="size-4" />
            </Link>
          </div>
        </div>
      </header>

      <main id="contenu">
        <section className="relative isolate pb-20 pt-32 sm:pb-28 sm:pt-40">
          <div className="landing-grid absolute inset-0 -z-20 opacity-60" />
          <div className="absolute -left-36 top-16 -z-10 size-[30rem] rounded-full bg-teal-200/40 blur-3xl" />
          <div className="absolute -right-48 top-40 -z-10 size-[34rem] rounded-full bg-amber-200/45 blur-3xl" />

          <div className="mx-auto grid max-w-7xl items-center gap-16 px-5 sm:px-8 lg:grid-cols-[1.02fr_0.98fr] lg:gap-12">
            <div className="relative z-10 min-w-0 max-w-2xl">
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-teal-900/10 bg-white/80 px-3.5 py-2 text-xs font-bold uppercase tracking-[0.16em] text-teal-800 shadow-sm backdrop-blur">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-70" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-600" />
                </span>
                La voix citoyenne, en action
              </div>
              <h1 className="max-w-3xl text-[2.75rem] font-black leading-[1.03] tracking-[-0.045em] text-slate-950 sm:text-6xl lg:text-[4.35rem]">
                Votre quartier mérite des{' '}
                <span className="relative text-teal-700 sm:whitespace-nowrap">
                  solutions visibles.
                  <svg
                    aria-hidden="true"
                    className="absolute -bottom-2 left-0 hidden h-3 w-full text-amber-400 sm:block"
                    viewBox="0 0 300 12"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M3 9c72-7 164-7 294-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="5"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </h1>
              <p className="mt-8 max-w-xl text-lg leading-8 text-slate-600 sm:text-xl">
                Signalez un problème local en quelques instants, suivez son traitement et voyez le
                changement prendre forme — simplement, même avec peu de réseau.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  className="group inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-teal-800 px-7 py-3.5 font-bold text-white shadow-xl shadow-teal-900/20 transition hover:-translate-y-1 hover:bg-teal-900"
                  to="/inscription"
                >
                  Signaler un problème
                  <span className="grid size-7 place-items-center rounded-full bg-white/15 transition-transform group-hover:translate-x-1">
                    <Icon name="arrow" className="size-4" />
                  </span>
                </Link>
                <a
                  className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white/80 px-7 py-3.5 font-bold text-slate-800 shadow-sm transition hover:-translate-y-1 hover:border-teal-700 hover:text-teal-800"
                  href="#fonctionnement"
                >
                  Découvrir le parcours
                </a>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-slate-600">
                {['Gratuit pour les citoyens', 'Photo et GPS facultatifs', 'Suivi transparent'].map(
                  (item) => (
                    <span key={item} className="inline-flex items-center gap-2">
                      <span className="grid size-5 place-items-center rounded-full bg-teal-100 text-teal-800">
                        <Icon name="check" className="size-3.5" />
                      </span>
                      {item}
                    </span>
                  ),
                )}
              </div>
            </div>

            <div className="relative mx-auto min-w-0 w-full max-w-[590px] lg:ml-auto">
              <div className="absolute -left-8 top-20 size-32 rounded-full border border-dashed border-teal-700/20" />
              <div className="absolute -right-10 bottom-10 size-44 rounded-full border border-dashed border-amber-600/20" />
              <div className="animate-landing-float relative rounded-[2rem] border border-white/90 bg-white/90 p-3 shadow-[0_35px_90px_-25px_rgba(15,78,68,0.35)] backdrop-blur sm:p-4">
                <div className="overflow-hidden rounded-[1.45rem] border border-slate-200 bg-white">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5 sm:px-5">
                    <div className="flex items-center gap-2">
                      <span className="size-2.5 rounded-full bg-red-300" />
                      <span className="size-2.5 rounded-full bg-amber-300" />
                      <span className="size-2.5 rounded-full bg-emerald-400" />
                    </div>
                    <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">
                      <span className="size-1.5 rounded-full bg-emerald-500" /> En ligne
                    </div>
                  </div>

                  <div className="grid gap-4 bg-slate-50/80 p-4 sm:grid-cols-[1.2fr_0.8fr] sm:p-5">
                    <div className="overflow-hidden rounded-2xl bg-[#dcefe6] shadow-inner">
                      <div className="app-map relative h-64 sm:h-72">
                        <svg
                          className="absolute inset-0 size-full"
                          viewBox="0 0 380 280"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path
                            d="M-20 50c80 30 80 78 165 80s100-45 255-15"
                            stroke="white"
                            strokeWidth="13"
                            opacity=".92"
                          />
                          <path
                            d="M115-20c-10 80 25 120 5 180s10 90 55 140"
                            stroke="white"
                            strokeWidth="9"
                            opacity=".9"
                          />
                          <path
                            d="M280-20c-50 65-30 115 5 150s25 75-10 160"
                            stroke="white"
                            strokeWidth="8"
                            opacity=".75"
                          />
                          <path
                            d="M-20 220c90-55 155-35 220-10s130 10 200-30"
                            stroke="white"
                            strokeWidth="7"
                            opacity=".72"
                          />
                        </svg>
                        <span className="absolute left-[23%] top-[28%] grid size-8 place-items-center rounded-full border-4 border-white bg-amber-500 text-white shadow-lg">
                          <Icon name="location" className="size-4" />
                        </span>
                        <span className="absolute right-[20%] top-[47%] size-5 rounded-full border-4 border-white bg-teal-700 shadow-lg" />
                        <span className="absolute bottom-[18%] left-[46%] size-4 rounded-full border-[3px] border-white bg-rose-500 shadow-lg" />
                        <div className="absolute bottom-3 left-3 right-3 rounded-xl border border-white/80 bg-white/90 p-3 shadow-lg backdrop-blur">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2.5">
                              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-700">
                                <Icon name="location" className="size-5" />
                              </span>
                              <div className="min-w-0">
                                <p className="truncate text-xs font-black text-slate-900">
                                  Éclairage public
                                </p>
                                <p className="truncate text-[10px] text-slate-500">
                                  Quartier Nord · il y a 8 min
                                </p>
                              </div>
                            </div>
                            <span className="rounded-full bg-amber-100 px-2 py-1 text-[9px] font-black uppercase text-amber-800">
                              Reçu
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-1">
                      <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="grid size-8 place-items-center rounded-lg bg-teal-50 text-teal-700">
                            <Icon name="chart" className="size-4" />
                          </span>
                          <span className="text-[10px] font-bold text-emerald-600">+12%</span>
                        </div>
                        <p className="text-2xl font-black text-slate-950">24</p>
                        <p className="text-[10px] leading-4 text-slate-500">
                          Signalements résolus ce mois
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
                        <div className="mb-3 grid size-8 place-items-center rounded-lg bg-amber-50 text-amber-700">
                          <Icon name="clock" className="size-4" />
                        </div>
                        <p className="text-2xl font-black text-slate-950">08</p>
                        <p className="text-[10px] leading-4 text-slate-500">
                          Signalements en traitement
                        </p>
                      </div>
                      <div className="col-span-2 rounded-2xl bg-teal-900 p-4 text-white sm:col-span-1">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-teal-200">
                          <Icon name="bell" className="size-4" /> Mise à jour
                        </div>
                        <p className="mt-2 text-xs font-bold leading-5">
                          Votre signalement est maintenant en cours de traitement.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="animate-landing-float-delayed absolute -left-4 top-12 hidden items-center gap-3 rounded-2xl border border-white bg-white p-3.5 shadow-xl sm:flex lg:-left-12">
                <span className="grid size-10 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                  <Icon name="check" />
                </span>
                <div>
                  <p className="text-xs font-black">Signalement envoyé</p>
                  <p className="text-[10px] text-slate-500">Suivi activé automatiquement</p>
                </div>
              </div>
              <div className="animate-landing-float absolute -bottom-5 right-3 flex items-center gap-3 rounded-2xl bg-slate-950 p-3.5 pr-5 text-white shadow-2xl sm:right-10">
                <span className="grid size-10 place-items-center rounded-xl bg-amber-400 text-slate-950">
                  <Icon name="offline" />
                </span>
                <div>
                  <p className="text-xs font-black">Mode hors ligne</p>
                  <p className="text-[10px] text-slate-400">Brouillon sauvegardé</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200/70 bg-white/80">
          <div className="mx-auto grid max-w-7xl grid-cols-1 divide-y divide-slate-200 px-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-8">
            {[
              ['3 étapes', 'pour créer un signalement'],
              ['Hors ligne', 'vos brouillons restent disponibles'],
              ['Suivi clair', 'chaque évolution est visible'],
            ].map(([value, label]) => (
              <div key={value} className="px-5 py-7 text-center sm:py-9">
                <p className="text-2xl font-black tracking-tight text-teal-800">{value}</p>
                <p className="mt-1 text-sm text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="fonctionnement" className="scroll-mt-24 py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="landing-eyebrow">Simple par conception</p>
              <h2 className="landing-title mt-4">Un problème signalé en trois étapes</h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Pas de formulaire interminable. Sahel Signal vous guide, une question à la fois.
              </p>
            </div>
            <div className="relative mt-16 grid gap-5 lg:grid-cols-3">
              <div className="absolute left-[16%] right-[16%] top-12 hidden border-t-2 border-dashed border-teal-200 lg:block" />
              {steps.map((step) => (
                <article key={step.number} className="landing-card relative p-7 sm:p-8">
                  <div className="flex items-center justify-between">
                    <span className="grid size-14 place-items-center rounded-2xl bg-teal-800 text-white shadow-lg shadow-teal-900/15">
                      <Icon name={step.icon} className="size-6" />
                    </span>
                    <span className="text-4xl font-black text-slate-100">{step.number}</span>
                  </div>
                  <h3 className="mt-7 text-xl font-black tracking-tight">{step.title}</h3>
                  <p className="mt-3 leading-7 text-slate-600">{step.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="solutions" className="scroll-mt-20 bg-[#092e2a] py-24 text-white sm:py-32">
          <div className="mx-auto grid max-w-7xl items-center gap-16 px-5 sm:px-8 lg:grid-cols-2 lg:gap-24">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">
                Pensé pour le terrain
              </p>
              <h2 className="mt-5 text-4xl font-black leading-tight tracking-[-0.035em] sm:text-5xl">
                Utile partout, même quand la connexion ne l’est pas.
              </h2>
              <p className="mt-6 max-w-xl text-lg leading-8 text-teal-100/70">
                L’expérience reste simple sur mobile, respectueuse des choix de chacun et adaptée
                aux réalités de connexion du Sahel.
              </p>
              <div className="mt-10 grid gap-4">
                {fieldFeatures.map((feature) => (
                  <article
                    key={feature.title}
                    className="group flex gap-4 rounded-2xl border border-white/10 bg-white/[0.055] p-5 transition hover:border-amber-300/30 hover:bg-white/[0.08]"
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-300 text-slate-950 transition-transform group-hover:-rotate-3">
                      <Icon name={feature.icon} className="size-5" />
                    </span>
                    <div>
                      <h3 className="font-black">{feature.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-teal-100/65">{feature.text}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-md">
              <div className="absolute inset-8 rounded-full bg-amber-300/20 blur-3xl" />
              <div className="relative mx-auto w-[86%] rounded-[2.8rem] border-[8px] border-slate-950 bg-white p-2 shadow-[0_35px_80px_-15px_rgba(0,0,0,0.5)]">
                <div className="overflow-hidden rounded-[2.05rem] bg-slate-50 text-slate-950">
                  <div className="flex items-center justify-between bg-white px-5 pb-3 pt-5">
                    <BrandLogo />
                    <span className="grid size-9 place-items-center rounded-full bg-slate-100 text-slate-600">
                      <Icon name="bell" className="size-4" />
                    </span>
                  </div>
                  <div className="px-5 py-6">
                    <p className="text-xs font-black uppercase tracking-[0.15em] text-teal-700">
                      Suivi du signalement
                    </p>
                    <h3 className="mt-2 text-2xl font-black">Lampadaire en panne</h3>
                    <p className="mt-1 text-sm text-slate-500">Quartier Nord · Éclairage public</p>
                    <div className="mt-7 space-y-0">
                      {[
                        ['Signalement reçu', 'Aujourd’hui, 09:24', true],
                        ['Affecté au service technique', 'Aujourd’hui, 10:05', true],
                        ['Intervention en cours', 'Mise à jour récente', true],
                        ['Problème résolu', 'Prochaine étape', false],
                      ].map(([title, time, active], index) => (
                        <div key={String(title)} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <span
                              className={`grid size-8 place-items-center rounded-full ${active ? 'bg-teal-700 text-white' : 'border-2 border-slate-300 bg-white text-slate-300'}`}
                            >
                              <Icon name={active ? 'check' : 'clock'} className="size-4" />
                            </span>
                            {index < 3 && (
                              <span
                                className={`h-12 w-0.5 ${active ? 'bg-teal-300' : 'bg-slate-200'}`}
                              />
                            )}
                          </div>
                          <div className="pt-1">
                            <p
                              className={`text-sm font-black ${active ? 'text-slate-900' : 'text-slate-400'}`}
                            >
                              {title}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-400">{time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="m-4 rounded-2xl bg-amber-100 p-4 text-sm text-amber-950">
                    <p className="font-black">Vous gardez le contrôle</p>
                    <p className="mt-1 text-xs leading-5 text-amber-900/70">
                      Une notification vous informe à chaque étape importante.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="engagements" className="scroll-mt-20 py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
              <div>
                <p className="landing-eyebrow">Une plateforme, deux expériences</p>
                <h2 className="landing-title mt-4">Plus de confiance. Moins de silence.</h2>
              </div>
              <p className="max-w-2xl text-lg leading-8 text-slate-600 lg:ml-auto">
                Les citoyens savent où en est leur demande. Les équipes disposent d’une vue claire
                pour prioriser, affecter et agir.
              </p>
            </div>

            <div className="mt-14 grid gap-6 lg:grid-cols-2">
              <article className="group relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-amber-100 to-orange-50 p-8 sm:p-10">
                <div className="absolute -right-16 -top-16 size-52 rounded-full border-[35px] border-white/40 transition-transform duration-500 group-hover:scale-110" />
                <span className="relative inline-flex rounded-full bg-white px-3 py-1.5 text-xs font-black uppercase tracking-wider text-amber-800">
                  Pour les citoyens
                </span>
                <h3 className="relative mt-8 max-w-md text-3xl font-black tracking-tight">
                  Une voix entendue et un suivi qui rassure.
                </h3>
                <ul className="relative mt-8 grid gap-3 text-sm font-semibold text-slate-700">
                  {[
                    'Formulaire guidé et inclusif',
                    'Brouillons disponibles hors ligne',
                    'Chronologie claire du signalement',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <span className="grid size-7 place-items-center rounded-full bg-amber-400 text-slate-950">
                        <Icon name="check" className="size-4" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
              <article className="group relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-teal-700 to-teal-950 p-8 text-white sm:p-10">
                <div className="absolute -bottom-24 -right-16 size-72 rounded-full border-[45px] border-teal-500/20 transition-transform duration-500 group-hover:scale-110" />
                <span className="relative inline-flex rounded-full bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-teal-100">
                  Pour les équipes
                </span>
                <h3 className="relative mt-8 max-w-md text-3xl font-black tracking-tight">
                  Les bonnes informations pour agir au bon moment.
                </h3>
                <ul className="relative mt-8 grid gap-3 text-sm font-semibold text-teal-50/85">
                  {[
                    'File de traitement centralisée',
                    'Priorités et affectations visibles',
                    'Indicateurs utiles à la décision',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <span className="grid size-7 place-items-center rounded-full bg-amber-300 text-slate-950">
                        <Icon name="check" className="size-4" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            </div>
          </div>
        </section>

        <section className="px-5 pb-24 sm:px-8 sm:pb-32">
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.25rem] bg-amber-300 px-6 py-16 text-center sm:px-12 sm:py-20">
            <div className="landing-grid absolute inset-0 opacity-30" />
            <div className="absolute -left-20 -top-20 size-64 rounded-full bg-white/30 blur-2xl" />
            <div className="absolute -bottom-24 -right-20 size-72 rounded-full bg-orange-400/25 blur-2xl" />
            <div className="relative mx-auto max-w-3xl">
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-slate-950 text-amber-300 shadow-xl">
                <Icon name="location" className="size-7" />
              </span>
              <h2 className="mt-7 text-4xl font-black leading-tight tracking-[-0.04em] text-slate-950 sm:text-5xl">
                Un problème dans votre quartier ? Faites-le avancer.
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-amber-950/75">
                Votre signalement peut être le début d’une amélioration concrète pour toute la
                communauté.
              </p>
              <Link
                className="mt-8 inline-flex min-h-14 items-center gap-3 rounded-2xl bg-slate-950 px-7 py-3.5 font-bold text-white shadow-xl transition hover:-translate-y-1 hover:bg-teal-950"
                to="/inscription"
              >
                Créer mon signalement
                <Icon name="arrow" className="size-5" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between">
          <BrandLogo />
          <p className="max-w-md text-sm leading-6 text-slate-500">
            Une plateforme citoyenne simple, inclusive et transparente pour améliorer nos
            territoires.
          </p>
          <div className="flex gap-5 text-sm font-semibold text-slate-600">
            <Link className="hover:text-teal-700" to="/connexion">
              Connexion
            </Link>
            <a className="hover:text-teal-700" href="#engagements">
              Engagements
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
