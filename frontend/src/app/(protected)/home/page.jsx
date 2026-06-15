"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  ArrowDownRight,
  CalendarDays,
  Compass,
  Heart,
  HeartHandshake,
  MessageCircleMore,
  Route,
  Sparkles,
  Sprout,
  UsersRound,
} from "lucide-react";
import freeSpiritLogo from "../../../../docs/design-reference/image.png";

const programAreas = [
  {
    title: "Meaningful programs",
    description:
      "Thoughtful experiences that invite participation, discovery, and practical growth.",
    icon: Compass,
  },
  {
    title: "Supportive relationships",
    description:
      "A community where people can be known, encouraged, and supported without judgment.",
    icon: HeartHandshake,
  },
  {
    title: "Room to grow",
    description:
      "Opportunities to build confidence, try something new, and move at a personal pace.",
    icon: Sprout,
  },
];

const communityPillars = [
  {
    number: "01",
    title: "Meet people where they are",
    description: "Care begins with listening, patience, and genuine connection.",
    icon: Heart,
  },
  {
    number: "02",
    title: "Grow through community",
    description: "Shared experiences make room for confidence and belonging.",
    icon: UsersRound,
  },
  {
    number: "03",
    title: "Make space for possibility",
    description: "Every next step can hold purpose, discovery, and hope.",
    icon: Sparkles,
  },
];

const startingPoints = [
  {
    title: "Programs",
    description: "Stay close to the experiences and activities you are part of.",
    icon: Sparkles,
  },
  {
    title: "Updates",
    description: "Find important community information in one familiar place.",
    icon: MessageCircleMore,
  },
  {
    title: "Meetings",
    description: "Keep upcoming conversations and shared time within reach.",
    icon: CalendarDays,
  },
  {
    title: "Next steps",
    description: "Return with a clear sense of where to continue from here.",
    icon: Route,
  },
];

function HomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const isEmailNotVerifiedParam = searchParams.get("emailNotVerified") === "1";
  const isAccessDeniedParam = searchParams.get("accessDenied") === "1";
  const [showAccessDenied, setShowAccessDenied] = useState(isAccessDeniedParam);

  useEffect(() => {
    if (!showAccessDenied) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowAccessDenied(false);
      router.replace("/", { scroll: false });
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [showAccessDenied, router]);

  useEffect(() => {
    if ((isEmailNotVerifiedParam || isAccessDeniedParam) && !showAccessDenied) {
      router.replace("/", { scroll: false });
    }
  }, [isEmailNotVerifiedParam, isAccessDeniedParam, showAccessDenied, router]);

  return (
    <main className="relative isolate min-h-[calc(100vh-4rem)] overflow-hidden bg-[linear-gradient(180deg,#E7F0E2_0%,#F3F6F0_22%,#DDEAD8_62%,#EDF3E9_100%)] text-[#15383E]">
      {showAccessDenied && (
        <div
          className="fixed left-1/2 top-24 z-[60] w-[min(92vw,460px)] -translate-x-1/2 rounded-2xl border border-red-100 bg-white px-5 py-4 text-center text-sm font-semibold text-red-700 shadow-[0_12px_35px_rgba(44,105,117,0.12)]"
          role="alert"
        >
          You do not have permission to access that page.
        </div>
      )}

      <section className="px-4 pb-8 pt-5 sm:px-6 sm:pb-12 sm:pt-7 lg:px-8">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-[#2C6975]">
          <div className="grid min-h-[510px] lg:grid-cols-[1.16fr_0.84fr]">
            <div className="relative flex flex-col justify-between overflow-hidden px-7 py-9 text-white sm:px-12 sm:py-12 lg:px-16 lg:py-14">
              <div
                aria-hidden="true"
                className="absolute -left-28 -top-36 h-96 w-96 rounded-full border-[62px] border-[#6BB2A0]/28"
              />
              <div
                aria-hidden="true"
                className="absolute -bottom-44 right-8 h-80 w-80 rounded-full bg-[#6BB2A0]/25"
              />

              <div className="relative flex items-center gap-3">
                <span className="h-px w-10 bg-[#CDE0C9]" />
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#E0ECDE]">
                  Free Spirit Community
                </p>
              </div>

              <div className="relative my-14 max-w-3xl">
                <p className="mb-5 text-base font-semibold text-[#CDE0C9]">
                  Welcome. We are glad you are here.
                </p>
                <h1 className="text-4xl font-bold leading-[1.04] tracking-[-0.04em] sm:text-5xl lg:text-[4.25rem]">
                  A place to find your people and your next step.
                </h1>
                <p className="mt-7 max-w-xl text-base leading-7 text-white/80 sm:text-lg">
                  This community is built on real relationships, shared
                  experiences, and the belief that everyone deserves room to
                  grow in their own way.
                </p>
              </div>

              <div className="relative flex items-center gap-3 text-sm font-semibold text-[#E0ECDE]">
                <span>Challenge by choice</span>
                <ArrowDownRight aria-hidden="true" className="h-5 w-5" />
              </div>
            </div>

            <div className="relative flex min-h-[390px] items-center justify-center overflow-hidden bg-[linear-gradient(145deg,#E0ECDE_0%,#CDE0C9_52%,#BBD7D1_100%)] px-8 py-12 sm:px-12 lg:min-h-full">
              <div
                aria-hidden="true"
                className="absolute -right-20 -top-20 h-64 w-64 rounded-full border-[42px] border-white/30"
              />
              <div
                aria-hidden="true"
                className="absolute -bottom-28 -left-16 h-64 w-64 rounded-full bg-white/25"
              />

              <div className="relative w-full max-w-sm">
                <div className="rounded-[2rem] bg-[#FFFDF8] px-8 py-9 shadow-[0_18px_45px_rgba(28,78,86,0.12)] sm:px-10 sm:py-11">
                  <div className="mx-auto w-full max-w-[245px]">
                    <Image
                      src={freeSpiritLogo}
                      alt="Free Spirit"
                      className="h-auto w-full object-contain"
                      priority
                      sizes="245px"
                    />
                  </div>
                  <div className="mt-7 border-t border-[#CDE0C9] pt-6 text-center">
                    <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#2C6975]">
                      Together, with purpose
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[#5C7478]">
                      A community shaped by courage, care, and meaningful
                      choice.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-12 sm:px-6 sm:pb-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 border-y border-[#B9CFCA] py-9 md:grid-cols-[0.7fr_2.3fr] md:gap-12 md:py-12">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#2C6975]">
                How we show up
              </p>
              <h2 className="mt-3 text-2xl font-bold tracking-[-0.025em] text-[#15383E] sm:text-3xl">
                Community is something we practice.
              </h2>
            </div>

            <div className="grid gap-8 sm:grid-cols-3 sm:gap-0">
              {communityPillars.map(
                ({ number, title, description, icon: PillarIcon }, index) => (
                  <article
                    key={number}
                    className={`relative sm:px-6 ${
                      index > 0 ? "sm:border-l sm:border-[#B9CFCA]" : ""
                    }`}
                  >
                    <div className="mb-6 flex items-center justify-between">
                      <span className="text-xs font-bold tracking-[0.18em] text-[#6BB2A0]">
                        {number}
                      </span>
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#D7E7D4] text-[#2C6975]">
                        <PillarIcon aria-hidden="true" className="h-5 w-5" />
                      </span>
                    </div>
                    <h3 className="text-lg font-bold leading-6 text-[#15383E]">
                      {title}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-[#5C7478]">
                      {description}
                    </p>
                  </article>
                ),
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#D7E7D2] px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div
          aria-hidden="true"
          className="absolute -right-32 -top-32 h-96 w-96 rounded-full border-[68px] border-white/25"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-40 -left-36 h-96 w-96 rounded-full bg-[#BFD9C1]/65"
        />

        <div className="relative mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
            <div className="max-w-xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#2C6975]">
                What we do
              </p>
              <h2 className="mt-4 text-3xl font-bold tracking-[-0.035em] text-[#15383E] sm:text-4xl">
                We create experiences where connection can become growth.
              </h2>
            </div>
            <p className="max-w-2xl text-base leading-7 text-[#4E6C70] sm:text-lg">
              Free Spirit helps people connect, participate, and find momentum
              through meaningful programs and community experiences. The work
              is practical and personal: showing up, building trust, and
              discovering what becomes possible together.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {programAreas.map(({ title, description, icon: AreaIcon }) => (
              <article
                key={title}
                className="group rounded-[1.75rem] border border-white/80 bg-[#F9FBF7]/90 p-6 shadow-[0_12px_30px_rgba(44,105,117,0.07)] sm:p-7"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2C6975] text-white transition-transform group-hover:-translate-y-0.5">
                  <AreaIcon aria-hidden="true" className="h-6 w-6" />
                </span>
                <h3 className="mt-8 text-xl font-bold tracking-[-0.02em] text-[#15383E]">
                  {title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-[#5C7478]">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:gap-16">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#2C6975]">
              Your space to begin
            </p>
            <h2 className="mt-4 max-w-xl text-3xl font-bold tracking-[-0.035em] text-[#15383E] sm:text-4xl">
              Come back to what matters, without having to start over.
            </h2>
            <p className="mt-6 max-w-xl text-base leading-7 text-[#536F73] sm:text-lg">
              This area is a steady home base for your connection to Free
              Spirit. It helps you stay oriented to programs, updates,
              meetings, and the next useful step in your journey.
            </p>
            <div className="mt-8 rounded-2xl border-l-4 border-[#6BB2A0] bg-white/70 px-5 py-4">
              <p className="text-sm font-semibold leading-6 text-[#315B62]">
                Take what you need today. The rest will still be here when you
                return.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {startingPoints.map(
              ({ title, description, icon: StartingPointIcon }, index) => (
                <article
                  key={title}
                  className={`rounded-[1.6rem] p-6 ${
                    index === 0 || index === 3
                      ? "bg-[#2C6975] text-white"
                      : "border border-[#C4D8C2] bg-[#F8FAF5] text-[#15383E]"
                  }`}
                >
                  <StartingPointIcon
                    aria-hidden="true"
                    className={`h-6 w-6 ${
                      index === 0 || index === 3
                        ? "text-[#CDE0C9]"
                        : "text-[#2C6975]"
                    }`}
                  />
                  <h3 className="mt-8 text-lg font-bold">{title}</h3>
                  <p
                    className={`mt-2 text-sm leading-6 ${
                      index === 0 || index === 3
                        ? "text-white/75"
                        : "text-[#5C7478]"
                    }`}
                  >
                    {description}
                  </p>
                </article>
              ),
            )}
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-[#C9DFC5]">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
            <div className="relative min-h-[430px] overflow-hidden bg-[linear-gradient(145deg,#BFD9C1_0%,#DCEAD6_55%,#B9D9D2_100%)] p-8 sm:p-12">
              <div
                aria-hidden="true"
                className="absolute -left-20 top-16 h-64 w-64 rounded-full bg-white/30"
              />
              <div
                aria-hidden="true"
                className="absolute -right-16 -top-20 h-56 w-56 rounded-full border-[38px] border-[#6BB2A0]/30"
              />
              <div
                aria-hidden="true"
                className="absolute bottom-14 left-[8%] h-20 w-[84%] -rotate-3 rounded-[50%] border-b-[10px] border-[#2C6975]/30"
              />

              <div
                aria-label="Illustration of three people gathering in community"
                className="relative mx-auto flex h-full min-h-[330px] max-w-lg items-end justify-center gap-3 sm:gap-7"
                role="img"
              >
                <div className="mb-14 flex flex-col items-center">
                  <span className="h-16 w-16 rounded-full bg-[#6BB2A0] ring-8 ring-white/35 sm:h-20 sm:w-20" />
                  <span className="-mt-1 h-32 w-24 rounded-t-[3rem] rounded-b-[1.4rem] bg-[#2C6975] sm:h-40 sm:w-28" />
                </div>
                <div className="relative z-10 flex flex-col items-center">
                  <span className="h-20 w-20 rounded-full bg-[#2C6975] ring-8 ring-white/40 sm:h-24 sm:w-24" />
                  <span className="-mt-1 h-40 w-28 rounded-t-[3.5rem] rounded-b-[1.5rem] bg-[#FFFDF8] sm:h-48 sm:w-36" />
                </div>
                <div className="mb-9 flex flex-col items-center">
                  <span className="h-16 w-16 rounded-full bg-[#CDE0C9] ring-8 ring-white/40 sm:h-20 sm:w-20" />
                  <span className="-mt-1 h-32 w-24 rounded-t-[3rem] rounded-b-[1.4rem] bg-[#6BB2A0] sm:h-40 sm:w-28" />
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-center bg-[#2C6975] px-7 py-12 text-white sm:px-12 sm:py-16 lg:px-14">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#CDE0C9]">
                Community in action
              </p>
              <h2 className="mt-4 text-3xl font-bold tracking-[-0.035em] sm:text-4xl">
                Small moments of participation can change how a person feels
                they belong.
              </h2>
              <p className="mt-6 text-base leading-7 text-white/78">
                Community comes alive when people are invited in, given room to
                contribute, and supported as they try. A conversation, a shared
                activity, or one brave next step can become the beginning of
                something lasting.
              </p>
              <div className="mt-9 flex items-center gap-3 border-t border-white/20 pt-7 text-sm font-semibold text-[#E0ECDE]">
                <UsersRound aria-hidden="true" className="h-5 w-5" />
                <span>Connection grows through participation.</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomePageContent />
    </Suspense>
  );
}
