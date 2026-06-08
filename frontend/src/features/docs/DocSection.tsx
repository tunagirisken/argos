import { useState } from "react";
import { Icon } from "../../components/icons/Icon";
import type { DocSectionType } from "./docContent";
import { slugify } from "./docContent";

export function DocCode({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="doc-code">
      <button type="button" className="doc-code__copy" onClick={copy}>
        <Icon name={copied ? "check" : "copy"} size={13} /> {copied ? "Kopyalandı" : "Kopyala"}
      </button>
      <pre>
        <code>{content}</code>
      </pre>
    </div>
  );
}

function DocCallout({
  variant,
  title,
  content,
}: {
  variant: "info" | "warning" | "danger" | "tip";
  title: string;
  content: string;
}) {
  const map = {
    info: { c: "var(--info)", icon: "ai" },
    warning: { c: "var(--warning)", icon: "bell" },
    danger: { c: "var(--negative)", icon: "x" },
    tip: { c: "var(--positive)", icon: "spark" },
  };
  const m = map[variant] || map.info;
  return (
    <div
      className="doc-callout"
      style={{
        background: `color-mix(in srgb, ${m.c} 9%, transparent)`,
        borderColor: m.c,
      }}
    >
      <span style={{ color: m.c, flexShrink: 0 }}>
        <Icon name={m.icon} size={16} />
      </span>
      <div>
        <div style={{ fontWeight: 700, fontSize: 13, color: m.c, marginBottom: 3 }}>{title}</div>
        <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text-secondary)" }}>{content}</div>
      </div>
    </div>
  );
}

function DocEndpoint({ method, path, desc }: { method: string; path: string; desc: string }) {
  const colors: Record<string, string> = {
    GET: "var(--positive)",
    POST: "var(--t-accent)",
    DELETE: "var(--negative)",
    PUT: "var(--warning)",
  };
  const c = colors[method] || "var(--text-muted)";
  return (
    <div className="doc-endpoint">
      <span
        className="doc-method"
        style={{ color: c, background: `color-mix(in srgb, ${c} 14%, transparent)` }}
      >
        {method}
      </span>
      <div style={{ minWidth: 0 }}>
        <div className="mono" style={{ fontSize: 14, wordBreak: "break-all" }}>
          {path}
        </div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>{desc}</div>
      </div>
    </div>
  );
}

function DocTable({ columns, rows }: { columns: string[]; rows: string[][] }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="doc-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((cell, j) => (
                <td key={j} className={j === 0 ? "mono" : ""}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DocSection({ s }: { s: DocSectionType }) {
  switch (s.type) {
    case "text":
      return <p className="doc-text">{s.content}</p>;
    case "heading":
      return (
        <h3 className="doc-h3" id={slugify(s.content)} data-doc-heading={s.content}>
          {s.content}
        </h3>
      );
    case "code":
      return <DocCode content={s.content} />;
    case "callout":
      return <DocCallout variant={s.variant} title={s.title} content={s.content} />;
    case "endpoint":
      return <DocEndpoint method={s.method} path={s.path} desc={s.desc} />;
    case "table":
      return <DocTable columns={s.columns} rows={s.rows} />;
    default:
      return null;
  }
}

export function DocCommandsTable({
  commands,
}: {
  commands: { command: string; description: string; example: string }[];
}) {
  return (
    <div style={{ overflowX: "auto", marginBottom: 16 }}>
      <table className="doc-table">
        <thead>
          <tr>
            <th>Komut</th>
            <th>Açıklama</th>
            <th>Örnek</th>
          </tr>
        </thead>
        <tbody>
          {commands.map((c) => (
            <tr key={c.command}>
              <td className="mono" style={{ color: "var(--t-accent)" }}>
                {c.command}
              </td>
              <td>{c.description}</td>
              <td className="mono faint">{c.example}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
