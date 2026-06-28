"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import freeSpiritLogo from "../../../../docs/design-reference/image.png";

const startingPoints = [
  {
    title: "Summer Program",
    description:
      "A short, meaningful experience focused on connection, adventure, self-discovery, and support.",
  },
  {
    title: "Gap Year",
    description:
      "A structured therapeutic journey for young adults building resilience, independence, and direction.",
  },
  {
    title: "Rolling Admission",
    description:
      "Flexible entry throughout the year for young people who need support when the time is right.",
  },
  {
    title: "Student Life",
    description:
      "Community living, mentoring, life skills, creative workshops, nature, and shared routines.",
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

      <section className="px-4 pb-3 pt-3 sm:px-6 sm:pb-5 sm:pt-5 lg:px-8">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-[#2C6975]">
          <div className="grid min-h-[250px] lg:grid-cols-[1.16fr_0.84fr]">
            <div className="relative flex flex-col justify-center overflow-hidden px-7 py-4 text-white sm:px-12 sm:py-5 lg:px-16 lg:py-5">
              <div
                aria-hidden="true"
                className="absolute -left-28 -top-36 h-96 w-96 rounded-full border-[62px] border-[#6BB2A0]/28"
              />
              <div
                aria-hidden="true"
                className="absolute -bottom-44 right-8 h-80 w-80 rounded-full bg-[#6BB2A0]/25"
              />
              
              <div className="relative max-w-3xl">
                <p className="mb-2 text-base font-semibold text-[#CDE0C9]">
                  Welcome to Free Spirit.
                </p>
                <h1 className="text-4xl font-bold leading-[1.04] tracking-[-0.04em] sm:text-5xl lg:text-[2.85rem]">
                  Where healing, growth, and purpose begin.
                </h1>
                <p className="mt-3 max-w-xl text-base leading-7 text-white/80 sm:text-lg">
                  Free Spirit supports teens and young adults through
                  therapeutic programs that bring together care, life skills,
                  nature, and community.
                </p>
              </div>
            </div>

            <div className="relative flex min-h-[190px] items-center justify-center overflow-hidden bg-[linear-gradient(145deg,#E0ECDE_0%,#CDE0C9_52%,#BBD7D1_100%)] px-8 py-4 sm:px-12 lg:min-h-full">
              <div
                aria-hidden="true"
                className="absolute -right-20 -top-20 h-64 w-64 rounded-full border-[42px] border-white/30"
              />
              <div
                aria-hidden="true"
                className="absolute -bottom-28 -left-16 h-64 w-64 rounded-full bg-white/25"
              />

              <div className="relative w-full max-w-sm">
                <div className="rounded-[2rem] bg-[#FFFDF8] px-5 py-4 shadow-[0_18px_45px_rgba(28,78,86,0.12)] sm:px-6 sm:py-5">
                  <div className="mx-auto w-full max-w-[145px]">
                    <Image
                      src={freeSpiritLogo}
                      alt="Free Spirit"
                      className="h-auto w-full object-contain"
                      priority
                      sizes="145px"
                    />
                  </div>
                  <div className="mt-3 border-t border-[#CDE0C9] pt-3 text-center">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2C6975]">
                      CARE, COURAGE, PURPOSE
                    </p>
                    <p className="mt-1 text-sm leading-5 text-[#5C7478]">
                      Clinical insight, community, and real-world practice in
                      one supportive journey.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-4 sm:px-6 sm:pb-6 lg:px-8">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-[#C9DFC5]">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
            <div className="relative min-h-[340px] overflow-hidden bg-[linear-gradient(145deg,#BFD9C1_0%,#DCEAD6_55%,#B9D9D2_100%)] p-8 sm:p-12">
              <Image
                src="/images/free-spirit-community.jpg"
                alt="Free Spirit community members gathered outdoors"
                fill
                sizes="(min-width: 1024px) 55vw, 100vw"
                className="object-cover"
              />
            </div>

            <div className="flex flex-col justify-center bg-[#2C6975] px-7 py-9 text-white sm:px-12 sm:py-11 lg:px-14">
              <h2 className="mt-4 text-3xl font-bold tracking-[-0.035em] sm:text-4xl">
                Real change happens when care meets everyday life.
              </h2>
              <p className="mt-6 text-base leading-7 text-white/78">
                Free Spirit brings therapy, mentorship, community, and
                experiential learning together so young people can practice
                resilience, connection, and independence in real time.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-10 pt-4 sm:px-6 sm:pb-14 sm:pt-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-7 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:gap-10">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#2C6975]">
              Programs at Free Spirit
            </p>
            <h2 className="mt-4 max-w-xl text-3xl font-bold tracking-[-0.035em] text-[#15383E] sm:text-4xl">
              Programs shaped around each journey.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-[#536F73] sm:text-lg">
              Free Spirit offers flexible therapeutic programs for teens and
              young adults, combining care, community, life skills, and
              experiential learning.
            </p>
            <div className="mt-5 rounded-2xl border-l-4 border-[#6BB2A0] bg-white/70 px-5 py-4">
              <p className="text-sm font-semibold leading-6 text-[#315B62]">
                Support can begin in different ways. Each path is guided with
                care.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {startingPoints.map(
              ({ title, description }, index) => (
                <article
                  key={title}
                  className={`rounded-[1.6rem] p-5 ${
                    index === 0 || index === 3
                      ? "bg-[#2C6975] text-white"
                      : "border border-[#C4D8C2] bg-[#F8FAF5] text-[#15383E]"
                  }`}
                >
                  <h3 className="mt-5 text-lg font-bold">{title}</h3>
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
