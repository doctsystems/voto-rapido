export default function AppFooter() {
  return (
    <footer className="border-t border-black/10 bg-white/80">
      <div className="mx-auto flex min-h-14 max-w-7xl flex-col gap-2 px-6 py-3 text-sm text-body sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>
            &copy; {new Date().getFullYear()} QuickTally. Todos los derechos
            reservados.
          </span>
          <a
            href="/privacy-policy"
            className="inline-flex items-center transition-colors hover:text-black"
          >
            Privacy policy
          </a>
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 sm:justify-end">
          <span>
            👨🏽‍💻 Built by{" "}
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
