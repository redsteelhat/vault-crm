# VaultCRM — Tam Özellik Listesi (Ürün Backlog)

Bu belge MVP + V1 genişleme + premium detayları kapsayan "tam katalog" ve todo listesidir.  
Öncelik: **MVP** → **V1** → **Premium/İleri**.

---

## A) Veri ve Profil Yönetimi

### A1 — Kişi kartı (Contact)
| # | Özellik | Detay / Kriter | Todo |
|---|---------|----------------|------|
| A1.1 | Temel alanlar | İsim (first/last), rol/unvan, şirket, lokasyon (şehir/ülke) | ☑ |
| A1.2 | İletişim | Email (birincil + ek), telefon (birincil + ek), doğrulama (format) | ☑ |
| A1.3 | Sosyal linkler | LinkedIn URL, Twitter/X, web sitesi (serbest URL alanları) | ☑ |
| A1.4 | Notlar alanı | Kişiye özel notlar (Markdown); timeline ile ilişkilendirme | ☑ |
| A1.5 | Şirket ilişkisi | Kişi ↔ şirket kartı bağlantısı (many-to-one) | ☑ |

### A2 — Şirket/organizasyon kartı (Company)
| # | Özellik | Detay / Kriter | Todo |
|---|---------|----------------|------|
| A2.1 | Temel alanlar | İsim, domain (örn. company.com), sektör/industry | ☑ |
| A2.2 | Notlar | Şirket bazlı notlar (Markdown) | ☑ |
| A2.3 | Kişi listesi | Bu şirkete bağlı kişiler; karttan tek tıkla kişiye geçiş | ☑ |
| A2.4 | Domain’den otomatik | (Opsiyonel) Domain girilince favicon/logo önerisi — tamamen local | ☑ |

### A3 — Özel alanlar (Custom fields)
| # | Özellik | Detay / Kriter | Todo |
|---|---------|----------------|------|
| A3.1 | Tanımlanabilir alanlar | Kullanıcı yeni alan ekleyebilir: metin, sayı, tarih, tek seçim, çoklu seçim | ☑ |
| A3.2 | Hazır “hissiyat” alanları | “Warmth score” (1–5 veya benzeri), “Source”, “Stage” — varsayılan şablon olarak sunulabilir | ☑ |
| A3.3 | Filtre/raporlama | Özel alanlara göre filtre ve dashboard’da kullanım | ☑ |

### A4 — Etiketleme ve segmentler
| # | Özellik | Detay / Kriter | Todo |
|---|---------|----------------|------|
| A4.1 | Tags | Kişi/şirket için çoklu etiket (örn. Investors, Customers, LPs); renk/label | ☐ |
| A4.2 | Segmentler / listeler | Tag’lere veya filtreye dayalı “listeler” (saved views); “Investors”, “Customers” gibi sabit veya dinamik | ☐ |
| A4.3 | Tag yönetimi | Tag oluşturma/silme/rename; kullanılmayan tag’leri temizleme uyarısı | ☐ |

### A5 — Akıllı birleştirme (Dedup)
| # | Özellik | Detay / Kriter | Todo |
|---|---------|----------------|------|
| A5.1 | Eşleştirme | Email exact match; telefon normalize + match; isim benzerliği (Levenshtein veya benzeri) | ☑ |
| A5.2 | Merge UI | “Olası duplikatlar” listesi; kullanıcı seçer, hangi alanların kalacağı seçilir | ☑ |
| A5.3 | Import sonrası öneri | CSV/import bitince “X olası tekrar var” önerisi | ☑ |

### A6 — Ek dosya / attachment (local only)
| # | Özellik | Detay / Kriter | Todo |
|---|---------|----------------|------|
| A6.1 | Desteklenen formatlar | PDF, doc (opsiyonel); pitch deck, sözleşme notu — hepsi local storage | ☑ |
| A6.2 | Bağlama | Kişi veya şirket kartına eklenir; dosya uygulama veri klasöründe veya kullanıcı seçtiği klasörde (BYO) | ☑ |
| A6.3 | Güvenlik | Attachment’lar da at-rest encryption kapsamında | ☑ |

---

## B) İlişki Zaman Çizelgesi (Relationship Timeline)

### B1 — Interaction log
| # | Özellik | Detay / Kriter | Todo |
|---|---------|----------------|------|
| B1.1 | Etkileşim tipleri | Meeting, Call, Email, DM (manuel giriş); tarih + kısa özet/not | ☑ |
| B1.2 | Timeline görünümü | Kişi/şirket kartında kronolojik liste; “Last touched” otomatik güncellenir | ☑ |
| B1.3 | Hızlı ekleme | “Meeting yaptık” butonu + tarih seçici + not alanı | ☑ |

### B2 — Last touched / Next touch
| # | Özellik | Detay / Kriter | Todo |
|---|---------|----------------|------|
| B2.1 | Last touched | Son etkileşim tarihi; interaction eklendiğinde otomatik güncelleme | ☑ |
| B2.2 | Next touch | Kullanıcı tarafından set edilen veya “Follow-up X gün sonra” ile türetilen tarih | ☑ |
| B2.3 | Liste/filtre | “Next touch bu hafta”, “Last touched 30+ gün önce” filtreleri | ☑ |

