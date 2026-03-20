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
          <span>Built with</span>
          <svg
            className="inline h-4 w-4 text-meta-1"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
          <span>
            by{" "}
            <a
              href="https://www.linkedin.com/in/diegoosvaldocruz/"
              target="_blank"
              rel="noreferrer"
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
