# ARGOS Release

Tam test + sürüm bump + commit + tag + push yap.

1. `.cursor/skills/argos-release/SKILL.md` dosyasını oku ve kurallara uy.
2. `make test-all` çalıştır; hata varsa düzelt, release'e devam etme.
3. Değişiklik kapsamına göre bump seç:
   - bugfix → `patch`
   - yeni özellik → `minor`
   - kırıcı değişiklik → `major`
4. Çalıştır: `./scripts/release.sh <bump> "<kısa özet>"`
5. Push başarısız olursa `git_write` + `network` izniyle tekrar dene.
6. Kullanıcıya yeni sürüm numarası, tag ve commit özetini bildir.

Runtime veriyi commit etme (alerts_log, chat_history, last_discovery, .env).
