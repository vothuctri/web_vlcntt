#include <ESP8266WiFi.h>
#include <PubSubClient.h>

// ================= CẤU HÌNH WI-FI =================
const char* ssid        = "Egavc";
const char* password    = "vothuctri";

// ================= CẤU HÌNH MQTT BROKER (NODE-RED) =================
const char* mqtt_server = "broker.emqx.io"; // Hoặc IP máy tính chạy Node-RED
const int   mqtt_port   = 1883;

// Các Topic MQTT
const char* topic_sensors = "smart_terrarium/nhom05/sensors"; // Topic gửi dữ liệu lên Web/Node-RED
const char* topic_control = "smart_terrarium/nhom05/control"; // Topic nhận lệnh từ Web/Node-RED

WiFiClient espClient;
PubSubClient client(espClient);

// Chuỗi đệm nhận dữ liệu từ Arduino qua Serial
String serialData = "";
unsigned long lastMsgTime = 0;

void setup() {
  // Giao tiếp Serial nội bộ với Arduino Uno ở tốc độ 9600
  Serial.begin(9600);

  // Kết nối Wi-Fi
  setupWiFi();

  // Cấu hình MQTT
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(mqttCallback);
}

void loop() {
  // 1. Duy trì kết nối MQTT
  if (!client.connected()) {
    reconnectMQTT();
  }
  client.loop();

  // 2. Đọc chuỗi JSON từ Arduino Uno gửi qua Serial nội bộ
  while (Serial.available() > 0) {
    char c = Serial.read();
    if (c == '\n' || c == '\r') {
      if (serialData.length() > 0) {
        serialData.trim();
        // Kiểm tra đúng định dạng JSON {...} rồi bắn lên MQTT Broker
        if (serialData.startsWith("{") && serialData.endsWith("}")) {
          client.publish(topic_sensors, serialData.c_str());
        }
        serialData = "";
      }
    } else {
      serialData += c;
    }
  }
}

// ================= HÀM KẾT NỐI WI-FI =================
void setupWiFi() {
  delay(10);
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  // Đợi kết nối Wi-Fi (không in Serial rác để tránh ảnh hưởng Arduino)
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }
}

// ================= HÀM XỬ LÝ KHI CÓ LỆNH ĐIỀU KHIỂN TỪ WEB / NODE-RED =================
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String command = "";
  for (unsigned int i = 0; i < length; i++) {
    command += (char)payload[i];
  }
  command.trim();

  // Gửi lệnh nhận được trực tiếp qua Serial xuống cho Arduino Uno xử lý
  // Ví dụ: PUMP:1, PUMP:0, LED:1, LED:0, MODE:AUTO
  if (command.length() > 0) {
    Serial.println(command);
  }
}

// ================= HÀM TỰ ĐỘNG KẾT NỐI LẠI MQTT =================
void reconnectMQTT() {
  // Tạo Client ID ngẫu nhiên cho ESP8266
  String clientId = "ESP8266_Terrarium_" + String(random(0xffff), HEX);
  
  if (client.connect(clientId.c_str())) {
    // Đăng ký (Subscribe) nhận lệnh điều khiển từ Node-RED/Web
    client.subscribe(topic_control);
  }
}
