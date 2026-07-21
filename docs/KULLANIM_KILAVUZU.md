# Router Check — Kullanım Kılavuzu

ZTE mobil router'lar (MF286R, MC801A, MU5001 ve benzeri `goform` API cihazları) için masaüstü izleme paneli.

---

## 1. İlk açılış

1. Uygulamayı açın (yalnızca masaüstü — tarayıcıda çalışmaz).
2. **Router IP** (ör. `192.168.0.1`) ve **yönetici şifresini** girin.
3. **Save Changes**'e tıklayın. Uygulama otomatik bağlanır.

Ayarlar yerel olarak uygulama yapılandırma dizinindeki `config.json` dosyasına kaydedilir.

---

## 2. Üst menü kontrolleri

| Kontrol                      | İşlevi                                    |
| ---------------------------- | ----------------------------------------- |
| **API: Connected / Offline** | Oturum durumu                             |
| **Pause / Auto**             | Otomatik yenilemeyi duraklat / başlat     |
| **Refresh**                  | Elle yenile (otomatik kapalıyken görünür) |
| **Settings**                 | IP, şifre, yenileme aralığı, tema         |
| **Login / Logout**           | Router oturumunu aç / kapat               |

---

## 3. Panel kartları

- **Network & Signal** — RSRP, SINR, grafikler, Cell ID, EARFCN. Sinyal düştüğünde **Recover Cell** ile baz istasyonuna yeniden bağlanın.
- **Realtime** — Anlık indirme/yükleme hızı.
- **Router Info** — WAN/LAN durumu, ağ modu, bağlan/bağlantıyı kes, taşıyıcı tercihi.
- **Usage** — Aylık ve oturum veri kullanımı.
- **Logs** — Son router değişiklikleri.
- **Static IP Reservations** — Sabit IP rezervasyonları (hostname, IP, MAC).
- **Connected Devices** — Ağa bağlı aktif cihazlar.

---

## 4. Ayarlar

**Settings** ile değiştirilebilir:

- Router IP ve yönetici şifresi
- **Auto Refresh Polling Interval** (en az 500 ms)
- **Auto Refresh on Startup** — açılışta otomatik yenileme
- **Main Window Initial Status** — pencere açılışta görünür veya gizli
- **Theme** — System, Light veya Dark

Kaydettikten sonra uygulama yeni bilgilerle yeniden bağlanır.

---

## 5. Sistem tepsisi

Uygulama arka planda çalışabilir. Tepsi simgesine sağ tıklayın:

- **Show / Hide Window** — pencereyi göster / gizle
- **Toggle Auto Refresh** — otomatik yenilemeyi aç/kapat
- **Force Refresh** — zorla yenile
- **Quit** — çıkış

Sol tık ana pencereyi açar/kapatır. Bağlıyken tepsi başlığında canlı sinyal bilgisi görünür.

---

## 6. Hücre kurtarma (Cell Recovery)

SINR veya sinyal kalitesi düşükse, Signal kartındaki **Recover Cell**'e tıklayın. Uygulama otomatik sıra çalıştırır: bağlantı kes → 3G → Auto (LTE) → yeniden bağlan. İşlem sırasında **Abort** ile iptal edebilir, bitince **Dismiss** ile kapatabilirsiniz.

> İnternet bağlantınız kısa süre kesilir. Kritik iş sırasında kullanmayın.

---

## 7. Sorun giderme

| Sorun                    | Çözüm                                                     |
| ------------------------ | --------------------------------------------------------- |
| Açılışta bağlantı hatası | **Settings**'ten IP ve şifreyi kontrol edin, **Retry**    |
| Yanlış şifre             | Birçok ZTE router ardışık hatalı girişte ~5 dk kilitlenir |
| API Offline kalıyor      | **Login**'e tıklayın veya uygulamayı yeniden başlatın     |
| Veriler güncellenmiyor   | **Auto** açık olsun veya **Refresh** kullanın             |

Bilgisayarınız router ile aynı ağda olmalı (veya router IP'sine erişebilmeli).
