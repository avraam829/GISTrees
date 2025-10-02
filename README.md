# GISTrees

[📱 **Скачать APK (Android)**](https://drive.google.com/file/d/19qOvT1BNHga8mdlgzpWnnBeEq9eRhn9L/view?usp=sharing)  
[🌐 **Открыть веб-ГИС GISTrees**](https://gistrees.ru/)

> Мобильное приложение + веб-ГИС для съёмки деревьев, офлайн-детекции и последующей аналитики в геопространственной системе.
<p align="center">
  <a href="https://drive.google.com/file/d/19qOvT1BNHga8mdlgzpWnnBeEq9eRhn9L/view?usp=sharing">
    <img alt="Download APK" src="https://img.shields.io/badge/Скачать-APK-3DDC84?logo=android&logoColor=white">
  </a>
  <a href="https://gistrees.ru/">
    <img alt="Open Web GIS" src="https://img.shields.io/badge/Открыть-веб–ГИС-1f6feb?logo=mapbox&logoColor=white">
  </a>
</p>

<p align="center">
  <img alt="Status" src="https://img.shields.io/badge/status-prototype-yellow">
  <img alt="NCNN YOLO" src="https://img.shields.io/badge/YOLOv11-NCNN-blue">
</p>


## Состав репозитория
---
gistrees/
├─ gistrees-server/   # backend / БД / API веб-ГИС
├─ gistrees-web/      # фронтенд веб-ГИС
└─ README.md          # этот файл
---

## Что уже работает

- ⚡ **Офлайн-детекция в реальном времени** прямо на телефоне (без интернета).
- 📷 **Обе камеры**: основная и фронтальная, переключение в один тап.
- 🔁 **Режимы моделей**: `det`, `seg`, `pose` (меню **⋮** в правом верхнем углу).  
  - Для деревьев внедрён **seg** (сейчас модель **nano / n**).  
  - `det`/`pose` — базовые наборы YOLO для визуализации.
- 🖼 **Фотосъёмка**: кнопка «Фото» сохраняет кадр.
- 🗂 **Встроенная галерея**: просмотр снимков и метаданных.
- 🧭 **EXIF-метаданные**: записываются найденные объекты и геопозиция.
- ☁ **Выгрузка в GISTrees**: при наличии интернета одним нажатием.

> Примечание: модели «порода/болезни» пока **не обучены**; сейчас — сегментация деревьев.

---

## Быстрый старт (мобильное приложение)

1. Установите APK:  
   **[Скачать GISTrees APK](https://drive.google.com/file/d/19qOvT1BNHga8mdlgzpWnnBeEq9eRhn9L/view?usp=sharing)**  
   Требуется Android (ARM64), разрешите установку из неизвестных источников.
2. Дайте доступ к **камере** и **геолокации**.
3. Через меню **⋮** (справа сверху) выберите:
   - **Задачу**: `det / seg / pose`
   - **Модель**: `n / s / m` (сейчас активна `seg_n` для деревьев)
   - **Устройство**: `cpu / gpu` (если поддерживается)
4. При необходимости переключите фронтальную/основную камеру.
5. Наведите на дерево — увидите маску/боксы/скелет в реальном времени.
6. Нажмите **Фото** — снимок сохранится с метаданными (EXIF + JSON).
7. Откройте **Галерею** (нижняя панель), чтобы:
   - просмотреть кадры и мета-инфо,
   - **выгрузить** снимки в GISTrees (кнопка в левом верхнем углу).

---

## Какие метаданные сохраняются

В **EXIF / UserComment (JSON)** пишутся:
- Пайплайн (`yolo11`), **task / model / device**, размер исходного кадра, флаг зеркалирования, **время**.
- Список **детекций**: класс (с учётом `labels/*.txt`), вероятность, координаты бокса/маски.
- **GPS** координаты (если доступны).

Эти поля используются веб-ГИС при импорте и отображении.

---

## Веб-ГИС GISTrees — как устроено

- 📦 Снимки пишутся в базу с **уникальными ключами** — **дубли невозможны**.
- 🗺 Автоматическое размещение на **карте** по геопозиции кадра.
- 🖼 Раздел **«Галерея»**: просмотр снимков и их метаданных (кто снимал — сейчас ID устройства; далее планируются пользователи и роли).
- 🧪 **Постпроцессинг (планируется)**:
  - запуск «тяжёлых» моделей для точечной диагностики проблем на уже загруженных фото,
  - раздел **«Обработка»** для постаналитики и улучшения качества.

Открыть веб-ГИС:  
**https://gistrees.ru/**

---

## Дорожная карта
- Возможность выбора и отправки фотографий из галереи
- Обучение моделей **пород** и **болезней** (детекция/сегментация).
- Улучшение точности (крупные модели, TTA).
- Полноценный **постпроцессинг** в веб-ГИС.
- Учётные записи пользователей и разграничение прав.
- Экспорт отчётов и датасетов.
- Составление тепловых карт распространнений по признаку
---

## ⚙️ Технологии и архитектура

> Пайплайн: **Android (CameraX → JNI → NCNN YOLOv11)** → **EXIF (JSON + GPS)** → **Upload → Flask API** → **PostgreSQL + PostGIS + файловое хранилище** → **Next.js + Mapbox GL**.

| Слой | Технологии | Ключевые задачи |
|---|---|---|
| Мобильное приложение | Android (Java), CameraX, ExifInterface, MediaStore | Реальная-время детекция/сегментация/позы, запись EXIF+JSON, локальная галерея и выгрузка в ГИС |
| Нативный ML | C++17, **ncnn**, (опционально) Vulkan, OpenCV (core) | Инференс YOLOv11 det/seg/pose/cls/obb, работа с .param/.bin, возврат масок/кейпоинтов |
| Backend API | **Flask**, **gunicorn**, **flask-cors**, **psycopg2-binary**, **Pillow** | Приём файлов, дедупликация по SHA-256, парсинг EXIF→GPS, запись в **PostgreSQL+PostGIS**, раздача JPEG, фильтрация по bbox, удаление |
| Веб-ГИС | **Next.js 15** (React 19), **react-map-gl**, **mapbox-gl 2.15**, **@turf/turf** | Кластеризация точек, попапы со снимками, удаление, запросы в API, карта |

---

### 📱 Мобильное приложение (он-девайс инференс)

- **CameraX**: превью + `ImageAnalysis` (YUV_420_888) → передача плоскостей в JNI.
- **JNI/NDK**: вызов `libyolo11ncnn.so`:
  - `loadModel(AssetManager, task, model, device)` — загрузка `.param/.bin` из `assets`.
  - `detectYuv420(...)` / `detectBitmap(...)` — инференс.
- **Переключатели** (меню **⋮**): `task = det/seg/pose/cls/obb`, `model = n/s/m`, `device = cpu/gpu`.
- **LabelStore**: динамический выбор файла меток `assets/labels/<task>_<model>.txt` (кешируется).
- **Сегментация и поза**: нативный код публикует результаты через callbacks → `SegStore` / `PoseStore`; рисование масок/скелетов поверх превью.
- **Сохранение кадров**:
  - Делается **две копии**: *RAW* (`Pictures/GISTreesRaw/…`) и *ANNOTATED* (`Pictures/GISTrees/…`).
  - В `EXIF:UserComment` пишется **JSON**: `{meta{pipeline, task, model, device, srcW/H, mirrorX, ts}, detections[...]}`
  - GPS пишется/читается через `ExifInterface`; координаты также передаются на сервер формой.
- **Галерея**: просмотр локальных фото + **массовая отправка** в сервер (через `UploadRepository`).

---

### 🧠 Нативный слой (C++ / ncnn)

- Базовый абстрактный класс `YOLO11` + реализации `YOLO11_det/seg/pose/cls/obb`.
- Загрузка: `yolo11.load_param(...); yolo11.load_model(...);` (в т.ч. `AAssetManager`), опция `use_vulkan_compute`.
- Результаты:
  - **Det** — bbox+class+score,
  - **Seg** — bbox + `mw × mh` бинарная маска,
  - **Pose** — bbox + массив `x,y,score` по ключевым точкам.
- Масштабирование таргет-сайза детекции на стороне C++ (`set_det_target_size`).

---

### 🗄 Backend API (Flask + PostGIS)

- Запуск в проде: **gunicorn** (+ обратный прокси nginx). CORS открыт для `/api/*`.
- **Хранилище файлов**: шардинг по SHA-256  
  `UPLOAD_ROOT/aa/bb/<sha>.jpg` (создание директорий, права `0640`).
- **Дедупликация**: сервер считает SHA-256; повторная загрузка даёт тот же ключ и апдейтит метаданные.
- **EXIF → GPS**: `Pillow` (если доступен) + приоритет координат, присланных формой.
- **База**: PostgreSQL + **PostGIS** (`geography` SRID=4326). Геометрия пишется как `ST_SetSRID(ST_MakePoint(lon,lat),4326)::geography`.  
  JSON из `UserComment` кладётся через `psycopg2.extras.Json`.
- **Эндпойнты**:
  - `GET /api/v1/health` — ping.
  - `POST /api/v1/photos` — приём файла. **Form-data**:
    - `file` *(jpeg)*, `content_sha256` *(опц.)*, `device_id` *(опц.)*,
    - `exif_user_comment` *(JSON или строка)*, `shot_time` *(ISO/EXIF)*,
    - `lat`, `lon` *(опц.)*.
    - **Ответ**: `{id, sha256, existed, lat, lon, has_geom}`.
  - `GET /api/v1/photos?limit=1000&bbox=minLon,minLat,maxLon,maxLat` — список точек с `image_url`.
  - `GET /api/v1/photos/<sha>.jpg` — отдача файла.
  - `DELETE /api/v1/photos/<sha>` — удаление из БД и диска.
- **Параметры окружения**:
  - `UPLOAD_ROOT=/var/lib/gistrees/uploads`
  - `DATABASE_URL=postgresql://user:pass@host:5432/db` *(или используемый в `db.py` набор переменных)*

---

### 🗺 Веб-ГИС (Next.js + Mapbox GL)

- **Next.js 15** (React 19, Turbopack).  
- **Карта**: `react-map-gl` + `mapbox-gl 2.15` + `@turf/turf`.
- **Кластеризация**: собственные `ClusterLayers` (кластеры/счётчики/не-кластеры).  
  Клик по кластеру — **expand zoom**, по точке — **Popup** с превью и метаданными.
- **Работа с API**:
  - Загрузка точек: `GET /api/v1/photos` (с `bbox` и `limit`).
  - Удаление из попапа: `DELETE /api/v1/photos/:sha` → локальный стейт синхронизируется (`removeBySha`).
- **Переменные окружения**:
  - `NEXT_PUBLIC_MAPBOX_TOKEN=…`  
  - (опц.) `API_BASE`, если фронт и API на разных доменах; по умолчанию вызовы идут на `/api/*` того же хоста (совместимо с nginx-проксированием).

---

### 🔐 Важные детали реализации

- Валидация SHA (`[0-9a-f]{64}`), проверка `bbox`, ограничение `limit ≤ 5000`.
- Парсинг времени поддерживает ISO и EXIF-формат (`YYYY:MM:DD HH:MM:SS`).
- Стабильные имена файлов и уникальность по содержимому → легко кешировать и реплицировать.
- Гибкая система меток: разные `labels/*.txt` на каждую задачу/вариант модели.

---

## Ссылки

- 📱 APK: **https://drive.google.com/file/d/19qOvT1BNHga8mdlgzpWnnBeEq9eRhn9L/view?usp=sharing**  
- 🌐 Веб-ГИС: **https://gistrees.ru/**  
- 📑 Презентация: *(добавим ссылку позже в этом разделе)*

---
