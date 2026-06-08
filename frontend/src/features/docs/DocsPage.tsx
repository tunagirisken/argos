import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../../components/icons/Icon";
import { api } from "../../services/api";
import "../../styles/docs.css";
import { DocCommandsTable, DocCode, DocSection } from "./DocSection";
import {
  DOC_CAT_OF,
  DOC_CATS,
  DOC_LABEL,
  DOC_ORDER,
  DOC_PAGES,
  type DocPageId,
} from "./docContent";

const DOC_STORAGE_KEY = "argos.doc";

export function DocsPage() {
  const [active, setActive] = useState<DocPageId>(() => {
    const stored = localStorage.getItem(DOC_STORAGE_KEY);
    return stored && stored in DOC_PAGES ? (stored as DocPageId) : "welcome";
  });
  const [query, setQuery] = useState("");
  const [openCats, setOpenCats] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(DOC_CATS.map((c) => [c.title, true]))
  );
  const [activeH, setActiveH] = useState<string | null>(null);
  const [commands, setCommands] = useState<{ command: string; description: string; example: string }[]>([]);
  const [localEnv, setLocalEnv] = useState<string | null>(null);
  const contentRef = useRef<HTMLElement>(null);

  useEffect(() => {
    api.getDocsTelegram().then((d) => setCommands(d.commands));
  }, []);

  useEffect(() => {
    if (active !== "env-config") {
      setLocalEnv(null);
      return;
    }
    api
      .getDocsLocalEnv()
      .then((d) => setLocalEnv(d.markdown))
      .catch(() => setLocalEnv(null));
  }, [active]);

  useEffect(() => {
    localStorage.setItem(DOC_STORAGE_KEY, active);
    if (contentRef.current) contentRef.current.scrollTop = 0;
    setActiveH(null);
  }, [active]);

  const page = DOC_PAGES[active] || DOC_PAGES.welcome;
  const headings = page.sections.filter((s) => s.type === "heading").map((s) => s.content);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DOC_CATS;
    return DOC_CATS.map((c) => ({
      ...c,
      items: c.items.filter(
        ([id, l]) =>
          l.toLowerCase().includes(q) || DOC_PAGES[id as DocPageId].title.toLowerCase().includes(q)
      ),
    })).filter((c) => c.items.length);
  }, [query]);

  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;
    const hs = [...root.querySelectorAll("[data-doc-heading]")];
    if (!hs.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis.length) setActiveH(vis[0].target.getAttribute("data-doc-heading"));
      },
      { root, rootMargin: "0px 0px -70% 0px", threshold: 0 }
    );
    hs.forEach((h) => io.observe(h));
    return () => io.disconnect();
  }, [active]);

  const idx = DOC_ORDER.indexOf(active);
  const prev = idx > 0 ? DOC_ORDER[idx - 1] : null;
  const next = idx < DOC_ORDER.length - 1 ? DOC_ORDER[idx + 1] : null;

  const goHeading = (h: string) => {
    const el = contentRef.current?.querySelector(`[data-doc-heading="${h}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="docs">
      <aside className="docs-side">
        <div className="docs-search">
          <Icon name="search" size={15} />
          <input
            placeholder="Dokümanlarda ara..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <nav className="docs-nav">
          {filtered.map((cat) => (
            <div key={cat.title} className="docs-cat">
              <button
                type="button"
                className="docs-cat__head"
                onClick={() => setOpenCats((o) => ({ ...o, [cat.title]: !o[cat.title] }))}
              >
                <span>
                  {cat.icon} {cat.title}
                </span>
                <span
                  className="docs-cat__chev"
                  style={{ transform: openCats[cat.title] || query ? "rotate(0)" : "rotate(-90deg)" }}
                >
                  <Icon name="chevron-down" size={14} />
                </span>
              </button>
              {(openCats[cat.title] || query) && (
                <div className="docs-cat__items">
                  {cat.items.map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      className={`docs-item${active === id ? " active" : ""}`}
                      onClick={() => setActive(id as DocPageId)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {!filtered.length && (
            <div style={{ padding: 16, fontSize: 13, color: "var(--text-muted)" }}>Sonuç yok.</div>
          )}
        </nav>
      </aside>

      <main className="docs-content" ref={contentRef}>
        <div className="docs-inner">
          <div className="docs-breadcrumb">
            Docs <span>/</span> {DOC_CAT_OF[active]} <span>/</span> {page.title}
          </div>
          <h1 className="docs-title">{page.title}</h1>
          {page.description ? <p className="docs-desc">{page.description}</p> : null}
          <div className="docs-body">
            {active === "bot-commands" && commands.length > 0 ? (
              <DocCommandsTable commands={commands} />
            ) : null}
            {page.sections.map((s, i) => (
              <DocSection key={i} s={s} />
            ))}
            {active === "env-config" && localEnv ? <DocCode content={localEnv} /> : null}
          </div>

          <div className="docs-pager">
            {prev ? (
              <button type="button" className="btn btn--ghost" onClick={() => setActive(prev)}>
                ← {DOC_LABEL[prev]}
              </button>
            ) : (
              <span />
            )}
            {next ? (
              <button type="button" className="btn btn--ghost" onClick={() => setActive(next)}>
                {DOC_LABEL[next]} →
              </button>
            ) : (
              <span />
            )}
          </div>

          <div className="docs-foot">
            <span>© 2026 ARGOS — Tüm hakları saklıdır. Tuna Girişken</span>
            <span style={{ fontStyle: "italic" }}>Bu uygulama yatırım tavsiyesi vermez.</span>
          </div>
        </div>
      </main>

      <aside className="docs-toc">
        {headings.length > 0 && (
          <>
            <div className="docs-toc__h">Bu Sayfada</div>
            {headings.map((h) => (
              <button
                key={h}
                type="button"
                className={`docs-toc__item${activeH === h ? " active" : ""}`}
                onClick={() => goHeading(h)}
              >
                {h}
              </button>
            ))}
          </>
        )}
      </aside>
    </div>
  );
}
