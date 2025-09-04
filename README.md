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

