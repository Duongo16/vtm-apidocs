# VTM-APIDocs — Cổng quản trị & xuất bản tài liệu API

> Monorepo gồm **Backend (Spring Boot + MariaDB)** và **Frontend (React + Vite + MUI)** để **soạn thảo, quản lý, xem trước (preview) và xuất bản OpenAPI**. Hỗ trợ nhập liệu bằng **LLM (OpenRouter)** để chuyển **DOC/PDF → OpenAPI JSON**.

---

## Mục lục
- [Tính năng](#tính-năng)
- [Kiến trúc & Cấu trúc thư mục](#kiến-trúc--cấu-trúc-thư-mục)
- [Yêu cầu](#yêu-cầu)
- [Khởi động nhanh](#khởi-động-nhanh)
  - [1) MariaDB bằng Docker](#1-mariadb-bằng-docker)
  - [2) Backend (Spring Boot)](#2-backend-spring-boot)
  - [3) Frontend (React--Vite--MUI)](#3-frontend-react--vite--mui)
- [Biến môi trường](#biến-môi-trường)
  - [Backend: `application.yml`](#backend-applicationyml)
  - [Frontend: `.env.local`](#frontend-envlocal)
- [Luồng sử dụng](#luồng-sử-dụng)
- [API phác thảo + ví dụ](#api-phác-thảo--ví-dụ)
- [Ghi chú tích hợp LLM / OpenRouter](#ghi-chú-tích-hợp-llm--openrouter)
- [Khắc phục sự cố nhanh](#khắc-phục-sự-cố-nhanh)
- [Roadmap](#roadmap)
- [Đóng góp](#đóng-góp)
- [License](#license)

---

## Tính năng
- Quản lý phân cấp: **Category → Document → Endpoint Index** (tìm kiếm nhanh).
- Soạn & chỉnh **OpenAPI 3.0.x** (JSON/YAML), **Preview** trực tiếp.
- **LLM Import**: chuyển văn bản/tài liệu sang **OpenAPI JSON**.
- Tìm kiếm & lọc theo trạng thái (*draft/published/archived*).
- Hướng tới: **RBAC (Admin/Editor/Viewer)**, **Public Docs** (read-only), **versioning & diff**.

---

## Kiến trúc & Cấu trúc thư mục

vtm-apidocs/
├─ vtm-apidocs-be/ # Spring Boot + JPA + MariaDB + WebClient (OpenRouter)
│ ├─ src/main/java/... # domain, dto, service, controller, indexer,...
│ └─ src/main/resources # application.yml (cấu hình)
├─ vtm-apidocs-fe/ # React + Vite + MUI (+ Scalar editor tuỳ chọn)
│ ├─ src/ # pages, components (DocsList, DocDetail, Editor/Preview,...)
│ └─ index.html
└─ README.md

yaml
Sao chép mã

**Tech stack ngắn gọn:**  
Java 17+/21, Spring Boot, Spring Web, Spring Data JPA, MariaDB; WebClient (reactor-netty); React 18+, Vite, TypeScript, MUI.

---

## Yêu cầu
- **Java** 17 hoặc 21, **Maven/Gradle**
- **Node.js** 18+ (khuyến nghị 20+)
- **Docker** & **Docker Compose** (để chạy DB nhanh)

---

## Khởi động nhanh

### 1) MariaDB bằng Docker
Tạo `docker-compose.yml` (ở thư mục gốc):
```yaml
version: "3.9"
services:
  mariadb:
    image: mariadb:11
    container_name: vtm_apidocs_db
    environment:
      MARIADB_ROOT_PASSWORD: root
      MARIADB_DATABASE: vtm_apidocs
      MARIADB_USER: vtm
      MARIADB_PASSWORD: vtm123
    ports:
      - "3306:3306"
    volumes:
      - db_data:/var/lib/mysql
volumes:
  db_data:
Chạy:

bash
Sao chép mã
docker compose up -d
2) Backend (Spring Boot)
bash
Sao chép mã
cd vtm-apidocs-be
# Maven
./mvnw spring-boot:run
# hoặc Gradle
./gradlew bootRun
Mặc định chạy tại http://localhost:8081 (theo server.port).

3) Frontend (React – Vite – MUI)
bash
Sao chép mã
cd vtm-apidocs-fe
npm i
npm run dev
Vite dev server thường tại http://localhost:5173.

Biến môi trường
Backend: application.yml
Đặt tại vtm-apidocs-be/src/main/resources/application.yml

yaml
Sao chép mã
server:
  port: 8081

spring:
  datasource:
    url: jdbc:mariadb://localhost:3306/vtm_apidocs
    username: vtm
    password: vtm123
    driver-class-name: org.mariadb.jdbc.Driver
  jpa:
    hibernate:
      ddl-auto: update
    open-in-view: false
    properties:
      hibernate.format_sql: true
  jackson:
    serialization:
      WRITE_DATES_AS_TIMESTAMPS: false

# Cho phép FE gọi BE (tuỳ chỉnh theo host FE)
vtm:
  cors-allowed-origins: "http://localhost:5173"

# LLM (OpenRouter)
llm:
  api:
    url: https://openrouter.ai/api/v1/chat/completions
    key: ${OPENROUTER_API_KEY:CHANGE_ME}
  model: openai/gpt-4o
Frontend: .env.local
Đặt tại vtm-apidocs-fe/.env.local

env
Sao chép mã
VITE_API_BASE_URL=http://localhost:8081
VITE_FEATURE_LLM_IMPORT=true
Luồng sử dụng
(Tuỳ chọn) Đăng nhập → vào trang quản trị.

DocsList: tìm kiếm theo từ khoá, lọc theo trạng thái.

Tạo Document (name/slug/version/description/status).

Editor: dán OpenAPI JSON/YAML → Validate/Format/Minify → Preview.

LLM Import: upload DOC/PDF → BE gọi OpenRouter → nhận OpenAPI JSON → lưu → reindex endpoints.

Chuyển trạng thái published để xuất bản.

API phác thảo + ví dụ
Tên đường dẫn có thể khác trong code thực tế. Dưới đây là outline phổ biến của dự án.

Auth
bash
Sao chép mã
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout
Documents
bash
Sao chép mã
GET  /admin/docs                 # liệt kê (hỗ trợ ?query=, ?status=)
POST /admin/docs                 # tạo document
GET  /admin/docs/{id}            # chi tiết document
PUT  /admin/docs/{id}            # cập nhật meta (name/slug/version/description/status)
PUT  /admin/docs/{id}/spec       # cập nhật OpenAPI spec (raw text)
DEL  /admin/docs/{id}            # xoá (tuỳ chính sách)
Ví dụ cập nhật spec:

bash
Sao chép mã
curl -X PUT "http://localhost:8081/admin/docs/1/spec" \
  -H "Content-Type: application/json" \
  --data-binary @openapi.json
Ví dụ cập nhật meta:

bash
Sao chép mã
curl -X PUT "http://localhost:8081/admin/docs/1" \
  -H "Content-Type: application/json" \
  -d '{"name":"Store API","slug":"store-api","version":"1.0.1","description":"Docs","status":"draft"}'
LLM
pgsql
Sao chép mã
GET  /admin/llm/openrouter/echo  # test kết nối
POST /admin/llm/import           # upload/convert DOC/PDF → OpenAPI JSON
Ví dụ test echo:

bash
Sao chép mã
curl "http://localhost:8081/admin/llm/openrouter/echo"
Ghi chú tích hợp LLM / OpenRouter
Dùng Authorization: Bearer <OPENROUTER_API_KEY>.

Khuyến nghị thêm header:

HTTP-Referer: https://github.com/<user>/<repo>

X-Title: VTM-APIDocs

Thiết lập timeout hợp lý cho WebClient (connect/read/write).

Khắc phục sự cố nhanh
Connection reset khi gọi OpenRouter

Kiểm tra llm.api.url, API key, mạng/proxy.

Thêm header HTTP-Referer, X-Title.

Cấu hình timeout cho Reactor Netty (connect, read, write).

CORS từ FE → BE

Bật @CrossOrigin hoặc cấu hình CorsConfigurationSource cho http://localhost:5173.

Lỗi parse OpenAPI

Đầu vào phải là một JSON/YAML hợp lệ duy nhất (không kèm markdown/code fence).

Log chi tiết lỗi để chỉnh sửa nhanh.

Request method 'PUT' is not supported

Đảm bảo mapping PUT /admin/docs/{id} (meta) khác PUT /admin/docs/{id}/spec (spec).

FE gọi đúng URL + method.

Roadmap
Public Docs (read-only), RBAC, versioning & diff, import/export bộ tài liệu, pipeline LLM nâng cao (table → components.schemas + examples).

Đóng góp
PR nhỏ, mô tả rõ, ảnh UI (nếu có).

Conventional commits: feat|fix|docs|refactor|test|chore.

Ưu tiên DTO, tách bạch domain/service/controller, thêm unit test cho parser/indexer.

License
TBD (gợi ý MIT).

makefile
Sao chép mã
::contentReference[oaicite:0]{index=0}
