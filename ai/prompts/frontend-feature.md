# Şablon: Frontend özellik / değişiklik

```
Görev: [tek cümle]
Kapsam: frontend only | frontend+backend
Bağlam: ai/context/frontend.md + [ilgili store/service dosyası]

Kısıt:
- Minimal diff, Türkçe yorum
- Hardcoded renk/spacing yok → tokens.css değişkenleri
- Canlı veri: portfolioStore.applyMarketUpdate (yeni paralel kaynak açma)
- REST çağrısı: services/api.ts üzerinden, JWT header otomatik
- Mock/synthetic veri yok → gerçek API + empty state
- Yeni endpoint kullanımı: api.ts → types/ → component sırası

Kabul: [1-2 madde, ör. "1024px'te tek kolon", "WS güncellemesinde kart flash"]
```

## Composer'da kullanım

`@` ile sadece ilgili 2-3 dosyayı ekle (token-policy: geniş tarama yok):

```
@.cursor/rules/frontend-react.mdc
@frontend/src/store/portfolioStore.ts
@frontend/src/services/api.ts
[+ değişecek component]
```
