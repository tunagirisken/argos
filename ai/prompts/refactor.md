# Şablon: Refactor

```
Hedef: [ne değişecek — tek cümle]
Dosya(lar): [tam path + fonksiyon/bileşen adı]
Bağlam: ai/context/[architecture|frontend].md

Yap:
- Mevcut pattern'i koru (servis katmanı, store yapısı, naming)
- Davranış değişmesin; yalnızca yapı/okunabilirlik
- Türkçe yorum, minimal diff
- Public API / endpoint imzası bozulursa açıkça belirt

Yapma:
- Geniş repo taraması (token-policy)
- Plan dosyası (*.plan.md) düzenleme
- İlgisiz dosyalara dokunma
- Yeni bağımlılık eklemek (önce sor)

Doğrula: make test (backend) veya cd frontend && npm run build
```

## Composer'da kullanım

```
@ai/context/architecture.md
@[refactor edilecek dosya]
[+ bu dosyayı kullanan 1 örnek dosya — kırılma kontrolü için]
```
