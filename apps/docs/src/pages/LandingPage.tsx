import { Link, useLocation, useNavigate } from 'react-router';
import { HeroDag } from '../components/HeroDag';
import { ThemeToggle } from '../components/ThemeToggle';
import { InstallBlock } from '../components/mdx/InstallBlock';
import { switchPathLocale, type Locale } from '../lib/locale';

const copyByLocale: Record<Locale, {
  navDocs: string;
  navPlayground: string;
  subtitle: string;
  ctaDocs: string;
  ctaPlayground: string;
  ctaGithub: string;
  installPackages: string;
  footer: string;
  pillars: Array<{ title: string; desc: string }>;
}> = {
  en: {
    navDocs: 'Docs',
    navPlayground: 'Playground',
    subtitle: 'Compose complex multi-agent context spaces fast: dep() selects dependencies, input hashes decide reuse.',
    ctaDocs: 'Read the Docs',
    ctaPlayground: 'Try the Playground',
    ctaGithub: 'View on GitHub',
    installPackages: '@radium-fs/core @radium-fs/node',
    footer: 'MIT License · Built with radium-fs',
    pillars: [
      {
        title: 'Deterministic',
        desc: 'kind + input = dataId. The same recipe always produces the same space at the same path. No timestamps, no heuristics — pure content addressing.',
      },
      {
        title: 'Composable',
        desc: 'Spaces declare dependencies via dep(). Symlinks wire them together in milliseconds with zero copies. The result is a physical DAG you can inspect with any tool.',
      },
      {
        title: 'Resilient',
        desc: 'Delete any space and it rebuilds from its recipe on the next ensure(). Dependencies cascade automatically. Only what changed gets rebuilt.',
      },
    ],
  },
  zh: {
    navDocs: '文档',
    navPlayground: 'Playground',
    subtitle: '快速连接并构建复杂多 agent 上下文空间：dep() 选择依赖，input 哈希决定复用。',
    ctaDocs: '阅读文档',
    ctaPlayground: '体验 Playground',
    ctaGithub: '查看 GitHub',
    installPackages: '@radium-fs/core @radium-fs/node',
    footer: 'MIT License · 基于 radium-fs 构建',
    pillars: [
      {
        title: '确定性',
        desc: 'kind + input = dataId。同一配方与输入总会得到同一路径的空间，无时间戳和启发式规则，完全内容寻址。',
      },
      {
        title: '可组合',
        desc: '通过 dep() 声明依赖，用符号链接在毫秒级完成上下文拼装，零拷贝，同时形成可被任意工具直接查看的物理 DAG。',
      },
      {
        title: '可恢复',
        desc: '删除任意空间后，下一次 ensure() 会按配方自动重建；依赖会级联处理，只有受影响的路径会重新构建。',
      },
    ],
  },
};

interface LandingPageProps {
  locale: Locale;
}

export function LandingPage({ locale }: LandingPageProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const copy = copyByLocale[locale];
  const docsPath = locale === 'zh' ? '/zh/docs' : '/docs';

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-2.5 border-b border-border">
        <Link to={locale === 'zh' ? '/zh' : '/'} className="flex items-center gap-2">
          <img
            src={`${import.meta.env.BASE_URL}radium-fs-logo.png`}
            alt="radium-fs"
            className="h-7 w-7"
          />
          <span className="font-semibold text-text-primary text-sm tracking-wide">
            radium-fs
          </span>
        </Link>

        <div className="flex items-center gap-3 ml-2">
          <Link
            to={docsPath}
            className="text-xs text-text-secondary hover:text-text-primary transition-colors font-medium"
          >
            {copy.navDocs}
          </Link>
          <Link
            to="/playground"
            className="text-xs text-text-secondary hover:text-text-primary transition-colors font-medium"
          >
            {copy.navPlayground}
          </Link>
        </div>

        <div className="flex-1" />

        <div className="relative">
          <label htmlFor="landing-lang" className="sr-only">
            Language
          </label>
          <select
            id="landing-lang"
            value={locale}
            onChange={(e) => {
              const target = e.target.value as Locale;
              if (target !== locale) {
                navigate(switchPathLocale(pathname, target));
              }
            }}
            className="h-8 rounded-md border border-border bg-surface-raised text-xs text-text-secondary pl-2.5 pr-7 appearance-none focus:outline-none focus:border-accent/40"
          >
            <option value="en">English</option>
            <option value="zh">中文</option>
          </select>
          <svg
            className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-text-secondary pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        <ThemeToggle />

        <a
          href="https://github.com/radium-fs/radium-fs"
          target="_blank"
          rel="noopener noreferrer"
          className="text-text-secondary hover:text-text-primary transition-colors"
          title="GitHub"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
        </a>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center px-6 pt-12 sm:pt-20 pb-16 text-center">
        <h1 className="flex items-center gap-3 text-4xl sm:text-5xl font-bold text-text-primary mb-3 tracking-tight">
          <img
            src={`${import.meta.env.BASE_URL}radium-fs-logo.png`}
            alt=""
            className="h-10 w-10 sm:h-12 sm:w-12"
          />
          radium-fs
        </h1>
        <p className="text-base sm:text-lg text-text-secondary max-w-xl mb-10 leading-relaxed">
          {copy.subtitle}
        </p>

        <div className="w-full mb-10">
          <HeroDag />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
          <Link
            to={docsPath}
            className="px-6 py-2.5 rounded-lg text-sm font-medium bg-accent text-surface hover:bg-accent/90 transition-colors"
          >
            {copy.ctaDocs}
          </Link>
          <Link
            to="/playground"
            className="px-6 py-2.5 rounded-lg text-sm font-medium border border-border text-text-primary hover:bg-surface-raised transition-colors"
          >
            {copy.ctaPlayground}
          </Link>
          <a
            href="https://github.com/radium-fs/radium-fs"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-2.5 rounded-lg text-sm font-medium border border-border text-text-primary hover:bg-surface-raised transition-colors"
          >
            {copy.ctaGithub}
          </a>
        </div>

        <InstallBlock packages={copy.installPackages} />
      </section>

      {/* Pillars */}
      <section className="px-6 py-16 border-t border-border">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {copy.pillars.map((p) => (
            <div key={p.title}>
              <h3 className="text-sm font-semibold text-accent mb-2 tracking-wide">
                {p.title}
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                {p.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-6 border-t border-border text-center text-xs text-text-secondary">
        {copy.footer}
      </footer>
    </div>
  );
}
