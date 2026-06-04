import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "../../services/api";

/** API anahtarı alanları — yalnızca Ayarlar’da; üretim rehberi linkleri ile */
const GUIDES = [
  {
    id: "gemini",
    title: "Google Gemini API Key",
    required: true,
    steps: [
      "https://aistudio.google.com/apikey adresine git",
      "Google hesabınla giriş yap",
      "Create API key → kopyala",
      "Aşağıya yapıştır → Kaydet",
    ],
    link: "https://aistudio.google.com/apikey",
    field: "gemini" as const,
    ph: "AIza...",
  },
  {
    id: "telegram_token",
    title: "Telegram Bot Token",
    required: true,
    steps: [
      "Telegram’da @BotFather aç",
      "/newbot → bot adı ve kullanıcı adı ver",
      "Verilen token’ı kopyala (123456:AAF...)",
    ],
    link: "https://t.me/BotFather",
    field: "botToken" as const,
    ph: "1234567890:AAF...",
  },
  {
    id: "telegram_chat",
    title: "Telegram Chat ID",
    required: true,
    steps: [
      "Botuna /start yaz",
      "@userinfobot veya @getidsbot ile Chat ID öğren",
      "Kişisel sohbet için pozitif, grup için negatif ID",
    ],
    link: "https://t.me/userinfobot",
    field: "chatId" as const,
    ph: "123456789",
  },
  {
    id: "firecrawl",
    title: "Firecrawl API Key (haber)",
    required: false,
    steps: [
      "https://firecrawl.dev → Sign up",
      "Dashboard → API Keys → Create",
      "fc- ile başlayan anahtarı kopyala",
    ],
    link: "https://firecrawl.dev",
    field: "firecrawl" as const,
    ph: "fc-...",
  },
  {
    id: "exa",
    title: "Exa API Key (haber yedek)",
    required: false,
    steps: [
      "https://exa.ai → hesap oluştur",
      "API / Dashboard bölümünden anahtar al",
    ],
    link: "https://exa.ai",
    field: "exa" as const,
    ph: "exa-...",
  },
];

export function IntegrationsSettings() {
  const [llmProvider, setLlmProvider] = useState<"gemini" | "anthropic">("gemini");
  const [env, setEnv] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    setMsg("");
    try {
      await api.setupEnv({ ...env, llmProvider });
      setMsg("Kaydedildi. Backend yeniden başlatmanız gerekebilir.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Kayıt hatası");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>API ve entegrasyonlar</CardTitle>
        <CardDescription>
          Anahtarlar yalnızca sunucudaki <code>backend/.env</code> dosyasına yazılır. Admin:{" "}
          <code>backend/.env.bootstrap</code> + giriş.
        </CardDescription>
      </CardHeader>
      <CardContent style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div className="field">
          <label>LLM sağlayıcı</label>
          <select
            value={llmProvider}
            onChange={(e) => setLlmProvider(e.target.value as "gemini" | "anthropic")}
            className="field__wrap"
            style={{ width: "100%", padding: 10 }}
          >
            <option value="gemini">Google Gemini</option>
            <option value="anthropic">Anthropic Claude</option>
          </select>
        </div>

        {GUIDES.map((g) => (
          <div key={g.id} className="integration-block">
            <div className="integration-block__head">
              <strong>{g.title}</strong>
              <span className={`req-badge ${g.required ? "req" : "opt"}`}>
                {g.required ? "ZORUNLU" : "OPSİYONEL"}
              </span>
            </div>
            <ol className="muted" style={{ fontSize: 12, margin: "8px 0 12px", paddingLeft: 18 }}>
              {g.steps.map((s) => (
                <li key={s}>{s.startsWith("http") ? <a href={s} target="_blank" rel="noreferrer">{s}</a> : s}</li>
              ))}
            </ol>
            <a href={g.link} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
              Resmi site →
            </a>
            <div className="field__wrap" style={{ marginTop: 8 }}>
              <input
                type="password"
                placeholder={g.ph}
                value={env[g.field] || ""}
                onChange={(e) => setEnv((x) => ({ ...x, [g.field]: e.target.value }))}
              />
            </div>
          </div>
        ))}

        {llmProvider === "anthropic" && (
          <div>
            <strong>Anthropic API Key</strong>
            <ol className="muted" style={{ fontSize: 12, paddingLeft: 18 }}>
              <li>https://console.anthropic.com → API Keys</li>
              <li>sk-ant- ile başlayan anahtarı kopyala</li>
            </ol>
            <div className="field__wrap">
              <input
                type="password"
                placeholder="sk-ant-..."
                value={env.anthropic || ""}
                onChange={(e) => setEnv((x) => ({ ...x, anthropic: e.target.value }))}
              />
            </div>
          </div>
        )}

        {msg && <p style={{ fontSize: 13 }}>{msg}</p>}
        <Button onClick={save} disabled={busy}>
          {busy ? "Kaydediliyor…" : "API anahtarlarını kaydet"}
        </Button>
      </CardContent>
    </Card>
  );
}
