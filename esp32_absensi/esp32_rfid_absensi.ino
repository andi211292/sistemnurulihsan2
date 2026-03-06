/*
 * ESP32 + PN532 RFID Absensi System
 * Sistem Pondok Pesantren Nurul Ihsan
 * =====================================
 * Wiring PN532 (SPI):
 *   PN532 SCK  → ESP32 GPIO 18
 *   PN532 MISO → ESP32 GPIO 19
 *   PN532 MOSI → ESP32 GPIO 23
 *   PN532 SS   → ESP32 GPIO 5
 *   PN532 RST  → ESP32 GPIO 4
 *   PN532 VCC  → 3.3V
 *   PN532 GND  → GND
 *
 * Wiring LCD I2C (16x2):
 *   LCD SDA → ESP32 GPIO 21
 *   LCD SCL → ESP32 GPIO 22
 *   LCD VCC → 5V / 3.3V
 *   LCD GND → GND
 *
 * Libraries yang dibutuhkan (install via Library Manager):
 *   - WiFiMulti (sudah built-in di ESP32)
 *   - HTTPClient (sudah built-in di ESP32)
 *   - ArduinoJson by Benoit Blanchon
 *   - Adafruit PN532
 *   - LiquidCrystal I2C by Frank de Brabander
 */

#include <WiFi.h>
#include <WiFiMulti.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <SPI.h>
#include <Adafruit_PN532.h>
#include <LiquidCrystal_I2C.h>

WiFiMulti wifiMulti;

// =====================================
// KONFIGURASI — SESUAIKAN DI SINI
// =====================================
// Ganti dengan IP laptop/server (cek dengan: ipconfig di CMD)
const char* SERVER_BASE = "http://50.50.50.10:8080";

// ID unik alat ini — harus didaftarkan di menu "Kelola Alat RFID" admin
// contoh: "ESP32-MASJID-01", "ESP32-KELAS-7A", "ESP32-KAMAR-A"
const char* DEVICE_ID = "ESP32-MASJID-01";
// =====================================

// Pin PN532 SPI
#define PN532_SCK  18
#define PN532_MISO 19
#define PN532_MOSI 23
#define PN532_SS   5
#define PN532_RST  4

Adafruit_PN532 nfc(PN532_SCK, PN532_MISO, PN532_MOSI, PN532_SS);
LiquidCrystal_I2C lcd(0x27, 16, 2);  // ganti 0x27 ke 0x3F jika LCD tidak menyala

void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22);   // SDA=21, SCL=22

  // Init LCD
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Sistem Absensi");
  lcd.setCursor(0, 1);
  lcd.print("Menghubungkan...");

  // Konfigurasi WiFi (bisa multiple AP)
  wifiMulti.addAP("kitabmakna.id3", "");        // WiFi tanpa password
  wifiMulti.addAP("Nurulihsan.idi", "");         // WiFi tanpa password
  // wifiMulti.addAP("NamaWiFi", "password");   // WiFi dengan password

  Serial.print("Menghubungkan ke WiFi");
  while (wifiMulti.run() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("WiFi Terhubung! IP: ");
  Serial.println(WiFi.localIP());

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("WiFi Terhubung!");
  lcd.setCursor(0, 1);
  lcd.print(WiFi.localIP());
  delay(2000);

  // Init PN532
  nfc.begin();
  uint32_t versiondata = nfc.getFirmwareVersion();
  if (!versiondata) {
    Serial.println("ERROR: PN532 tidak terdeteksi!");
    lcd.clear();
    lcd.print("ERROR: PN532!");
    while (1) delay(1000);
  }
  Serial.print("PN532 ditemukan! Firmware: ");
  Serial.println((versiondata >> 16) & 0xFF);

  nfc.SAMConfig();   // Konfigurasi untuk membaca kartu ISO14443A

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Tap Kartu RFID");
  lcd.setCursor(0, 1);
  lcd.print("........................");
}

void loop() {
  uint8_t uid[7];
  uint8_t uidLength;

  // Tunggu kartu RFID (timeout 1 detik)
  bool cardFound = nfc.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, &uidLength, 1000);

  if (!cardFound) return;

  // Konversi UID bytes ke angka desimal
  unsigned long uidDecimal = 0;
  for (uint8_t i = 0; i < uidLength; i++) {
    uidDecimal = (uidDecimal << 8) | uid[i];
  }
  String uidStr = String(uidDecimal);

  Serial.print("Kartu terdeteksi! UID Desimal: ");
  Serial.println(uidStr);

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("UID: " + uidStr.substring(0, 11));
  lcd.setCursor(0, 1);
  lcd.print("Memproses...");

  // Kirim ke server
  kirimAbsensi(uidStr);

  // Tunggu 2 detik sebelum bisa tap lagi (anti double tap)
  delay(2000);
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Tap Kartu RFID");
}

void kirimAbsensi(String rfidUid) {
  if (wifiMulti.run() != WL_CONNECTED) {
    Serial.println("WiFi terputus, mencoba reconnect...");
    lcd.clear();
    lcd.print("WiFi Terputus!");
    return;
  }

  HTTPClient http;
  String url = String(SERVER_BASE) + "/api/absensi/tap";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000);

  // JSON: uid + device_id (server tentukan sesi dari device)
  StaticJsonDocument<256> doc;
  doc["uid"]       = rfidUid;   // 10-digit desimal
  doc["device_id"] = DEVICE_ID; // ID alat ini
  doc["tipe"]      = "AUTO";    // biarkan server tentukan sesi

  String jsonBody;
  serializeJson(doc, jsonBody);

  Serial.print("POST ke: "); Serial.println(url);
  Serial.print("Body: ");    Serial.println(jsonBody);

  int httpCode = http.POST(jsonBody);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.println("Response: " + response);

    StaticJsonDocument<512> resDoc;
    DeserializationError err = deserializeJson(resDoc, response);

    lcd.clear();
    if (!err) {
      bool success = resDoc["success"] | false;
      const char* status  = resDoc["status"]  | "";
      const char* message = resDoc["message"] | "OK";
      const char* nama    = resDoc["nama"]    | "Tidak Dikenal";
      const char* waktu   = resDoc["waktu"]   | "--:--";
      const char* sesi    = resDoc["sesi"]    | "";

      String namaStr = String(nama);
      String msgStr  = String(message);

      if (String(status) == "already_tapped") {
        // Pesan khusus double tap
        lcd.setCursor(0, 0);
        lcd.print("Sudah Absen!");
        lcd.setCursor(0, 1);
        lcd.print(namaStr.substring(0, 16));
        Serial.println("Double tap: " + namaStr);
      } else if (success) {
        lcd.setCursor(0, 0);
        lcd.print(namaStr.substring(0, 16));
        lcd.setCursor(0, 1);
        lcd.print(String(waktu) + " HADIR");
        Serial.println("OK: " + namaStr + " - " + String(sesi));
      } else {
        lcd.setCursor(0, 0);
        lcd.print("KARTU TDK ADA!");
        lcd.setCursor(0, 1);
        lcd.print(msgStr.substring(0, 16));
        Serial.println("Gagal: " + msgStr);
      }
    } else {
      lcd.print("Parse Error!");
    }
  } else {
    lcd.clear();
    lcd.print("Server Error!");
    lcd.setCursor(0, 1);
    lcd.print("Code: " + String(httpCode));
    Serial.println("HTTP Error: " + String(httpCode));
  }

  http.end();
}