### B3 — Relationship health sinyali
| # | Özellik | Detay / Kriter | Todo |
|---|---------|----------------|------|
| B3.1 | Basit model | Recency (son temas ne zaman) + frequency (son N ayda kaç temas); tamamen local hesaplama | ☑ |
| B3.2 | Görselleştirme | Kişi kartında basit gösterge (örn. renk/ikon: yeşil/sarı/kırmızı veya “Warm / Cooling / Cold”) | ☑ |
| B3.3 | Ayarlanabilir | Kullanıcı eşikleri değiştirebilir (opsiyonel) | ☑ |

---

## C) Notlar ve İçerik Sistemi

### C1 — Markdown ve şablonlar
| # | Özellik | Detay / Kriter | Todo |
|---|---------|----------------|------|
| C1.1 | Markdown destekli notlar | Kişi/şirket notları ve timeline notları Markdown; önizleme (preview) | ☑ |
| C1.2 | Not şablonları | “Meeting Notes”, “Follow-up”, “Intro”, “Intro requested”, “Send deck”, “Follow-up in X days” | ☑ |
| C1.3 | Hızlı aksiyonlar | Şablondan not açılınca otomatik “X gün sonra hatırlat” seçeneği | ☑ |

### C2 — Arama ve mention
| # | Özellik | Detay / Kriter | Todo |
|---|---------|----------------|------|
| C2.1 | Global hızlı arama | Cmd/Ctrl+K: kişi adı, şirket, not içeriği; sonuçlara hızlı geçiş | ☑ |
| C2.2 | Notlarda @mention | @kişi → kişiye link; arama/raporlarda “bu kişi geçen notlar” | ☑ |
| C2.3 | Notlarda #etiket | #tag → mevcut tag’lerle ilişki; tag’e tıklanınca filtre | ☑ |

---

## D) Hatırlatıcı ve Task Management

### D1 — Local notification ve reminder
| # | Özellik | Detay / Kriter | Todo |
|---|---------|----------------|------|
| D1.1 | OS bildirimi | Desktop/mobile OS üzerinden local notification (sunucu yok) | ☐ |
| D1.2 | Kişi bazlı “Next action” | Her kişi için tek “next action” + tarih/saat; bildirim bu tarihte | ☐ |
| D1.3 | Snooze | Bildirimde snooze (1h, 1 gün, 7/14/30 gün) | ☐ |
| D1.4 | Recurring | “Her X günde bir hatırlat” veya “until done” (yapılana kadar tekrarla) | ☐ |

### D2 — Inbox ve review
| # | Özellik | Detay / Kriter | Todo |
|---|---------|----------------|------|
| D2.1 | “Next action required” inbox | Tüm kişilerin bugün/bu hafta next action’ları tek listede | ☐ |
| D2.2 | Günlük/haftalık review ekranı | “Bugün yapılacaklar”, “Bu hafta pipeline review”; tamamen local | ☑ |
| D2.3 | Tamamlandı işaretleme | Action tamamlandı → “Last touched” güncellenir, next action temizlenir veya yeni tarih | ☐ |

---

## E) Arama, Filtre, Analitik (Local)

### E1 — Arama ve filtre
| # | Özellik | Detay / Kriter | Todo |
|---|---------|----------------|------|
| E1.1 | Full-text search | İsim, not içeriği, şirket adı; SQLite FTS veya benzeri (local) | ☐ |
| E1.2 | Filtreler | Last touched, tags, stage, city, source, custom fields; AND/OR birleştirme | ☐ |
| E1.3 | Kayıtlı filtreler | Sık kullanılan filtreleri “saved view” olarak saklama | ☐ |

### E2 — Dashboard
| # | Özellik | Detay / Kriter | Todo |
|---|---------|----------------|------|
| E2.1 | “Bu hafta temas edilmesi gerekenler” | Next touch bu hafta olan kişiler | ☐ |
| E2.2 | “30+ gündür dokunmadıkların” | Last touched > 30 gün | ☐ |
| E2.3 | “Yeni import edilenler” | Son X günde eklenen kişiler | ☐ |
| E2.4 | Genişletilebilir widget’lar | İleride ek widget (örn. tag dağılımı, stage pipeline) | ☐ |

### E3 — Export (data portability)
| # | Özellik | Detay / Kriter | Todo |
|---|---------|----------------|------|
| E3.1 | CSV export | Seçilen alanlar, filtre uygulanmış liste; UTF-8 | ☐ |
| E3.2 | JSON export | Tam veri seti veya seçili segment; yedek/taşıma amaçlı | ☐ |
| E3.3 | Veri kullanıcıda | Export dosyası kullanıcının seçtiği yere; uygulama sunucuya göndermez | ☐ |

---

## F) Privacy & Security (Anti-Cloud omurgası)

