export default function AppFooter() {
  return (
    <footer className="border-t border-black/10 bg-white/80">
      <div className="mx-auto flex min-h-14 max-w-7xl flex-col items-center gap-2 px-6 py-3 text-center text-sm text-body sm:flex-row sm:justify-between sm:text-left lg:px-8">
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 sm:justify-start">
          <span>
            &copy; {new Date().getFullYear()} QuickTally. Todos los derechos
            reservados.
          </span>
          <a
            href="/privacy-policy"
            className="inline-flex items-center transition-colors hover:text-black"
          >
            Politicas de privacidad.
          </a>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 sm:justify-end">
          <span>
            Built by{" "}
            <a
              href="https://www.linkedin.com/in/diegoosvaldocruz/"
              target="_blank"
              rel="diegoosvaldo85"
              className="transition-colors hover:text-black"
            >
              Diego Osvaldo
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