### F1 — Şifreleme ve anahtar
| # | Özellik | Detay / Kriter | Todo |
|---|---------|----------------|------|
| F1.1 | At-rest encryption | Veritabanı (SQLite) şifreli; açılışta tek anahtar (passphrase veya device key) | ☐ |
| F1.2 | Anahtar saklama | OS Keychain (macOS/iOS), Credential Manager (Windows), Keychain (Android) — uygulama anahtarı orada | ☐ |
| F1.3 | İlk kurulum | İlk açılışta “şifreleme anahtarını oluştur” / “passphrase belirle”; kurtarma uyarısı | ☐ |

### F2 — Offline ve telemetri
| # | Özellik | Detay / Kriter | Todo |
|---|---------|----------------|------|
| F2.1 | Offline by default | Tüm core akışlar ağ olmadan çalışır; “sync” ayrı modül | ☐ |
| F2.2 | Telemetry kapalı | Varsayılan: hiçbir kullanım verisi gönderilmez | ☐ |
| F2.3 | Opt-in crash report | İsteğe bağlı: crash log anonim ve sadece kullanıcı açarsa | ☐ |

### F3 — Yedekleme ve panic
| # | Özellik | Detay / Kriter | Todo |
|---|---------|----------------|------|
| F3.1 | Otomatik lokal backup | Versiyonlu yedek (örn. günlük); uygulama veri klasöründe veya kullanıcı seçtiği klasör | ☐ |
| F3.2 | Kullanıcı yedek klasörü | “Yedekleri buraya da kopyala” (BYO folder) | ☐ |
| F3.3 | Panic lock | Kısayol veya buton: uygulamayı kilitle / ekranı hızlıca gizle; tekrar açmak için passphrase | ☐ |

---

## G) (Opsiyonel) BYO Sync Modülleri

### G1 — Folder Sync
| # | Özellik | Detay / Kriter | Todo |
|---|---------|----------------|------|
| G1.1 | Klasör seçimi | Kullanıcı bir klasör seçer (NAS, Google Drive, Dropbox lokal senkronlu klasör vb.) | ☐ |
| G1.2 | Şifreli yazma | DB (veya snapshot) şifreli olarak o klasöre yazılır; format dokümante | ☐ |
| G1.3 | Çok cihaz | Aynı klasörü kullanan ikinci cihar “bu klasörden aç” ile aynı veriyi kullanır | ☐ |

### G2 — LAN / P2P sync
| # | Özellik | Detay / Kriter | Todo |
|---|---------|----------------|------|
| G2.1 | Aynı ağda cihazlar | İki cihaz aynı LAN’da; biri “paylaş”, diğeri “katıl” — P2P veya basit LAN discovery | ☐ |
| G2.2 | Conflict handling | Basit strateji: last-write-wins + conflict’lerin activity log’u (kim ne zaman değiştirdi) | ☐ |
| G2.3 | Şifreleme | Sync kanalı üzerinden giden veri de şifreli (ortak anahtar veya cihaz eşlemesi) | ☐ |

---

## H) (İleri Seviye) Akıllı Özellikler — Bulutsuz

### H1 — Local AI (opsiyonel)
| # | Özellik | Detay / Kriter | Todo |
|---|---------|----------------|------|
| H1.1 | Next action önerisi | Notlardan (local model veya kural tabanlı) “şu kişiye follow-up önerilir” | ☐ |
| H1.2 | Tamamen cihazda | Model indirilir, inference local; buluta veri gitmez | ☐ |

### H2 — Kişi özetleri (opsiyonel)
| # | Özellik | Detay / Kriter | Todo |
|---|---------|----------------|------|
| H2.1 | Local embedding + retrieval | Notlar/etkileşimlerden özet cümle; local embedding modeli | ☐ |
| H2.2 | “Bu kişiyi özetle” | Tek tıkla son notlar + son temas özeti | ☐ |

### H3 — Intro graph
| # | Özellik | Detay / Kriter | Todo |
|---|---------|----------------|------|
| H3.1 | Veri kaynağı | Sadece import edilen / manuel girilen bağlantılar (kim kimi tanıyor) | ☐ |
| H3.2 | Görselleştirme | “A, B’yi tanıtabilir” grafiği; node: kişi, edge: tanışıklık/intro | ☐ |
| H3.3 | LinkedIn import’tan | “Connections.csv” veya notlardan “intro” ilişkisi çıkarımı (manuel tag veya basit parse) | ☐ |

---

## Öncelik Matrisi (Referans)

| Faz | Kapsam | Örnek özellikler |
|-----|--------|-------------------|
| **MVP** | İndir-kur, CSV import, not, 14 gün bildirim | A1 (temel kişi), A4 (tag), A5 (dedup), C1 (not+şablon), D1–D2 (hatırlatıcı), E1 (arama), F1–F2 (şifreleme, offline) |
| **V1** | Tam kişi/şirket, timeline, dashboard, export | A2, A3, A6, B, C2, E2, E3, F3 |
| **V1+** | BYO sync, panic lock | G1, G2, F3.3 |
| **İleri** | Local AI, intro graph | H1, H2, H3 |

---

*Son güncelleme: Backlog oluşturuldu; geliştirme başlamadan önce onay için hazır.*
